import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pause, Play, SlidersHorizontal, Sprout, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sectionMusicPrompts } from '../music/sectionMusicPrompts.js';
import { MUSIC_PROMPT_STORAGE_KEY, formatPromptsAsConfig, loadPromptOverrides, savePromptOverrides } from '../music/promptStorage.js';
import { useAmbientMusicEngine } from '../music/useAmbientMusicEngine.js';

const promptKeys = Object.keys(sectionMusicPrompts);
const MUSIC_DASHBOARD_COLLAPSED_KEY = 'solseven.musicDashboardCollapsed';

const normalizeKeywords = (value) =>
  value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export default function MusicPlayer({ activeSectionKey }) {
  const [prompts, setPrompts] = useState(loadPromptOverrides);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(MUSIC_DASHBOARD_COLLAPSED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [selectedKey, setSelectedKey] = useState(activeSectionKey in prompts ? activeSectionKey : promptKeys[0]);
  const [copied, setCopied] = useState(false);
  const activeKey = activeSectionKey in prompts ? activeSectionKey : 'home';
  const selectedPrompt = prompts[selectedKey] ?? prompts.home;

  const engine = useAmbientMusicEngine({ prompts, activeSectionKey: activeKey });

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_DASHBOARD_COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // Ignore storage failures; the music engine should keep running.
    }

    if (isCollapsed) {
      setEditorOpen(false);
    }
  }, [isCollapsed]);

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
    <aside className={`music-player${isCollapsed ? ' music-player--collapsed' : ''}`} aria-label="Ambient music system">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.button
            key="plant"
            type="button"
            className={`music-plant-toggle${engine.isPlaying ? ' is-playing' : ''}`}
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsCollapsed(false)}
            aria-label="Open music dashboard"
            aria-expanded="false"
          >
            <Sprout size={25} />
            <span className="visually-hidden">Open music dashboard</span>
          </motion.button>
        ) : (
          <motion.div
            key="dashboard"
            className="music-player__main"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="music-orb" type="button" onClick={engine.togglePlay} aria-label={engine.isPlaying ? 'Pause ambient music' : 'Play ambient music'}>
              {engine.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            <div className="music-player__text">
              <div className="music-player__eyebrow">
                <span>{engine.loading ? 'Loading stems' : engine.status}</span>
              </div>
              <h2>{engine.activePrompt.label}</h2>
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
                <span>Edit Music</span>
              </button>
              <button type="button" className="music-icon-button music-collapse-button" onClick={() => setIsCollapsed(true)} aria-label="Collapse music dashboard">
                <Sprout size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editorOpen && !isCollapsed && (
          <motion.div
            className="music-editor"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="music-editor__header">
              <div>
                <p className="section-kicker">Sound editor</p>
                <h3>Music scenes</h3>
              </div>
              <button type="button" className="music-icon-button" onClick={() => setEditorOpen(false)} aria-label="Close music editor">
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
                <span>Scene direction</span>
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
                  Reset edits
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
