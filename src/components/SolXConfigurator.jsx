import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bounds, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import {
  Camera,
  Copy,
  Download,
  FolderOpen,
  MousePointer2,
  RotateCcw,
  RotateCw,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import AppLink from './AppLink.jsx';
import { shadeColorOptions, solxBuilderConfig, solxPartOrder, solxParts } from '../data/solxParts.js';

const MODEL_SCALE = 8.5;
const CONNECTOR_GAP = 0.004;
const SNAP_RADIUS = 112;
const FEEDBACK_TIMEOUT = 2600;
const FLOOR_Y = -0.05;
const FLOOR_LIMIT = 0.88;
const FLOOR_SNAP = 0.045;
const FLOOR_FINE_SNAP = 0.015;
const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const TORUS_FORWARD = new THREE.Vector3(0, 0, 1);
const DEFAULT_CAMERA = {
  position: [7.2, 5.1, 9.2],
  target: [0, 0.46, 0],
  fov: 40,
};

const vectorFromArray = (value, fallback = [0, 0, 0]) => new THREE.Vector3(...(value ?? fallback));

const rotationFromArray = (value) => new THREE.Euler(...(value ?? [0, 0, 0]), 'XYZ');

const quaternionFromRotation = (value) => new THREE.Quaternion().setFromEuler(rotationFromArray(value));

const quaternionFromDirection = (direction) => new THREE.Quaternion().setFromUnitVectors(LOCAL_UP, direction.clone().normalize());

const connectorQuaternion = (direction) => new THREE.Quaternion().setFromUnitVectors(TORUS_FORWARD, direction.clone().normalize());

const isShade = (partKey) => solxParts[partKey]?.type === 'shade';

const createStarterScene = () => solxBuilderConfig.defaultScene.map((part) => ({
  id: part.id,
  partKey: part.moduleId,
  color: part.color,
  parentId: part.parentId,
  position: part.position,
  rotation: part.rotation,
}));

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

function clampFloorValue(value) {
  return Math.max(-FLOOR_LIMIT, Math.min(FLOOR_LIMIT, value));
}

function snapFloorValue(value, fineSnap) {
  const step = fineSnap ? FLOOR_FINE_SNAP : FLOOR_SNAP;
  return clampFloorValue(Math.round(value / step) * step);
}

function normalizeFloorPosition(position, fineSnap = false) {
  return [
    snapFloorValue(Number(position?.[0]) || 0, fineSnap),
    0,
    snapFloorValue(Number(position?.[2]) || 0, fineSnap),
  ];
}

function canPlaceOnFloor(drag, freePlacement) {
  if (!drag) return false;
  return drag.partKey === 'base' || freePlacement;
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
    if (!partConfig) return;

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

  const roots = parts.filter((part) => !part.parentId);
  roots.forEach((root, index) => {
    const fallbackPosition = [index * 0.22, 0, 0];
    placePart(root, vectorFromArray(root.position, fallbackPosition), quaternionFromRotation(root.rotation));
  });

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

function findIncompleteDividers(parts, layout) {
  return parts.filter((part) => solxParts[part.partKey]?.type === 'divider' && !layout.childByParent.has(part.id));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sanitizeLoadedParts(savedParts) {
  if (!Array.isArray(savedParts)) return createStarterScene();
  const knownIds = new Set(savedParts.map((part) => part.id).filter(Boolean));

  const sanitized = savedParts
    .filter((part) => part?.id && solxParts[part.partKey])
    .map((part) => ({
      id: String(part.id),
      partKey: part.partKey,
      color: shadeColorOptions[part.color] ? part.color : solxBuilderConfig.defaultColor,
      parentId: part.parentId && knownIds.has(part.parentId) ? String(part.parentId) : null,
      position: normalizeFloorPosition(part.position ?? solxParts[part.partKey].defaultRootPosition, true),
      rotation: Array.isArray(part.rotation) && part.rotation.length === 3 ? part.rotation.map((value) => Number(value) || 0) : [0, 0, 0],
    }));

  return sanitized.length ? sanitized : createStarterScene();
}

function nextCounterFromParts(parts) {
  return parts.reduce((max, part) => {
    const match = part.id.match(/-(\d+)$/);
    return Math.max(max, match ? Number(match[1]) + 1 : max);
  }, 2);
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

function isTintableMaterial(material, part) {
  if (!material?.color) return false;
  const name = material.name?.toLowerCase() ?? '';
  if (name.includes('black') || name.includes('magnet') || name.includes('metal')) return false;
  if (name.includes('3d print') || name.includes('opaque') || name.includes('plastic')) return true;

  const color = material.color;
  const brightness = (color.r + color.g + color.b) / 3;
  return part.type !== 'divider' && brightness > 0.54 && (material.metalness ?? 0) < 0.22;
}

function SolPartModel({ colorKey, partKey }) {
  const part = solxParts[partKey];
  const option = shadeColorOptions[colorKey] ?? shadeColorOptions.white;
  const { scene } = useGLTF(part.file);

  const clone = useMemo(() => {
    const next = scene.clone(true);
    const inputAnchor = vectorFromArray(part.inputAnchor);
    const targetColor = new THREE.Color(option.materialColor ?? option.swatch);
    next.position.copy(inputAnchor.multiplyScalar(-1));

    next.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const nextMaterials = materials.map((material) => {
        const nextMaterial = material.clone();
        nextMaterial.roughness = Math.min(nextMaterial.roughness ?? 0.58, 0.66);
        nextMaterial.metalness = Math.min(nextMaterial.metalness ?? 0, 0.05);

        if (isTintableMaterial(nextMaterial, part)) {
          nextMaterial.color.copy(targetColor);
          nextMaterial.transparent = true;
          nextMaterial.opacity = option.opacity ?? 0.78;
          nextMaterial.depthWrite = (option.opacity ?? 0.78) >= 0.86;
          if ('transmission' in nextMaterial) nextMaterial.transmission = option.transmission ?? nextMaterial.transmission ?? 0;
          if ('thickness' in nextMaterial) nextMaterial.thickness = Math.max(nextMaterial.thickness ?? 0, 0.12);
          if ('ior' in nextMaterial) nextMaterial.ior = 1.34;
        }

        return nextMaterial;
      });
      child.material = Array.isArray(child.material) ? nextMaterials : nextMaterials[0];
    });

    return next;
  }, [option.materialColor, option.opacity, option.swatch, option.transmission, part, scene]);

  return <primitive object={clone} />;
}

function SelectionGlow() {
  return (
    <group>
      <mesh quaternion={connectorQuaternion(LOCAL_UP)}>
        <torusGeometry args={[0.102, 0.0045, 16, 80]} />
        <meshBasicMaterial color="#819d8b" transparent opacity={0.76} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.017, 18, 12]} />
        <meshBasicMaterial color="#819d8b" transparent opacity={0.44} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ConnectorTarget({ active, connector }) {
  return (
    <group position={connector.position} quaternion={connectorQuaternion(connector.direction)}>
      <mesh>
        <torusGeometry args={[0.088, active ? 0.0065 : 0.004, 20, 96]} />
        <meshBasicMaterial color={active ? '#d4a35d' : '#95aa9d'} transparent opacity={active ? 0.94 : 0.5} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[active ? 0.019 : 0.012, 18, 12]} />
        <meshBasicMaterial color={active ? '#d4a35d' : '#95aa9d'} transparent opacity={active ? 0.72 : 0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FloorPlacementTarget({ position }) {
  return (
    <group position={[position[0] * MODEL_SCALE, FLOOR_Y + 0.012, position[2] * MODEL_SCALE]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.34, 0.43, 80]} />
        <meshBasicMaterial color="#8aa493" transparent opacity={0.44} depthWrite={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.28, 80]} />
        <meshBasicMaterial color="#8aa493" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FloorGrid({ visible }) {
  const gridRef = useRef(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const materials = Array.isArray(gridRef.current.material) ? gridRef.current.material : [gridRef.current.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.22;
      material.depthWrite = false;
    });
  }, []);

  if (!visible) return null;

  return <gridHelper ref={gridRef} args={[12, 24, '#9dad9f', '#ded8ca']} position={[0, FLOOR_Y + 0.006, 0]} />;
}

function PlacedPart({ dragActive, onBeginSceneDrag, onSelect, part, placement, selected }) {
  return (
    <group
      position={placement.position}
      quaternion={placement.quaternion}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(part.id);
        onBeginSceneDrag(event.nativeEvent, part.id);
      }}
    >
      <SolPartModel partKey={part.partKey} colorKey={part.color} />
      {selected && <SelectionGlow />}
      {dragActive && (
        <mesh>
          <sphereGeometry args={[0.18, 32, 18]} />
          <meshBasicMaterial color="#d4a35d" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function SceneProjectionSync({ connectorScreensRef, connectors, screenToFloorRef }) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y), []);
  const floorPoint = useMemo(() => new THREE.Vector3(), []);

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

    screenToFloorRef.current = (clientX, clientY, fineSnap = false) => {
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(floorPlane, floorPoint);
      if (!hit) return null;
      return normalizeFloorPosition([floorPoint.x / MODEL_SCALE, 0, floorPoint.z / MODEL_SCALE], fineSnap);
    };
  });

  return null;
}

function CameraRig({ controlsRef, resetToken }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA.position);
    camera.fov = DEFAULT_CAMERA.fov;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(...DEFAULT_CAMERA.target);
      controlsRef.current.update();
    }
  }, [camera, controlsRef, resetToken]);

  return null;
}

function BuilderScene({
  activeDrag,
  connectorScreensRef,
  connectors,
  floorHover,
  freePlacement,
  gridVisible,
  hoverConnectorId,
  layout,
  lightingMode,
  onBeginSceneDrag,
  onClearSelection,
  onSelect,
  parts,
  resetCameraToken,
  screenToFloorRef,
  selectedId,
}) {
  const controlsRef = useRef(null);
  const eligibleConnectorIds = useMemo(() => {
    if (!activeDrag) return new Set();
    return new Set(eligibleConnectorsForDrag(activeDrag, connectors, parts).map((connector) => connector.id));
  }, [activeDrag, connectors, parts]);
  const expectedPaths = solxPartOrder.map((key) => solxParts[key].expectedPath);
  const resetKey = parts.map((part) => `${part.id}-${part.partKey}`).join('-');
  const canDropOnFloor = canPlaceOnFloor(activeDrag, freePlacement);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA.position, fov: DEFAULT_CAMERA.fov }}
      dpr={[1, 1.65]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onPointerMissed={onClearSelection}
    >
      <color attach="background" args={['#f4f0e6']} />
      <fog attach="fog" args={['#f4f0e6', 10, 26]} />
      <ambientLight intensity={lightingMode === 'gallery' ? 1.08 : 0.92} />
      <hemisphereLight args={['#fff6e5', '#aebcaf', lightingMode === 'gallery' ? 0.72 : 0.6]} />
      <directionalLight position={[4.8, 8, 5.2]} intensity={lightingMode === 'gallery' ? 2.55 : 2.22} color="#fff2dc" castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <circleGeometry args={[6.3, 128]} />
        <meshStandardMaterial color="#f1ede2" roughness={0.9} metalness={0} />
      </mesh>
      <FloorGrid visible={gridVisible} />
      {floorHover && canDropOnFloor && <FloorPlacementTarget position={floorHover} />}
      <ConfiguratorErrorBoundary resetKey={resetKey} fallback={<CanvasMessage title="Could not load SOL X GLB files." paths={expectedPaths} />}>
        <Suspense fallback={<CanvasMessage title="Loading SOL X parts..." />}>
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
          <Environment preset={lightingMode === 'gallery' ? 'apartment' : 'studio'} />
          <SceneProjectionSync connectors={connectors} connectorScreensRef={connectorScreensRef} screenToFloorRef={screenToFloorRef} />
        </Suspense>
      </ConfiguratorErrorBoundary>
      <OrbitControls
        ref={controlsRef}
        enabled={!activeDrag}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        enablePan
        screenSpacePanning
        zoomSpeed={0.72}
        panSpeed={0.82}
        rotateSpeed={0.58}
        minDistance={3.2}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.86}
      />
      <CameraRig controlsRef={controlsRef} resetToken={resetCameraToken} />
    </Canvas>
  );
}

function PartPreviewIcon({ partKey }) {
  return (
    <div className="parts-tray__preview" aria-hidden="true">
      <Canvas camera={{ position: [0.7, 0.46, 0.9], fov: 34 }} dpr={[1, 1.4]} frameloop="demand" gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.15} />
        <directionalLight position={[2, 3, 2]} intensity={1.9} color="#fff4de" />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.18}>
            <group scale={4.2}>
              <SolPartModel partKey={partKey} colorKey="white" />
            </group>
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
}

function SolLampGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="29" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14.5 25.5C14.5 17.6 25.5 17.6 25.5 25.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M20 14.5V8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15.4 12.1L12.6 8.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24.6 12.1L27.4 8.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function SolXConfigurator({ onNavigate }) {
  const [parts, setParts] = useState(createStarterScene);
  const [selectedId, setSelectedId] = useState('base-1');
  const [feedback, setFeedback] = useState('Drop bases onto the floor, then snap modules onto glowing connectors.');
  const [activeDrag, setActiveDrag] = useState(null);
  const [hoverConnectorId, setHoverConnectorId] = useState(null);
  const [floorHover, setFloorHover] = useState(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showAdvancedDisclaimer, setShowAdvancedDisclaimer] = useState(false);
  const [freePlacement, setFreePlacement] = useState(false);
  const [fineSnap, setFineSnap] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [lightingMode, setLightingMode] = useState('studio');
  const idCounter = useRef(2);
  const viewerRef = useRef(null);
  const feedbackTimeout = useRef(null);
  const connectorScreensRef = useRef([]);
  const screenToFloorRef = useRef(null);
  const partsRef = useRef(parts);
  const activeDragRef = useRef(activeDrag);

  const layout = useMemo(() => buildBuilderLayout(parts), [parts]);
  const connectors = useMemo(() => buildOutputConnectors(parts, layout), [layout, parts]);
  const selectedPart = parts.find((part) => part.id === selectedId) ?? null;
  const selectedPartLabel = selectedPart ? solxParts[selectedPart.partKey].label : 'None';
  const rootBaseCount = parts.filter((part) => !part.parentId && part.partKey === 'base').length;

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  useEffect(() => {
    activeDragRef.current = activeDrag;
  }, [activeDrag]);

  useEffect(() => () => window.clearTimeout(feedbackTimeout.current), []);

  const showFeedback = useCallback((message, persistent = false) => {
    setFeedback(message);
    window.clearTimeout(feedbackTimeout.current);
    if (!persistent) {
      feedbackTimeout.current = window.setTimeout(() => {
        setFeedback('Drop bases onto the floor, then snap modules onto glowing connectors.');
      }, FEEDBACK_TIMEOUT);
    }
  }, []);

  const createPart = useCallback((partKey, overrides = {}) => {
    const id = `${partKey}-${idCounter.current}`;
    idCounter.current += 1;
    return {
      id,
      partKey,
      color: overrides.color ?? solxBuilderConfig.defaultColor,
      parentId: overrides.parentId ?? null,
      position: overrides.position ?? solxParts[partKey].defaultRootPosition ?? [0, 0, 0],
      rotation: overrides.rotation ?? solxParts[partKey].defaultRootRotation ?? [0, 0, 0],
    };
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
    setFloorHover(null);
    showFeedback(drag.partKey === 'base' ? 'Drop it on the floor or snap it to a shade.' : 'Move it near a glowing connector.', true);
  }, [showFeedback]);

  const beginTrayDrag = useCallback((event, partKey) => {
    startDrag(event, { kind: 'new', partKey });
  }, [startDrag]);

  const beginSceneDrag = useCallback((event, id) => {
    const part = partsRef.current.find((nextPart) => nextPart.id === id);
    if (!part) return;
    startDrag(event, { kind: 'existing', id, partKey: part.partKey });
  }, [startDrag]);

  const finishDrop = useCallback((event) => {
    const drag = activeDragRef.current;
    if (!drag) return;

    const currentParts = partsRef.current;
    const target = nearestConnectorForPoint(drag, connectorScreensRef.current, currentParts, event.clientX, event.clientY);
    const viewerBounds = viewerRef.current?.getBoundingClientRect();
    const insideViewer = viewerBounds
      ? event.clientX >= viewerBounds.left && event.clientX <= viewerBounds.right && event.clientY >= viewerBounds.top && event.clientY <= viewerBounds.bottom
      : false;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8;
    const floorPosition = screenToFloorRef.current?.(event.clientX, event.clientY, fineSnap) ?? null;

    if (target) {
      if (drag.kind === 'new') {
        const nextPart = createPart(drag.partKey, { parentId: target.partId });
        setParts((current) => [...current, nextPart]);
        setSelectedId(nextPart.id);
      } else {
        setParts((current) => current.map((part) => (part.id === drag.id ? { ...part, parentId: target.partId } : part)));
        setSelectedId(drag.id);
      }

      showFeedback(solxParts[drag.partKey].type === 'divider' ? 'Add a shade to finish this connector.' : 'Snapped into place.');
    } else if (insideViewer && floorPosition && canPlaceOnFloor(drag, freePlacement)) {
      if (drag.kind === 'new') {
        const nextPart = createPart(drag.partKey, { position: floorPosition, parentId: null });
        setParts((current) => [...current, nextPart]);
        setSelectedId(nextPart.id);
      } else {
        setParts((current) => current.map((part) => (part.id === drag.id ? { ...part, parentId: null, position: floorPosition } : part)));
        setSelectedId(drag.id);
      }
      showFeedback(drag.partKey === 'base' ? 'Base placed on the floor.' : 'Placed in experimental free mode.');
    } else if (insideViewer && moved) {
      showFeedback('This part cannot connect there.');
    }

    setActiveDrag(null);
    setHoverConnectorId(null);
    setFloorHover(null);
  }, [createPart, fineSnap, freePlacement, showFeedback]);

  useEffect(() => {
    if (!activeDrag) return undefined;

    const handlePointerMove = (event) => {
      setActiveDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      const target = nearestConnectorForPoint(activeDragRef.current, connectorScreensRef.current, partsRef.current, event.clientX, event.clientY);
      setHoverConnectorId(target?.id ?? null);
      const floorPosition = screenToFloorRef.current?.(event.clientX, event.clientY, fineSnap) ?? null;
      setFloorHover(floorPosition && canPlaceOnFloor(activeDragRef.current, freePlacement) ? floorPosition : null);
    };

    const handlePointerUp = (event) => finishDrop(event);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, fineSnap, finishDrop, freePlacement]);

  const updateSelectedColor = (color) => {
    if (!selectedPart) return;
    setParts((current) => current.map((part) => (part.id === selectedPart.id ? { ...part, color } : part)));
  };

  const deleteSelectedPart = () => {
    if (!selectedPart) {
      showFeedback('Select a part first.');
      return;
    }

    const parent = parts.find((part) => part.id === selectedPart.parentId);
    const deleteRootId = parent && solxParts[parent.partKey].type === 'divider' ? parent.id : selectedPart.id;
    const deleteIds = getBranchIds(parts, deleteRootId);
    const remaining = parts.filter((part) => !deleteIds.has(part.id));

    if (!remaining.length) {
      const nextScene = createStarterScene();
      setParts(nextScene);
      setSelectedId(nextScene[0].id);
      idCounter.current = nextCounterFromParts(nextScene);
      showFeedback('Scene reset to one starter base.');
      return;
    }

    setParts(remaining);
    setSelectedId(parent && !deleteIds.has(parent.id) ? parent.id : remaining[0]?.id ?? null);
    showFeedback('Removed selected connection.');
  };

  const resetScene = () => {
    const nextScene = createStarterScene();
    idCounter.current = nextCounterFromParts(nextScene);
    setParts(nextScene);
    setSelectedId(nextScene[0].id);
    setActiveDrag(null);
    setHoverConnectorId(null);
    setFloorHover(null);
    showFeedback('Scene reset to one starter base.');
  };

  const resetColors = () => {
    setParts((current) => current.map((part) => ({ ...part, color: solxBuilderConfig.defaultColor })));
    showFeedback('Colors reset.');
  };

  const duplicateSelectedPart = () => {
    if (!selectedPart) {
      showFeedback('Select a part first.');
      return;
    }

    if (selectedPart.partKey !== 'base' && !freePlacement) {
      showFeedback('Turn on experimental free placement to duplicate loose modules.');
      return;
    }

    const placement = layout.placements.get(selectedPart.id);
    const position = placement
      ? normalizeFloorPosition([placement.position.x + 0.16, 0, placement.position.z + 0.12], fineSnap)
      : normalizeFloorPosition([0.16, 0, 0.12], fineSnap);
    const euler = placement ? new THREE.Euler().setFromQuaternion(placement.quaternion, 'XYZ') : rotationFromArray(selectedPart.rotation);
    const duplicate = createPart(selectedPart.partKey, {
      color: selectedPart.color,
      parentId: null,
      position,
      rotation: [euler.x, euler.y, euler.z],
    });
    setParts((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
    showFeedback('Duplicated selected part.');
  };

  const nudgeSelectedRoot = (dx, dz) => {
    if (!selectedPart) {
      showFeedback('Select a floor part first.');
      return;
    }

    if (selectedPart.parentId && !freePlacement) {
      showFeedback('Manual move is for floor roots.');
      return;
    }

    setParts((current) => current.map((part) => {
      if (part.id !== selectedPart.id) return part;
      const currentPosition = part.position ?? [0, 0, 0];
      return {
        ...part,
        parentId: part.parentId && freePlacement ? null : part.parentId,
        position: normalizeFloorPosition([currentPosition[0] + dx, 0, currentPosition[2] + dz], fineSnap),
      };
    }));
  };

  const rotateSelectedRoot = (amount) => {
    if (!selectedPart) {
      showFeedback('Select a floor part first.');
      return;
    }

    if (selectedPart.parentId && !freePlacement) {
      showFeedback('Manual rotate is for floor roots.');
      return;
    }

    setParts((current) => current.map((part) => {
      if (part.id !== selectedPart.id) return part;
      const rotation = part.rotation ?? [0, 0, 0];
      return {
        ...part,
        parentId: part.parentId && freePlacement ? null : part.parentId,
        rotation: [rotation[0], rotation[1] + amount, rotation[2]],
      };
    }));
  };

  const saveBuild = () => {
    const incompleteDividers = findIncompleteDividers(parts, layout);
    if (incompleteDividers.length) {
      showFeedback('Add a shade to finish each divider before saving.');
      return;
    }

    const payload = {
      version: 2,
      savedAt: new Date().toISOString(),
      modules: parts.map((part) => {
        const placement = layout.placements.get(part.id);
        const euler = placement ? new THREE.Euler().setFromQuaternion(placement.quaternion, 'XYZ') : rotationFromArray(part.rotation);
        return {
          id: part.id,
          moduleId: part.partKey,
          partKey: part.partKey,
          label: solxParts[part.partKey].label,
          model: solxParts[part.partKey].file,
          color: part.color,
          parentId: part.parentId,
          position: placement ? [placement.position.x, placement.position.y, placement.position.z] : (part.position ?? [0, 0, 0]),
          rootPosition: part.position ?? null,
          rotation: [euler.x, euler.y, euler.z],
          rootRotation: part.rotation ?? null,
        };
      }),
    };

    window.localStorage.setItem(solxBuilderConfig.storageKey, JSON.stringify(payload));
    showFeedback('Build saved to this browser.');
  };

  const loadSavedBuild = () => {
    const payload = safeJsonParse(window.localStorage.getItem(solxBuilderConfig.storageKey));
    if (!payload?.modules?.length) {
      showFeedback('No saved build found.');
      return;
    }

    const loadedParts = sanitizeLoadedParts(payload.modules.map((part) => ({
      ...part,
      partKey: part.partKey ?? part.moduleId,
    })));
    idCounter.current = nextCounterFromParts(loadedParts);
    setParts(loadedParts);
    setSelectedId(loadedParts[0]?.id ?? null);
    showFeedback('Saved build loaded.');
  };

  const clearSavedBuild = () => {
    window.localStorage.removeItem(solxBuilderConfig.storageKey);
    showFeedback('Saved build cleared.');
  };

  const takeScreenshot = () => {
    const canvas = viewerRef.current?.querySelector('canvas');
    if (!canvas) {
      showFeedback('Screenshot is not ready yet.');
      return;
    }

    try {
      const link = document.createElement('a');
      link.download = 'sol-configurator-build.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showFeedback('Screenshot saved.');
    } catch {
      showFeedback('Screenshot could not be saved.');
    }
  };

  const toggleAdvanced = () => {
    const hasSeenDisclaimer = window.localStorage.getItem(solxBuilderConfig.disclaimerKey) === 'true';
    if (!hasSeenDisclaimer) {
      setShowAdvancedDisclaimer(true);
      return;
    }
    setAdvancedOpen((current) => !current);
  };

  const acceptAdvancedDisclaimer = () => {
    window.localStorage.setItem(solxBuilderConfig.disclaimerKey, 'true');
    setShowAdvancedDisclaimer(false);
    setAdvancedOpen(true);
  };

  return (
    <main className="route-page configurator-page configurator-page--immersive" data-music-section="solX">
      <section className="configurator-stage" aria-label="SOL X creative builder">
        <div ref={viewerRef} className="configurator-viewer configurator-viewer--immersive" aria-label="Interactive SOL X modular builder">
          <BuilderScene
            activeDrag={activeDrag}
            connectorScreensRef={connectorScreensRef}
            connectors={connectors}
            floorHover={floorHover}
            freePlacement={freePlacement}
            gridVisible={gridVisible}
            hoverConnectorId={hoverConnectorId}
            layout={layout}
            lightingMode={lightingMode}
            onBeginSceneDrag={beginSceneDrag}
            onClearSelection={() => {
              if (!activeDragRef.current) setSelectedId(null);
            }}
            onSelect={setSelectedId}
            parts={parts}
            resetCameraToken={resetCameraToken}
            screenToFloorRef={screenToFloorRef}
            selectedId={selectedId}
          />

          <div className="builder-hud" aria-label="SOL X builder tools">
            <div className="builder-glass builder-title-panel">
              <p className="section-kicker">SOL X Configurator</p>
              <h1>SOL X Builder</h1>
              <span>{parts.length} modules / {rootBaseCount} floor bases</span>
              <div className="builder-title-links">
                <AppLink to="/shop" onNavigate={onNavigate}>Shop</AppLink>
                <AppLink to="/sol-x" onNavigate={onNavigate}>SOL X</AppLink>
              </div>
            </div>

            <div className="builder-glass builder-tray-panel">
              <div className="builder-panel__header">
                <span>Parts</span>
                <small>Drag into scene</small>
              </div>
              <div className="parts-tray parts-tray--icons" aria-label="SOL X parts tray">
                {solxPartOrder.map((partKey) => (
                  <button
                    type="button"
                    key={partKey}
                    className="parts-tray__item parts-tray__item--icon"
                    onPointerDown={(event) => beginTrayDrag(event, partKey)}
                  >
                    <PartPreviewIcon partKey={partKey} />
                    <span>{solxParts[partKey].shortLabel ?? solxParts[partKey].label}</span>
                    <MousePointer2 size={13} />
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-glass builder-inspector-panel">
              <div className="builder-panel__header">
                <span>Selected</span>
                <small>{selectedPartLabel}</small>
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
                  <div className="builder-tool-row builder-tool-row--compact">
                    <button type="button" onClick={deleteSelectedPart}>
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                    <button type="button" onClick={duplicateSelectedPart}>
                      <Copy size={15} />
                      <span>Duplicate</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="builder-empty-selection">Select a module to tune its color or remove it.</p>
              )}
            </div>

            <div className="builder-glass builder-action-panel">
              <button type="button" onClick={saveBuild}>
                <Save size={15} />
                <span>Save build</span>
              </button>
              <button type="button" onClick={loadSavedBuild}>
                <FolderOpen size={15} />
                <span>Load saved build</span>
              </button>
              <button type="button" onClick={clearSavedBuild}>
                <X size={15} />
                <span>Clear saved build</span>
              </button>
              <button type="button" onClick={resetScene}>
                <RotateCcw size={15} />
                <span>Reset scene</span>
              </button>
              <button type="button" onClick={() => setResetCameraToken((token) => token + 1)}>
                <Camera size={15} />
                <span>Reset camera</span>
              </button>
              <button type="button" onClick={takeScreenshot}>
                <Download size={15} />
                <span>Screenshot</span>
              </button>
            </div>

            <button type="button" className="advanced-lamp-button" onClick={toggleAdvanced} aria-expanded={advancedOpen}>
              <SolLampGlyph />
              <span className="visually-hidden">Advanced controls</span>
            </button>

            {advancedOpen && (
              <div className="builder-glass builder-advanced-panel">
                <div className="builder-panel__header">
                  <span>Advanced</span>
                  <button type="button" onClick={() => setAdvancedOpen(false)} aria-label="Close advanced controls">
                    <X size={14} />
                  </button>
                </div>
                <div className="advanced-control-grid">
                  <button type="button" className={fineSnap ? 'active' : ''} onClick={() => setFineSnap((current) => !current)}>
                    Fine snap
                  </button>
                  <button type="button" className={gridVisible ? 'active' : ''} onClick={() => setGridVisible((current) => !current)}>
                    Grid
                  </button>
                  <button type="button" className={freePlacement ? 'active experimental' : 'experimental'} onClick={() => setFreePlacement((current) => !current)}>
                    Experimental free placement
                  </button>
                  <button type="button" onClick={() => setLightingMode((current) => (current === 'studio' ? 'gallery' : 'studio'))}>
                    {lightingMode === 'studio' ? 'Gallery light' : 'Studio light'}
                  </button>
                </div>
                <div className="manual-transform">
                  <p>Manual move</p>
                  <div>
                    <button type="button" onClick={() => nudgeSelectedRoot(0, -FLOOR_SNAP)}>Forward</button>
                    <button type="button" onClick={() => nudgeSelectedRoot(-FLOOR_SNAP, 0)}>Left</button>
                    <button type="button" onClick={() => nudgeSelectedRoot(FLOOR_SNAP, 0)}>Right</button>
                    <button type="button" onClick={() => nudgeSelectedRoot(0, FLOOR_SNAP)}>Back</button>
                    <button type="button" onClick={() => rotateSelectedRoot(-Math.PI / 12)}>
                      <RotateCcw size={14} />
                      Rotate
                    </button>
                    <button type="button" onClick={() => rotateSelectedRoot(Math.PI / 12)}>
                      <RotateCw size={14} />
                      Rotate
                    </button>
                  </div>
                </div>
                <button type="button" className="reset-colors-button" onClick={resetColors}>
                  Reset colors
                </button>
              </div>
            )}

            <div className={`configurator-feedback builder-feedback builder-feedback--toast${feedback ? ' is-visible' : ''}`} role="status" aria-live="polite">
              {feedback}
            </div>
          </div>

          {showAdvancedDisclaimer && (
            <div className="builder-modal-backdrop" role="presentation">
              <div className="builder-glass builder-disclaimer-modal" role="dialog" aria-modal="true" aria-labelledby="advanced-disclaimer-title">
                <p className="section-kicker" id="advanced-disclaimer-title">Advanced mode</p>
                <p>
                  Advanced mode lets you explore more experimental SOL compositions. Some combinations made here may not be purchasable or physically buildable yet, so treat this space like a creative artwork tool for imagining what SOL could become.
                </p>
                <div className="builder-tool-row">
                  <button type="button" onClick={acceptAdvancedDisclaimer}>
                    <SlidersHorizontal size={15} />
                    <span>Continue</span>
                  </button>
                  <button type="button" onClick={() => setShowAdvancedDisclaimer(false)}>
                    <X size={15} />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
