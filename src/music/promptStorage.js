import { sectionMusicPrompts } from './sectionMusicPrompts.js';

export const MUSIC_PROMPT_STORAGE_KEY = 'solseven.musicPrompts.v1';

export const clonePrompts = (prompts) => JSON.parse(JSON.stringify(prompts));

export const loadPromptOverrides = () => {
  try {
    const stored = localStorage.getItem(MUSIC_PROMPT_STORAGE_KEY);
    if (!stored) return clonePrompts(sectionMusicPrompts);
    return {
      ...clonePrompts(sectionMusicPrompts),
      ...JSON.parse(stored),
    };
  } catch {
    return clonePrompts(sectionMusicPrompts);
  }
};

export const savePromptOverrides = (prompts) => {
  localStorage.setItem(MUSIC_PROMPT_STORAGE_KEY, JSON.stringify(prompts));
};

export const formatPromptsAsConfig = (prompts) => {
  const body = JSON.stringify(prompts, null, 2);
  return `export const sectionMusicPrompts = ${body};\n`;
};
