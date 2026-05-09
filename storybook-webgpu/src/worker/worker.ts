import workerpool from 'workerpool'

import { computeCreasedNormalAttribute } from './tasks/computeCreasedNormalAttribute'
import { computeMVTWaterAreaTileImage } from './tasks/computeMVTWaterAreaTileImage'

export const methods = {
  computeCreasedNormalAttribute,
  computeMVTWaterAreaTileImage
}

workerpool.worker(methods)
