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

The site includes a section-aware ambient music layer built as a local stem mixer.

Scene settings live in:

```text
src/music/sectionMusicScenes.js
```

Each section entry controls the label, keywords, stem folder, intensity, tempo, and texture. Major page sections use `data-music-section` attributes, and `IntersectionObserver` updates the active scene while visitors scroll.

The floating player lets visitors play, pause, mute, and adjust volume after user interaction.

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

`.wav`, `.ogg`, and `.m4a` are also supported. Replace the current loops with polished audio when final sound assets are ready.

`public/audio/stemManifest.json` lists available stems. Update it when you replace files, change extensions, or add a new folder.

If a section folder has no matching stems, the player will keep running and show that music layers are unavailable for that section.
