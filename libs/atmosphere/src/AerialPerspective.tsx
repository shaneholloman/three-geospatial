import { EffectComposerContext } from '@react-three/postprocessing'
import { forwardRef, useContext, useEffect, useMemo } from 'react'

import { type EffectProps } from '@geovanni/effects'

import {
  AerialPerspectiveEffect,
  aerialPerspectiveEffectOptionsDefaults,
  type AerialPerspectiveEffectOptions
} from './AerialPerspectiveEffect'
import {
  IRRADIANCE_TEXTURE_HEIGHT,
  IRRADIANCE_TEXTURE_WIDTH,
  SCATTERING_TEXTURE_DEPTH,
  SCATTERING_TEXTURE_HEIGHT,
  SCATTERING_TEXTURE_WIDTH,
  TRANSMITTANCE_TEXTURE_HEIGHT,
  TRANSMITTANCE_TEXTURE_WIDTH
} from './constants'
import { usePrecomputedData } from './usePrecomputedData'

export interface AerialPerspectiveProps
  extends EffectProps<
    typeof AerialPerspectiveEffect,
    AerialPerspectiveEffectOptions
  > {}

export const AerialPerspective = forwardRef<
  AerialPerspectiveEffect,
  AerialPerspectiveProps
>(function AerialPerspective(props, forwardedRef) {
  const { blendFunction, ...others } = {
    ...aerialPerspectiveEffectOptionsDefaults,
    ...props
  }

  // Make textures shared.
  const irradianceTexture = usePrecomputedData('/irradiance.bin', {
    width: IRRADIANCE_TEXTURE_WIDTH,
    height: IRRADIANCE_TEXTURE_HEIGHT
  })
  const scatteringTexture = usePrecomputedData('/scattering.bin', {
    width: SCATTERING_TEXTURE_WIDTH,
    height: SCATTERING_TEXTURE_HEIGHT,
    depth: SCATTERING_TEXTURE_DEPTH
  })
  const transmittanceTexture = usePrecomputedData('/transmittance.bin', {
    width: TRANSMITTANCE_TEXTURE_WIDTH,
    height: TRANSMITTANCE_TEXTURE_HEIGHT
  })

  const { camera, normalPass } = useContext(EffectComposerContext)

  const effect = useMemo(
    () => new AerialPerspectiveEffect(camera, { blendFunction }),
    [camera, blendFunction]
  )
  useEffect(() => {
    return () => {
      effect.dispose()
    }
  }, [effect])

  return (
    <primitive
      ref={forwardedRef}
      object={effect}
      camera={camera}
      normalBuffer={normalPass?.texture ?? null}
      irradianceTexture={irradianceTexture}
      scatteringTexture={scatteringTexture}
      transmittanceTexture={transmittanceTexture}
      {...others}
    />
  )
})
