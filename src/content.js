export const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const navItems = [
  { label: 'Work', href: '#work' },
  { label: 'Systems', href: '#systems' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Contact', href: '#contact' },
];

export const heroLines = [
  'Modular products.',
  'Circular systems.',
  'Future focused manufacturing.',
];

export const featuredWork = [
  {
    title: 'SOL Lamp System',
    eyebrow: 'Modular lighting',
    image: assetUrl('assets/lamps/homepage-sol-feature.png'),
    description:
      'A lighting platform designed around swappable forms, repairable assemblies, and expressive spatial presence.',
  },
  {
    title: 'SOL X Lamp',
    eyebrow: 'Additive workflow',
    image: assetUrl('assets/lamps/solx-one-lamp.png'),
    description:
      'A refined lamp study that connects printed parts, connector logic, and premium domestic lighting.',
  },
  {
    title: 'PlastiVista',
    eyebrow: 'Circular manufacturing',
    image: assetUrl('assets/plastivista/homepage-process-sequence.png'),
    description:
      'A compact material system for shredding, extruding, printing, and returning plastic waste to product form.',
  },
  {
    title: 'Revo Chair',
    eyebrow: 'Furniture system',
    image: assetUrl('assets/chairs/revo-tall-test.png'),
    description:
      'Furniture development focused on rotational form, digital fabrication, and quiet structural clarity.',
  },
  {
    title: 'Sol Wheel',
    eyebrow: 'Object research',
    image: assetUrl('assets/process/sol-wheel-render.png'),
    description:
      'A product exploration linking playful interaction, fabrication research, and physical prototyping.',
  },
];

export const systemTabs = [
  {
    id: 'dram',
    label: 'DRAM',
    image: assetUrl('assets/plastivista/system-hero.png'),
    title: 'Distributed production that behaves like an ecosystem.',
    body:
      'DRAM frames manufacturing as a network of local cells: material collection, processing, fabrication, assembly, and product storytelling working in one loop.',
  },
  {
    id: 'circular',
    label: 'Circular',
    image: assetUrl('assets/plastivista/system-diagram.png'),
    title: 'Waste streams become visible design material.',
    body:
      'PlastiVista translates discarded plastic into feedstock, parts, furniture, and lighting components with a process that can be seen and understood.',
  },
  {
    id: 'studio',
    label: 'Studio',
    image: assetUrl('assets/plastivista/system-environment-a.png'),
    title: 'A calm production environment for future objects.',
    body:
      'The studio connects visualization, prototyping, product development, and manufacturing systems inside one integrated presentation language.',
  },
];

export const capabilities = [
  'Industrial design',
  'Visualization',
  'Additive manufacturing',
  'Prototyping',
  'Circular design',
  'Storytelling',
];

export const assetNotes = [
  'Hero model: lightweight SOL lamp GLB from local Capstone Electric Lamp Renders.',
  'Product visuals: Sol lamp, SOL X, PlastiVista, Revo Chair, and Sol Wheel assets from local D: drive and Google Drive discovery.',
  'Motion media: real shredder process video, muted by design.',
  'Sound: procedural Web Audio, off until the visitor enables it.',
];
