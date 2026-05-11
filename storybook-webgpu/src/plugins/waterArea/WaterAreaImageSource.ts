import {
  XYZImageSource,
  type XYZImageSourceOptions
} from '3d-tiles-renderer/src/three/plugins/images/sources/XYZImageSource.js'
import { CanvasTexture, RedFormat, SRGBColorSpace, Texture } from 'three'

import { queueTask } from '../../worker/pool'

function createSolidTexture(color: string): Texture {
  const size = 4
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, size, size)

  const texture = new CanvasTexture(canvas)
  texture.format = RedFormat
  texture.generateMipmaps = false
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const landTexture = createSolidTexture('#000')
const waterTexture = createSolidTexture('#fff')

export interface WaterAreaImageSourceOptions extends Omit<
  XYZImageSourceOptions,
  'url' | 'tileDimensions'
> {}

export class WaterAreaImageSource extends XYZImageSource {
  constructor({ levels = 20, ...options }: WaterAreaImageSourceOptions = {}) {
    super({
      ...options,
      levels,
      tileDimension: 128 // Tile size is fixed to 128px
    })
  }

  override async fetchItem(
    tokens: [number, number, number],
    signal: AbortSignal
  ): Promise<Texture> {
    const [x, y, z] = tokens

    if (signal.aborted) {
      return landTexture
    }

    const taskPromise = queueTask('computeWaterAreaTileImage', [{ x, y, z }])

    const onAbort = (): void => {
      taskPromise.cancel()
    }
    signal.addEventListener('abort', onAbort)

    let result
    try {
      result = await taskPromise
    } catch (error) {
      console.error(error)
      return landTexture
    }

    signal.removeEventListener('abort', onAbort)

    if (result.image == null) {
      if (result.solid === 'water') {
        return waterTexture
      } else {
        return landTexture
      }
    }

    const texture = new Texture(result.image)
    texture.format = RedFormat
    texture.generateMipmaps = false
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }

  override disposeItem(texture: Texture): void {
    if (texture === landTexture || texture === waterTexture) {
      return // We reuse these textures
    }
    super.disposeItem(texture)
  }
}
