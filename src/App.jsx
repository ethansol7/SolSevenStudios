import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ChevronDown, ExternalLink, Menu, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import AppLink from './components/AppLink.jsx';
import ContactForm from './components/ContactForm.jsx';
import MusicPlayer from './components/MusicPlayer.jsx';
import {
  AboutPage,
  ContactPage,
  GalleryPage,
  NotFoundPage,
  OriginalSolCollectionPage,
  PlastiVistaPage,
  PressPage,
  ProductPage,
  ShopPage,
  SolXConfiguratorPage,
  SolXPage,
} from './components/StorePages.jsx';
import { assetUrl, capabilities, featuredWork, heroLines, navItems, socialLinks, systemTabs } from './content.js';
import { initAnalytics, trackEvent, trackPageView } from './analytics.js';
import { findProductBySlug } from './data/products.js';
import { requestMusicSection, useActiveMusicSection } from './music/useActiveMusicSection.js';
import { currentRoutePath, useClientNavigation } from './routing.js';

const HeroScene = lazy(() => import('./components/HeroScene.jsx'));
const canonicalOrigin = 'https://SolSevenStudios.com';

const mobileNavLabels = {
  Configurator: 'Builder',
};

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

function Navigation({ onNavigate, routePath }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);

  useEffect(() => {
    setIsMenuOpen(false);
    setOpenMenuKey(null);
  }, [routePath]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setOpenMenuKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const handleNavigate = (event, href) => {
    setIsMenuOpen(false);
    setOpenMenuKey(null);
    onNavigate?.(event, href);
  };

  const isActive = (href) => {
    const path = href.split('#')[0] || '/';
    if (path === '/' && href.includes('#')) return false;
    return routePath === path;
  };

  const isItemActive = (item) => {
    if (item.children?.length) return item.children.some((child) => isActive(child.href));
    return isActive(item.href);
  };

  return (
    <header className={`site-nav${isMenuOpen ? ' is-open' : ''}`}>
      <AppLink className="brand-mark" to="/" onNavigate={onNavigate} aria-label="Sol Seven Studios home">
        <img src={assetUrl('assets/brand/sol-seven-studios-logo.png')} alt="" />
      </AppLink>
      <button
        className="nav-menu-button"
        type="button"
        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        {isMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        <span>{isMenuOpen ? 'Close' : 'Menu'}</span>
      </button>
      <nav id="primary-navigation" aria-label="Primary navigation">
        {navItems.map((item) => {
          const active = isItemActive(item);

          if (item.children?.length) {
            const isExpanded = openMenuKey === item.label;

            return (
              <div
                className={`nav-group${active ? ' is-active' : ''}${isExpanded ? ' is-expanded' : ''}`}
                key={item.label}
              >
                <button
                  type="button"
                  className="nav-link nav-link--button"
                  aria-haspopup="true"
                  aria-expanded={isExpanded}
                  onClick={() => setOpenMenuKey((current) => (current === item.label ? null : item.label))}
                >
                  <span data-label={item.label} data-mobile-label={item.label}>{item.label}</span>
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
                <div className="nav-dropdown" role="menu" aria-label={`${item.label} pages`}>
                  {item.children.map((child) => (
                    <AppLink
                      key={child.href}
                      className={`nav-dropdown-link${isActive(child.href) ? ' is-active' : ''}`}
                      to={child.href}
                      onNavigate={(event) => handleNavigate(event, child.href)}
                      role="menuitem"
                    >
                      {child.label}
                    </AppLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <AppLink
              key={item.href}
              className={`nav-link${active ? ' is-active' : ''}`}
              to={item.href}
              onNavigate={(event) => handleNavigate(event, item.href)}
              aria-label={mobileNavLabels[item.label] ?? item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span data-label={item.label} data-mobile-label={mobileNavLabels[item.label] ?? item.label}>{item.label}</span>
            </AppLink>
          );
        })}
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
        <motion.div className="hero-lines" aria-label="Modular products, circular systems, future focused manufacturing">
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
          Objects, systems, and production stories built with the same precision
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
        <h2>Product platforms with manufacturing built into the narrative</h2>
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
        <h2>Manufacturing is not hidden behind the product. It becomes the product language</h2>
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
                trackEvent('system_tab_click', {
                  event_category: 'navigation',
                  tab_id: tab.id,
                  tab_label: tab.label,
                });
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
        <h2>From cinematic product vision to physical systems that can be built</h2>
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
    </section>
  );
}

function SocialLinks({ className = '' }) {
  return (
    <div className={`social-links ${className}`}>
      {socialLinks.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
          <span>{link.label}</span>
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      ))}
    </div>
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
        <h2>Start a conversation</h2>
        <div className="contact-layout contact-layout--footer">
          <ContactForm context="home-footer" />
          <SocialLinks />
        </div>
        <p className="contact-legal">&copy; Sol Seven Studios. Patent Pending.</p>
      </motion.div>
    </footer>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <p>Sol Seven Studios</p>
        <span>Modular lighting, circular systems, and future focused manufacturing</span>
      </div>
      <SocialLinks />
      <p className="contact-legal">&copy; Sol Seven Studios. Patent Pending.</p>
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
  if (routePath === '/gallery') return <GalleryPage />;
  if (routePath === '/shop/original-sol') return <OriginalSolCollectionPage onNavigate={onNavigate} />;
  if (routePath === '/sol-x') return <SolXPage onNavigate={onNavigate} />;
  if (routePath === '/solx-configurator') return <SolXConfiguratorPage onNavigate={onNavigate} />;
  if (routePath === '/plastivista') return <PlastiVistaPage />;
  if (routePath === '/press') return <PressPage onNavigate={onNavigate} />;
  if (routePath === '/contact') return <ContactPage />;
  if (routePath === '/about') return <AboutPage />;
  if (routePath.startsWith('/product/')) return <ProductPage slug={routePath.replace('/product/', '')} onNavigate={onNavigate} />;
  return <NotFoundPage onNavigate={onNavigate} />;
}

function metadataForRoute(routePath) {
  if (routePath.startsWith('/product/')) {
    const product = findProductBySlug(routePath.replace('/product/', ''));
    if (product) {
      return {
        title: `${product.name} | Sol Seven Studios`,
        description: `${product.name} from Sol Seven Studios. ${product.description}`,
      };
    }
  }

  const routeMetadata = {
    '/': {
      title: 'Sol Seven Studios | Modular Lighting and Circular Design',
      description: 'Sol Seven Studios designs modular lighting systems, furniture, circular manufacturing systems, and future focused production workflows.',
    },
    '/shop': {
      title: 'Shop Modular Lighting | Sol Seven Studios',
      description: 'Shop the Sol Seven Studios Original SOL collection, modular shades, lamp components, and system add-ons with Stripe checkout.',
    },
    '/shop/original-sol': {
      title: 'Original SOL Collection | Sol Seven Studios',
      description: 'Explore the Original SOL modular lamp collection from Sol Seven Studios, including lamps, shades, combos, and accessories.',
    },
    '/gallery': {
      title: 'Gallery | Sol Seven Studios',
      description: 'View Sol Seven Studios product, material, and modular lighting gallery images across studio, room, and detail settings.',
    },
    '/sol-x': {
      title: 'SOL X System | Sol Seven Studios',
      description: 'Preview the SOL X modular lighting system and component language from Sol Seven Studios.',
    },
    '/solx-configurator': {
      title: 'SOL X Configurator | Sol Seven Studios',
      description: 'Configure a SOL X modular lighting system with live component previews and pricing context.',
    },
    '/plastivista': {
      title: 'PlastiVista Circular Manufacturing | Sol Seven Studios',
      description: 'Explore PlastiVista, a Sol Seven Studios circular manufacturing workflow for material processing, additive production, and product storytelling.',
    },
    '/press': {
      title: 'Press | Sol Seven Studios',
      description: 'Press and exhibition updates for Sol Seven Studios, Original SOL modular lamps, SOL X, ICFF, and WantedDesign Launch Pad.',
    },
    '/about': {
      title: 'About Sol Seven Studios',
      description: 'Learn about Sol Seven Studios, a New York product design studio developing modular lighting, furniture, and circular manufacturing systems.',
    },
    '/contact': {
      title: 'Contact Sol Seven Studios',
      description: 'Contact Sol Seven Studios for product inquiries, collaborations, custom work, and modular lighting questions.',
    },
  };

  return routeMetadata[routePath] ?? routeMetadata['/'];
}

function setMetaTag(selector, attributes) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    tag.setAttribute(key, value);
  });
}

function setCanonicalLink(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
}

function updateDocumentMetadata(routePath) {
  const metadata = metadataForRoute(routePath);
  const normalizedRoute = routePath === '/' ? '/' : `${routePath.replace(/\/+$/, '')}/`;
  const pageUrl = new URL(normalizedRoute, canonicalOrigin).href;
  const imageUrl = new URL('/assets/lamps/homepage-hero.png', canonicalOrigin).href;

  document.title = metadata.title;
  setCanonicalLink(pageUrl);
  setMetaTag('meta[name="description"]', { name: 'description', content: metadata.description });
  setMetaTag('meta[property="og:title"]', { property: 'og:title', content: metadata.title });
  setMetaTag('meta[property="og:description"]', { property: 'og:description', content: metadata.description });
  setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  setMetaTag('meta[property="og:url"]', { property: 'og:url', content: pageUrl });
  setMetaTag('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
  setMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  setMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title });
  setMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description });
  setMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
}

function musicSectionForRoute(routePath) {
  if (routePath === '/shop' || routePath === '/shop/original-sol') return 'solLamp';
  if (routePath === '/gallery') return 'solLamp';
  if (routePath === '/sol-x' || routePath === '/solx-configurator') return 'solX';
  if (routePath === '/plastivista') return 'plastivista';
  if (routePath === '/press') return 'studio';
  if (routePath === '/about' || routePath === '/contact') return 'contact';
  if (routePath.startsWith('/product/')) {
    const product = findProductBySlug(routePath.replace('/product/', ''));
    return product?.category === 'accessories' || product?.category === 'combos' ? 'process' : 'solLamp';
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
    initAnalytics();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    requestMusicSection(musicSectionForRoute(routePath));
    updateDocumentMetadata(routePath);
    trackPageView(routePath, metadataForRoute(routePath));
  }, [routePath]);

  return (
    <>
      <ScrollProgress />
      <motion.div className="ambient-wash" style={{ '--scroll-shift': backgroundShift }} aria-hidden="true" />
      <Navigation onNavigate={onNavigate} routePath={routePath} />
      <RouteSwitch routePath={routePath} onNavigate={onNavigate} />
      {routePath !== '/' && <SiteFooter />}
      <MusicPlayer activeSectionKey={activeMusicSection} />
    </>
  );
}
