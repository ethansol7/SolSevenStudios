import { assetUrl } from '../content.js';

const STEM_ROLES = ['pad', 'texture', 'rhythm', 'sparkle'];
const STEM_EXTENSIONS = ['wav', 'mp3', 'ogg', 'm4a'];
const stemCache = new Map();
let manifestCache = null;

const normalizeFolder = (folder = '/audio/home/') => {
  const withoutLeadingSlash = folder.replace(/^\/+/, '');
  return withoutLeadingSlash.endsWith('/') ? withoutLeadingSlash : `${withoutLeadingSlash}/`;
};

const probeStem = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

const getStemManifest = async () => {
  if (manifestCache) return manifestCache;

  try {
    const response = await fetch(assetUrl('audio/stemManifest.json'));
    manifestCache = response.ok ? await response.json() : {};
  } catch {
    manifestCache = {};
  }

  return manifestCache;
};

export async function loadMusicStemsForScene(sceneConfig) {
  const folder = normalizeFolder(sceneConfig.audioStemFolder);
  const folderKey = folder.replace(/\/$/, '');
  const cacheKey = folder;

  if (stemCache.has(cacheKey)) {
    return stemCache.get(cacheKey);
  }

  const manifest = await getStemManifest();
  if (Object.prototype.hasOwnProperty.call(manifest, folderKey)) {
    const manifestStems = manifest[folderKey]
      .map((fileName) => {
        const role = STEM_ROLES.find((stemRole) => fileName.startsWith(stemRole));
        return role ? { role, url: assetUrl(`${folder}${fileName}`) } : null;
      })
      .filter(Boolean);

    stemCache.set(cacheKey, manifestStems);
    return manifestStems;
  }

  const stems = [];

  for (const role of STEM_ROLES) {
    for (const extension of STEM_EXTENSIONS) {
      const url = assetUrl(`${folder}${role}.${extension}`);
      if (await probeStem(url)) {
        stems.push({ role, url });
        break;
      }
    }
  }

  stemCache.set(cacheKey, stems);
  return stems;
}

export function clearMusicStemCache() {
  stemCache.clear();
}
