import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bounds, Environment, Html, OrbitControls, useBounds, useGLTF } from '@react-three/drei';
import { Copy, MousePointer2, RotateCcw, Trash2 } from 'lucide-react';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import AppLink from './AppLink.jsx';
import { shadeColorOptions, solxPartOrder, solxParts } from '../data/solxParts.js';

const MODEL_SCALE = 8.5;
const CONNECTOR_GAP = 0.004;
const SNAP_RADIUS = 112;
const FEEDBACK_TIMEOUT = 2600;
const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const TORUS_FORWARD = new THREE.Vector3(0, 0, 1);
const STARTER_BASE_ID = 'starter-base';

const createStarterScene = () => [
  {
    id: STARTER_BASE_ID,
    partKey: 'base',
    color: 'white',
    parentId: null,
    locked: true,
  },
];

const vectorFromArray = (value, fallback = [0, 0, 0]) => new THREE.Vector3(...(value ?? fallback));

const quaternionFromDirection = (direction) => new THREE.Quaternion().setFromUnitVectors(LOCAL_UP, direction.clone().normalize());

const connectorQuaternion = (direction) => new THREE.Quaternion().setFromUnitVectors(TORUS_FORWARD, direction.clone().normalize());

const isShade = (partKey) => solxParts[partKey]?.type === 'shade';

function getConnectionMessage(parentPartKey, childPartKey) {
  const parent = solxParts[parentPartKey];
  const child = solxParts[childPartKey];

  if (!parent || !child) return 'This part cannot connect there.';
  if (parent.type === 'base' && child.type === 'shade') return '';
  if (parent.type === 'shade' && child.type === 'base') return '';
  if (parent.type === 'shade' && child.type === 'divider') return '';
  if (parent.type === 'divider' && child.type === 'shade') return '';

  if (parent.type === 'base' && child.type === 'divider') return 'Dividers only go between shades.';
  if (parent.type === 'base' && child.type === 'base') return 'Bases cannot connect to bases.';
  if (parent.type === 'shade' && child.type === 'shade') return 'Use a divider between two shades.';
  if (parent.type === 'divider' && child.type === 'divider') return 'Dividers cannot connect in a row.';
  if (parent.type === 'divider' && !isShade(childPartKey)) return 'Dividers only connect to shades.';

  return 'This part cannot connect there.';
}

function buildChildMap(parts) {
  const childByParent = new Map();
  parts.forEach((part) => {
    if (part.parentId) childByParent.set(part.parentId, part.id);
  });
  return childByParent;
}

function getBranchIds(parts, rootId) {
  const ids = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    parts.forEach((part) => {
      if (part.parentId && ids.has(part.parentId) && !ids.has(part.id)) {
        ids.add(part.id);
        changed = true;
      }
    });
  }

  return ids;
}

function buildBuilderLayout(parts) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const childrenByParent = new Map();
  parts.forEach((part) => {
    if (!part.parentId) return;
    if (!childrenByParent.has(part.parentId)) childrenByParent.set(part.parentId, []);
    childrenByParent.get(part.parentId).push(part.id);
  });

  const placements = new Map();

  const placePart = (part, position = new THREE.Vector3(0, 0, 0), quaternion = new THREE.Quaternion()) => {
    placements.set(part.id, { id: part.id, partKey: part.partKey, position, quaternion });
    const children = childrenByParent.get(part.id) ?? [];
    const partConfig = solxParts[part.partKey];
    const outputDirection = vectorFromArray(partConfig.outputDirection, [0, 1, 0]).applyQuaternion(quaternion).normalize();
    const outputOffset = vectorFromArray(partConfig.outputOffset, [0, partConfig.height / MODEL_SCALE, 0]).applyQuaternion(quaternion);
    const connectorPosition = position
      .clone()
      .add(outputOffset)
      .add(outputDirection.clone().multiplyScalar(CONNECTOR_GAP));

    children.forEach((childId) => {
      const child = partsById.get(childId);
      if (!child) return;
      placePart(child, connectorPosition.clone(), quaternionFromDirection(outputDirection));
    });
  };

  const root = parts.find((part) => !part.parentId) ?? parts[0];
  if (root) placePart(root);

  return {
    placements,
    partsById,
    childByParent: buildChildMap(parts),
  };
}

function buildOutputConnectors(parts, layout) {
  return parts
    .map((part) => {
      const placement = layout.placements.get(part.id);
      const partConfig = solxParts[part.partKey];
      if (!placement || !partConfig) return null;

      const direction = vectorFromArray(partConfig.outputDirection, [0, 1, 0]).applyQuaternion(placement.quaternion).normalize();
      const position = placement.position
        .clone()
        .add(vectorFromArray(partConfig.outputOffset, [0, partConfig.height / MODEL_SCALE, 0]).applyQuaternion(placement.quaternion))
        .add(direction.clone().multiplyScalar(CONNECTOR_GAP));

      return {
        id: `${part.id}:output`,
        partId: part.id,
        partKey: part.partKey,
        childId: layout.childByParent.get(part.id) ?? null,
        position,
        direction,
      };
    })
    .filter(Boolean);
}

function eligibleConnectorsForDrag(drag, connectorScreens, parts) {
  if (!drag) return [];

  const branchIds = drag.kind === 'existing' ? getBranchIds(parts, drag.id) : new Set();
  return connectorScreens.filter((connector) => {
    if (branchIds.has(connector.partId)) return false;
    if (connector.childId && connector.childId !== drag.id) return false;
    return !getConnectionMessage(connector.partKey, drag.partKey);
  });
}

function nearestConnectorForPoint(drag, connectorScreens, parts, x, y) {
  let nearest = null;
  let nearestDistance = Infinity;

  eligibleConnectorsForDrag(drag, connectorScreens, parts).forEach((connector) => {
    const distance = Math.hypot(connector.screenX - x, connector.screenY - y);
    if (distance < SNAP_RADIUS && distance < nearestDistance) {
      nearest = connector;
      nearestDistance = distance;
    }
  });

  return nearest;
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

function SolPartModel({ colorKey, partKey }) {
  const part = solxParts[partKey];
  const option = shadeColorOptions[colorKey] ?? shadeColorOptions.white;
  const { scene } = useGLTF(part.file);

  const clone = useMemo(() => {
    const next = scene.clone(true);
    const inputAnchor = vectorFromArray(part.inputAnchor);
    const targetColor = new THREE.Color(option.swatch);
    next.position.copy(inputAnchor.multiplyScalar(-1));

    next.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const nextMaterials = materials.map((material) => {
        const nextMaterial = material.clone();
        nextMaterial.roughness = Math.min(nextMaterial.roughness ?? 0.66, 0.78);
        nextMaterial.metalness = Math.max(nextMaterial.metalness ?? 0, 0.015);
        if (nextMaterial.color && nextMaterial.name?.toLowerCase().includes('3d print')) {
          nextMaterial.color.copy(targetColor);
        }
        return nextMaterial;
      });
      child.material = Array.isArray(child.material) ? nextMaterials : nextMaterials[0];
    });

    return next;
  }, [option.swatch, part.inputAnchor, part.file, scene]);

  return <primitive object={clone} />;
}

function SelectionGlow({ placement }) {
  return (
    <group position={placement.position} quaternion={placement.quaternion}>
      <mesh quaternion={connectorQuaternion(LOCAL_UP)}>
        <torusGeometry args={[0.096, 0.004, 16, 72]} />
        <meshBasicMaterial color="#809b8b" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.014, 18, 12]} />
        <meshBasicMaterial color="#809b8b" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ConnectorTarget({ active, connector }) {
  return (
    <group position={connector.position} quaternion={connectorQuaternion(connector.direction)}>
      <mesh>
        <torusGeometry args={[0.084, active ? 0.006 : 0.004, 20, 96]} />
        <meshBasicMaterial color={active ? '#ce9644' : '#9ab4a4'} transparent opacity={active ? 0.92 : 0.5} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[active ? 0.018 : 0.012, 18, 12]} />
        <meshBasicMaterial color={active ? '#ce9644' : '#9ab4a4'} transparent opacity={active ? 0.72 : 0.38} depthWrite={false} />
      </mesh>
    </group>
  );
}

function PlacedPart({ dragActive, onBeginSceneDrag, onSelect, part, placement, selected }) {
  return (
    <group
      position={placement.position}
      quaternion={placement.quaternion}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(part.id);
        if (!part.locked) {
          onBeginSceneDrag(event.nativeEvent, part.id);
        }
      }}
    >
      <SolPartModel partKey={part.partKey} colorKey={part.color} />
      {selected && <SelectionGlow placement={{ position: new THREE.Vector3(0, 0, 0), quaternion: new THREE.Quaternion() }} />}
      {dragActive && !part.locked && (
        <mesh>
          <sphereGeometry args={[0.18, 32, 18]} />
          <meshBasicMaterial color="#ce9644" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function ConnectorProjectionSync({ connectorScreensRef, connectors }) {
  const { camera, gl } = useThree();

  useFrame(() => {
    const rect = gl.domElement.getBoundingClientRect();
    connectorScreensRef.current = connectors.map((connector) => {
      const projected = connector.position.clone().multiplyScalar(MODEL_SCALE).project(camera);
      return {
        ...connector,
        screenX: rect.left + ((projected.x + 1) / 2) * rect.width,
        screenY: rect.top + ((1 - projected.y) / 2) * rect.height,
      };
    });
  });

  return null;
}

function CameraResetter({ controlsRef, resetToken }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(5.8, 3.8, 8.4);
    camera.fov = 34;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.7, 0);
      controlsRef.current.update();
    }
  }, [camera, controlsRef, resetToken]);

  return null;
}

function FitSceneToParts({ signature }) {
  const bounds = useBounds();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bounds.refresh().clip().fit();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [bounds, signature]);

  return null;
}

function BuilderScene({
  activeDrag,
  connectorScreensRef,
  connectors,
  hoverConnectorId,
  layout,
  onBeginSceneDrag,
  onClearSelection,
  onSelect,
  parts,
  resetCameraToken,
  selectedId,
}) {
  const controlsRef = useRef(null);
  const eligibleConnectorIds = useMemo(() => {
    if (!activeDrag) return new Set();
    return new Set(eligibleConnectorsForDrag(activeDrag, connectors, parts).map((connector) => connector.id));
  }, [activeDrag, connectors, parts]);
  const expectedPaths = solxPartOrder.map((key) => solxParts[key].expectedPath);
  const partsSignature = parts.map((part) => `${part.id}:${part.partKey}:${part.parentId ?? 'root'}`).join('|');

  return (
    <Canvas
      camera={{ position: [5.8, 3.8, 8.4], fov: 34 }}
      dpr={[1, 1.65]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onPointerMissed={onClearSelection}
    >
      <color attach="background" args={['#f4f1e8']} />
      <fog attach="fog" args={['#f4f1e8', 9, 24]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#fff8ea', '#b9c4bb', 0.58]} />
      <directionalLight position={[4.5, 7, 4.5]} intensity={2.15} color="#fff4df" castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[5.2, 96]} />
        <shadowMaterial transparent opacity={0.13} />
      </mesh>
      <ConfiguratorErrorBoundary
        resetKey={parts.map((part) => `${part.id}-${part.partKey}`).join('-')}
        fallback={<CanvasMessage title="Could not load SOL X GLB files." paths={expectedPaths} />}
      >
        <Suspense fallback={<CanvasMessage title="Loading SOL X parts..." />}>
          <Bounds fit clip observe margin={3.25}>
            <FitSceneToParts signature={partsSignature} />
            <group scale={MODEL_SCALE}>
              {parts.map((part) => {
                const placement = layout.placements.get(part.id);
                if (!placement) return null;
                return (
                  <PlacedPart
                    key={part.id}
                    dragActive={activeDrag?.kind === 'existing' && activeDrag.id === part.id}
                    onBeginSceneDrag={onBeginSceneDrag}
                    onSelect={onSelect}
                    part={part}
                    placement={placement}
                    selected={selectedId === part.id}
                  />
                );
              })}
              {connectors
                .filter((connector) => eligibleConnectorIds.has(connector.id))
                .map((connector) => (
                  <ConnectorTarget key={connector.id} connector={connector} active={hoverConnectorId === connector.id} />
                ))}
            </group>
          </Bounds>
          <Environment preset="studio" />
          <ConnectorProjectionSync connectors={connectors} connectorScreensRef={connectorScreensRef} />
        </Suspense>
      </ConfiguratorErrorBoundary>
      <OrbitControls
        ref={controlsRef}
        enabled={!activeDrag}
        enablePan
        autoRotate={false}
        minDistance={3}
        maxDistance={16}
        minPolarAngle={Math.PI * 0.16}
        maxPolarAngle={Math.PI * 0.82}
      />
      <CameraResetter controlsRef={controlsRef} resetToken={resetCameraToken} />
    </Canvas>
  );
}

export default function SolXConfigurator({ onNavigate }) {
  const [parts, setParts] = useState(createStarterScene);
  const [selectedId, setSelectedId] = useState(STARTER_BASE_ID);
  const [feedback, setFeedback] = useState('Drag a module near a glowing connector and release to snap.');
  const [activeDrag, setActiveDrag] = useState(null);
  const [hoverConnectorId, setHoverConnectorId] = useState(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const idCounter = useRef(1);
  const viewerRef = useRef(null);
  const feedbackTimeout = useRef(null);
  const connectorScreensRef = useRef([]);
  const partsRef = useRef(parts);
  const activeDragRef = useRef(activeDrag);

  const layout = useMemo(() => buildBuilderLayout(parts), [parts]);
  const connectors = useMemo(() => buildOutputConnectors(parts, layout), [layout, parts]);
  const selectedPart = parts.find((part) => part.id === selectedId) ?? null;

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  useEffect(() => {
    activeDragRef.current = activeDrag;
  }, [activeDrag]);

  const showFeedback = useCallback((message, persistent = false) => {
    setFeedback(message);
    window.clearTimeout(feedbackTimeout.current);
    if (!persistent) {
      feedbackTimeout.current = window.setTimeout(() => {
        setFeedback('Drag a module near a glowing connector and release to snap.');
      }, FEEDBACK_TIMEOUT);
    }
  }, []);

  const startDrag = useCallback((event, drag) => {
    event.preventDefault();
    const nextDrag = {
      ...drag,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    };
    setActiveDrag(nextDrag);
    setHoverConnectorId(null);
    showFeedback('Move it near a glowing connector.', true);
  }, [showFeedback]);

  const beginTrayDrag = useCallback((event, partKey) => {
    startDrag(event, { kind: 'new', partKey });
  }, [startDrag]);

  const beginSceneDrag = useCallback((event, id) => {
    const part = partsRef.current.find((nextPart) => nextPart.id === id);
    if (!part || part.locked) return;
    startDrag(event, { kind: 'existing', id, partKey: part.partKey });
  }, [startDrag]);

  const finishDrop = useCallback((event) => {
    const drag = activeDragRef.current;
    if (!drag) return;

    const target = nearestConnectorForPoint(drag, connectorScreensRef.current, partsRef.current, event.clientX, event.clientY);
    const viewerBounds = viewerRef.current?.getBoundingClientRect();
    const insideViewer = viewerBounds
      ? event.clientX >= viewerBounds.left && event.clientX <= viewerBounds.right && event.clientY >= viewerBounds.top && event.clientY <= viewerBounds.bottom
      : false;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8;

    if (target) {
      if (drag.kind === 'new') {
        const id = `${drag.partKey}-${idCounter.current}`;
        idCounter.current += 1;
        setParts((current) => [
          ...current,
          {
            id,
            partKey: drag.partKey,
            color: 'white',
            parentId: target.partId,
            locked: false,
          },
        ]);
        setSelectedId(id);
      } else {
        setParts((current) => current.map((part) => (part.id === drag.id ? { ...part, parentId: target.partId } : part)));
        setSelectedId(drag.id);
      }

      showFeedback(solxParts[drag.partKey].type === 'divider' ? 'Add a shade to finish this connector.' : 'Snapped into place.');
    } else if (insideViewer && moved) {
      showFeedback('This part cannot connect there.');
    }

    setActiveDrag(null);
    setHoverConnectorId(null);
  }, [showFeedback]);

  useEffect(() => {
    if (!activeDrag) return undefined;

    const handlePointerMove = (event) => {
      setActiveDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const target = nearestConnectorForPoint(activeDragRef.current, connectorScreensRef.current, partsRef.current, event.clientX, event.clientY);
      setHoverConnectorId(target?.id ?? null);
    };

    const handlePointerUp = (event) => finishDrop(event);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, finishDrop]);

  const updateSelectedColor = (color) => {
    if (!selectedPart) return;
    setParts((current) => current.map((part) => (part.id === selectedPart.id ? { ...part, color } : part)));
  };

  const deleteSelectedPart = () => {
    if (!selectedPart || selectedPart.locked) {
      showFeedback('The starter base stays locked.');
      return;
    }

    const parent = parts.find((part) => part.id === selectedPart.parentId);
    const deleteRootId = parent && solxParts[parent.partKey].type === 'divider' ? parent.id : selectedPart.id;
    const deleteIds = getBranchIds(parts, deleteRootId);
    setParts((current) => current.filter((part) => !deleteIds.has(part.id)));
    setSelectedId(parent && !deleteIds.has(parent.id) ? parent.id : STARTER_BASE_ID);
    showFeedback('Removed selected connection.');
  };

  const resetScene = () => {
    idCounter.current = 1;
    const nextScene = createStarterScene();
    setParts(nextScene);
    setSelectedId(STARTER_BASE_ID);
    setActiveDrag(null);
    setHoverConnectorId(null);
    showFeedback('Scene reset to the starter base.');
  };

  const resetColors = () => {
    setParts((current) => current.map((part) => ({ ...part, color: 'white' })));
    showFeedback('Colors reset.');
  };

  return (
    <main className="route-page configurator-page" data-music-section="solX">
      <section className="configurator-shell configurator-shell--builder">
        <div className="configurator-copy builder-copy">
          <p className="section-kicker">SOL X Configurator</p>
          <h1>SOL X Builder</h1>
          <p className="configurator-subtitle">Drag, snap, and shape a modular lighting system.</p>
          <p>
            Start from the locked base, then pull modules into the scene. Compatible connector rings glow softly when a part can snap into place.
          </p>

          <div className="builder-panel">
            <div className="builder-panel__header">
              <span>Parts tray</span>
              <small>Drag into scene</small>
            </div>
            <div className="parts-tray" aria-label="SOL X parts tray">
              {solxPartOrder.map((partKey) => (
                <button
                  type="button"
                  key={partKey}
                  className="parts-tray__item"
                  onPointerDown={(event) => beginTrayDrag(event, partKey)}
                >
                  <MousePointer2 size={15} />
                  <span>{solxParts[partKey].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="builder-panel builder-selection">
            <div className="builder-panel__header">
              <span>Selected part</span>
              <small>{selectedPart ? solxParts[selectedPart.partKey].label : 'None'}</small>
            </div>

            {selectedPart ? (
              <>
                <div className="shade-color-picker shade-color-picker--builder" aria-label="Selected part color">
                  <p>Color</p>
                  <div>
                    {Object.entries(shadeColorOptions).map(([key, option]) => (
                      <button
                        type="button"
                        key={key}
                        className={selectedPart.color === key ? 'active' : ''}
                        onClick={() => updateSelectedColor(key)}
                        aria-pressed={selectedPart.color === key}
                      >
                        <span style={{ '--swatch': option.swatch }} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="builder-tool-row">
                  <button type="button" onClick={deleteSelectedPart} disabled={selectedPart.locked}>
                    <Trash2 size={15} />
                    <span>{selectedPart.locked ? 'Starter Locked' : 'Delete Part'}</span>
                  </button>
                  <button type="button" onClick={resetColors}>
                    <Copy size={15} />
                    <span>Reset Colors</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="builder-empty-selection">Click a module in the scene to tune its color or remove it.</p>
            )}
          </div>

          <div className="builder-tool-row">
            <button type="button" onClick={resetScene}>
              <RotateCcw size={15} />
              <span>Reset Scene</span>
            </button>
            <button type="button" onClick={() => setResetCameraToken((token) => token + 1)}>
              <RotateCcw size={15} />
              <span>Reset Camera</span>
            </button>
          </div>

          <div className={`configurator-feedback builder-feedback${feedback ? ' is-visible' : ''}`} role="status" aria-live="polite">
            {feedback}
          </div>

          <div className="route-actions">
            <AppLink to="/shop" onNavigate={onNavigate}>Back to Shop</AppLink>
            <AppLink to="/sol-x" onNavigate={onNavigate}>Back to SOL X</AppLink>
          </div>
        </div>

        <div ref={viewerRef} className="configurator-viewer builder-viewer" aria-label="Interactive SOL X modular builder">
          <BuilderScene
            activeDrag={activeDrag}
            connectorScreensRef={connectorScreensRef}
            connectors={connectors}
            hoverConnectorId={hoverConnectorId}
            layout={layout}
            onBeginSceneDrag={beginSceneDrag}
            onClearSelection={() => {
              if (!activeDragRef.current) setSelectedId(null);
            }}
            onSelect={setSelectedId}
            parts={parts}
            resetCameraToken={resetCameraToken}
            selectedId={selectedId}
          />
        </div>

        {activeDrag && (
          <div className="builder-drag-ghost" style={{ left: activeDrag.x, top: activeDrag.y }}>
            {solxParts[activeDrag.partKey].label}
          </div>
        )}
      </section>
    </main>
  );
}

solxPartOrder.forEach((partKey) => useGLTF.preload(solxParts[partKey].file));
