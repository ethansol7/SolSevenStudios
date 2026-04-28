import { Canvas } from '@react-three/fiber';
import { Bounds, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Component, Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import AppLink from './AppLink.jsx';
import { defaultSolXStack, shadeColorOptions, solxPartOrder, solxParts } from '../data/solxParts.js';

const MODEL_SCALE = 8.5;
const CONNECTOR_GAP = 0.004;
const FEEDBACK_TIMEOUT = 2600;
const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const LAYOUT_PADDING = 0.095;

const isShade = (partKey) => solxParts[partKey]?.type === 'shade';

function validateStack(stack, { allowTrailingDivider = false } = {}) {
  if (!stack.length || stack[0] !== 'base') {
    return { valid: false, message: 'Start with the base.' };
  }

  if (!allowTrailingDivider && solxParts[stack.at(-1)]?.type === 'divider') {
    return { valid: false, message: 'Dividers only go between shades.' };
  }

  for (let index = 1; index < stack.length; index += 1) {
    const previous = solxParts[stack[index - 1]];
    const current = solxParts[stack[index]];

    if (!previous || !current) {
      return { valid: false, message: 'This part cannot go here.' };
    }

    if (previous.type === 'base' && current.type !== 'shade') {
      return { valid: false, message: current.type === 'base' ? 'Bases cannot stack on bases.' : 'A shade needs to sit on the base.' };
    }

    if (previous.type === 'shade' && current.type === 'shade') {
      return { valid: false, message: 'Use a divider between two shades.' };
    }

    if (previous.type === 'divider' && current.type !== 'shade') {
      return { valid: false, message: 'Dividers only go between shades.' };
    }
  }

  return { valid: true, message: '' };
}

function nextPartMessage(partKey, stack, pendingDivider) {
  if (pendingDivider) {
    return isShade(partKey) ? '' : 'Choose a shade to finish the divider connection.';
  }

  const topPart = solxParts[stack.at(-1)];
  const nextPart = solxParts[partKey];

  if (!topPart || !nextPart) return 'This part cannot go here.';
  if (topPart.type === 'base') {
    if (nextPart.type === 'base') return 'Bases cannot stack on bases.';
    if (nextPart.type === 'divider') return 'A divider needs a shade below it.';
    return '';
  }

  if (topPart.type === 'shade') {
    if (nextPart.type === 'shade') return 'Use a divider between two shades.';
    return '';
  }

  if (topPart.type === 'divider') {
    return isShade(partKey) ? '' : 'Dividers only go between shades.';
  }

  return '';
}

const isMoveValid = (stack, index, direction) => {
  return Boolean(findClosestValidMove(stack, index, direction));
};

function moveItem(stack, fromIndex, toIndex) {
  const next = [...stack];
  const [part] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, part);
  return next;
}

function findClosestValidMove(stack, index, direction) {
  if (index === 0) return null;

  for (let target = index + direction; target > 0 && target < stack.length; target += direction) {
    const next = moveItem(stack, index, target);
    if (validateStack(next).valid) {
      return next;
    }
  }

  return null;
}

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

function findMaterialByName(scene, namePart) {
  const match = namePart.toLowerCase();
  let material = null;

  scene.traverse((child) => {
    if (material || !child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    material = materials.find((nextMaterial) => nextMaterial?.name?.toLowerCase().includes(match)) ?? null;
  });

  return material;
}

function vectorFromArray(value, fallback = [0, 0, 0]) {
  return new THREE.Vector3(...(value ?? fallback));
}

function quaternionFromDirection(direction) {
  return new THREE.Quaternion().setFromUnitVectors(LOCAL_UP, direction.clone().normalize());
}

function buildConnectorLayout(stack) {
  let connectorPosition = new THREE.Vector3(0, 0, 0);
  let connectorDirection = LOCAL_UP.clone();
  const points = [connectorPosition.clone()];
  const placements = stack.map((partKey, index) => {
    const part = solxParts[partKey];
    const quaternion = quaternionFromDirection(connectorDirection);
    const placement = {
      id: `${partKey}-${index}`,
      partKey,
      position: connectorPosition.clone(),
      quaternion,
    };

    const outputOffset = vectorFromArray(part.outputOffset, [0, part.height / MODEL_SCALE, 0]).applyQuaternion(quaternion);
    connectorDirection = vectorFromArray(part.outputDirection, [0, 1, 0]).applyQuaternion(quaternion).normalize();
    connectorPosition = connectorPosition
      .clone()
      .add(outputOffset)
      .add(connectorDirection.clone().multiplyScalar(CONNECTOR_GAP));
    points.push(connectorPosition.clone());

    return placement;
  });

  const box = new THREE.Box3().setFromPoints(points);
  box.expandByScalar(LAYOUT_PADDING);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  return {
    frameSize: [
      Math.max(0.34, size.x),
      Math.max(0.34, size.y),
      Math.max(0.34, size.z),
    ],
    placements: placements.map((placement) => ({
      ...placement,
      position: placement.position.sub(center).toArray(),
      quaternion: placement.quaternion.toArray(),
    })),
  };
}

function StackModel({ partKey, shadeColor }) {
  const part = solxParts[partKey];
  const { scene } = useGLTF(part.file);

  const clone = useMemo(() => {
    const next = scene.clone(true);
    const inputAnchor = vectorFromArray(part.inputAnchor);
    next.position.copy(inputAnchor.multiplyScalar(-1));
    const shadeColorMaterial = part.type === 'shade' ? findMaterialByName(scene, shadeColorOptions[shadeColor].materialName) : null;

    next.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.min(child.material.roughness ?? 0.66, 0.78);
        child.material.metalness = Math.max(child.material.metalness ?? 0, 0.015);
        if (part.type === 'shade' && child.material.name?.toLowerCase().includes('3d print') && shadeColorMaterial?.color) {
          child.material.color.copy(shadeColorMaterial.color);
          child.material.transparent = child.material.transparent || shadeColorMaterial.transparent;
          child.material.opacity = Math.min(child.material.opacity ?? 1, shadeColorMaterial.opacity ?? 1);
          child.material.transmission = child.material.transmission ?? shadeColorMaterial.transmission ?? 0;
          child.material.depthWrite = child.material.opacity >= 1;
        } else if (part.tint && child.material.color) {
          child.material.color.lerp(new THREE.Color(part.tint), 0.18);
        }
      }
    });

    return next;
  }, [part.inputAnchor, part.tint, part.type, scene, shadeColor]);

  return (
    <primitive object={clone} />
  );
}

function StackAssembly({ shadeColor, stack }) {
  const { frameSize, placements } = useMemo(() => buildConnectorLayout(stack), [stack]);

  return (
    <Bounds fit clip observe margin={1.28}>
      <group scale={MODEL_SCALE}>
        <mesh>
          <boxGeometry args={frameSize} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {placements.map((placement) => (
          <group key={placement.id} position={placement.position} quaternion={placement.quaternion}>
            <StackModel partKey={placement.partKey} shadeColor={shadeColor} />
          </group>
        ))}
      </group>
    </Bounds>
  );
}

function ConfiguratorViewer({ autoRotate, shadeColor, stack }) {
  const expectedPaths = solxPartOrder.map((key) => solxParts[key].expectedPath);

  return (
    <div className="configurator-viewer" aria-label="Interactive SOL X configurator viewer">
      <Canvas
        camera={{ position: [5.8, 3.8, 8.4], fov: 34 }}
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
            <StackAssembly stack={stack} shadeColor={shadeColor} />
            <Environment preset="studio" />
          </Suspense>
        </ConfiguratorErrorBoundary>
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          enablePan={false}
          minDistance={3}
          maxDistance={16}
          minPolarAngle={Math.PI * 0.18}
          maxPolarAngle={Math.PI * 0.78}
        />
      </Canvas>
    </div>
  );
}

export default function SolXConfigurator({ onNavigate }) {
  const [stack, setStack] = useState(defaultSolXStack);
  const [feedback, setFeedback] = useState('');
  const [shadeColor, setShadeColor] = useState('white');
  const [autoRotate, setAutoRotate] = useState(true);
  const feedbackTimeout = useRef(null);

  const showFeedback = (message) => {
    setFeedback(message);
    window.clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = window.setTimeout(() => setFeedback(''), FEEDBACK_TIMEOUT);
  };

  const addPart = (partKey, message) => {
    if (message) {
      showFeedback(message);
      return;
    }

    setStack((current) => {
      const next = [...current, partKey];
      const result = validateStack(next, { allowTrailingDivider: partKey === 'divider' });
      if (!result.valid) {
        showFeedback(result.message);
        return current;
      }
      showFeedback(partKey === 'divider' ? 'Choose a shade to finish the divider connection.' : '');
      return next;
    });
  };

  const removeTop = () => {
    setStack((current) => {
      if (current.length <= 1) return current;
      setFeedback('');
      return current.slice(0, -1);
    });
  };

  const resetStack = () => {
    setStack(defaultSolXStack);
    setFeedback('');
  };

  const movePart = (index, direction) => {
    setStack((current) => {
      const next = findClosestValidMove(current, index, direction);
      if (!next) {
        showFeedback("This part can't move any further with the current stack.");
        return current;
      }
      setFeedback('');
      return next;
    });
  };

  const validation = validateStack(stack);
  const isTrailingDivider = solxParts[stack.at(-1)]?.type === 'divider';

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
              <span
                className="configurator-action-wrap"
                key={partKey}
                onClick={() => {
                  const message = nextPartMessage(partKey, stack, isTrailingDivider);
                  if (message) showFeedback(message);
                }}
              >
                <button
                  type="button"
                  disabled={Boolean(nextPartMessage(partKey, stack, isTrailingDivider))}
                  onClick={() => addPart(partKey, nextPartMessage(partKey, stack, isTrailingDivider))}
                >
                  <Plus size={15} />
                  <span>{solxParts[partKey].label}</span>
                </button>
              </span>
            ))}
          </div>

          <div className="shade-color-picker" aria-label="Shade color">
            <p>Shade color</p>
            <div>
              {Object.entries(shadeColorOptions).map(([key, option]) => (
                <button
                  type="button"
                  key={key}
                  className={shadeColor === key ? 'active' : ''}
                  onClick={() => setShadeColor(key)}
                  aria-pressed={shadeColor === key}
                >
                  <span style={{ '--swatch': option.swatch }} />
                  {option.label}
                </button>
              ))}
            </div>
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

          <div className={`configurator-feedback${feedback || !validation.valid ? ' is-visible' : ''}`} role="status" aria-live="polite">
            {feedback || (!validation.valid ? (isTrailingDivider ? 'Choose a shade to finish the divider connection.' : validation.message) : 'Only compatible parts are available for the next layer.')}
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
                const canMoveUp = isMoveValid(stack, index, 1);
                const canMoveDown = isMoveValid(stack, index, -1);
                return (
                  <li key={`${partKey}-${index}`} className={partKey === 'divider' && index === stack.length - 1 ? 'pending' : undefined}>
                    <span>{solxParts[partKey].label}</span>
                    <small>{locked ? 'Locked base' : partKey === 'divider' && index === stack.length - 1 ? 'Needs shade' : `Layer ${index + 1}`}</small>
                    <div>
                      <button
                        type="button"
                        onClick={() => movePart(index, 1)}
                        disabled={locked}
                        className={!locked && !canMoveUp ? 'soft-disabled' : undefined}
                        aria-label={`Move ${solxParts[partKey].label} up`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePart(index, -1)}
                        disabled={locked}
                        className={!locked && !canMoveDown ? 'soft-disabled' : undefined}
                        aria-label={`Move ${solxParts[partKey].label} down`}
                      >
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

        <ConfiguratorViewer stack={stack} autoRotate={autoRotate} shadeColor={shadeColor} />
      </section>
    </main>
  );
}

solxPartOrder.forEach((partKey) => useGLTF.preload(solxParts[partKey].file));
