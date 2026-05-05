import {
  CubeCamera,
  WebGLCubeRenderTarget as CubeRenderTarget,
  HalfFloatType,
  Mesh,
  RGBAFormat,
  Vector3
} from 'three'
import { Fn, pmremTexture, positionGeometry, uniform, vec4 } from 'three/tsl'
import {
  NodeMaterial,
  NodeUpdateType,
  TempNode,
  type NodeBuilder,
  type NodeFrame
} from 'three/webgpu'

import { QuadGeometry, radians } from '@takram/three-geospatial'
import {
  inverseProjectionMatrix,
  OnBeforeFrameUpdate
} from '@takram/three-geospatial/webgpu'

import { getAtmosphereContext } from './AtmosphereContext'
import { sky, type SkyNode } from './SkyNode'

export class SkyEnvironmentNode extends TempNode {
  static override get type(): string {
    return 'SkyEnvironmentNode'
  }

  skyNode: SkyNode

  distanceThreshold = 1000
  angularThreshold = radians(0.1)

  private readonly renderTarget: CubeRenderTarget
  private readonly cubeCamera: CubeCamera
  private readonly material = new NodeMaterial()
  private readonly mesh = new Mesh(new QuadGeometry(), this.material)

  private currentVersion?: number
  private removeLUTUpdateListener?: () => void

  constructor(size = 64) {
    super('vec3')
    this.updateBeforeType = NodeUpdateType.FRAME
    this.material.name = 'SkyEnvironment'

    this.skyNode = sky()
    this.skyNode.showSun = false
    this.skyNode.showMoon = false
    this.skyNode.showStars = false

    this.renderTarget = new CubeRenderTarget(size, {
      depthBuffer: false,
      type: HalfFloatType,
      format: RGBAFormat
    })
    this.cubeCamera = new CubeCamera(0.1, 1000, this.renderTarget)
  }

  override updateBefore({ renderer }: NodeFrame): void {
    if (renderer == null || this.version === this.currentVersion) {
      return
    }
    this.currentVersion = this.version
    this.cubeCamera.update(renderer, this.mesh)
  }

  override setup(builder: NodeBuilder): unknown {
    const atmosphereContext = getAtmosphereContext(builder)

    const { camera, matrixWorldToECEF } = atmosphereContext

    const matrixViewToECEF = uniform('mat4')
      .setName('matrixViewToECEF')
      .onRenderUpdate(({ camera }, { value }) => {
        if (camera != null) {
          value.multiplyMatrices(matrixWorldToECEF.value, camera.matrixWorld)
        }
      })

    this.skyNode.rayDirectionECEF = Fn(() => {
      const positionView = inverseProjectionMatrix().mul(
        vec4(positionGeometry, 1)
      ).xyz
      return matrixViewToECEF
        .mul(vec4(positionView, 0))
        .xyz.toVarying('rayDirectionECEF')
        .normalize()
    })()

    if (camera != null) {
      const nextPosition = new Vector3()
      const prevPosition = new Vector3()
      OnBeforeFrameUpdate(() => {
        // TODO: Ideally, this should be compared against the parameterization
        // values of the LUT. (i.e. radius, angle between view and sun, etc.)
        nextPosition
          .copy(camera.position)
          .divideScalar(this.distanceThreshold)
          .round()
        if (!prevPosition.equals(nextPosition)) {
          prevPosition.copy(nextPosition)
          this.needsUpdate = true
        }
      })
    }

    const sunDirection = atmosphereContext.sunDirectionECEF.value.clone()
    OnBeforeFrameUpdate(() => {
      const { value } = atmosphereContext.sunDirectionECEF
      if (sunDirection.angleTo(value) > this.angularThreshold) {
        sunDirection.copy(value)
        this.needsUpdate = true
      }
    })

    const moonDirection = atmosphereContext.moonDirectionECEF.value.clone()
    OnBeforeFrameUpdate(() => {
      const { value } = atmosphereContext.moonDirectionECEF
      if (moonDirection.angleTo(value) > this.angularThreshold) {
        moonDirection.copy(value)
        this.needsUpdate = true
      }
    })

    const handleLUTUpdate = (): void => {
      this.needsUpdate = true
    }
    atmosphereContext.lutNode.addEventListener(
      // @ts-expect-error Cannot specify the events map
      'update',
      handleLUTUpdate
    )
    this.removeLUTUpdateListener?.()
    this.removeLUTUpdateListener = () => {
      atmosphereContext.lutNode.removeEventListener(
        // @ts-expect-error Cannot specify the events map
        'update',
        handleLUTUpdate
      )
    }

    this.material.vertexNode = vec4(positionGeometry.xy, 0, 1)
    this.material.fragmentNode = this.skyNode
    return pmremTexture(this.renderTarget.texture)
  }

  override dispose(): void {
    this.removeLUTUpdateListener?.()

    this.renderTarget.dispose()
    this.skyNode.dispose() // TODO: Conditionally depending on the owner.
    this.material.dispose()
    this.mesh.geometry.dispose()
    super.dispose()
  }
}

export const skyEnvironment = (
  ...args: ConstructorParameters<typeof SkyEnvironmentNode>
): SkyEnvironmentNode => new SkyEnvironmentNode(...args)
