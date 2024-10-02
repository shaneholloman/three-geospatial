/// <reference types="vite-plugin-glsl/ext" />

import {
  Matrix4,
  RawShaderMaterial,
  Uniform,
  Vector3,
  type BufferGeometry,
  type Camera,
  type Group,
  type Object3D,
  type Scene,
  type ShaderMaterialParameters,
  type Texture,
  type WebGLRenderer
} from 'three'

import { Cartographic, Ellipsoid } from '@geovanni/core'

import { METER_TO_UNIT_LENGTH, SUN_ANGULAR_RADIUS } from './constants'

import fragmentShader from './shaders/atmosphere.frag'
import vertexShader from './shaders/atmosphere.vert'
import atmosphericScattering from './shaders/atmosphericScattering.glsl'
import vertexCommon from './shaders/vertexCommon.glsl'

const cartographicScratch = new Cartographic()

export interface AtmosphereMaterialParameters
  extends Partial<ShaderMaterialParameters> {
  irradianceTexture?: Texture
  scatteringTexture?: Texture
  transmittanceTexture?: Texture
  ellipsoid?: Ellipsoid
  sun?: boolean
  sunDirection?: Vector3
  sunAngularRadius?: number
}

export class AtmosphereMaterial extends RawShaderMaterial {
  constructor({
    irradianceTexture,
    scatteringTexture,
    transmittanceTexture,
    ellipsoid = Ellipsoid.WGS84,
    sun = true,
    sunDirection,
    sunAngularRadius = SUN_ANGULAR_RADIUS, // 16 minutes of arc
    ...params
  }: AtmosphereMaterialParameters = {}) {
    super({
      vertexShader: `${vertexCommon}${vertexShader}`,
      ...params,
      glslVersion: '300 es',
      fragmentShader: `${atmosphericScattering}${fragmentShader}`,
      uniforms: {
        irradiance_texture: new Uniform(irradianceTexture),
        scattering_texture: new Uniform(scatteringTexture),
        single_mie_scattering_texture: new Uniform(scatteringTexture),
        transmittance_texture: new Uniform(transmittanceTexture),
        projectionMatrix: new Uniform(new Matrix4()),
        modelViewMatrix: new Uniform(new Matrix4()),
        modelMatrix: new Uniform(new Matrix4()),
        inverseProjectionMatrix: new Uniform(new Matrix4()),
        inverseViewMatrix: new Uniform(new Matrix4()),
        cameraPosition: new Uniform(new Vector3()),
        cameraHeight: new Uniform(0),
        ellipsoidRadii: new Uniform(new Vector3().copy(ellipsoid.radii)),
        sunDirection: new Uniform(sunDirection?.clone() ?? new Vector3()),
        sunParams: new Uniform(new Vector3())
      },
      defines: {
        SUN: '1',
        METER_TO_UNIT_LENGTH
      },
      depthWrite: false,
      depthTest: false
    })
    this.sunAngularRadius = sunAngularRadius
  }

  override onBeforeRender(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    geometry: BufferGeometry,
    object: Object3D,
    group: Group
  ): void {
    const uniforms = this.uniforms
    uniforms.projectionMatrix.value.copy(camera.projectionMatrix)
    uniforms.modelViewMatrix.value.copy(scene.modelViewMatrix)
    uniforms.modelMatrix.value.copy(object.matrixWorld)
    uniforms.inverseProjectionMatrix.value.copy(camera.projectionMatrixInverse)
    uniforms.inverseViewMatrix.value.copy(camera.matrixWorld)
    const position = camera.getWorldPosition(uniforms.cameraPosition.value)
    uniforms.cameraHeight.value =
      cartographicScratch.setFromVector(position).height
  }

  get irradianceTexture(): Texture | null {
    return this.uniforms.irradiance_texture.value
  }

  set irradianceTexture(value: Texture | null) {
    this.uniforms.irradiance_texture.value = value
  }

  get scatteringTexture(): Texture | null {
    return this.uniforms.scattering_texture.value
  }

  set scatteringTexture(value: Texture | null) {
    this.uniforms.scattering_texture.value = value
    this.uniforms.single_mie_scattering_texture.value = value
  }

  get transmittanceTexture(): Texture | null {
    return this.uniforms.transmittance_texture.value
  }

  set transmittanceTexture(value: Texture | null) {
    this.uniforms.transmittance_texture.value = value
  }

  get sun(): boolean {
    return this.defines.SUN != null
  }

  set sun(value: boolean) {
    if (value !== this.sun) {
      if (value) {
        this.defines.SUN = '1'
      } else {
        delete this.defines.SUN
      }
      this.needsUpdate = true
    }
  }

  get sunDirection(): Vector3 {
    return this.uniforms.sunDirection.value
  }

  set sunDirection(value: Vector3) {
    this.uniforms.sunDirection.value.copy(value)
  }

  get sunAngularRadius(): number {
    return this.uniforms.sunParams.value.x
  }

  set sunAngularRadius(value: number) {
    this.uniforms.sunParams.value.x = value
    this.uniforms.sunParams.value.y = Math.cos(value)
    this.uniforms.sunParams.value.z = SUN_ANGULAR_RADIUS ** 2 / value ** 2
  }
}
