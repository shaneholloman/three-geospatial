// cSpell:words zoomaborts

import Point from '@mapbox/point-geometry'
import {
  paint,
  PolygonSymbolizer,
  TileCache,
  View,
  ZxySource,
  type PaintRule,
  type Zxy
} from 'protomaps-leaflet'

import { Transfer, type TransferResult } from '../transfer'

const size = 256

const canvas = new OffscreenCanvas(size, size)
const context = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

const paintRules: PaintRule[] = [
  {
    dataLayer: 'ocean',
    symbolizer: new PolygonSymbolizer({ fill: '#fff' })
  },
  {
    dataLayer: 'water_polygons',
    symbolizer: new PolygonSymbolizer({ fill: '#fff' }),
    filter: (zoom, feature) => feature.props.kind !== 'glacier'
  }
]

const source = new ZxySource(
  'https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt',
  false
)
const cache = new TileCache(source, 1024)
const view = new View(cache, 14, 2)

export interface MVTWaterAreaTileImage {
  image?: ImageBitmap
  fallback?: 'land' | 'water'
}

export async function computeMVTWaterAreaTileImage(
  coordinate: Zxy
): Promise<TransferResult<MVTWaterAreaTileImage>> {
  try {
    context.fillStyle = '#000'
    context.fillRect(0, 0, size, size)

    const { x, y, z } = coordinate

    const bbox = {
      minX: size * x,
      minY: size * y,
      maxX: size * (x + 1),
      maxY: size * (y + 1)
    }
    const origin = new Point(size * x, size * y)

    const preparedTile = await view.getDisplayTile(coordinate)
    const preparedTileMap = new Map([['', [preparedTile]]])
    paint(context, z, preparedTileMap, null, paintRules, bbox, origin, false)

    // Because we are using workerpool, having distributed caches doesn't make
    // much sense. The benefit of reducing the heap memory is greater.
    cache.cache.clear()
    source.zoomaborts.length = 0 // This appears to leak

    const image = await createImageBitmap(canvas, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
      imageOrientation: 'flipY'
    })

    return Transfer({ image }, [image])
  } catch (error) {
    console.error(error)
    return Transfer({}, [])
  }
}
