import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ExternalLink } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SoundToggle from './components/SoundToggle.jsx';
import { assetNotes, assetUrl, capabilities, featuredWork, heroLines, navItems, systemTabs } from './content.js';

const HeroScene = lazy(() => import('./components/HeroScene.jsx'));

const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] },
  },
};

const cascade = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.12,
    },
  },
};

function useSoundDesign() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.nodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Gain and filter nodes do not expose stop.
      }
      try {
        node.disconnect();
      } catch {
        // Already disconnected.
      }
    });

    audioRef.current.context.close();
    audioRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (audioRef.current) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.026;
    master.connect(context.destination);

    const airFilter = context.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 820;
    airFilter.Q.value = 0.7;
    airFilter.connect(master);

    const ambientGain = context.createGain();
    ambientGain.gain.value = 0.22;
    ambientGain.connect(airFilter);

    const toneA = context.createOscillator();
    toneA.type = 'sine';
    toneA.frequency.value = 147;
    toneA.connect(ambientGain);

    const toneB = context.createOscillator();
    toneB.type = 'triangle';
    toneB.frequency.value = 221;
    toneB.detune.value = 5;
    toneB.connect(ambientGain);

    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientGain.gain);

    toneA.start();
    toneB.start();
    lfo.start();

    audioRef.current = {
      context,
      master,
      nodes: [toneA, toneB, lfo, lfoGain, ambientGain, airFilter, master],
    };
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      stop();
      setEnabled(false);
      return;
    }

    start();
    setEnabled(true);
  }, [enabled, start, stop]);

  const playTone = useCallback((frequency = 620, duration = 0.42, volume = 0.022) => {
    const audio = audioRef.current;
    if (!audio) return;

    const { context, master } = audio;
    const now = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.34, now + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(540, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    enabled,
    toggle,
    playHover: () => playTone(760, 0.24, 0.01),
    playTransition: () => playTone(420, 0.55, 0.016),
  };
}

function Navigation({ sound }) {
  return (
    <header className="site-nav">
      <a className="brand-mark" href="#home" aria-label="Sol Seven Studios home" onPointerEnter={sound.playHover}>
        <span>S7</span>
      </a>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.href} className="nav-link" href={item.href} onPointerEnter={sound.playHover}>
            <span data-label={item.label}>{item.label}</span>
          </a>
        ))}
      </nav>
      <SoundToggle enabled={sound.enabled} onToggle={sound.toggle} />
    </header>
  );
}

function Hero({ sound }) {
  return (
    <section className="hero" id="home">
      <div className="hero-image-layer">
        <motion.img
          src={assetUrl('assets/lamps/homepage-hero.png')}
          alt=""
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.56, scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <Suspense fallback={<div className="hero-scene hero-scene--fallback" aria-hidden="true" />}>
        <HeroScene />
      </Suspense>
      <motion.div className="hero-copy" variants={cascade} initial="hidden" animate="show">
        <motion.p className="section-kicker" variants={reveal}>
          Product systems / circular manufacturing
        </motion.p>
        <motion.h1 variants={reveal}>Sol Seven Studios</motion.h1>
        <motion.div className="hero-lines" aria-label="Modular products. Circular systems. Future focused manufacturing.">
          {heroLines.map((line) => (
            <motion.span key={line} variants={reveal}>
              {line}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
      <motion.a
        className="scroll-cue"
        href="#studio"
        onPointerEnter={sound.playHover}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.55, duration: 0.8 }}
        aria-label="Scroll to studio introduction"
      >
        <ArrowDown size={19} />
      </motion.a>
    </section>
  );
}

function StudioIntro() {
  return (
    <section className="intro-section section-pad" id="studio">
      <motion.div
        className="intro-grid"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.36 }}
        variants={cascade}
      >
        <motion.p className="section-kicker" variants={reveal}>
          Studio premise
        </motion.p>
        <motion.h2 variants={reveal}>
          Objects, systems, and production stories built with the same calm precision.
        </motion.h2>
        <motion.p className="intro-body" variants={reveal}>
          Sol Seven Studios develops modular lighting, furniture, and circular manufacturing workflows. The work moves from visualization to prototype to distributed production with a focus on tangible systems that can be repaired, remade, and understood.
        </motion.p>
      </motion.div>
      <motion.div
        className="intro-media"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={assetUrl('assets/process/founder-brand-portrait.png')} alt="Sol Seven Studios production cart and studio portrait" />
      </motion.div>
    </section>
  );
}

function FeaturedWork({ sound }) {
  return (
    <section className="work-section section-pad" id="work">
      <div className="section-heading">
        <p className="section-kicker">Featured work</p>
        <h2>Product platforms with manufacturing built into the narrative.</h2>
      </div>
      <div className="work-list">
        {featuredWork.map((item, index) => (
          <motion.article
            className="work-item"
            key={item.title}
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ duration: 0.95, delay: Math.min(index * 0.08, 0.24), ease: [0.16, 1, 0.3, 1] }}
            onPointerEnter={sound.playHover}
          >
            <div className="work-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="work-image-wrap">
              <img src={item.image} alt={`${item.title} visual`} loading="lazy" />
            </div>
            <div className="work-copy">
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <span>{item.description}</span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function CinematicSection() {
  return (
    <section className="cinematic-section" aria-label="Circular manufacturing process">
      <div className="cinematic-media">
        <video src={assetUrl('assets/video/shredder-process.mp4')} poster={assetUrl('assets/plastivista/system-environment-b.png')} muted playsInline autoPlay loop preload="metadata" />
        <img src={assetUrl('assets/plastivista/system-environment-a.png')} alt="" loading="lazy" />
      </div>
      <motion.div
        className="cinematic-copy"
        initial={{ opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="section-kicker">Material atmosphere</p>
        <h2>Manufacturing is not hidden behind the product. It becomes the product language.</h2>
      </motion.div>
    </section>
  );
}

function Systems({ sound }) {
  const [active, setActive] = useState(systemTabs[0].id);
  const current = useMemo(() => systemTabs.find((tab) => tab.id === active) ?? systemTabs[0], [active]);

  return (
    <section className="systems-section section-pad" id="systems">
      <div className="systems-copy">
        <p className="section-kicker">Systems</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>{current.title}</h2>
            <p>{current.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="system-tabs" role="tablist" aria-label="System stories">
          {systemTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              className={active === tab.id ? 'active' : ''}
              onClick={() => {
                setActive(tab.id);
                sound.playTransition();
              }}
              onPointerEnter={sound.playHover}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="systems-visual">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.image}
            src={current.image}
            alt={`${current.label} system visual`}
            initial={{ opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="capabilities-section section-pad" id="capabilities">
      <div className="section-heading">
        <p className="section-kicker">Capabilities</p>
        <h2>From cinematic product vision to physical systems that can be built.</h2>
      </div>
      <div className="capability-grid">
        {capabilities.map((capability, index) => (
          <motion.div
            className="capability-item"
            key={capability}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.75, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{capability}</p>
          </motion.div>
        ))}
      </div>
      <div className="asset-note-strip" aria-label="Asset sourcing notes">
        {assetNotes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </section>
  );
}

function Contact({ sound }) {
  return (
    <footer className="contact-section" id="contact">
      <motion.div
        initial={{ opacity: 0, y: 42 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="section-kicker">Contact</p>
        <h2>Let's build the next system.</h2>
        <a href="https://www.instagram.com/solsevenstudios/" target="_blank" rel="noreferrer" onPointerEnter={sound.playHover}>
          <span>Open studio channel</span>
          <ExternalLink size={18} />
        </a>
      </motion.div>
    </footer>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });

  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

export default function App() {
  const sound = useSoundDesign();
  const { scrollYProgress } = useScroll();
  const backgroundShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <>
      <ScrollProgress />
      <motion.div className="ambient-wash" style={{ '--scroll-shift': backgroundShift }} aria-hidden="true" />
      <Navigation sound={sound} />
      <main>
        <Hero sound={sound} />
        <StudioIntro />
        <FeaturedWork sound={sound} />
        <CinematicSection />
        <Systems sound={sound} />
        <Capabilities />
        <Contact sound={sound} />
      </main>
    </>
  );
}
