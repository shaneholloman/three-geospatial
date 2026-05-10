import type { Meta } from '@storybook/react-vite'
import { TilesPlugin } from '3d-tiles-renderer/r3f'

import { createStory } from '../components/createStory'
import { WaterAreaTilesOverlay } from '../plugins/waterArea/WaterAreaImageOverlay'
import { WaterAreaNodeMaterial } from '../plugins/waterArea/WaterAreaNodeMaterial'
import { WaterAreaOverlayPlugin } from '../plugins/waterArea/WaterAreaOverlayPlugin'
import { Story } from './3DTilesRenderer-Shadows'

import StoryCode from './3DTilesRenderer-Shadows?raw'

export default {
  title: 'atmosphere/Cityscape',
  tags: ['order:3'],
  parameters: {
    docs: {
      codePanel: true,
      source: {
        language: 'tsx'
      }
    }
  }
} satisfies Meta

export const Cityscape = createStory(Story, {
  props: {
    longitude: -73.9883,
    latitude: 40.7657,
    heading: -42,
    pitch: -25,
    distance: 2667,
    fov: 50,
    csmFar: 1e4,
    materialHandler: () => new WaterAreaNodeMaterial(),
    globeChildren: (
      <TilesPlugin
        plugin={WaterAreaOverlayPlugin}
        args={{
          overlays: [new WaterAreaTilesOverlay()],
          enableTileSplitting: false
        }}
      />
    )
  },
  args: {
    toneMappingExposure: 40,
    dayOfYear: 1,
    timeOfDay: 7.6
  },
  parameters: {
    docs: {
      source: {
        code: StoryCode
      }
    }
  }
})
