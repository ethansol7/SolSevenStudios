# Sol Seven Studios Ambient Music Stems

Place loopable audio stems in these section folders:

```text
public/audio/home/
public/audio/studio/
public/audio/sol-lamp/
public/audio/sol-x/
public/audio/plastivista/
public/audio/revo-chair/
public/audio/sol-wheel/
public/audio/process/
public/audio/dram/
public/audio/capabilities/
public/audio/icff/
public/audio/contact/
```

Each folder can contain any of these stem names:

```text
pad.mp3
texture.mp3
rhythm.mp3
sparkle.mp3
```

The adapter also accepts `.wav`, `.ogg`, and `.m4a` versions of those names. The current `.wav` files are simple generated starter loops so the system can be tested immediately. Replace them with higher quality loopable stems when you have final audio.

`stemManifest.json` lists the stems currently available in each folder. Update it when you replace the starter files or add a new section folder. If a folder is intentionally empty, set its manifest entry to an empty array.

The music prompts live in `src/music/sectionMusicPrompts.js`. The in-site editor saves local test edits to `localStorage` and can copy an updated config block that you can paste back into that file.

This does not sound like Google MusicFX DJ because it is not connected to a real AI music generation model. It is an original local stem mixer that uses prompts as editable direction, then crossfades section-based audio layers. To connect a future official AI music API, use `src/music/aiMusicAdapter.js` as the integration point and call the provider from a backend or serverless function. Do not put API keys in frontend code or ship them on GitHub Pages.
