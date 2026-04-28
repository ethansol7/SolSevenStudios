import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pause, Play, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sectionMusicPrompts } from '../music/sectionMusicPrompts.js';
import { MUSIC_PROMPT_STORAGE_KEY, formatPromptsAsConfig, loadPromptOverrides, savePromptOverrides } from '../music/promptStorage.js';
import { useAmbientMusicEngine } from '../music/useAmbientMusicEngine.js';

const promptKeys = Object.keys(sectionMusicPrompts);

const normalizeKeywords = (value) =>
  value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export default function MusicPlayer({ activeSectionKey }) {
  const [prompts, setPrompts] = useState(loadPromptOverrides);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(activeSectionKey in prompts ? activeSectionKey : promptKeys[0]);
  const [copied, setCopied] = useState(false);
  const activeKey = activeSectionKey in prompts ? activeSectionKey : 'home';
  const selectedPrompt = prompts[selectedKey] ?? prompts.home;

  const engine = useAmbientMusicEngine({ prompts, activeSectionKey: activeKey });

  const promptPreview = useMemo(() => {
    const text = engine.activePrompt?.prompt ?? '';
    return text.length > 168 ? `${text.slice(0, 168)}...` : text;
  }, [engine.activePrompt]);

  const updatePrompt = (field, value) => {
    setPrompts((current) => {
      const next = {
        ...current,
        [selectedKey]: {
          ...current[selectedKey],
          [field]: field === 'keywords' ? normalizeKeywords(value) : value,
        },
      };
      savePromptOverrides(next);
      return next;
    });
  };

  const updateNumber = (field, value) => {
    updatePrompt(field, Number(value));
  };

  const resetLocalEdits = () => {
    localStorage.removeItem(MUSIC_PROMPT_STORAGE_KEY);
    setPrompts(JSON.parse(JSON.stringify(sectionMusicPrompts)));
    setCopied(false);
  };

  const copyConfig = async () => {
    const config = formatPromptsAsConfig(prompts);
    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="music-player" aria-label="Ambient music system">
      <div className="music-player__main">
        <button className="music-orb" type="button" onClick={engine.togglePlay} aria-label={engine.isPlaying ? 'Pause ambient music' : 'Play ambient music'}>
          {engine.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>

        <div className="music-player__text">
          <div className="music-player__eyebrow">
            <span>{engine.loading ? 'Loading stems' : engine.status}</span>
          </div>
          <h2>{engine.activePrompt.label}</h2>
          <p>{promptPreview}</p>
          <div className="music-meta-row">
            <span>{engine.activePrompt.texture}</span>
            <span>{engine.activePrompt.tempo} BPM</span>
            <span>{Math.round(engine.activePrompt.intensity * 100)}% intensity</span>
            <span>{engine.loadedStemCount ? `${engine.loadedStemCount} stems` : 'No stems loaded for this section'}</span>
          </div>
        </div>

        <div className="music-player__controls">
          <button type="button" className="music-icon-button" onClick={() => engine.setMuted(!engine.muted)} aria-label={engine.muted ? 'Unmute music' : 'Mute music'}>
            {engine.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <label className="volume-control">
            <span>Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={engine.volume}
              onChange={(event) => engine.setVolume(Number(event.target.value))}
            />
          </label>
          <button type="button" className="music-edit-button" onClick={() => setEditorOpen(true)}>
            <SlidersHorizontal size={16} />
            <span>Edit Music Prompts</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {editorOpen && (
          <motion.div
            className="music-editor"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="music-editor__header">
              <div>
                <p className="section-kicker">Local prompt lab</p>
                <h3>Section music prompts</h3>
              </div>
              <button type="button" className="music-icon-button" onClick={() => setEditorOpen(false)} aria-label="Close music prompt editor">
                <X size={18} />
              </button>
            </div>

            <div className="music-editor__body">
              <label className="music-field">
                <span>Section</span>
                <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                  {Object.keys(prompts).map((key) => (
                    <option key={key} value={key}>
                      {prompts[key].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="music-field">
                <span>Label</span>
                <input value={selectedPrompt.label} onChange={(event) => updatePrompt('label', event.target.value)} />
              </label>

              <label className="music-field music-field--wide">
                <span>Prompt</span>
                <textarea value={selectedPrompt.prompt} onChange={(event) => updatePrompt('prompt', event.target.value)} rows={5} />
              </label>

              <label className="music-field music-field--wide">
                <span>Keywords</span>
                <input value={selectedPrompt.keywords.join(', ')} onChange={(event) => updatePrompt('keywords', event.target.value)} />
              </label>

              <label className="music-field">
                <span>Intensity</span>
                <input min="0" max="1" step="0.01" type="number" value={selectedPrompt.intensity} onChange={(event) => updateNumber('intensity', event.target.value)} />
              </label>

              <label className="music-field">
                <span>Tempo</span>
                <input min="40" max="140" step="1" type="number" value={selectedPrompt.tempo} onChange={(event) => updateNumber('tempo', event.target.value)} />
              </label>

              <label className="music-field">
                <span>Texture</span>
                <input value={selectedPrompt.texture} onChange={(event) => updatePrompt('texture', event.target.value)} />
              </label>

              <div className="music-editor__actions">
                <button type="button" onClick={copyConfig}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied config' : 'Copy config'}</span>
                </button>
                <button type="button" onClick={resetLocalEdits}>
                  Reset local edits
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
