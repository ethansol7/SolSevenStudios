import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyRouteMap } from '../src/legacyRoutes.js';

const siteBaseUrl = 'https://SolSevenStudios.com';
const defaultImageUrl = `${siteBaseUrl}/assets/lamps/homepage-hero.png`;

const productSlugs = [
  's01',
  's02',
  's03',
  's04',
  's01-shade',
  's02-shade',
  's03-shade',
  's04-shade',
  's0l-planter',
  's0l-combo',
  's0l-base',
  's0l-divider',
  's0l-accessory-kit',
  's0l-magnetic-clip',
];

const routeMetadata = {
  shop: {
    title: 'Shop Modular Lighting | Sol Seven Studios',
    description: 'Shop the Sol Seven Studios Original SOL collection, modular shades, lamp components, and system add-ons with Stripe checkout.',
  },
  'shop/original-sol': {
    title: 'Original SOL Collection | Sol Seven Studios',
    description: 'Explore the Original SOL modular lamp collection from Sol Seven Studios, including lamps, shades, combos, and accessories.',
  },
  gallery: {
    title: 'Gallery | Sol Seven Studios',
    description: 'View Sol Seven Studios product, material, and modular lighting gallery images across studio, room, and detail settings.',
  },
  'sol-x': {
    title: 'SOL X System | Sol Seven Studios',
    description: 'Preview the SOL X modular lighting system and component language from Sol Seven Studios.',
  },
  'solx-configurator': {
    title: 'SOL X Configurator | Sol Seven Studios',
    description: 'Configure a SOL X modular lighting system with live component previews and pricing context.',
  },
  plastivista: {
    title: 'PlastiVista Circular Manufacturing | Sol Seven Studios',
    description: 'Explore PlastiVista, a Sol Seven Studios circular manufacturing workflow for material processing, additive production, and product storytelling.',
  },
  about: {
    title: 'About Sol Seven Studios',
    description: 'Learn about Sol Seven Studios, a New York product design studio developing modular lighting, furniture, and circular manufacturing systems.',
  },
  contact: {
    title: 'Contact Sol Seven Studios',
    description: 'Contact Sol Seven Studios for product inquiries, collaborations, custom work, and modular lighting questions.',
  },
};

const productMetadata = {
  s01: ['S01 | Sol Seven Studios', 'S01 is a modular Sol Seven Studios lamp with sculptural form, RGB smart lighting, and swappable S0L components.'],
  s02: ['S02 | Sol Seven Studios', 'S02 is a modular Sol Seven Studios lamp for diffuse room lighting, RGB color, and adaptable S0L shade configurations.'],
  s03: ['S03 | Sol Seven Studios', 'S03 is a modular Sol Seven Studios lamp with an organic shade profile, warm diffusion, and RGB smart lighting.'],
  s04: ['S04 | Sol Seven Studios', 'S04 is a modular Sol Seven Studios lamp with geometric stacked form, RGB smart lighting, and S0L compatibility.'],
  's01-shade': ['S01 Shade | Sol Seven Studios', 'S01 Shade is a modular S0L shade for stacking, swapping, and building compatible Sol Seven Studios lamp setups.'],
  's02-shade': ['S02 Shade | Sol Seven Studios', 'S02 Shade is a soft-profile modular S0L shade for diffuse lighting and compatible Sol Seven Studios builds.'],
  's03-shade': ['S03 Shade | Sol Seven Studios', 'S03 Shade is a wide dome modular S0L shade for warm diffusion, stacking, and compatible lamp configurations.'],
  's04-shade': ['S04 Shade | Sol Seven Studios', 'S04 Shade is a bold geometric S0L shade for modular stacking and compatible Sol Seven Studios lamp builds.'],
  's0l-planter': ['S0L Planter | Sol Seven Studios', 'S0L Planter repurposes compatible S0L shade modules into planters, desktop greenery, and modular decor.'],
  's0l-combo': ['S0L Combo | Sol Seven Studios', 'S0L Combo bundles multiple Sol Seven Studios modular lamps, shades, bases, clips, and RGB smart bulbs.'],
  's0l-base': ['S0L Base | Sol Seven Studios', 'S0L Base is the foundation module for compatible Sol Seven Studios lamp assemblies.'],
  's0l-divider': ['S0L Divider | Sol Seven Studios', 'S0L Divider separates compatible S0L shade modules in stacked Sol Seven Studios lamp builds.'],
  's0l-accessory-kit': ['S0L Accessory Kit | Sol Seven Studios', 'S0L Accessory Kit supports compatible Sol Seven Studios modular lamp assemblies and component adaptation.'],
  's0l-magnetic-clip': ['S0L Magnetic Clip | Sol Seven Studios', 'S0L Magnetic Clip is connection hardware for compatible Sol Seven Studios modular lamp components.'],
};

const appRoutes = [
  'shop',
  'shop/original-sol',
  'gallery',
  'sol-x',
  'solx-configurator',
  'plastivista',
  'about',
  'contact',
  ...productSlugs.map((slug) => `product/${slug}`),
];

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const appShell = path.join(distRoot, 'index.html');
const appShellHtml = await readFile(appShell, 'utf8');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const metadataForRoute = (route) => {
  if (route.startsWith('product/')) {
    const slug = route.replace('product/', '');
    const [title, description] = productMetadata[slug] ?? ['Sol Seven Studios Product', 'Explore modular lighting products from Sol Seven Studios.'];
    return { title, description };
  }

  return routeMetadata[route] ?? {
    title: 'Sol Seven Studios | Modular Lighting and Circular Design',
    description: 'Sol Seven Studios designs modular lighting systems, furniture, circular manufacturing systems, and future focused production workflows.',
  };
};

const routeUrl = (route) => (route ? `${siteBaseUrl}/${route}/` : `${siteBaseUrl}/`);

const upsertMetaTag = (html, selector, replacement) => {
  const patterns = {
    description: /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    ogTitle: /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    ogDescription: /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    ogUrl: /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    ogImage: /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    twitterTitle: /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    twitterDescription: /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    twitterImage: /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    canonical: /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
  };

  return patterns[selector].test(html)
    ? html.replace(patterns[selector], replacement)
    : html.replace('</head>', `    ${replacement}\n  </head>`);
};

const withRouteMetadata = (html, route) => {
  const { title, description } = metadataForRoute(route);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(routeUrl(route));
  const safeImage = escapeHtml(defaultImageUrl);

  let nextHtml = html.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
  nextHtml = upsertMetaTag(nextHtml, 'description', `<meta name="description" content="${safeDescription}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'ogTitle', `<meta property="og:title" content="${safeTitle}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'ogDescription', `<meta property="og:description" content="${safeDescription}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'ogUrl', `<meta property="og:url" content="${safeUrl}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'ogImage', `<meta property="og:image" content="${safeImage}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'twitterTitle', `<meta name="twitter:title" content="${safeTitle}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'twitterDescription', `<meta name="twitter:description" content="${safeDescription}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'twitterImage', `<meta name="twitter:image" content="${safeImage}" />`);
  nextHtml = upsertMetaTag(nextHtml, 'canonical', `<link rel="canonical" href="${safeUrl}" />`);

  return nextHtml;
};

await Promise.all(appRoutes.map(async (route) => {
  const routeDir = path.join(distRoot, ...route.split('/'));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), withRouteMetadata(appShellHtml, route));
}));

await Promise.all(Object.entries(legacyRouteMap).map(async ([fromRoute, targetRoute]) => {
  const normalizedFromRoute = fromRoute.replace(/^\/+/, '');
  const normalizedTargetRoute = targetRoute.replace(/^\/+/, '');
  const routeDir = path.join(distRoot, ...normalizedFromRoute.split('/'));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, 'index.html'), withRouteMetadata(appShellHtml, normalizedTargetRoute));
}));

const sitemapRoutes = ['', ...appRoutes];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes.map((route) => `  <url>
    <loc>${escapeHtml(routeUrl(route))}</loc>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(path.join(distRoot, 'sitemap.xml'), sitemapXml);

console.log(`Created static entry files for ${appRoutes.length} routes and ${Object.keys(legacyRouteMap).length} compatibility routes.`);
