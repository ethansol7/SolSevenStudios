import { assetUrl } from '../content.js';

const modelFile = (fileName) => assetUrl(`models/solx/${fileName}`);

export const solxParts = {
  base: {
    label: 'Base',
    type: 'base',
    file: modelFile('base.glb'),
    expectedPath: '/models/solx/base.glb',
    height: 0.23,
    tint: '#f4eee8',
  },
  s02: {
    label: 'S02',
    type: 'shade',
    file: modelFile('s02.glb'),
    expectedPath: '/models/solx/s02.glb',
    height: 2.14,
  },
  s03: {
    label: 'S03',
    type: 'shade',
    file: modelFile('s03.glb'),
    expectedPath: '/models/solx/s03.glb',
    height: 1.52,
  },
  s04: {
    label: 'S04',
    type: 'shade',
    file: modelFile('s04.glb'),
    expectedPath: '/models/solx/s04.glb',
    height: 1.64,
  },
  divider: {
    label: 'Divider',
    type: 'divider',
    file: modelFile('divider.glb'),
    expectedPath: '/models/solx/divider.glb',
    height: 0.12,
    tint: '#ece7dc',
  },
};

export const shadeColorOptions = {
  amber: {
    label: 'Translucent Amber',
    materialName: 'Opaque(243,203,124)',
    swatch: '#fae7b9',
  },
  gray: {
    label: 'Translucent Gray',
    materialName: '3d print',
    swatch: '#b9bcbd',
  },
  white: {
    label: 'Translucent White',
    materialName: 'Opaque(196,197,196)',
    swatch: '#e3e4e3',
  },
};

export const shadePartOrder = ['s02', 's03', 's04'];
export const solxPartOrder = ['base', ...shadePartOrder, 'divider'];
export const defaultSolXStack = ['base'];
