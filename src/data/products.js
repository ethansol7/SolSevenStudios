import { assetUrl } from '../content.js';

const shopImage = (name) => assetUrl(`assets/shop/${name}`);

export const productCategories = [
  {
    id: 'table-lights',
    label: 'Table Lights',
    description: 'Complete Original SOL lamp builds with base, shade, magnetic clips, and smart RGB lighting.',
  },
  {
    id: 'shades',
    label: 'Shades',
    description: 'Stackable S0 shades for changing light diffusion, silhouette, and functional add-on use.',
  },
  {
    id: 'add-ons',
    label: 'Combos and Add-Ons',
    description: 'Planter and bundle options for building a larger modular lighting ecosystem.',
  },
];

const sharedLampNotes = [
  'Modular Swap & Snap ecosystem with magnetic shades, bases, and clips.',
  '40W RGB smart bulb for color changing light and warm white settings.',
  'Sustainable plant-based PETG polymer construction.',
  'SGS certified for UL and CSA on listed lamp builds.',
];

const sharedShadeNotes = [
  'Available in White, Black, and Orange on the public Sol Seven Studios product pages.',
  'Sustainable plant-based PETG polymer construction.',
  'Designed to stack, swap, diffuse light, or become a functional desktop object.',
];

export const originalSolProducts = [
  {
    slug: 's01',
    name: 'S01',
    category: 'table-lights',
    collection: 'Original SOL Collection',
    price: '$70.00',
    image: shopImage('s01.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s01',
    shortDescription: 'A sculptural modular table lamp with customizable RGB illumination.',
    story:
      'S01 is the clearest entry point into the S0L language: bold, playful, and built for everyday personalization. It gives the lamp system a simple foundation for stacking, swapping, and changing the room mood.',
    intent:
      'Designed as a confident object that can sit alone or begin a larger modular build.',
    processNotes: sharedLampNotes,
  },
  {
    slug: 's02',
    name: 'S02',
    category: 'table-lights',
    collection: 'Original SOL Collection',
    price: '$70.00',
    image: shopImage('s02.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s02',
    shortDescription: 'A minimal, versatile lamp for broad ambient lighting and daily color control.',
    story:
      'S02 bridges clean minimalism with adaptable light. Its form is intended to fit quietly into a room while still supporting the full stackable SOL ecosystem.',
    intent:
      'Designed to illuminate a whole space without overpowering the surface around it.',
    processNotes: sharedLampNotes,
  },
  {
    slug: 's03',
    name: 'S03',
    category: 'table-lights',
    collection: 'Original SOL Collection',
    price: '$70.00',
    image: shopImage('s03.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s03',
    shortDescription: 'A warm organic lamp profile with a refined, inviting silhouette.',
    story:
      'S03 softens the modular system with a broader organic presence. It is tuned for warm light, sculptural volume, and calm use across work, rest, and creative settings.',
    intent:
      'Designed for users who want the system to feel both elevated and emotionally warm.',
    processNotes: sharedLampNotes,
  },
  {
    slug: 's04',
    name: 'S04',
    category: 'table-lights',
    collection: 'Original SOL Collection',
    price: '$70.00',
    image: shopImage('s04.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s04',
    shortDescription: 'A sharper geometric SOL profile with layered visual rhythm.',
    story:
      'S04 adds a more architectural silhouette to the S0 series. It is built to feel strong as a single object and expressive when stacked with other modules.',
    intent:
      'Designed as the most geometric table-light expression in the original collection.',
    processNotes: sharedLampNotes,
  },
  {
    slug: 's01-shade',
    name: 'S01 Shade',
    category: 'shades',
    collection: 'Original SOL Collection',
    price: '$35.00',
    image: shopImage('s01-shade.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s01-shade',
    shortDescription: 'The foundational stackable shade for the S0 modular system.',
    story:
      'S01 Shade is the most minimal module in the shade family. Its open form can support light diffusion, stacking, and planter-style reuse.',
    intent: 'Designed as the simplest modular shade and a flexible off-lamp object.',
    processNotes: sharedShadeNotes,
  },
  {
    slug: 's02-shade',
    name: 'S02 Shade',
    category: 'shades',
    collection: 'Original SOL Collection',
    price: '$15.00',
    image: shopImage('s02-shade.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s02-shade',
    shortDescription: 'A soft curved shade for diffuse ambient lighting and calm visual weight.',
    story:
      'S02 Shade brings a smoother profile to the system. It can stand alone on a base or sit between other modules to change the lamp silhouette.',
    intent: 'Designed as a calm shade option for warmer, softer SOL builds.',
    processNotes: sharedShadeNotes,
  },
  {
    slug: 's03-shade',
    name: 'S03 Shade',
    category: 'shades',
    collection: 'Original SOL Collection',
    price: '$35.00',
    image: shopImage('s03-shade.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s03-shade',
    shortDescription: 'A wide dome shade that creates warm, even light and sculptural volume.',
    story:
      'S03 Shade anchors low-profile and taller stacked builds with a generous dome-like form. It also works as a standalone container when off the lamp.',
    intent: 'Designed to add volume, warmth, and balance to modular lamp compositions.',
    processNotes: sharedShadeNotes,
  },
  {
    slug: 's04-shade',
    name: 'S04 Shade',
    category: 'shades',
    collection: 'Original SOL Collection',
    price: '$15.00',
    image: shopImage('s04-shade.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s04-shade',
    shortDescription: 'A bold geometric shade for stacked visual depth and interlocking expression.',
    story:
      'S04 Shade pushes the system toward sharper geometry. It supports upward expansion and pairs with the magnetic clip logic of the S0 ecosystem.',
    intent: 'Designed to make the shade family feel architectural and playful.',
    processNotes: sharedShadeNotes,
  },
  {
    slug: 's0l-planter',
    name: 'S0L Planter',
    category: 'add-ons',
    collection: 'Original SOL Collection',
    price: '$25.00',
    image: shopImage('s0l-planter.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s0l-planter',
    shortDescription: 'A modular planter add-on that turns unused shades into functional decor.',
    story:
      'The planter extends the SOL system beyond lighting. It keeps unused modules active in the room as desktop objects, storage, or small plant vessels.',
    intent: 'Designed to make modularity useful even when parts are not on a lamp.',
    processNotes: ['Built for S0 shades and attachments.', 'Uses the same playful modular logic as the lighting system.', 'Listed as an add-on in the public shop.'],
  },
  {
    slug: 's0l-combo',
    name: 'S0L Combo',
    category: 'add-ons',
    collection: 'Original SOL Collection',
    price: '$195.00 sale',
    compareAt: '$210.00 regular',
    image: shopImage('s0l-combo.png'),
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s0-combo',
    shortDescription: 'The full modular lighting bundle with S01, S02, S03, bulbs, clips, and extra shades.',
    story:
      'S0L Combo is the most complete way to experience the original modular system. It supports multi-room setups, stacked compositions, and a more expressive lamp ecosystem.',
    intent: 'Designed as a full-system entry point rather than a single lamp purchase.',
    processNotes: sharedLampNotes,
  },
];

export const featuredOriginalSolProducts = originalSolProducts.filter((product) => product.category === 'table-lights');

export const solXComponents = [
  {
    label: 'SOL X Base',
    path: assetUrl('assets/3d/solx/base.glb'),
    note: 'Primary SOL X foundation component.',
  },
  {
    label: 'SOL X S02 Shade',
    path: assetUrl('assets/3d/solx/shade_s02.glb'),
    note: 'Component shade file for the SOL X preview system.',
  },
  {
    label: 'SOL X S03 Shade',
    path: assetUrl('assets/3d/solx/shade_s03.glb'),
    note: 'Tall shade component for SOL X system previews.',
  },
  {
    label: 'SOL X Divider',
    path: assetUrl('assets/3d/solx/divider.glb'),
    note: 'Divider component for spacing and modular assembly studies.',
  },
];

export const collectionNotes = {
  originalSol:
    'Discover the modular S0L Lamps, shades, and attachments. Every piece is designed to mix, match, and stack so a lamp can feel personal, playful, and adaptable.',
  solX:
    'SOL X is a preview of the next technology direction: component-based lamp architecture, additive manufacturing workflows, and cleaner digital-to-physical assembly logic.',
};

export const findProductBySlug = (slug) => originalSolProducts.find((product) => product.slug === slug);
