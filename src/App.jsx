import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ExternalLink } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import AppLink from './components/AppLink.jsx';
import MusicPlayer from './components/MusicPlayer.jsx';
import {
  AboutPage,
  NotFoundPage,
  OriginalSolCollectionPage,
  PlastiVistaPage,
  ProductPage,
  ShopPage,
  SolXPage,
} from './components/StorePages.jsx';
import { assetNotes, assetUrl, capabilities, featuredWork, heroLines, navItems, systemTabs } from './content.js';
import { findProductBySlug } from './data/products.js';
import { requestMusicSection, useActiveMusicSection } from './music/useActiveMusicSection.js';
import { currentRoutePath, useClientNavigation } from './routing.js';

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

function Navigation({ onNavigate }) {
  return (
    <header className="site-nav">
      <AppLink className="brand-mark" to="/" onNavigate={onNavigate} aria-label="Sol Seven Studios home">
        <span>S7</span>
      </AppLink>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => (
          <AppLink key={item.href} className="nav-link" to={item.href} onNavigate={onNavigate}>
            <span data-label={item.label}>{item.label}</span>
          </AppLink>
        ))}
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="home" data-music-section="home">
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
    <section className="intro-section section-pad" id="studio" data-music-section="studio">
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

function FeaturedWork() {
  return (
    <section className="work-section section-pad" id="work" data-music-section="solLamp">
      <div className="section-heading">
        <p className="section-kicker">Featured work</p>
        <h2>Product platforms with manufacturing built into the narrative.</h2>
      </div>
      <div className="work-list">
        {featuredWork.map((item, index) => (
          <motion.article
            className="work-item"
            key={item.title}
            data-music-section={item.musicSection}
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ duration: 0.95, delay: Math.min(index * 0.08, 0.24), ease: [0.16, 1, 0.3, 1] }}
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
    <section className="cinematic-section" aria-label="Circular manufacturing process" data-music-section="process">
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

function Systems() {
  const [active, setActive] = useState(systemTabs[0].id);
  const current = useMemo(() => systemTabs.find((tab) => tab.id === active) ?? systemTabs[0], [active]);
  const musicSection = active === 'circular' ? 'plastivista' : active === 'studio' ? 'process' : 'dram';

  return (
    <section className="systems-section section-pad" id="systems" data-music-section={musicSection}>
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
                requestMusicSection(tab.id === 'circular' ? 'plastivista' : tab.id === 'studio' ? 'process' : 'dram');
              }}
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
    <section className="capabilities-section section-pad" id="capabilities" data-music-section="capabilities">
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

function Contact() {
  return (
    <footer className="contact-section" id="contact" data-music-section="contact">
      <motion.div
        initial={{ opacity: 0, y: 42 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="section-kicker">Contact</p>
        <h2>Let's build the next system.</h2>
        <a href="https://www.instagram.com/solsevenstudios/" target="_blank" rel="noreferrer">
          <span>Open studio channel</span>
          <ExternalLink size={18} />
        </a>
      </motion.div>
    </footer>
  );
}

function HomePage() {
  return (
    <main>
      <Hero />
      <StudioIntro />
      <FeaturedWork />
      <CinematicSection />
      <Systems />
      <Capabilities />
      <Contact />
    </main>
  );
}

function RouteSwitch({ onNavigate, routePath }) {
  if (routePath === '/' || routePath === '') return <HomePage />;
  if (routePath === '/shop') return <ShopPage onNavigate={onNavigate} />;
  if (routePath === '/shop/original-sol') return <OriginalSolCollectionPage onNavigate={onNavigate} />;
  if (routePath === '/sol-x') return <SolXPage onNavigate={onNavigate} />;
  if (routePath === '/plastivista') return <PlastiVistaPage />;
  if (routePath === '/about') return <AboutPage />;
  if (routePath.startsWith('/product/')) return <ProductPage slug={routePath.replace('/product/', '')} onNavigate={onNavigate} />;
  return <NotFoundPage onNavigate={onNavigate} />;
}

function musicSectionForRoute(routePath) {
  if (routePath === '/shop' || routePath === '/shop/original-sol') return 'solLamp';
  if (routePath === '/sol-x') return 'solX';
  if (routePath === '/plastivista') return 'plastivista';
  if (routePath === '/about') return 'contact';
  if (routePath.startsWith('/product/')) {
    const product = findProductBySlug(routePath.replace('/product/', ''));
    return product?.category === 'add-ons' ? 'process' : 'solLamp';
  }

  return 'home';
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });

  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

export default function App() {
  const [routePath, setRoutePath] = useState(currentRoutePath);
  const onNavigate = useClientNavigation(setRoutePath);
  const activeMusicSection = useActiveMusicSection('home');
  const { scrollYProgress } = useScroll();
  const backgroundShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const handlePopState = () => setRoutePath(currentRoutePath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    requestMusicSection(musicSectionForRoute(routePath));
  }, [routePath]);

  return (
    <>
      <ScrollProgress />
      <motion.div className="ambient-wash" style={{ '--scroll-shift': backgroundShift }} aria-hidden="true" />
      <Navigation onNavigate={onNavigate} />
      <RouteSwitch routePath={routePath} onNavigate={onNavigate} />
      <MusicPlayer activeSectionKey={activeMusicSection} />
    </>
  );
}
