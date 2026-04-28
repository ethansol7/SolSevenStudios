# Sol Seven Studios

Premium studio website for Sol Seven Studios.

Built with Vite, React, Framer Motion, React Three Fiber, Three.js, and Web Audio API. The site uses real Sol Seven product and process assets organized under `public/assets`, plus section-aware ambient audio stems under `public/audio`.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

GitHub Pages deployment is configured through `.github/workflows/deploy.yml`.

## Ambient Music System

The site includes a prompt-based ambient music layer inspired by the functional idea of MusicFX DJ, but it does not scrape, iframe, automate, or copy Google MusicFX DJ. It is an original local stem mixer.

Prompts live in:

```text
src/music/sectionMusicPrompts.js
```

Each section entry controls the label, prompt, keywords, stem folder, intensity, tempo, and texture. Major page sections use `data-music-section` attributes, and `IntersectionObserver` updates the active prompt while visitors scroll.

The floating player lets you:

- play or pause music after user interaction
- adjust volume and mute
- see the active section prompt
- edit prompts locally in the browser
- save test edits to `localStorage`
- copy the updated config back into `sectionMusicPrompts.js`

## Adding Audio Stems

Put loopable stems in the matching folder under:

```text
public/audio/
```

Each folder can include:

```text
pad.mp3
texture.mp3
rhythm.mp3
sparkle.mp3
```

`.wav`, `.ogg`, and `.m4a` are also supported. The current WAV files are lightweight generated starter loops so the feature works immediately. Replace them with polished music loops for a higher-end result.

`public/audio/stemManifest.json` lists available stems. Update it when you replace files, change extensions, or add a new folder.

If a section folder has no matching stems, the player will not crash and will show `No stems loaded for this section`.

## Future AI Music Adapter

`src/music/aiMusicAdapter.js` is the integration point for future AI music generation. Right now it returns local stem paths. A real official AI music API should be called from a backend or serverless function so API keys are never exposed in frontend code or on GitHub Pages.

This will not sound like Google MusicFX DJ unless it is connected to a real AI music model. Today it provides prompt editing, section-based moods, evolving local layers, and smooth transitions using local stems.
