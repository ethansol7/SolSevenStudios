import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateMusicFromPrompt } from './aiMusicAdapter.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const fadeTime = 2.4;

const layerBaseGain = {
  pad: 0.58,
  texture: 0.38,
  rhythm: 0.28,
  sparkle: 0.22,
};

const intensityLayerCount = (intensity) => {
  if (intensity >= 0.5) return 4;
  if (intensity >= 0.38) return 3;
  if (intensity >= 0.28) return 2;
  return 1;
};

const getPrompt = (prompts, key) => prompts[key] ?? prompts.home ?? Object.values(prompts)[0];

const rampGain = (gainNode, target, context, seconds = fadeTime) => {
  const now = context.currentTime;
  const current = gainNode.gain.value;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(current, now);
  gainNode.gain.linearRampToValueAtTime(target, now + seconds);
};

export function useAmbientMusicEngine({ prompts, activeSectionKey }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.42);
  const [status, setStatus] = useState('Press play to begin.');
  const [loadedStemCount, setLoadedStemCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const contextRef = useRef(null);
  const masterGainRef = useRef(null);
  const sectionBanksRef = useRef(new Map());
  const activeBankKeyRef = useRef(null);
  const isPlayingRef = useRef(false);
  const promptsRef = useRef(prompts);
  const activeSectionRef = useRef(activeSectionKey);

  const activePrompt = useMemo(() => getPrompt(prompts, activeSectionKey), [activeSectionKey, prompts]);

  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  useEffect(() => {
    activeSectionRef.current = activeSectionKey;
  }, [activeSectionKey]);

  const ensureContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setStatus('Web Audio is not available in this browser.');
      return null;
    }

    const context = new AudioContext();
    const masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(context.destination);
    contextRef.current = context;
    masterGainRef.current = masterGain;
    return context;
  }, [muted, volume]);

  const createBank = useCallback(
    async (sectionKey) => {
      if (sectionBanksRef.current.has(sectionKey)) return sectionBanksRef.current.get(sectionKey);

      const context = ensureContext();
      const masterGain = masterGainRef.current;
      const prompt = getPrompt(promptsRef.current, sectionKey);
      if (!context || !masterGain || !prompt) return null;

      setLoading(true);
      const stems = await generateMusicFromPrompt(prompt);
      setLoading(false);

      const bankGain = context.createGain();
      bankGain.gain.value = 0;
      bankGain.connect(masterGain);

      const bank = {
        sectionKey,
        prompt,
        bankGain,
        layers: [],
        loaded: 0,
      };

      const decodedLayers = await Promise.all(
        stems.map(async (stem, index) => {
          try {
            const response = await fetch(stem.url);
            if (!response.ok) return null;

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            const source = context.createBufferSource();
            const gain = context.createGain();
            const offset = Math.random() * Math.max(audioBuffer.duration - 0.1, 0);

            source.buffer = audioBuffer;
            source.loop = true;
            gain.gain.value = 0;
            source.connect(gain);
            gain.connect(bankGain);
            source.start(context.currentTime + 0.02, offset);

            return {
              ...stem,
              source,
              gain,
              index,
            };
          } catch {
            return null;
          }
        }),
      );

      bank.layers = decodedLayers.filter(Boolean);
      bank.loaded = bank.layers.length;

      sectionBanksRef.current.set(sectionKey, bank);
      return bank;
    },
    [ensureContext],
  );

  const shapeBankLayers = useCallback((bank, prompt = bank.prompt) => {
    const context = contextRef.current;
    if (!context) return;

    const activeLayerCount = intensityLayerCount(prompt.intensity);

    bank.layers.forEach((layer, index) => {
      const base = layerBaseGain[layer.role] ?? 0.24;
      const randomLift = 0.84 + Math.random() * 0.28;
      const roleBoost = layer.role === 'rhythm' ? clamp(prompt.tempo / 90, 0.7, 1.12) : 1;
      const target = index < activeLayerCount ? base * clamp(prompt.intensity + 0.36, 0.38, 0.92) * randomLift * roleBoost : 0;
      rampGain(layer.gain, target, context, 3.8 + Math.random() * 2.2);
    });
  }, []);

  const transitionToSection = useCallback(
    async (sectionKey) => {
      if (!isPlayingRef.current) return;

      const context = ensureContext();
      if (!context) return;
      if (context.state === 'suspended') await context.resume();

      const bank = await createBank(sectionKey);
      if (!bank) return;

      activeBankKeyRef.current = sectionKey;
      setLoadedStemCount(bank.loaded);

      if (!bank.loaded) {
        setStatus(`No stems loaded for this section: ${bank.prompt.label}`);
      } else {
        setStatus(`Playing ${bank.prompt.label}`);
      }

      sectionBanksRef.current.forEach((candidate, candidateKey) => {
        if (candidateKey === sectionKey) {
          rampGain(candidate.bankGain, candidate.loaded ? 1 : 0, context, fadeTime);
          shapeBankLayers(candidate, getPrompt(promptsRef.current, sectionKey));
        } else {
          rampGain(candidate.bankGain, 0, context, fadeTime);
        }
      });
    },
    [createBank, ensureContext, shapeBankLayers],
  );

  const play = useCallback(async () => {
    const context = ensureContext();
    if (context?.state === 'suspended') await context.resume();
    isPlayingRef.current = true;
    setIsPlaying(true);
    await transitionToSection(activeSectionRef.current);
  }, [ensureContext, transitionToSection]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    const context = contextRef.current;
    if (!context) return;

    sectionBanksRef.current.forEach((bank) => {
      rampGain(bank.bankGain, 0, context, 0.8);
    });
    window.setTimeout(() => {
      if (!isPlayingRef.current && context.state === 'running') void context.suspend();
    }, 900);
    setStatus('Paused.');
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      void play();
    }
  }, [pause, play]);

  useEffect(() => {
    if (isPlaying) void transitionToSection(activeSectionKey);
  }, [activeSectionKey, isPlaying, transitionToSection]);

  useEffect(() => {
    const context = contextRef.current;
    const masterGain = masterGainRef.current;
    if (!context || !masterGain) return;

    rampGain(masterGain, muted ? 0 : volume, context, 0.35);
  }, [muted, volume]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const interval = window.setInterval(() => {
      const key = activeBankKeyRef.current;
      const bank = key ? sectionBanksRef.current.get(key) : null;
      if (bank) shapeBankLayers(bank, getPrompt(promptsRef.current, key));
    }, 4200);

    return () => window.clearInterval(interval);
  }, [isPlaying, shapeBankLayers]);

  useEffect(() => {
    return () => {
      sectionBanksRef.current.forEach((bank) => {
        bank.layers.forEach((layer) => {
          try {
            layer.source.stop();
          } catch {
            // Source may already be stopped during unmount in some browsers.
          }
        });
      });
      contextRef.current?.close();
    };
  }, []);

  return {
    activePrompt,
    isPlaying,
    loading,
    loadedStemCount,
    muted,
    setMuted,
    setVolume,
    status,
    togglePlay,
    volume,
  };
}
