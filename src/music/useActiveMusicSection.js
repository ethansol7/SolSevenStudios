import { useEffect, useRef, useState } from 'react';

const CUSTOM_EVENT = 'solseven:music-section';

export function requestMusicSection(sectionKey) {
  if (!sectionKey || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT, { detail: { sectionKey } }));
}

export function useActiveMusicSection(defaultSection = 'home') {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const visibleSections = useRef(new Map());

  useEffect(() => {
    const handleManualChange = (event) => {
      const sectionKey = event.detail?.sectionKey;
      if (sectionKey) setActiveSection(sectionKey);
    };

    window.addEventListener(CUSTOM_EVENT, handleManualChange);
    return () => window.removeEventListener(CUSTOM_EVENT, handleManualChange);
  }, []);

  useEffect(() => {
    const sections = [...document.querySelectorAll('[data-music-section]')];
    if (!sections.length || !('IntersectionObserver' in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionKey = entry.target.getAttribute('data-music-section');
          if (!sectionKey) return;

          if (entry.isIntersecting) {
            visibleSections.current.set(sectionKey, entry.intersectionRatio);
          } else {
            visibleSections.current.delete(sectionKey);
          }
        });

        const nextSection = [...visibleSections.current.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (nextSection) setActiveSection(nextSection);
      },
      {
        root: null,
        rootMargin: '-22% 0px -42% 0px',
        threshold: [0.1, 0.22, 0.38, 0.55, 0.72],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return activeSection;
}
