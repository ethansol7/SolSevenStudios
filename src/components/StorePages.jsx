import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import AppLink from './AppLink.jsx';
import ContactForm from './ContactForm.jsx';
import {
  collectionNotes,
  findProductBySlug,
  originalSolProducts,
  productCategories,
  siteGallerySections,
  solXComponents,
} from '../data/products.js';
import { assetUrl, socialLinks } from '../content.js';
import { trackProductCardClick, trackStripeCheckoutClick } from '../analytics.js';

const SolXViewer = lazy(() => import('./SolXViewer.jsx'));
const SolXConfigurator = lazy(() => import('./SolXConfigurator.jsx'));

const stripeLinkPattern = /^https:\/\/buy\.stripe\.com\//;
const hasLiveStripeLink = (link) => typeof link === 'string' && stripeLinkPattern.test(link);
const productDetailPath = (product) => (findProductBySlug(product.slug) ? `/product/${product.slug}` : '/shop/original-sol');
const sellableOriginalSolProducts = originalSolProducts.filter((product) => hasLiveStripeLink(product.stripeLink));
const originalSolLamps = sellableOriginalSolProducts.filter((product) => product.category === 'lamps');
const originalSolAddOns = sellableOriginalSolProducts.filter((product) => product.category !== 'lamps');
const originalSolSystemPoints = [
  {
    label: 'What it is',
    title: 'A modular lamp system you can buy now',
    body:
      'Original SOL is the lighting collection available now. Each lamp uses a base, shade, magnetic connection hardware, and smart bulb so the build can change without replacing the whole object.',
  },
  {
    label: 'Parts',
    title: 'Lamps, shades, bundles, and add-ons',
    body:
      'The collection includes complete S01-S04 lamps, matching shade modules, the S0L Planter combo, and compatible accessories as they become available.',
  },
  {
    label: 'Modularity',
    title: 'Stack, swap, and reuse pieces over time',
    body:
      'Shades and add-ons are designed to move between lamp builds. A piece can become a new silhouette, a storage form, or part of a taller stack instead of becoming obsolete.',
  },
  {
    label: 'Future direction',
    title: 'Designed to grow toward SOL X',
    body:
      'SOL X extends the same design language into an electronic and configurator-driven system. It is a future prototype direction, while Original SOL is the current product line.',
  },
];

function PageHero({ kicker, title, body, media, mediaAlt = '', mediaClassName = '', musicSection = 'solLamp', children }) {
  return (
    <section className="store-hero" data-music-section={musicSection}>
      <div className="store-hero__copy">
        <p className="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{body}</p>
        {children}
      </div>
      {media && (
        <div className={`store-hero__media${mediaClassName ? ` ${mediaClassName}` : ''}`}>
          <img src={media} alt={mediaAlt} loading="lazy" />
        </div>
      )}
    </section>
  );
}

function ProductCard({ onNavigate, product, showDescription = true, variant = 'default' }) {
  const categoryLabel = product.collection || product.category.replace('-', ' ');
  const detailPath = productDetailPath(product);

  return (
    <article className={`store-card store-card--${variant}`}>
      <AppLink
        to={detailPath}
        onNavigate={onNavigate}
        className="store-card__image"
        aria-label={`View ${product.name}`}
        onClick={() => trackProductCardClick(product, 'image')}
      >
        <img src={product.image} alt={`${product.name} product image`} loading="lazy" />
      </AppLink>
      <div className="store-card__body">
        <p>{categoryLabel}</p>
        <h3>{product.name}</h3>
        {showDescription && <span>{product.description}</span>}
        <div className="store-card__footer">
          <small>{product.compareAt ? `${product.compareAt} / ${product.price}` : product.price}</small>
          <AppLink
            to={detailPath}
            onNavigate={onNavigate}
            onClick={() => trackProductCardClick(product, 'view_product')}
          >
            View Product
          </AppLink>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ onNavigate, products = originalSolProducts, showDescription = true }) {
  return (
    <div className="store-grid">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} onNavigate={onNavigate} showDescription={showDescription} />
      ))}
    </div>
  );
}

function ProductSections({ onNavigate, products: sourceProducts = originalSolProducts, showDescription = true }) {
  return productCategories.map((category) => {
    const products = sourceProducts.filter((product) => product.category === category.id);
    if (!products.length) return null;

    return (
      <section className="store-section section-pad" data-music-section={category.id === 'accessories' || category.id === 'combos' ? 'process' : 'solLamp'} key={category.id}>
        <div className="section-heading">
          <p className="section-kicker">{category.label}</p>
          <h2>{category.description}</h2>
        </div>
        <ProductGrid onNavigate={onNavigate} products={products} showDescription={showDescription} />
      </section>
    );
  });
}

function SocialLinks({ className = '' }) {
  return (
    <div className={`social-links ${className}`}>
      {socialLinks.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      ))}
    </div>
  );
}

function normalizeProductGallery(product) {
  const primary = { src: product.image, caption: '' };
  const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [primary];
  const normalized = gallery
    .filter((item) => item?.src)
    .map((item) => ({ src: item.src, caption: item.caption || '' }));

  if (normalized[0]?.src === product.image) return normalized;
  return [primary, ...normalized.filter((item) => item.src !== product.image)];
}

function formatInventoryStatus(inventory) {
  if (inventory === 'InStock') return 'In stock';
  if (inventory === 'OutOfStock') return 'Out of stock';
  return inventory || 'Availability pending';
}

function ImageLightbox({ image, label, onClose }) {
  if (!image) return null;

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={label} onMouseDown={onClose}>
      <button className="image-lightbox__close" type="button" onClick={onClose} aria-label="Close image viewer">
        Close
      </button>
      <figure className="image-lightbox__figure" onMouseDown={(event) => event.stopPropagation()}>
        <img src={image.src} alt={image.caption || label} />
        {image.caption && <figcaption>{image.caption}</figcaption>}
      </figure>
    </div>
  );
}

function ProductGallery({ product }) {
  const images = useMemo(() => normalizeProductGallery(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const activeImage = images[activeIndex] ?? images[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [product.slug]);

  return (
    <div className="product-gallery">
      <button className="product-gallery__main" type="button" onClick={() => setLightboxImage(activeImage)} aria-label={`Open ${product.name} image larger`}>
        <img src={activeImage.src} alt={`${product.name} product image`} />
      </button>
      {activeImage.caption && <p className="product-gallery__caption">{activeImage.caption}</p>}
      {images.length > 1 && (
        <div className="product-gallery__thumbs" aria-label={`${product.name} product images`}>
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              className={`product-gallery__thumb${index === activeIndex ? ' active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
            >
              <img src={image.src} alt="" loading="lazy" />
              {image.caption && <span>{image.caption}</span>}
            </button>
          ))}
        </div>
      )}
      <ImageLightbox image={lightboxImage} label={`${product.name} gallery image`} onClose={() => setLightboxImage(null)} />
    </div>
  );
}

function ProductPurchasePanel({ product }) {
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.label ?? '');
  const colors = product.colors ?? [];
  const liveStripeLink = hasLiveStripeLink(product.stripeLink) ? product.stripeLink : '';

  useEffect(() => {
    setSelectedColor(product.colors?.[0]?.label ?? '');
  }, [product.slug, product.colors]);

  return (
    <div className="product-purchase" aria-label={`${product.name} purchase options`}>
      <div className="product-stock-row">
        <span>Stock status</span>
        <strong>{formatInventoryStatus(product.inventory)}</strong>
      </div>

      {colors.length > 0 && (
        <div className="product-option">
          <p>Color</p>
          <div className="product-color-options">
            {colors.map((color) => (
              <button
                key={`${product.slug}-${color.label}`}
                type="button"
                className={selectedColor === color.label ? 'active' : ''}
                style={{ '--swatch': color.value }}
                onClick={() => setSelectedColor(color.label)}
                aria-pressed={selectedColor === color.label}
              >
                <span aria-hidden="true" />
                {color.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="route-actions route-actions--purchase">
        {liveStripeLink ? (
          <a
            href={liveStripeLink}
            target="_blank"
            rel="noreferrer"
            aria-label={`Buy ${product.name} with Stripe checkout`}
            onClick={() => trackStripeCheckoutClick(product)}
          >
            Buy Now
          </a>
        ) : (
          <button type="button" disabled aria-label={`${product.name} coming soon`}>
            Coming Soon
          </button>
        )}
      </div>
      <p>{liveStripeLink ? 'Secure checkout powered by Stripe.' : 'Online checkout is coming soon for this product.'}</p>
    </div>
  );
}

export function ShopPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Shop"
        title="Shop Original SOL Lamps"
        body="Browse the current Original SOL lamp pieces, then choose the lamp, shade, or bundle that fits your space."
        media={assetUrl('assets/shop/s0l-stack.png')}
      >
        <div className="route-actions">
          <AppLink to="/shop/original-sol" onNavigate={onNavigate}>View Collection</AppLink>
          <AppLink to="/contact" onNavigate={onNavigate}>Ask a Question</AppLink>
        </div>
      </PageHero>

      <section className="store-section section-pad" data-music-section="solLamp">
        <div className="section-heading">
          <p className="section-kicker">Original SOL Lamps</p>
          <h2>Complete modular lamps for quick checkout</h2>
        </div>
        <ProductGrid onNavigate={onNavigate} products={originalSolLamps} showDescription={false} />
      </section>

      <section className="store-section section-pad" data-music-section="solLamp">
        <div className="section-heading">
          <p className="section-kicker">Shades and Bundles</p>
          <h2>Compatible pieces for expanding a build</h2>
        </div>
        <ProductGrid onNavigate={onNavigate} products={originalSolAddOns} showDescription={false} />
      </section>
    </main>
  );
}

export function OriginalSolCollectionPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Original SOL Collection"
        title="Stack, swap, sculpt, and reuse"
        body={collectionNotes.originalSol}
        media={assetUrl('assets/shop/s0l-combo.png')}
      >
        <div className="route-actions">
          <AppLink to="/shop" onNavigate={onNavigate}>Shop Overview</AppLink>
          <AppLink to="/sol-x" onNavigate={onNavigate}>SOL X Preview</AppLink>
        </div>
      </PageHero>

      <section className="original-sol-explainer section-pad" data-music-section="studio">
        <div className="section-heading">
          <p className="section-kicker">System overview</p>
          <h2>Original SOL is the lamp collection customers can buy now</h2>
        </div>
        <div className="original-sol-explainer__grid">
          {originalSolSystemPoints.map((item) => (
            <article key={item.label}>
              <p>{item.label}</p>
              <h3>{item.title}</h3>
              <span>{item.body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="original-sol-compat section-pad" data-music-section="solX">
        <div>
          <p className="section-kicker">Compatibility direction</p>
          <h2>Built for today, shaped for the next SOL system</h2>
        </div>
        <p>
          Original SOL and SOL X share the same core visual language: ribbed printed forms, swappable silhouettes, and modular build logic. Original SOL is the lamp system available now. SOL X is the future electronic and configurator direction, developed as a prototype path for smarter parts, cleaner build feedback, and long-term compatibility.
        </p>
      </section>

      <ProductSections onNavigate={onNavigate} products={sellableOriginalSolProducts} showDescription={false} />
    </main>
  );
}

export function ProductPage({ onNavigate, slug }) {
  const product = findProductBySlug(slug);

  if (!product) {
    return <NotFoundPage onNavigate={onNavigate} />;
  }

  const detailSections = product.additionalInfo ?? [];

  return (
    <main className="route-page">
      <section className="product-detail" data-music-section={product.category === 'accessories' || product.category === 'combos' ? 'process' : 'solLamp'}>
        <div className="product-detail__gallery">
          <ProductGallery product={product} />
        </div>
        <div className="product-detail__copy">
          <p className="section-kicker">{product.collection}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="product-price">
            {product.compareAt && <span>{product.compareAt}</span>}
            <strong>{product.price}</strong>
          </div>
          <ProductPurchasePanel product={product} />
          <div className="route-actions product-secondary-actions">
            <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Back to Collection</AppLink>
            <AppLink to="/contact" onNavigate={onNavigate}>Inquire</AppLink>
          </div>
        </div>
      </section>

      <section className="product-story section-pad" data-music-section="studio">
        <div>
          <p className="section-kicker">Product description</p>
          <h2>{product.name}</h2>
        </div>
        <p>{product.description}</p>
      </section>

      <section className="product-notes section-pad" data-music-section="process">
        <div className="section-heading">
          <p className="section-kicker">Product details</p>
          <h2>Category, options, stock, and catalog details</h2>
        </div>
        <div className="capability-grid product-notes__grid">
          <div className="capability-item">
            <span>01</span>
            <p>Category: {product.collection}</p>
          </div>
          <div className="capability-item">
            <span>02</span>
            <p>Stock status: {formatInventoryStatus(product.inventory)}</p>
          </div>
          {detailSections.map((detail, index) => (
            <div className="capability-item" key={`${product.slug}-${detail.title}`}>
              <span>{String(index + 3).padStart(2, '0')}</span>
              <p><strong>{detail.title}:</strong> {detail.description}</p>
            </div>
          ))}
          {product.colors?.length > 0 && (
            <div className="capability-item">
              <span>{String(detailSections.length + 3).padStart(2, '0')}</span>
              <p>Available colors: {product.colors.map((color) => color.label).join(', ')}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export function SolXPage({ onNavigate }) {
  return (
    <main className="route-page">
      <section className="solx-page" data-music-section="solX">
        <div className="solx-page__copy">
          <p className="section-kicker">SOL X preview</p>
          <h1>Component intelligence for the next modular lamp system</h1>
          <p>{collectionNotes.solX}</p>
          <div className="route-actions">
            <AppLink to="/solx-configurator" onNavigate={onNavigate}>Open Configurator</AppLink>
            <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Original SOL Collection</AppLink>
            <AppLink to="/contact" onNavigate={onNavigate}>Join Waitlist</AppLink>
          </div>
        </div>
        <Suspense fallback={<div className="solx-viewer solx-viewer--loading">Loading SOL X models...</div>}>
          <SolXViewer />
        </Suspense>
      </section>

      <section className="solx-continuity section-pad" data-music-section="solX">
        <div className="solx-continuity__copy">
          <p className="section-kicker">Modular continuity</p>
          <h2>Built around layered connection and future compatibility</h2>
          <p>
            SOL X explores a stackable lighting architecture where each layer can align, connect, and pass power through the build. Magnetic positioning, electrical continuity, and modular shade logic are developed together so future parts can feel simple to place and natural to understand.
          </p>
          <div className="solx-continuity__points" aria-label="SOL X modular system principles">
            <span>Magnetic alignment</span>
            <span>Electrical continuity</span>
            <span>Layered stack logic</span>
          </div>
        </div>
        <figure className="solx-continuity__image">
          <img src={assetUrl('assets/solx/solx-modular-connection.png')} alt="Exploded SOL X module showing shade, connector layer, and vertical stack alignment" loading="lazy" />
        </figure>
      </section>

      <section className="store-section section-pad" data-music-section="solX">
        <div className="section-heading">
          <p className="section-kicker">SOL X components</p>
          <h2>Preview the base, shades, and divider as a modular lighting language</h2>
        </div>
        <div className="component-list">
          {solXComponents.map((component) => (
            <article key={component.path}>
              <p>{component.label}</p>
              <span>{component.note}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function SolXConfiguratorPage({ onNavigate }) {
  return (
    <Suspense fallback={<main className="route-page"><div className="solx-viewer solx-viewer--loading">Loading SOL X configurator...</div></main>}>
      <SolXConfigurator onNavigate={onNavigate} />
    </Suspense>
  );
}

export function PlastiVistaPage() {
  return (
    <main className="route-page">
      <PageHero
        kicker="PlastiVista"
        title="Circular manufacturing as a visible product system"
        body="A compact process story for material collection, shredding, extrusion, printing, assembly, and product storytelling."
        media={assetUrl('assets/plastivista/system-hero.png')}
        musicSection="plastivista"
      />
      <section className="systems-section section-pad" data-music-section="plastivista">
        <div className="systems-copy">
          <p className="section-kicker">Circular workflow</p>
          <h2>Waste streams become design material</h2>
          <p>PlastiVista connects plastic waste, small-scale processing, additive manufacturing, and modular product design into a calmer production loop.</p>
        </div>
        <div className="systems-visual">
          <img src={assetUrl('assets/plastivista/homepage-process-sequence.png')} alt="PlastiVista process sequence" loading="lazy" />
        </div>
      </section>
    </main>
  );
}

export function AboutPage() {
  return (
    <main className="route-page">
      <PageHero
        kicker="About / Contact"
        title="Start a conversation"
        body="Sol Seven Studios develops modular lighting, furniture, additive workflows, and circular manufacturing stories from New York."
        media={assetUrl('assets/process/founder-brand-portrait.png')}
        musicSection="contact"
      />
      <section className="contact-section contact-section--route" data-music-section="contact">
        <div className="contact-layout">
          <p className="section-kicker">Contact</p>
          <h2>Start a conversation</h2>
          <ContactForm context="about-page" />
          <SocialLinks />
        </div>
      </section>
    </main>
  );
}

export function ContactPage() {
  return (
    <main className="route-page">
      <PageHero
        kicker="Contact"
        title="Start a conversation"
        body="Use this form for product questions, custom work, collaborations, press, and business inquiries."
        media={assetUrl('assets/contact/ethan-sol-exhibition-contact.jpg')}
        mediaAlt="Ethan Solodukhin standing with SOL lamps and fabrication equipment in an exhibition space"
        mediaClassName="store-hero__media--contact"
        musicSection="contact"
      />
      <section className="contact-section contact-section--route contact-section--page" data-music-section="contact">
        <div className="contact-layout">
          <ContactForm context="contact-page" />
          <SocialLinks />
        </div>
      </section>
    </main>
  );
}

export function GalleryPage() {
  const [lightboxImage, setLightboxImage] = useState(null);

  return (
    <main className="route-page">
      <PageHero
        kicker="Gallery"
        title="SOL in rooms, systems, and details"
        body="A visual archive of modular lighting, interior use, product details, and material views."
        media={assetUrl('assets/gallery/curated/living-space-sol-system-01.png')}
      />

      {siteGallerySections.map((section) => (
        <section className="gallery-section section-pad" key={section.title} data-music-section="solLamp">
          <div className="section-heading">
            <p className="section-kicker">{section.title}</p>
            {section.description && <h2>{section.description}</h2>}
          </div>
          <div className="gallery-grid-page">
            {section.items.map((image, index) => (
              <button
                type="button"
                className="gallery-tile"
                key={`${section.title}-${image.src}-${index}`}
                onClick={() => setLightboxImage(image)}
                aria-label={`Open ${image.caption}`}
              >
                <img src={image.src} alt={image.caption} loading="lazy" />
                <span>{image.caption}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <ImageLightbox image={lightboxImage} label="Gallery image" onClose={() => setLightboxImage(null)} />
    </main>
  );
}

export function PressPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Press"
        title="Press and exhibition updates"
        body="Sol Seven Studios is preparing modular lighting, circular design systems, and SOL X configurator work for ICFF and WantedDesign Launch Pad"
        media={assetUrl('assets/gallery/curated/studio-product-family-01.jpg')}
        musicSection="studio"
      >
        <div className="route-actions">
          <AppLink to="/contact" onNavigate={onNavigate}>Press Inquiries</AppLink>
          <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Original SOL</AppLink>
        </div>
      </PageHero>

      <section className="press-section section-pad" data-music-section="studio">
        <div className="section-heading">
          <p className="section-kicker">Coverage</p>
          <h2>Press, exhibition notes, and circular design coverage</h2>
        </div>
        <div className="press-grid">
          <a
            className="press-card press-card--link"
            href="https://www.yankodesign.com/2024/11/19/3d-printed-chairs-are-made-from-100-recycled-plastic-from-donation-program/"
            target="_blank"
            rel="noreferrer"
          >
            <p>Yanko Design</p>
            <h3>Revo Chair circular design feature</h3>
            <span>
              Coverage of recycled-plastic furniture work that supports the studio's circular material and additive manufacturing direction.
            </span>
          </a>
          <article className="press-card">
            <p>ICFF 2026</p>
            <h3>WantedDesign Launch Pad</h3>
            <span>
              Sol Seven Studios will present Original SOL as the current modular lamp collection and SOL X as the future configurator and electronic system direction.
            </span>
          </article>
          <article className="press-card">
            <p>Press contact</p>
            <h3>Images, interviews, and product information</h3>
            <span>
              For press materials, product details, or exhibition questions, use the contact form and include the publication or project context.
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}

export function NotFoundPage({ onNavigate }) {
  return (
    <main className="route-page">
      <section className="store-hero" data-music-section="home">
        <div className="store-hero__copy">
          <p className="section-kicker">404</p>
          <h1>That page is not in the system yet</h1>
          <p>Head back to the studio home or browse the Original SOL collection.</p>
          <div className="route-actions">
            <AppLink to="/" onNavigate={onNavigate}>Home</AppLink>
            <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Original SOL</AppLink>
          </div>
        </div>
      </section>
    </main>
  );
}
