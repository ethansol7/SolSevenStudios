import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

await Promise.all(appRoutes.map(async (route) => {
  const routeDir = path.join(distRoot, ...route.split('/'));
  await mkdir(routeDir, { recursive: true });
  await copyFile(appShell, path.join(routeDir, 'index.html'));
}));

console.log(`Created static entry files for ${appRoutes.length} routes.`);
