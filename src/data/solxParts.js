import { assetUrl } from '../content.js';

const modelFile = (fileName) => assetUrl(`models/solx/${fileName}`);

export const solxParts = {
  base: {
    label: 'Base',
    file: modelFile('base.glb'),
    expectedPath: '/models/solx/base.glb',
    height: 0.23,
    tint: '#f4eee8',
  },
  s02: {
    label: 'S02 Shade',
    file: modelFile('s02.glb'),
    expectedPath: '/models/solx/s02.glb',
    height: 2.14,
    tint: '#f1b36d',
  },
  s03: {
    label: 'S03 Shade',
    file: modelFile('s03.glb'),
    expectedPath: '/models/solx/s03.glb',
    height: 1.52,
    tint: '#b8c7cf',
  },
  divider: {
    label: 'Divider',
    file: modelFile('divider.glb'),
    expectedPath: '/models/solx/divider.glb',
    height: 0.12,
    tint: '#ece7dc',
  },
};

export const solxPartOrder = ['base', 's02', 's03', 'divider'];
export const defaultSolXStack = ['base'];
