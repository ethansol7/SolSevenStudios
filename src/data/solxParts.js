import { assetUrl } from '../content.js';

const modelFile = (fileName) => assetUrl(`models/solx/${fileName}`);

export const solxParts = {
  base: {
    label: 'Base',
    shortLabel: 'Base',
    type: 'base',
    family: 'lighting',
    file: modelFile('base.glb'),
    expectedPath: '/models/solx/base.glb',
    availableColors: ['amber', 'gray', 'white'],
    height: 0.23,
    inputAnchor: [0, 0.3735, 0],
    outputOffset: [0, 0.027, 0],
    outputDirection: [0, 1, 0],
    defaultRootPosition: [0, 0, 0],
    defaultRootRotation: [0, 0, 0],
    tint: '#f4eee8',
    connectors: {
      input: {
        position: [0, 0.3735, 0],
        direction: [0, -1, 0],
      },
      output: {
        position: [0, 0.027, 0],
        direction: [0, 1, 0],
      },
    },
  },
  s02: {
    label: 'S02',
    shortLabel: 'S02',
    type: 'shade',
    family: 'lighting',
    file: modelFile('s02.glb'),
    expectedPath: '/models/solx/s02.glb',
    availableColors: ['amber', 'gray', 'white'],
    height: 2.14,
    inputAnchor: [0, 0.089, 0],
    outputOffset: [0, 0.246, 0],
    outputDirection: [0, 1, 0],
    defaultRootPosition: [0, 0, 0],
    defaultRootRotation: [0, 0, 0],
    connectors: {
      input: {
        position: [0, 0.089, 0],
        direction: [0, -1, 0],
      },
      output: {
        position: [0, 0.246, 0],
        direction: [0, 1, 0],
      },
    },
  },
  s03: {
    label: 'S03',
    shortLabel: 'S03',
    type: 'shade',
    family: 'lighting',
    file: modelFile('s03.glb'),
    expectedPath: '/models/solx/s03.glb',
    availableColors: ['amber', 'gray', 'white'],
    height: 1.52,
    inputAnchor: [0, -0.196, 0],
    outputOffset: [0, 0.174, 0],
    outputDirection: [0, 1, 0],
    defaultRootPosition: [0, 0, 0],
    defaultRootRotation: [0, 0, 0],
    connectors: {
      input: {
        position: [0, -0.196, 0],
        direction: [0, -1, 0],
      },
      output: {
        position: [0, 0.174, 0],
        direction: [0, 1, 0],
      },
    },
  },
  s04: {
    label: 'S04',
    shortLabel: 'S04',
    type: 'shade',
    family: 'lighting',
    file: modelFile('s04.glb'),
    expectedPath: '/models/solx/s04.glb',
    availableColors: ['amber', 'gray', 'white'],
    height: 1.64,
    inputAnchor: [0, 0.5427, 0],
    outputOffset: [0, 0.1136, 0.1136],
    outputDirection: [0, 0, 1],
    defaultRootPosition: [0, 0, 0],
    defaultRootRotation: [0, 0, 0],
    connectors: {
      input: {
        position: [0, 0.5427, 0],
        direction: [0, -1, 0],
      },
      output: {
        position: [0, 0.1136, 0.1136],
        direction: [0, 0, 1],
      },
    },
  },
  divider: {
    label: 'Divider',
    shortLabel: 'Divider',
    type: 'divider',
    family: 'lighting',
    file: modelFile('divider.glb'),
    expectedPath: '/models/solx/divider.glb',
    availableColors: ['amber', 'gray', 'white'],
    height: 0.12,
    inputAnchor: [0, 0.5011, 0],
    outputOffset: [0, 0.012, 0],
    outputDirection: [0, 1, 0],
    defaultRootPosition: [0, 0, 0],
    defaultRootRotation: [0, 0, 0],
    tint: '#ece7dc',
    connectors: {
      input: {
        position: [0, 0.5011, 0],
        direction: [0, -1, 0],
      },
      output: {
        position: [0, 0.012, 0],
        direction: [0, 1, 0],
      },
    },
  },
};

export const shadeColorOptions = {
  amber: {
    label: 'Translucent Amber',
    materialName: 'Opaque(243,203,124)',
    swatch: '#ffae42',
    materialColor: '#ffbd52',
    opacity: 0.88,
    transmission: 0.08,
  },
  gray: {
    label: 'Translucent Gray',
    materialName: '3d print',
    swatch: '#838d8f',
    materialColor: '#929c9e',
    opacity: 0.86,
    transmission: 0.1,
  },
  white: {
    label: 'Translucent White',
    materialName: 'Opaque(196,197,196)',
    swatch: '#fff3d6',
    materialColor: '#fff1ca',
    opacity: 0.9,
    transmission: 0.06,
  },
};

export const shadePartOrder = ['s02', 's03', 's04'];
export const solxPartOrder = ['base', ...shadePartOrder, 'divider'];
export const defaultSolXStack = ['base'];

export const solxBuilderConfig = {
  storageKey: 'sol-seven-solx-builder-v2',
  disclaimerKey: 'sol-seven-solx-advanced-disclaimer-v1',
  defaultColor: 'white',
  defaultScene: [
    {
      id: 'base-1',
      moduleId: 'base',
      color: 'white',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      parentId: null,
    },
  ],
  moduleOrder: solxPartOrder,
  moduleDefinitions: solxParts,
  colors: shadeColorOptions,
};
