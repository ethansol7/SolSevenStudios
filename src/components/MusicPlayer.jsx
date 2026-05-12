import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Sprout, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sectionMusicScenes } from '../music/sectionMusicScenes.js';
import { useAmbientMusicEngine } from '../music/useAmbientMusicEngine.js';

const MUSIC_DASHBOARD_COLLAPSED_KEY = 'solseven.musicDashboardCollapsed';

export default function MusicPlayer({ activeSectionKey }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(MUSIC_DASHBOARD_COLLAPSED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const activeKey = activeSectionKey in sectionMusicScenes ? activeSectionKey : 'home';

  const engine = useAmbientMusicEngine({ scenes: sectionMusicScenes, activeSectionKey: activeKey });

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_DASHBOARD_COLLAPSED_KEY, String(isCollapsed));
    } catch {
      // Ignore storage failures; the music engine should keep running.
    }
  }, [isCollapsed]);

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
                <span>{engine.loading ? 'Loading music' : engine.status}</span>
              </div>
              <h2>{engine.activeScene.label}</h2>
              <div className="music-meta-row">
                <span>{engine.activeScene.texture}</span>
                <span>{engine.activeScene.tempo} BPM</span>
                <span>{Math.round(engine.activeScene.intensity * 100)}% intensity</span>
                <span>{engine.loadedStemCount ? `${engine.loadedStemCount} music layers` : 'Music layers unavailable'}</span>
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
              <button type="button" className="music-icon-button music-collapse-button" onClick={() => setIsCollapsed(true)} aria-label="Collapse music dashboard">
                <Sprout size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
