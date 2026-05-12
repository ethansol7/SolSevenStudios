import { assetUrl } from '../content.js';

const lampImage = (name) => assetUrl(`assets/lamps/${name}`);
const plastivistaImage = (name) => assetUrl(`assets/plastivista/${name}`);
const productAsset = (slug, name) => assetUrl(`assets/products/${slug}/${name}`);
const galleryAsset = (name) => assetUrl(`assets/gallery/curated/${name}`);
const fallbackProductImage = assetUrl('assets/products/product-art.svg');

const galleryImage = (src, caption) => (caption ? { src, caption } : { src });

export const stripePaymentLinks = {
  s01: 'STRIPE_LINK_S01',
  s02: 'STRIPE_LINK_S02',
  s03: 'STRIPE_LINK_S03',
  s04: 'STRIPE_LINK_S04',
  s01Shade: 'STRIPE_LINK_S01_SHADE',
  s02Shade: 'STRIPE_LINK_S02_SHADE',
  s03Shade: 'STRIPE_LINK_S03_SHADE',
  s04Shade: 'STRIPE_LINK_S04_SHADE',
  base: 'STRIPE_LINK_BASE',
  divider: 'STRIPE_LINK_DIVIDER',
  planter: 'STRIPE_LINK_PLANTER',
  accessoryKit: 'STRIPE_LINK_ACCESSORY_KIT',
  magneticClip: 'STRIPE_LINK_MAGNETIC_CLIP',
  s0lCombo: 'STRIPE_LINK_S0L_COMBO',
};

const productGalleryFiles = {
  's0l-planter': ['s0l-planter-main.webp', 's0l-planter-gallery-01.webp', 's0l-planter-gallery-02.webp'],
  's04-shade': ['s04-shade-main.webp', 's04-shade-gallery-01.webp', 's04-shade-gallery-02.webp', 's04-shade-gallery-03.webp', 's04-shade-gallery-04.webp', 's04-shade-gallery-05.webp', 's04-shade-gallery-06.webp', 's04-shade-gallery-07.webp', 's04-shade-gallery-08.webp'],
  s04: ['s04-main.webp', 's04-gallery-01.webp', 's04-gallery-02.webp', 's04-gallery-03.webp', 's04-gallery-04.webp', 's04-gallery-05.webp', 's04-gallery-06.webp'],
  's03-shade': ['s03-shade-main.webp', 's03-shade-gallery-01.webp', 's03-shade-gallery-02.webp', 's03-shade-gallery-03.webp', 's03-shade-gallery-04.webp', 's03-shade-gallery-05.webp', 's03-shade-gallery-06.webp', 's03-shade-gallery-07.webp', 's03-shade-gallery-08.webp'],
  s03: ['s03-main.webp', 's03-gallery-01.webp', 's03-gallery-02.webp', 's03-gallery-03.webp', 's03-gallery-04.webp', 's03-gallery-05.webp', 's03-gallery-06.webp', 's03-gallery-07.webp'],
  's02-shade': ['s02-shade-main.webp', 's02-shade-gallery-01.webp', 's02-shade-gallery-02.webp', 's02-shade-gallery-03.webp', 's02-shade-gallery-04.webp', 's02-shade-gallery-05.webp', 's02-shade-gallery-06.webp', 's02-shade-gallery-07.webp', 's02-shade-gallery-08.webp'],
  s02: ['s02-main.webp', 's02-gallery-01.webp', 's02-gallery-02.webp', 's02-gallery-03.webp', 's02-gallery-04.webp', 's02-gallery-05.webp', 's02-gallery-06.webp', 's02-gallery-07.webp'],
  's01-shade': ['s01-shade-main.webp', 's01-shade-gallery-01.webp', 's01-shade-gallery-02.webp', 's01-shade-gallery-03.webp', 's01-shade-gallery-04.webp', 's01-shade-gallery-05.webp', 's01-shade-gallery-06.webp', 's01-shade-gallery-07.webp', 's01-shade-gallery-08.webp'],
  s01: ['s01-main.webp', 's01-gallery-01.webp', 's01-gallery-02.webp', 's01-gallery-03.webp', 's01-gallery-04.webp', 's01-gallery-05.webp', 's01-gallery-06.webp'],
  's0l-combo': ['s0l-combo-main.webp', 's0l-combo-gallery-01.webp', 's0l-combo-gallery-02.webp', 's0l-combo-gallery-03.webp', 's0l-combo-gallery-04.webp', 's0l-combo-gallery-05.webp', 's0l-combo-gallery-06.webp', 's0l-combo-gallery-07.webp', 's0l-combo-gallery-08.webp', 's0l-combo-gallery-09.webp', 's0l-combo-gallery-10.webp', 's0l-combo-gallery-11.webp', 's0l-combo-gallery-12.webp', 's0l-combo-gallery-13.webp'],
};

const productImage = (slug) => {
  const files = productGalleryFiles[slug];
  return files?.[0] ? productAsset(slug, files[0]) : fallbackProductImage;
};

const productGallery = (slug) => {
  const files = productGalleryFiles[slug];
  return files?.length ? files.map((file) => galleryImage(productAsset(slug, file))) : [galleryImage(fallbackProductImage)];
};

export const solColorOptions = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Orange', value: '#ffa500' },
];

export const productCategories = [
  {
    id: 'table-lights',
    label: 'Table Lights',
    description: 'Complete S0L lamp builds with base, shade, magnetic clips, and smart RGB lighting.',
  },
  {
    id: 'shades',
    label: 'Shades',
    description: 'Stackable S0L shades for changing light diffusion, silhouette, and functional add-on use.',
  },
  {
    id: 'add-ons',
    label: 'Combos and Add-Ons',
    description: 'Planters, bases, dividers, clips, kits, and bundles for extending the modular S0L ecosystem.',
  },
];

const swapAndSnapDetail = {
  title: 'Modular "Swap & Snap" System',
  description:
    "The S0L Lamp's modular ecosystem allows you to build, swap, and evolve your lamp over time. Thanks to the magnetically attached shades and bases, users can mix and match designs effortlessly, whether stacking multiple shades for a tower-like build or swapping covers to change the light diffusion. With additional attachments, unused shades can become functional decor, serving as planters, storage cups, or sculptural accents when not on the lamp.",
};

const lampDetails = [
  swapAndSnapDetail,
  { title: 'Brightness', description: '40W RGB Smart Bulb (Color Changing + Warm White)' },
  { title: 'Material', description: 'Sustainable plant-based polymers (PETG)' },
  { title: 'Certified', description: 'SGS for UL and CSA' },
];

const shadeDetails = [
  { title: 'Available in 3 colors', description: 'White, Black, and Orange.' },
  { title: 'Material', description: 'Sustainable plant-based polymers (PETG)' },
];

const makeCsvProduct = ({
  slug,
  name,
  category,
  collection,
  price,
  description,
  stripePaymentLink,
  details,
  colors = solColorOptions,
  inventory = 'InStock',
}) => ({
  slug,
  name,
  category,
  collection,
  price,
  image: productImage(slug),
  gallery: productGallery(slug),
  colors,
  inventory,
  stripePaymentLink,
  description,
  shortDescription: description,
  additionalInfo: details,
});

export const originalSolProducts = [
  makeCsvProduct({
    slug: 's0l-planter',
    name: 'S0L Planter',
    category: 'add-ons',
    collection: 'Combos',
    price: '$25.00',
    stripePaymentLink: stripePaymentLinks.planter,
    description:
      "A playful extension of the S0L ecosystem, the S0L Planter transforms any shade into functional decor. Designed to fit perfectly with S01, S02, S03, and S04 components, it lets you repurpose your unused lamp parts into vibrant homes for small plants, succulents, or desktop greenery. Whether you're stacking it onto a base or displaying it solo, the S0L Planter adds life and versatility to your space.",
    details: [
      {
        title: 'Modular "Swap & Snap" System',
        description:
          "The S0L Planter uses the same magnetic connection system as your S0 Lamp, allowing it to integrate directly with existing bases and shades. Simply attach it to the top of a shade or place it on its own for a standalone planter. It's a zero-waste way to evolve your setup without buying entirely new parts.",
      },
      { title: 'Material', description: 'Sustainable plant-based polymers (PETG)' },
      { title: 'Size', description: 'Fits standard S0L shades (S01 to S04)' },
    ],
  }),
  makeCsvProduct({
    slug: 's04-shade',
    name: 'S04 Shade',
    category: 'shades',
    collection: 'Shades',
    price: '$15.00',
    stripePaymentLink: stripePaymentLinks.s04Shade,
    description:
      'A bold geometric profile meets functional modularity in the S04 Shade. Designed to make a visual statement whether used solo or stacked, it introduces a fresh silhouette to the S0 family. Its interlocking form supports upward expansion and pairs seamlessly with all S0 magnetic clips.',
    details: shadeDetails,
  }),
  makeCsvProduct({
    slug: 's04',
    name: 'S04',
    category: 'table-lights',
    collection: 'Table Lights',
    price: '$70.00',
    stripePaymentLink: stripePaymentLinks.s04,
    description:
      'A striking evolution in the S0 series, the S04 Lamp embraces clean geometry and layered depth to create a powerful sculptural presence. With its sharp yet balanced proportions, S04 brings visual rhythm to any space whether standing solo or stacked. Paired with a 40W RGB smart bulb, the lamp allows you to transition from focused white light to ambient color, making it an adaptable centerpiece for creative or calming environments.',
    details: lampDetails,
  }),
  makeCsvProduct({
    slug: 's03-shade',
    name: 'S03 Shade',
    category: 'shades',
    collection: 'Shades',
    price: '$15.00',
    stripePaymentLink: stripePaymentLinks.s03Shade,
    description:
      'Defined by its wide dome and gentle form, the S03 Shade creates warm, even lighting while bringing sculptural volume to your lamp. On its own, it is ideal for low-profile bases. When stacked, it anchors taller builds with balance and depth. It also doubles as a standalone container, proving beauty can be functional too.',
    details: shadeDetails,
  }),
  makeCsvProduct({
    slug: 's03',
    name: 'S03',
    category: 'table-lights',
    collection: 'Table Lights',
    price: '$70.00',
    stripePaymentLink: stripePaymentLinks.s03,
    description:
      "A refined blend of modern aesthetics and functional warmth, the S03 Lamp is designed for those who seek an elegant yet inviting lighting experience. Its organic silhouette and plant-based polymer construction make it a sustainable statement piece for any space. Equipped with a 40W RGB bulb, S03 lets you switch between vibrant colors and warm white tones, perfect for setting the mood, whether you're working, relaxing, or creating.",
    details: lampDetails,
  }),
  makeCsvProduct({
    slug: 's02-shade',
    name: 'S02 Shade',
    category: 'shades',
    collection: 'Shades',
    price: '$15.00',
    stripePaymentLink: stripePaymentLinks.s02Shade,
    description:
      'With soft curvature and a clean profile, the S02 Shade offers a modern alternative for diffuse, ambient lighting. Whether placed on a base or layered between other modules, it adds calm visual weight to your setup. Like all S0 components, it is made from durable, recyclable PETG and built to evolve with your space.',
    details: shadeDetails,
  }),
  makeCsvProduct({
    slug: 's02',
    name: 'S02',
    category: 'table-lights',
    collection: 'Table Lights',
    price: '$70.00',
    stripePaymentLink: stripePaymentLinks.s02,
    description:
      'Bridging minimalism and versatility, the S02 Lamp is designed to illuminate entire spaces without overwhelming them. Its sculptural form integrates seamlessly into any setting, while the 40W RGB bulb allows you to customize lighting with millions of colors and adjustable brightness. Whether casting a bold hue for creative inspiration or a soft glow for evening relaxation, S02 adapts to your lifestyle.',
    details: lampDetails,
  }),
  makeCsvProduct({
    slug: 's01-shade',
    name: 'S01 Shade',
    category: 'shades',
    collection: 'Shades',
    price: '$15.00',
    stripePaymentLink: stripePaymentLinks.s01Shade,
    description:
      'Minimal yet unmistakable, the S01 Shade serves as the foundation of the S0 system. Its simple geometry makes it perfect for stacking, while its open base allows it to double as a desktop planter. Designed for use with any S0 base or clip, the S01 Shade is where modular lighting begins.',
    details: shadeDetails,
  }),
  makeCsvProduct({
    slug: 's01',
    name: 'S01',
    category: 'table-lights',
    collection: 'Table Lights',
    price: '$70.00',
    stripePaymentLink: stripePaymentLinks.s01,
    description:
      'A bold take on contemporary lighting, the S01 Lamp redefines everyday illumination with its sculptural presence and customizable glow. Designed for both ambiance and function, it features a 40W RGB smart bulb, allowing you to shift between crisp white light and dynamic colors to match your mood.',
    details: lampDetails,
  }),
  makeCsvProduct({
    slug: 's0l-combo',
    name: 'S0L Combo',
    category: 'add-ons',
    collection: 'Combos',
    price: '$210.00',
    stripePaymentLink: stripePaymentLinks.s0lCombo,
    description:
      "The ultimate modular lighting collection. The S0 Combo includes the full S01, S02, and S03 lamps, each with its own RGB smart bulb, modular base, and matching shade. With included magnetic clips and two extra shades, this bundle gives you the freedom to stack, swap, and sculpt your lighting across multiple rooms or creative setups. It's the most versatile and expressive way to experience the full S0 system.",
    details: lampDetails,
  }),
  // TODO: Add S0L Divider product image/gallery when final product images are available.
  makeCsvProduct({
    slug: 's0l-divider',
    name: 'S0L Divider',
    category: 'add-ons',
    collection: 'Accessories',
    price: '$15.00',
    stripePaymentLink: stripePaymentLinks.divider,
    description: 'Divider module for separating compatible S0L shade modules in a stacked lamp build.',
    details: [
      { title: 'Use', description: 'Designed for compatible stacked S0L shade assemblies.' },
      { title: 'Material', description: 'Sustainable plant-based polymers (PETG)' },
    ],
  }),
  // TODO: Add S0L Base product image/gallery when final product images are available.
  makeCsvProduct({
    slug: 's0l-base',
    name: 'S0L Base',
    category: 'add-ons',
    collection: 'Accessories',
    price: '$55.00',
    stripePaymentLink: stripePaymentLinks.base,
    description: 'Foundation module for compatible S0L lamp builds.',
    details: [
      { title: 'Use', description: 'Designed as the base component for compatible S0L lamp assemblies.' },
      { title: 'Material', description: 'Sustainable plant-based polymers (PETG)' },
    ],
  }),
  // TODO: Add S0L Accessory Kit product image/gallery when final product images are available.
  makeCsvProduct({
    slug: 's0l-accessory-kit',
    name: 'S0L Accessory Kit',
    category: 'add-ons',
    collection: 'Accessories',
    price: 'Price pending',
    stripePaymentLink: stripePaymentLinks.accessoryKit,
    description: 'Accessory bundle for compatible S0L lamp components.',
    details: [
      { title: 'Use', description: 'Designed for maintaining and adapting compatible S0L assemblies.' },
      { title: 'Compatibility', description: 'Compatible S0L components.' },
    ],
  }),
  // TODO: Add S0L Magnetic Clip product image/gallery when final product images are available.
  makeCsvProduct({
    slug: 's0l-magnetic-clip',
    name: 'S0L Magnetic Clip',
    category: 'add-ons',
    collection: 'Accessories',
    price: 'Price pending',
    stripePaymentLink: stripePaymentLinks.magneticClip,
    description: 'Magnetic connection hardware for compatible S0L components.',
    details: [
      { title: 'Use', description: 'Designed for attaching and stacking compatible S0L modules.' },
      { title: 'Compatibility', description: 'Compatible S0L components.' },
    ],
  }),
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
