import { assetUrl } from '../content.js';

const lampImage = (name) => assetUrl(`assets/lamps/${name}`);
const plastivistaImage = (name) => assetUrl(`assets/plastivista/${name}`);
const productAsset = (slug, name) => assetUrl(`assets/products/${slug}/${name}`);
const galleryAsset = (name) => assetUrl(`assets/gallery/curated/${name}`);

const galleryImage = (src, caption) => (caption ? { src, caption } : { src });

// Add future product renders by placing files in public/assets/products/<slug>/ and appending the filename here.
const productGalleryFiles = {
  's0l-planter': ['s0l-planter-main.webp', 's0l-planter-gallery-01.webp', 's0l-planter-gallery-02.webp'],
  's04-shade': ['s04-shade-main.webp', 's04-shade-gallery-01.webp', 's04-shade-gallery-02.webp', 's04-shade-gallery-03.webp', 's04-shade-gallery-04.webp', 's04-shade-gallery-05.webp', 's04-shade-gallery-06.webp', 's04-shade-gallery-07.webp', 's04-shade-gallery-08.webp'],
  's04': ['s04-main.webp', 's04-gallery-01.webp', 's04-gallery-02.webp', 's04-gallery-03.webp', 's04-gallery-04.webp', 's04-gallery-05.webp', 's04-gallery-06.webp'],
  's01': ['s01-main.webp', 's01-gallery-01.webp', 's01-gallery-02.webp', 's01-gallery-03.webp', 's01-gallery-04.webp', 's01-gallery-05.webp', 's01-gallery-06.webp'],
  's02': ['s02-main.webp', 's02-gallery-01.webp', 's02-gallery-02.webp', 's02-gallery-03.webp', 's02-gallery-04.webp', 's02-gallery-05.webp', 's02-gallery-06.webp', 's02-gallery-07.webp'],
  's03': ['s03-main.webp', 's03-gallery-01.webp', 's03-gallery-02.webp', 's03-gallery-03.webp', 's03-gallery-04.webp', 's03-gallery-05.webp', 's03-gallery-06.webp', 's03-gallery-07.webp'],
  's0l-combo': ['s0l-combo-main.webp', 's0l-combo-gallery-01.webp', 's0l-combo-gallery-02.webp', 's0l-combo-gallery-03.webp', 's0l-combo-gallery-04.webp', 's0l-combo-gallery-05.webp', 's0l-combo-gallery-06.webp', 's0l-combo-gallery-07.webp', 's0l-combo-gallery-08.webp', 's0l-combo-gallery-09.webp', 's0l-combo-gallery-10.webp', 's0l-combo-gallery-11.webp', 's0l-combo-gallery-12.webp', 's0l-combo-gallery-13.webp'],
  's03-shade': ['s03-shade-main.webp', 's03-shade-gallery-01.webp', 's03-shade-gallery-02.webp', 's03-shade-gallery-03.webp', 's03-shade-gallery-04.webp', 's03-shade-gallery-05.webp', 's03-shade-gallery-06.webp', 's03-shade-gallery-07.webp', 's03-shade-gallery-08.webp'],
  's02-shade': ['s02-shade-main.webp', 's02-shade-gallery-01.webp', 's02-shade-gallery-02.webp', 's02-shade-gallery-03.webp', 's02-shade-gallery-04.webp', 's02-shade-gallery-05.webp', 's02-shade-gallery-06.webp', 's02-shade-gallery-07.webp', 's02-shade-gallery-08.webp'],
  's01-shade': ['s01-shade-main.webp', 's01-shade-gallery-01.webp', 's01-shade-gallery-02.webp', 's01-shade-gallery-03.webp', 's01-shade-gallery-04.webp', 's01-shade-gallery-05.webp', 's01-shade-gallery-06.webp', 's01-shade-gallery-07.webp', 's01-shade-gallery-08.webp'],
};

const productImage = (slug) => productAsset(slug, productGalleryFiles[slug][0]);
const productGallery = (slug) => productGalleryFiles[slug].map((file) => galleryImage(productAsset(slug, file)));

export const solColorOptions = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Orange', value: '#ffa500' },
];

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
  '40W RGB smart bulb for color-changing light and warm white settings.',
  'Sustainable plant-based PETG polymer construction.',
  'SGS certified for UL and CSA on listed lamp builds.',
];

const sharedShadeNotes = [
  'Available in White, Black, and Orange in the current shop.',
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
    image: productImage('s01'),
    gallery: productGallery('s01'),
    colors: solColorOptions,
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
    image: productImage('s02'),
    gallery: productGallery('s02'),
    colors: solColorOptions,
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
    image: productImage('s03'),
    gallery: productGallery('s03'),
    colors: solColorOptions,
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
    image: productImage('s04'),
    gallery: productGallery('s04'),
    colors: solColorOptions,
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
    price: '$15.00',
    image: productImage('s01-shade'),
    gallery: productGallery('s01-shade'),
    colors: solColorOptions,
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
    image: productImage('s02-shade'),
    gallery: productGallery('s02-shade'),
    colors: solColorOptions,
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
    price: '$15.00',
    image: productImage('s03-shade'),
    gallery: productGallery('s03-shade'),
    colors: solColorOptions,
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
    image: productImage('s04-shade'),
    gallery: productGallery('s04-shade'),
    colors: solColorOptions,
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
    image: productImage('s0l-planter'),
    gallery: productGallery('s0l-planter'),
    colors: solColorOptions,
    sourceUrl: 'https://www.solsevenstudios.com/product-page/s0l-planter',
    shortDescription: 'A modular planter add-on that turns unused shades into functional decor.',
    story:
      'The planter extends the SOL system beyond lighting. It keeps unused modules active in the room as desktop objects, storage, or small plant vessels.',
    intent: 'Designed to make modularity useful even when parts are not on a lamp.',
    processNotes: ['Built for S0 shades and attachments.', 'Uses the same playful modular logic as the lighting system.', 'Listed as an add-on in the current shop.'],
  },
  {
    slug: 's0l-combo',
    name: 'S0L Combo',
    category: 'add-ons',
    collection: 'Original SOL Collection',
    price: '$195.00 sale',
    compareAt: '$210.00 regular',
    image: productImage('s0l-combo'),
    gallery: productGallery('s0l-combo'),
    colors: solColorOptions,
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
    partKey: 'base',
    path: assetUrl('models/solx/base.glb'),
    note: 'Primary SOL X foundation component.',
  },
  {
    label: 'SOL X S02',
    partKey: 's02',
    path: assetUrl('models/solx/s02.glb'),
    note: 'Shade module for calm, vertical SOL X stack compositions.',
  },
  {
    label: 'SOL X S03',
    partKey: 's03',
    path: assetUrl('models/solx/s03.glb'),
    note: 'Tall shade module for a softer, more architectural profile.',
  },
  {
    label: 'SOL X S04',
    partKey: 's04',
    path: assetUrl('models/solx/s04.glb'),
    note: 'New shade module for extended, more expressive stack builds.',
  },
  {
    label: 'SOL X Divider',
    partKey: 'divider',
    path: assetUrl('models/solx/divider.glb'),
    note: 'Slim connector layer that separates two shade modules.',
  },
];

export const collectionNotes = {
  originalSol:
    'Discover the modular S0L Lamps, shades, and attachments. Every piece is designed to mix, match, and stack so a lamp can feel personal, playful, and adaptable.',
  solX:
    'SOL X is a preview of the next technology direction: component-based lamp architecture, additive manufacturing workflows, and cleaner digital-to-physical assembly logic.',
};

export const siteGallerySections = [
  {
    title: 'Studio',
    items: [
      galleryImage(galleryAsset('studio-product-family-01.jpg'), 'Original SOL family study.'),
      galleryImage(galleryAsset('studio-system-wide-01.png'), 'Modular lamp system study.'),
      galleryImage(galleryAsset('studio-sol-collection-02.png'), 'Studio arrangement with shade, lamp, and add-on forms.'),
    ],
  },
  {
    title: 'Living Spaces',
    items: [
      galleryImage(galleryAsset('living-space-sol-system-01.png'), 'SOL lamps in a calm interior setting.'),
      galleryImage(galleryAsset('living-space-sol-collection-01.png'), 'Warm room composition with modular floor and table forms.'),
      galleryImage(lampImage('sol-gallery-b.png'), 'Sculptural SOL lighting in a residential setting.'),
    ],
  },
  {
    title: 'Bedrooms',
    items: [
      galleryImage(galleryAsset('bedroom-sol-collection-01.png'), 'Soft bedside-scale SOL arrangement.'),
      galleryImage(lampImage('homepage-sol-feature.png'), 'Low, warm modular light study.'),
      galleryImage(galleryAsset('living-space-sol-system-01.png'), 'Quiet room setting with modular silhouettes.'),
    ],
  },
  {
    title: 'Details',
    items: [
      galleryImage(galleryAsset('detail-modular-lamp-01.png'), 'Vertical module and shade detail.'),
      galleryImage(galleryAsset('detail-shade-study-01.png'), 'Shade profile and diffusion study.'),
      galleryImage(plastivistaImage('homepage-process-sequence.png'), 'Circular production workflow.'),
    ],
  },
];

export const findProductBySlug = (slug) => originalSolProducts.find((product) => product.slug === slug);
