import { Vector2 } from 'three'
import { type PartialDeep, type SharedUnionFieldsDeep } from 'type-fest'

import { type CloudsEffect } from './CloudsEffect'

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra'

const values = {
  resolutionScale: 1,
  lightShafts: true,
  shapeDetail: true,
  turbulence: true,
  clouds: {
    multiScatteringOctaves: 8,
    accurateSunSkyIrradiance: true,
    accuratePhaseFunction: false,

    // Primary raymarch
    maxIterationCount: 500,
    minStepSize: 50,
    maxStepSize: 1000,
    maxRayDistance: 5e5,
    perspectiveStepScale: 1.01,
    minDensity: 1e-5,
    minExtinction: 1e-5,
    minTransmittance: 1e-2,

    // Secondary raymarch
    maxIterationCountToGround: 3,
    maxIterationCountToSun: 2,
    minSecondaryStepSize: 100,
    secondaryStepScale: 2,

    // Shadow length
    maxShadowLengthIterationCount: 500,
    minShadowLengthStepSize: 50,
    maxShadowLengthRayDistance: 5e5
  },
  shadow: {
    cascadeCount: 3,
    mapSize: /*#__PURE__*/ new Vector2(512, 512),

    // Primary raymarch
    maxIterationCount: 50,
    minStepSize: 100,
    maxStepSize: 1000,
    minDensity: 1e-5,
    minExtinction: 1e-5,
    minTransmittance: 1e-4
  }
} satisfies PartialDeep<CloudsEffect>

// Relax types narrowed down by satisfies operator.
type Schema = SharedUnionFieldsDeep<typeof values | CloudsEffect>

export const defaults: Schema = values

export const qualityPresets: Record<QualityPreset, Schema> = {
  // TODO: We cloud decrease multi-scattering octaves for lower quality presets,
  // but it leads to a loss of higher frequency scattering, making it darker
  // overall, which suggests the need for a fudge factor to scale the radiance.
  low: {
    ...defaults,
    resolutionScale: 0.75, // Obvious, but 0.5 is excessive.
    lightShafts: false, // Expensive
    shapeDetail: false, // Expensive
    turbulence: false, // Expensive
    clouds: {
      ...defaults.clouds,
      accurateSunSkyIrradiance: false, // Greatly reduces texel reads.
      maxIterationCount: 200,
      minStepSize: 100,
      maxRayDistance: 1e5,
      minDensity: 1e-4,
      minExtinction: 1e-4,
      minTransmittance: 1e-1, // Makes the primary march terminate earlier.
      maxIterationCountToGround: 0, // Expensive
      maxIterationCountToSun: 0 // Use only BSM for the optical depth.
    },
    shadow: {
      ...defaults.shadow,
      maxIterationCount: 25,
      minDensity: 1e-4,
      minExtinction: 1e-4,
      minTransmittance: 1e-2, // Makes the primary march terminate earlier.
      cascadeCount: 2, // Obvious
      mapSize: /*#__PURE__*/ new Vector2(256, 256) // Obvious
    }
  },
  medium: {
    ...defaults,
    lightShafts: false, // Expensive
    turbulence: false, // Expensive
    clouds: {
      ...defaults.clouds,
      minDensity: 1e-4,
      minExtinction: 1e-4,
      accurateSunSkyIrradiance: false,
      maxIterationCountToSun: 2,
      maxIterationCountToGround: 1
    },
    shadow: {
      ...defaults.shadow,
      minDensity: 1e-4,
      minExtinction: 1e-4,
      mapSize: /*#__PURE__*/ new Vector2(256, 256)
    }
  },
  high: defaults, // Consider high quality preset as default.
  ultra: {
    ...defaults,
    shadow: {
      ...defaults.shadow,
      maxIterationCount: 100,
      mapSize: /*#__PURE__*/ new Vector2(1024, 1024)
    }
  }
}
