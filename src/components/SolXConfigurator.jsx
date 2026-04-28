import { Canvas } from '@react-three/fiber';
import { Bounds, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Component, Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import AppLink from './AppLink.jsx';
import { defaultSolXStack, solxPartOrder, solxParts } from '../data/solxParts.js';

const MODEL_SCALE = 8.5;
const STACK_GAP = 0.035;

class ConfiguratorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function CanvasMessage({ title, paths }) {
  return (
    <Html center>
      <div className="configurator-canvas-message">
        <strong>{title}</strong>
        {paths && <span>{paths.join(', ')}</span>}
      </div>
    </Html>
  );
}

function StackModel({ partKey, y }) {
  const part = solxParts[partKey];
  const { scene } = useGLTF(part.file);

  const clone = useMemo(() => {
    const next = scene.clone(true);
    const box = new THREE.Box3().setFromObject(next);
    const center = new THREE.Vector3();
    box.getCenter(center);

    next.position.set(-center.x, -box.min.y, -center.z);
    next.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.min(child.material.roughness ?? 0.66, 0.78);
        child.material.metalness = Math.max(child.material.metalness ?? 0, 0.015);
        if (child.material.color) {
          child.material.color.lerp(new THREE.Color(part.tint), 0.22);
        }
      }
    });

    return next;
  }, [part.tint, scene]);

  return (
    <group position={[0, y, 0]} scale={MODEL_SCALE}>
      <primitive object={clone} />
    </group>
  );
}

function StackAssembly({ stack }) {
  const { frameHeight, placements, totalHeight } = useMemo(() => {
    let y = 0;
    const nextPlacements = stack.map((partKey, index) => {
      const placement = { id: `${partKey}-${index}`, partKey, y };
      y += solxParts[partKey].height + STACK_GAP;
      return placement;
    });
    return {
      frameHeight: Math.max(3.2, y),
      placements: nextPlacements,
      totalHeight: y,
    };
  }, [stack]);

  return (
    <Bounds fit clip observe margin={1.45}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.75, frameHeight, 2.75]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group position={[0, -totalHeight / 2, 0]}>
        {placements.map((placement) => (
          <StackModel key={placement.id} partKey={placement.partKey} y={placement.y} />
        ))}
      </group>
    </Bounds>
  );
}

function ConfiguratorViewer({ autoRotate, stack }) {
  const expectedPaths = solxPartOrder.map((key) => solxParts[key].expectedPath);

  return (
    <div className="configurator-viewer" aria-label="Interactive SOL X configurator viewer">
      <Canvas
        camera={{ position: [5.2, 3.2, 7.2], fov: 34 }}
        dpr={[1, 1.65]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#f4f1e8']} />
        <fog attach="fog" args={['#f4f1e8', 9, 22]} />
        <ambientLight intensity={0.92} />
        <hemisphereLight args={['#fff8ea', '#b9c4bb', 0.58]} />
        <directionalLight position={[4.5, 7, 4.5]} intensity={2.2} color="#fff4df" castShadow />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.26, 0]} receiveShadow>
          <circleGeometry args={[4.2, 72]} />
          <shadowMaterial transparent opacity={0.14} />
        </mesh>
        <ConfiguratorErrorBoundary
          resetKey={stack.join('-')}
          fallback={<CanvasMessage title="Could not load SOL X GLB files." paths={expectedPaths} />}
        >
          <Suspense fallback={<CanvasMessage title="Loading SOL X parts..." />}>
            <StackAssembly stack={stack} />
            <Environment preset="studio" />
          </Suspense>
        </ConfiguratorErrorBoundary>
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          enablePan={false}
          minDistance={3}
          maxDistance={13}
          minPolarAngle={Math.PI * 0.18}
          maxPolarAngle={Math.PI * 0.78}
        />
      </Canvas>
    </div>
  );
}

export default function SolXConfigurator({ onNavigate }) {
  const [stack, setStack] = useState(defaultSolXStack);
  const [autoRotate, setAutoRotate] = useState(true);

  const addPart = (partKey) => {
    setStack((current) => [...current, partKey]);
  };

  const removeTop = () => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  };

  const resetStack = () => {
    setStack(defaultSolXStack);
  };

  const movePart = (index, direction) => {
    setStack((current) => {
      const target = index + direction;
      if (index === 0 || target < 1 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <main className="route-page configurator-page" data-music-section="solX">
      <section className="configurator-shell">
        <div className="configurator-copy">
          <p className="section-kicker">SOL X Configurator</p>
          <h1>SOL X Configurator</h1>
          <p className="configurator-subtitle">Build your modular lighting stack.</p>
          <p>
            SOL X uses modular components, magnetic alignment, and pogo pin connectivity to make lighting feel like a calm physical system instead of a fixed object.
          </p>

          <div className="configurator-actions" aria-label="Add SOL X parts">
            {solxPartOrder.map((partKey) => (
              <button type="button" key={partKey} onClick={() => addPart(partKey)}>
                <Plus size={15} />
                <span>{solxParts[partKey].label}</span>
              </button>
            ))}
          </div>

          <div className="configurator-secondary-actions">
            <button type="button" onClick={removeTop} disabled={stack.length <= 1}>
              <Trash2 size={15} />
              <span>Remove Top</span>
            </button>
            <button type="button" onClick={resetStack}>
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
            <button type="button" className={autoRotate ? 'active' : ''} onClick={() => setAutoRotate((current) => !current)}>
              <span>{autoRotate ? 'Auto Rotate On' : 'Auto Rotate Off'}</span>
            </button>
          </div>

          <div className="configurator-stack-card">
            <div className="configurator-stack-card__header">
              <span>Current stack</span>
              <strong>{stack.length} part{stack.length === 1 ? '' : 's'}</strong>
            </div>
            <ol>
              {[...stack].reverse().map((partKey, reversedIndex) => {
                const index = stack.length - 1 - reversedIndex;
                const locked = index === 0;
                return (
                  <li key={`${partKey}-${index}`}>
                    <span>{solxParts[partKey].label}</span>
                    <small>{locked ? 'Locked base' : `Layer ${index + 1}`}</small>
                    <div>
                      <button type="button" onClick={() => movePart(index, 1)} disabled={locked || index === stack.length - 1} aria-label={`Move ${solxParts[partKey].label} up`}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onClick={() => movePart(index, -1)} disabled={locked || index === 1} aria-label={`Move ${solxParts[partKey].label} down`}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="route-actions">
            <AppLink to="/shop" onNavigate={onNavigate}>Back to Shop</AppLink>
            <AppLink to="/sol-x" onNavigate={onNavigate}>Back to SOL X</AppLink>
          </div>
        </div>

        <ConfiguratorViewer stack={stack} autoRotate={autoRotate} />
      </section>
    </main>
  );
}

solxPartOrder.forEach((partKey) => useGLTF.preload(solxParts[partKey].file));
