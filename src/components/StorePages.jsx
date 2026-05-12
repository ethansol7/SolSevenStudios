import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import AppLink from './AppLink.jsx';
import {
  collectionNotes,
  findProductBySlug,
  originalSolProducts,
  productCategories,
  siteGallerySections,
  solXComponents,
} from '../data/products.js';
import { assetUrl } from '../content.js';

const SolXViewer = lazy(() => import('./SolXViewer.jsx'));
const SolXConfigurator = lazy(() => import('./SolXConfigurator.jsx'));

function PageHero({ kicker, title, body, media, musicSection = 'solLamp', children }) {
  return (
    <section className="store-hero" data-music-section={musicSection}>
      <div className="store-hero__copy">
        <p className="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{body}</p>
        {children}
      </div>
      {media && (
        <div className="store-hero__media">
          <img src={media} alt="" loading="lazy" />
        </div>
      )}
    </section>
  );
}

function ProductCard({ onNavigate, product, variant = 'default' }) {
  return (
    <article className={`store-card store-card--${variant}`}>
      <AppLink to={`/product/${product.slug}`} onNavigate={onNavigate} className="store-card__image" aria-label={`View ${product.name}`}>
        <img src={product.image} alt={`${product.name} product image`} loading="lazy" />
      </AppLink>
      <div className="store-card__body">
        <p>{product.category.replace('-', ' ')}</p>
        <h3>{product.name}</h3>
        <span>{product.shortDescription}</span>
        <div className="store-card__footer">
          <small>{product.compareAt ? `${product.compareAt} / ${product.price}` : product.price}</small>
          <AppLink to={`/product/${product.slug}`} onNavigate={onNavigate}>
            View Product
          </AppLink>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ onNavigate, products = originalSolProducts }) {
  return (
    <div className="store-grid">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} onNavigate={onNavigate} />
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
  const [quantity, setQuantity] = useState(1);
  const colors = product.colors ?? [];

  useEffect(() => {
    setSelectedColor(product.colors?.[0]?.label ?? '');
    setQuantity(1);
  }, [product.slug, product.colors]);

  const updateQuantity = (nextValue) => {
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.min(Math.max(Math.round(parsed), 1), 99));
  };

  return (
    <div className="product-purchase" aria-label={`${product.name} purchase options`}>
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

      <label className="quantity-control">
        <span>Quantity</span>
        <input
          type="number"
          min="1"
          max="99"
          value={quantity}
          onChange={(event) => updateQuantity(event.target.value)}
          aria-label={`${product.name} quantity`}
        />
      </label>

      <div className="route-actions route-actions--purchase">
        <a href={product.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Add ${product.name} to cart on SolSevenStudios.com`}>
          Add to Cart
        </a>
        <a href={product.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Buy ${product.name} on SolSevenStudios.com`}>
          Buy Now
        </a>
      </div>
      <p>Checkout opens on the live Sol Seven Studios shop.</p>
    </div>
  );
}

function PatentLine({ compact = false }) {
  return <p className={compact ? 'patent-line patent-line--compact' : 'patent-line'}>Patent Pending</p>;
}

export function ShopPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Shop"
        title="Modular lighting, shades, and system add-ons."
        body="A clean shopping overview for the public Original SOL collection, plus a preview of the next SOL X component system."
        media={assetUrl('assets/shop/s0l-stack.png')}
      >
        <PatentLine compact />
        <div className="route-actions">
          <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Original SOL Collection</AppLink>
          <AppLink to="/sol-x" onNavigate={onNavigate}>Explore SOL X</AppLink>
        </div>
      </PageHero>

      <section className="store-section section-pad" data-music-section="solLamp">
        <div className="section-heading">
          <p className="section-kicker">Collections</p>
          <h2>Current products and future component technology stay intentionally separate.</h2>
        </div>
        <div className="collection-grid">
          <AppLink to="/shop/original-sol" onNavigate={onNavigate} className="collection-tile">
            <img src={assetUrl('assets/shop/s01.png')} alt="" loading="lazy" />
            <div>
              <p>Available collection</p>
              <h3>Original SOL Collection</h3>
              <span>{collectionNotes.originalSol}</span>
            </div>
          </AppLink>
          <AppLink to="/sol-x" onNavigate={onNavigate} className="collection-tile">
            <img src={assetUrl('assets/lamps/solx-one-lamp.png')} alt="" loading="lazy" />
            <div>
              <p>Technology preview</p>
              <h3>SOL X System</h3>
              <span>{collectionNotes.solX}</span>
            </div>
          </AppLink>
        </div>
      </section>

      <section className="store-section section-pad" data-music-section="solLamp">
        <div className="section-heading">
          <p className="section-kicker">Original SOL</p>
          <h2>Available products from SolSevenStudios.com.</h2>
        </div>
        <ProductGrid onNavigate={onNavigate} />
      </section>
    </main>
  );
}

export function OriginalSolCollectionPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Original SOL Collection"
        title="Stack, swap, sculpt, and reuse."
        body={collectionNotes.originalSol}
        media={assetUrl('assets/shop/s0l-combo.png')}
      >
        <PatentLine compact />
        <div className="route-actions">
          <AppLink to="/shop" onNavigate={onNavigate}>Shop Overview</AppLink>
          <AppLink to="/sol-x" onNavigate={onNavigate}>SOL X Preview</AppLink>
        </div>
      </PageHero>

      {productCategories.map((category) => {
        const products = originalSolProducts.filter((product) => product.category === category.id);
        return (
          <section className="store-section section-pad" data-music-section={category.id === 'add-ons' ? 'process' : 'solLamp'} key={category.id}>
            <div className="section-heading">
              <p className="section-kicker">{category.label}</p>
              <h2>{category.description}</h2>
            </div>
            <ProductGrid onNavigate={onNavigate} products={products} />
          </section>
        );
      })}
    </main>
  );
}

export function ProductPage({ onNavigate, slug }) {
  const product = findProductBySlug(slug);

  if (!product) {
    return <NotFoundPage onNavigate={onNavigate} />;
  }

  return (
    <main className="route-page">
      <section className="product-detail" data-music-section={product.category === 'add-ons' ? 'process' : 'solLamp'}>
        <div className="product-detail__gallery">
          <ProductGallery product={product} />
        </div>
        <div className="product-detail__copy">
          <p className="section-kicker">{product.collection}</p>
          <PatentLine compact />
          <h1>{product.name}</h1>
          <p>{product.shortDescription}</p>
          <div className="product-price">
            {product.compareAt && <span>{product.compareAt}</span>}
            <strong>{product.price}</strong>
          </div>
          <ProductPurchasePanel product={product} />
          <div className="route-actions product-secondary-actions">
            <a href={product.sourceUrl} target="_blank" rel="noreferrer">View Product Page</a>
            <AppLink to="/about" onNavigate={onNavigate}>Inquire</AppLink>
          </div>
        </div>
      </section>

      <section className="product-story section-pad" data-music-section="studio">
        <div>
          <p className="section-kicker">Design intent</p>
          <h2>{product.intent}</h2>
        </div>
        <p>{product.story}</p>
      </section>

      <section className="product-notes section-pad" data-music-section="process">
        <div className="section-heading">
          <p className="section-kicker">Material / Process</p>
          <h2>Material, certification, and modular use details.</h2>
        </div>
        <div className="capability-grid product-notes__grid">
          {product.processNotes.map((note, index) => (
            <div className="capability-item" key={note}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{note}</p>
            </div>
          ))}
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
          <PatentLine compact />
          <h1>Component intelligence for the next modular lamp system.</h1>
          <p>{collectionNotes.solX}</p>
          <div className="route-actions">
            <AppLink to="/solx-configurator" onNavigate={onNavigate}>Open Configurator</AppLink>
            <AppLink to="/shop/original-sol" onNavigate={onNavigate}>Original SOL Collection</AppLink>
            <AppLink to="/about" onNavigate={onNavigate}>Join Waitlist</AppLink>
          </div>
        </div>
        <Suspense fallback={<div className="solx-viewer solx-viewer--loading">Loading SOL X models...</div>}>
          <SolXViewer />
        </Suspense>
      </section>

      <section className="store-section section-pad" data-music-section="solX">
        <div className="section-heading">
          <p className="section-kicker">SOL X components</p>
          <h2>Preview the base, shades, and divider as a modular lighting language.</h2>
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
        title="Circular manufacturing as a visible product system."
        body="A compact process story for material collection, shredding, extrusion, printing, assembly, and product storytelling."
        media={assetUrl('assets/plastivista/system-hero.png')}
        musicSection="plastivista"
      >
        <PatentLine compact />
      </PageHero>
      <section className="systems-section section-pad" data-music-section="plastivista">
        <div className="systems-copy">
          <p className="section-kicker">Circular workflow</p>
          <h2>Waste streams become design material.</h2>
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
        title="Let's build the next system."
        body="Sol Seven Studios develops modular lighting, furniture, additive workflows, and circular manufacturing stories from New York."
        media={assetUrl('assets/process/founder-brand-portrait.png')}
        musicSection="contact"
      >
        <PatentLine compact />
      </PageHero>
      <section className="contact-section contact-section--route" data-music-section="contact">
        <div>
          <p className="section-kicker">Contact</p>
          <h2>Let's build the next system.</h2>
          <a href="https://www.instagram.com/solsevenstudios/" target="_blank" rel="noreferrer">
            Open studio channel
          </a>
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
        title="SOL lamps across studio, room, and detail views."
        body="A curated visual archive for room settings, system studies, and close material views."
        media={assetUrl('assets/gallery/curated/living-space-sol-system-01.png')}
      >
        <PatentLine compact />
      </PageHero>

      {siteGallerySections.map((section) => (
        <section className="gallery-section section-pad" key={section.title} data-music-section="solLamp">
          <div className="section-heading">
            <p className="section-kicker">{section.title}</p>
            <h2>{section.title === 'Details' ? 'Material, profile, and modular connection studies.' : 'Product context views for the SOL lighting system.'}</h2>
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

export function NotFoundPage({ onNavigate }) {
  return (
    <main className="route-page">
      <section className="store-hero" data-music-section="home">
        <div className="store-hero__copy">
          <p className="section-kicker">404</p>
          <h1>That page is not in the system yet.</h1>
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
