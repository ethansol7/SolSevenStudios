import { lazy, Suspense } from 'react';
import AppLink from './AppLink.jsx';
import {
  collectionNotes,
  findProductBySlug,
  originalSolProducts,
  productCategories,
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

export function ShopPage({ onNavigate }) {
  return (
    <main className="route-page">
      <PageHero
        kicker="Shop"
        title="Modular lighting, shades, and system add-ons."
        body="A clean shopping overview for the public Original SOL collection, plus a preview of the next SOL X component system."
        media={assetUrl('assets/shop/s0l-stack.png')}
      >
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
          <h2>Public products from SolSevenStudios.com.</h2>
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
          <img src={product.image} alt={`${product.name} product image`} />
        </div>
        <div className="product-detail__copy">
          <p className="section-kicker">{product.collection}</p>
          <h1>{product.name}</h1>
          <p>{product.shortDescription}</p>
          <div className="product-price">
            {product.compareAt && <span>{product.compareAt}</span>}
            <strong>{product.price}</strong>
          </div>
          <div className="route-actions">
            <a href={product.sourceUrl} target="_blank" rel="noreferrer">View on SolSevenStudios.com</a>
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
          <h2>Notes from the public product language.</h2>
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
          <p className="section-kicker">Provided GLB files</p>
          <h2>Loaded as SOL X components, not Original SOL product imagery.</h2>
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
      />
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
      />
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
