import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bounds, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  DollarSign,
  FolderOpen,
  HelpCircle,
  Maximize2,
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
import { trackConfiguratorInteraction } from '../analytics.js';
import { estimateSolXBuild, formatPricingValue, solxPricing } from '../data/pricing.js';
import { shadeColorOptions, solxBuilderConfig, solxPartOrder, solxParts } from '../data/solxParts.js';

const MODEL_SCALE = 8.5;
const CONNECTOR_GAP = 0.004;
const SNAP_RADIUS = 112;
const FEEDBACK_TIMEOUT = 2600;
const FLOOR_Y = -0.05;
const FLOOR_LIMIT = 0.88;
const FLOOR_SNAP = 0.045;
const FLOOR_FINE_SNAP = 0.015;
const DEFAULT_BUILD_NAME = 'Untitled SOL Build';
const PENTAGON_POINTS = 5;
const PENTAGON_STEP = (Math.PI * 2) / PENTAGON_POINTS;
const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const TORUS_FORWARD = new THREE.Vector3(0, 0, 1);
const DEFAULT_CAMERA = {
  position: [7.2, 5.1, 9.2],
  target: [0, 0.46, 0],
  fov: 40,
};
const MOBILE_CAMERA = {
  position: [8.6, 5.65, 10.8],
  target: [0, -0.18, 0],
  fov: 42,
};
const TUTORIAL_KEY = 'sol-seven-solx-builder-tutorial-v1';
const tutorialSteps = [
  {
    title: 'Move through the space',
    body: 'Drag to orbit, pinch or scroll to zoom, and pan when you want to frame a larger build.',
  },
  {
    title: 'Start with a base',
    body: 'On mobile, tap Base, then tap the highlighted floor target. On desktop, drag bases onto the floor.',
  },
  {
    title: 'Follow the glowing connectors',
    body: 'Tap or drag shades, dividers, and bases onto the soft connector markers. Invalid connectors stay quiet.',
  },
  {
    title: 'Rotate by SOL points',
    body: 'Use rotate left and right to step the selected module through five 72 degree magnet positions.',
  },
  {
    title: 'Tune and keep the build',
    body: 'Select any part to change its translucent color, then save, screenshot, or estimate the build price.',
  },
];

function useMobileBuilderMode() {
  const [isMobileBuilder, setIsMobileBuilder] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px), (pointer: coarse), (max-width: 960px) and (orientation: landscape)');
    const syncMode = () => setIsMobileBuilder(media.matches);

    syncMode();
    media.addEventListener('change', syncMode);
    return () => media.removeEventListener('change', syncMode);
  }, []);

  return isMobileBuilder;
}

const vectorFromArray = (value, fallback = [0, 0, 0]) => new THREE.Vector3(...(value ?? fallback));

const rotationFromArray = (value) => new THREE.Euler(...(value ?? [0, 0, 0]), 'XYZ');

const quaternionFromRotation = (value) => new THREE.Quaternion().setFromEuler(rotationFromArray(value));

const quaternionFromDirection = (direction) => new THREE.Quaternion().setFromUnitVectors(LOCAL_UP, direction.clone().normalize());

const connectorSpinQuaternion = (part) => new THREE.Quaternion().setFromAxisAngle(LOCAL_UP, part?.rotation?.[1] ?? 0);

const quaternionForConnectedPart = (direction, part) => quaternionFromDirection(direction).multiply(connectorSpinQuaternion(part));

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

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
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

function getRootPart(parts, partId) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  let current = partsById.get(partId) ?? null;
  const visited = new Set();

  while (current?.parentId && partsById.has(current.parentId) && !visited.has(current.id)) {
    visited.add(current.id);
    current = partsById.get(current.parentId);
  }

  return current;
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function nearestPentagonIndex(angle) {
  return Math.round(normalizeAngle(angle) / PENTAGON_STEP) % PENTAGON_POINTS;
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
      placePart(child, connectorPosition.clone(), quaternionForConnectedPart(outputDirection, child));
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
        nextMaterial.roughness = Math.min(nextMaterial.roughness ?? 0.58, 0.72);
        nextMaterial.metalness = Math.min(nextMaterial.metalness ?? 0, 0.05);

        if (isTintableMaterial(nextMaterial, part)) {
          nextMaterial.color.copy(targetColor);
          nextMaterial.transparent = true;
          nextMaterial.opacity = option.opacity ?? 0.78;
          nextMaterial.depthWrite = true;
          nextMaterial.depthTest = true;
          nextMaterial.alphaTest = 0.02;
          nextMaterial.premultipliedAlpha = true;
          nextMaterial.envMapIntensity = 0.24;
          if (nextMaterial.emissive && option.emissive) {
            nextMaterial.emissive.copy(new THREE.Color(option.emissive));
            nextMaterial.emissiveIntensity = 0.045;
          }
          if ('transmission' in nextMaterial) nextMaterial.transmission = option.transmission ?? nextMaterial.transmission ?? 0;
          if ('thickness' in nextMaterial) nextMaterial.thickness = Math.max(nextMaterial.thickness ?? 0, 0.18);
          if ('ior' in nextMaterial) nextMaterial.ior = 1.34;
        } else if (nextMaterial.color) {
          nextMaterial.color.multiplyScalar(0.86);
          nextMaterial.roughness = Math.min(nextMaterial.roughness ?? 0.6, 0.7);
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
        <torusGeometry args={[0.102, 0.0038, 16, 80]} />
        <meshBasicMaterial color="#6f8978" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.017, 18, 12]} />
        <meshBasicMaterial color="#6f8978" transparent opacity={0.28} depthWrite={false} />
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
      <mesh position={[0, 0, active ? 0.078 : 0.062]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[active ? 0.022 : 0.017, active ? 0.052 : 0.04, 5]} />
        <meshBasicMaterial color={active ? '#d4a35d' : '#95aa9d'} transparent opacity={active ? 0.78 : 0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

function PentagonalRotationGuide({ activeIndex, onRotateToSnap, target }) {
  const radius = 0.255;
  const points = useMemo(() => Array.from({ length: PENTAGON_POINTS }, (_, index) => {
    const angle = -Math.PI / 2 + index * PENTAGON_STEP;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }), []);
  const pentagonGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([...points, points[0]]), [points]);

  useEffect(() => () => pentagonGeometry.dispose(), [pentagonGeometry]);

  if (!target) return null;

  return (
    <group position={[target.position.x, FLOOR_Y / MODEL_SCALE + 0.03, target.position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.004, radius + 0.004, 96]} />
        <meshBasicMaterial color="#7e9888" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <line geometry={pentagonGeometry}>
        <lineBasicMaterial color="#789181" transparent opacity={0.34} depthWrite={false} />
      </line>
      {points.map((point, index) => (
        <mesh
          key={`pentagon-point-${index}`}
          position={[point.x, point.y + 0.006, point.z]}
          onPointerDown={(event) => {
            event.stopPropagation();
            onRotateToSnap(index);
          }}
        >
          <sphereGeometry args={[activeIndex === index ? 0.019 : 0.014, 18, 12]} />
          <meshBasicMaterial
            color={activeIndex === index ? '#d69b42' : '#8aa493'}
            transparent
            opacity={activeIndex === index ? 0.9 : 0.62}
            depthWrite={false}
          />
        </mesh>
      ))}
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

function PartContactShadow({ partKey, placement }) {
  const partType = solxParts[partKey]?.type;
  const radius = partKey === 's04' ? 0.2 : partType === 'shade' ? 0.155 : 0.118;
  const opacity = partType === 'divider' ? 0.14 : 0.22;

  return (
    <mesh position={[placement.position.x, FLOOR_Y / MODEL_SCALE + 0.003, placement.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 72]} />
      <meshBasicMaterial color="#6f6659" transparent opacity={opacity} depthWrite={false} />
    </mesh>
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

function CameraRig({ controlsRef, fitToken, layout, mobile, resetToken }) {
  const { camera } = useThree();
  const cameraProfile = mobile ? MOBILE_CAMERA : DEFAULT_CAMERA;

  useEffect(() => {
    camera.position.set(...cameraProfile.position);
    camera.fov = cameraProfile.fov;
    camera.far = 90;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(...cameraProfile.target);
      controlsRef.current.update();
    }
  }, [camera, cameraProfile, controlsRef, resetToken]);

  useEffect(() => {
    if (!fitToken || !layout?.placements?.size) return;

    const points = Array.from(layout.placements.values()).map((placement) => placement.position.clone().multiplyScalar(MODEL_SCALE));
    const box = new THREE.Box3().setFromPoints(points);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const buildRadius = Math.max(size.length(), 2.8);
    const distance = Math.min(Math.max(buildRadius * 1.45, 8.2), 30);
    const cameraOffset = new THREE.Vector3(distance * 0.62, distance * 0.46, distance * 0.78);

    center.y = mobile ? Math.max(center.y + 0.24, 0.28) : Math.max(center.y + 0.65, 0.9);
    camera.position.copy(center.clone().add(cameraOffset));
    camera.fov = cameraProfile.fov;
    camera.far = 90;
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [camera, cameraProfile, controlsRef, fitToken, layout, mobile]);

  return null;
}

function BuilderScene({
  activeDrag,
  connectorScreensRef,
  connectors,
  fitCameraToken,
  floorHover,
  freePlacement,
  gridVisible,
  hoverConnectorId,
  layout,
  lightingMode,
  mobile,
  onBeginSceneDrag,
  onCanvasTap,
  onClearSelection,
  onRotateToSnap,
  onSelect,
  parts,
  placementIntent,
  resetCameraToken,
  rotationTarget,
  screenToFloorRef,
  selectedId,
}) {
  const controlsRef = useRef(null);
  const eligibleConnectorIds = useMemo(() => {
    if (!placementIntent) return new Set();
    return new Set(eligibleConnectorsForDrag(placementIntent, connectors, parts).map((connector) => connector.id));
  }, [connectors, parts, placementIntent]);
  const expectedPaths = solxPartOrder.map((key) => solxParts[key].expectedPath);
  const resetKey = parts.map((part) => `${part.id}-${part.partKey}`).join('-');
  const canDropOnFloor = canPlaceOnFloor(placementIntent, freePlacement);
  const floorTarget = floorHover ?? (canDropOnFloor && placementIntent?.kind === 'new' && placementIntent.partKey === 'base' ? [0, 0, 0] : null);

  return (
    <Canvas
      camera={{ position: (mobile ? MOBILE_CAMERA : DEFAULT_CAMERA).position, fov: (mobile ? MOBILE_CAMERA : DEFAULT_CAMERA).fov, far: 90 }}
      dpr={[1, 1.65]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onPointerDown={(event) => {
        if (!activeDrag && placementIntent) onCanvasTap(event.nativeEvent);
      }}
      onPointerMissed={(event) => {
        if (!activeDrag && placementIntent) {
          onCanvasTap(event.nativeEvent);
          return;
        }
        onClearSelection();
      }}
    >
      <color attach="background" args={['#ded3c0']} />
      <fog attach="fog" args={['#ded3c0', 20, 54]} />
      <ambientLight intensity={lightingMode === 'gallery' ? 0.56 : 0.48} />
      <hemisphereLight args={['#fff1d8', '#77877c', lightingMode === 'gallery' ? 0.42 : 0.36]} />
      <directionalLight
        position={[4.8, 8, 5.2]}
        intensity={lightingMode === 'gallery' ? 2.25 : 2.02}
        color="#fff0d4"
        castShadow
        shadow-bias={-0.00018}
        shadow-normalBias={0.012}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      >
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 0.2, 24]} />
      </directionalLight>
      <directionalLight position={[-5.5, 4.2, -4.5]} intensity={0.42} color="#9faf9e" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <circleGeometry args={[6.3, 128]} />
        <meshStandardMaterial color="#d4c8b4" roughness={0.96} metalness={0} />
      </mesh>
      <FloorGrid visible={gridVisible} />
      {floorTarget && canDropOnFloor && <FloorPlacementTarget position={floorTarget} />}
      <ConfiguratorErrorBoundary resetKey={resetKey} fallback={<CanvasMessage title="Could not load SOL X GLB files." paths={expectedPaths} />}>
        <Suspense fallback={<CanvasMessage title="Loading SOL X parts..." />}>
          <group scale={MODEL_SCALE}>
            {parts.map((part) => {
              const placement = layout.placements.get(part.id);
              if (!placement) return null;
              return <PartContactShadow key={`${part.id}-shadow`} partKey={part.partKey} placement={placement} />;
            })}
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
            {rotationTarget && !activeDrag && !placementIntent && (
              <PentagonalRotationGuide
                activeIndex={rotationTarget.activeIndex}
                onRotateToSnap={onRotateToSnap}
                target={rotationTarget}
              />
            )}
          </group>
          <Environment preset={lightingMode === 'gallery' ? 'apartment' : 'studio'} />
          <SceneProjectionSync connectors={connectors} connectorScreensRef={connectorScreensRef} screenToFloorRef={screenToFloorRef} />
        </Suspense>
      </ConfiguratorErrorBoundary>
      <OrbitControls
        ref={controlsRef}
        enabled={!activeDrag && !placementIntent}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        enablePan
        screenSpacePanning
        zoomSpeed={0.72}
        panSpeed={0.82}
        rotateSpeed={0.58}
        minDistance={3.2}
        maxDistance={34}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.86}
      />
      <CameraRig controlsRef={controlsRef} fitToken={fitCameraToken} layout={layout} mobile={mobile} resetToken={resetCameraToken} />
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

function PriceSummary({ buildName, estimate }) {
  return (
    <div className="price-summary">
      <div className="price-summary__heading">
        <span>{buildName || 'Estimated price'}</span>
        <strong>{formatPricingValue(estimate.total, estimate.currency)}</strong>
      </div>
      <p>{estimate.note}</p>
      <ul>
        {estimate.lineItems.map((item) => {
          const colorSummary = item.colors.map((color) => `${color.count} ${color.label.replace('Translucent ', '')}`).join(', ');
          return (
            <li key={item.partKey}>
              <div>
                <span>{item.label}</span>
                <small>{item.quantity} x {formatPricingValue(item.unitPrice, estimate.currency)}</small>
                {colorSummary && <em>{colorSummary}</em>}
              </div>
              <strong>{formatPricingValue(item.subtotal, estimate.currency)}</strong>
            </li>
          );
        })}
      </ul>
      {estimate.hasTemporaryPricing && (
        <small className="price-summary__temporary">
          Base and divider estimates will be finalized when standalone module pricing is released.
        </small>
      )}
      <small className="price-summary__source">Pricing checked {solxPricing.lastChecked}</small>
    </div>
  );
}

function PentagonPointButtons({ activeIndex, onRotateToSnap }) {
  return (
    <div className="pentagon-point-buttons" aria-label="Pentagonal rotation snap points">
      {Array.from({ length: PENTAGON_POINTS }, (_, index) => (
        <button
          type="button"
          key={`point-${index + 1}`}
          className={activeIndex === index ? 'active' : ''}
          onClick={() => onRotateToSnap(index)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}

function RotateStepControls({ onRotateLeft, onRotateRight }) {
  return (
    <div className="rotate-step-controls" aria-label="Rotate selected part by 72 degrees">
      <button type="button" onClick={onRotateLeft}>
        <RotateCcw size={15} />
        <span>Left 72</span>
      </button>
      <button type="button" onClick={onRotateRight}>
        <RotateCw size={15} />
        <span>Right 72</span>
      </button>
    </div>
  );
}

function TutorialOverlay({ onClose, onNext, onSkip, stepIndex }) {
  const step = tutorialSteps[stepIndex];
  const isLast = stepIndex === tutorialSteps.length - 1;

  return (
    <div className="builder-modal-backdrop builder-tutorial-backdrop" role="presentation">
      <div className="builder-glass builder-tutorial-card" role="dialog" aria-modal="true" aria-labelledby="builder-tutorial-title">
        <p className="section-kicker">Quick guide / {stepIndex + 1} of {tutorialSteps.length}</p>
        <h2 id="builder-tutorial-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="builder-tutorial-progress" aria-hidden="true">
          {tutorialSteps.map((item, index) => (
            <span key={item.title} className={index === stepIndex ? 'active' : ''} />
          ))}
        </div>
        <div className="builder-tool-row">
          <button type="button" onClick={onSkip}>
            <X size={15} />
            <span>Skip</span>
          </button>
          <button type="button" onClick={isLast ? onClose : onNext}>
            <HelpCircle size={15} />
            <span>{isLast ? 'Done' : 'Next'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopBuildPanel({
  buildName,
  estimate,
  onBuildNameChange,
  onNavigate,
  onRefreshPrice,
  onSaveBuild,
  onTakeScreenshot,
}) {
  return (
    <div className="builder-glass builder-shop-panel">
      <div className="builder-panel__header">
        <span>Shop this build</span>
        <small>{formatPricingValue(estimate.total, estimate.currency)}</small>
      </div>
      <label className="builder-build-name">
        <span>Build name</span>
        <input
          type="text"
          value={buildName}
          onChange={(event) => onBuildNameChange(event.target.value)}
          aria-label="Build name"
        />
      </label>
      <PriceSummary buildName={buildName} estimate={estimate} />
      <div className="builder-shop-actions">
        <button type="button" onClick={onRefreshPrice}>
          <DollarSign size={15} />
          <span>Estimate price</span>
        </button>
        <button type="button" onClick={onSaveBuild}>
          <Save size={15} />
          <span>Save build</span>
        </button>
        <button type="button" onClick={onTakeScreenshot}>
          <Download size={15} />
          <span>Screenshot</span>
        </button>
        <AppLink to="/about" onNavigate={onNavigate}>
          Request this build
        </AppLink>
      </div>
    </div>
  );
}

function MobileConfiguratorHeader({ partsCount, rootBaseCount }) {
  return (
    <div className="mobile-configurator-intro">
      <div className="builder-glass mobile-configurator-heading">
        <p className="section-kicker">SOL X Configurator</p>
        <h1>SOL X Builder</h1>
        <span>{partsCount} modules / {rootBaseCount} floor bases</span>
      </div>
    </div>
  );
}

function MobileBuilderDrawer({
  activeTab,
  activeRotationIndex,
  buildName,
  drawerState,
  estimate,
  feedback,
  onBuildNameChange,
  onChoosePart,
  onClearSavedBuild,
  onDeleteSelectedPart,
  onDuplicateSelectedPart,
  onFitBuildToView,
  onLoadSavedBuild,
  onNavigate,
  onNudgeSelectedRoot,
  onResetCamera,
  onResetScene,
  onRotateStepLeft,
  onRotateStepRight,
  onRotateToSnap,
  onSaveBuild,
  onSetActiveTab,
  onStartTutorial,
  onTakeScreenshot,
  onToggleDrawer,
  onUpdateSelectedColor,
  pendingPartKey,
  selectedPart,
  selectedPartLabel,
}) {
  const drawerOpen = drawerState !== 'collapsed';
  const activeTabLabel = activeTab === 'price' ? 'Price' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  const carouselRef = useRef(null);
  const drawerBodyRef = useRef(null);
  const drawerRailRef = useRef(null);
  const drawerRailDragRef = useRef(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [drawerScroll, setDrawerScroll] = useState({
    progress: 0,
    thumbHeight: 42,
    scrollable: false,
  });

  const syncDrawerScroll = useCallback(() => {
    const body = drawerBodyRef.current;
    if (!body) return;

    const maxScroll = Math.max(0, body.scrollHeight - body.clientHeight);
    const scrollable = activeTab !== 'parts' && maxScroll > 6;
    const thumbHeight = scrollable
      ? Math.max(42, Math.min(94, (body.clientHeight / body.scrollHeight) * body.clientHeight))
      : 42;

    setDrawerScroll({
      progress: scrollable ? clampUnit(body.scrollTop / maxScroll) : 0,
      thumbHeight,
      scrollable,
    });
  }, [activeTab]);

  const scrollDrawerFromRail = useCallback((clientY) => {
    const body = drawerBodyRef.current;
    const rail = drawerRailRef.current;
    if (!body || !rail) return;

    const maxScroll = Math.max(0, body.scrollHeight - body.clientHeight);
    if (!maxScroll) return;

    const rect = rail.getBoundingClientRect();
    const trackTravel = Math.max(1, rect.height - drawerScroll.thumbHeight);
    const thumbTop = clampUnit((clientY - rect.top - drawerScroll.thumbHeight / 2) / trackTravel);
    body.scrollTop = thumbTop * maxScroll;
  }, [drawerScroll.thumbHeight]);

  const handleDrawerRailPointerDown = useCallback((event) => {
    event.preventDefault();
    drawerRailDragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    scrollDrawerFromRail(event.clientY);
  }, [scrollDrawerFromRail]);

  const handleDrawerRailPointerMove = useCallback((event) => {
    if (!drawerRailDragRef.current) return;
    event.preventDefault();
    scrollDrawerFromRail(event.clientY);
  }, [scrollDrawerFromRail]);

  const handleDrawerRailPointerEnd = useCallback((event) => {
    drawerRailDragRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    const body = drawerBodyRef.current;
    if (!body || !drawerOpen) return undefined;

    const sync = () => syncDrawerScroll();
    const frame = window.requestAnimationFrame(sync);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);

    body.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    resizeObserver?.observe(body);

    return () => {
      window.cancelAnimationFrame(frame);
      body.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      resizeObserver?.disconnect();
    };
  }, [activeTab, drawerOpen, selectedPart?.id, buildName, estimate.total, syncDrawerScroll]);

  useEffect(() => {
    if (!drawerBodyRef.current) return;
    drawerBodyRef.current.scrollTop = 0;
    window.requestAnimationFrame(syncDrawerScroll);
  }, [activeTab, syncDrawerScroll]);

  const scrollCarouselToIndex = (index) => {
    const nextIndex = Math.max(0, Math.min(solxPartOrder.length - 1, index));
    const carousel = carouselRef.current;
    const card = carousel?.querySelector('button');
    if (carousel && card) {
      const cardWidth = card.getBoundingClientRect().width;
      const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap || window.getComputedStyle(carousel).gap || '0') || 0;
      carousel.scrollTo({ left: nextIndex * (cardWidth + gap), behavior: 'smooth' });
    }
    setCarouselIndex(nextIndex);
  };

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    const card = carousel?.querySelector('button');
    if (!carousel || !card) return;
    const cardWidth = card.getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap || window.getComputedStyle(carousel).gap || '0') || 0;
    const nextIndex = Math.max(0, Math.min(solxPartOrder.length - 1, Math.round(carousel.scrollLeft / (cardWidth + gap))));
    setCarouselIndex(nextIndex);
  };

  return (
    <div className={`builder-glass mobile-builder-drawer is-${drawerState}`}>
      <div className="mobile-builder-drawer__summary">
        <button type="button" className="mobile-builder-drawer__toggle" onClick={onToggleDrawer} aria-expanded={drawerOpen}>
          <span>{drawerOpen ? 'Build controls' : activeTabLabel}</span>
          <small>{pendingPartKey ? `Placing ${solxParts[pendingPartKey].shortLabel}` : selectedPartLabel}</small>
          <b>{drawerOpen ? 'Min' : 'Open'}</b>
        </button>
      </div>
      {drawerOpen && (
        <div
          ref={drawerBodyRef}
          className={`mobile-builder-drawer__body mobile-builder-drawer__body--${activeTab}`}
        >
          <div className="mobile-builder-tabs" role="tablist" aria-label="SOL X mobile builder controls">
            {['parts', 'edit', 'color', 'price', 'save'].map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeTab === tab ? 'active' : ''}
                onClick={() => onSetActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {tab === 'price' ? 'Price' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'parts' && (
            <div className="mobile-builder-pane">
              <div className="mobile-parts-carousel">
                <div className="mobile-parts-carousel__header">
                  <span>Parts</span>
                  <div>
                    <button type="button" onClick={() => scrollCarouselToIndex(carouselIndex - 1)} aria-label="Previous part">
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={() => scrollCarouselToIndex(carouselIndex + 1)} aria-label="Next part">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div ref={carouselRef} className="mobile-part-strip" aria-label="SOL X parts" onScroll={handleCarouselScroll}>
                  {solxPartOrder.map((partKey) => (
                    <button
                      type="button"
                      key={partKey}
                      className={pendingPartKey === partKey ? 'active' : ''}
                      onClick={() => onChoosePart(partKey)}
                    >
                      <PartPreviewIcon partKey={partKey} />
                      <span>{solxParts[partKey].shortLabel ?? solxParts[partKey].label}</span>
                    </button>
                  ))}
                </div>
                <div className="mobile-carousel-dots" aria-label="Parts carousel pages">
                  {solxPartOrder.map((partKey, index) => (
                    <button
                      type="button"
                      key={`${partKey}-dot`}
                      className={index === carouselIndex ? 'active' : ''}
                      onClick={() => scrollCarouselToIndex(index)}
                      aria-label={`Show ${solxParts[partKey].label}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mobile-builder-help">{feedback}</p>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="mobile-builder-pane mobile-builder-pane--edit">
              {selectedPart ? (
                <>
                  <p>Selected {selectedPartLabel}</p>
                  <div className="mobile-action-grid">
                    <button type="button" onClick={onDeleteSelectedPart}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                    <button type="button" onClick={onDuplicateSelectedPart}>
                      <Copy size={16} />
                      Duplicate
                    </button>
                  </div>
                  <div className="builder-rotation-card">
                    <span>Rotate by SOL points</span>
                    <RotateStepControls onRotateLeft={onRotateStepLeft} onRotateRight={onRotateStepRight} />
                    <PentagonPointButtons activeIndex={activeRotationIndex} onRotateToSnap={onRotateToSnap} />
                  </div>
                  <div className="mobile-move-pad">
                    <button type="button" onClick={() => onNudgeSelectedRoot(0, -FLOOR_SNAP)}>Forward</button>
                    <button type="button" onClick={() => onNudgeSelectedRoot(-FLOOR_SNAP, 0)}>Left</button>
                    <button type="button" onClick={() => onNudgeSelectedRoot(FLOOR_SNAP, 0)}>Right</button>
                    <button type="button" onClick={() => onNudgeSelectedRoot(0, FLOOR_SNAP)}>Back</button>
                  </div>
                </>
              ) : (
                <p>Select a part to move, rotate, duplicate, or delete it.</p>
              )}
            </div>
          )}

          {activeTab === 'color' && (
            <div className="mobile-builder-pane mobile-builder-pane--color">
              {selectedPart ? (
                <>
                  <p>Selected {selectedPartLabel}</p>
                  <div className="mobile-color-grid">
                    {Object.entries(shadeColorOptions).map(([key, option]) => (
                      <button
                        type="button"
                        key={key}
                        className={selectedPart.color === key ? 'active' : ''}
                        onClick={() => onUpdateSelectedColor(key)}
                      >
                        <span style={{ '--swatch': option.swatch }} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mobile-action-grid">
                    <button type="button" onClick={onDeleteSelectedPart}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                    <button type="button" onClick={onDuplicateSelectedPart}>
                      <Copy size={16} />
                      Duplicate
                    </button>
                  </div>
                </>
              ) : (
                <p>Select a part in the scene to change color.</p>
              )}
            </div>
          )}

          {activeTab === 'price' && (
            <div className="mobile-builder-pane">
              <label className="builder-build-name builder-build-name--mobile">
                <span>Build name</span>
                <input
                  type="text"
                  value={buildName}
                  onChange={(event) => onBuildNameChange(event.target.value)}
                  aria-label="Mobile build name"
                />
              </label>
              <PriceSummary buildName={buildName} estimate={estimate} />
            </div>
          )}

          {activeTab === 'save' && (
            <div className="mobile-builder-pane">
              <div className="mobile-action-grid mobile-action-grid--build">
                <button type="button" onClick={onSaveBuild}>
                  <Save size={16} />
                  Save build
                </button>
                <button type="button" onClick={onLoadSavedBuild}>
                  <FolderOpen size={16} />
                  Load build
                </button>
                <button type="button" onClick={onClearSavedBuild}>
                  <X size={16} />
                  Clear saved
                </button>
                <button type="button" onClick={onResetScene}>
                  <RotateCcw size={16} />
                  Reset scene
                </button>
                <button type="button" onClick={onResetCamera}>
                  <Camera size={16} />
                  Reset camera
                </button>
                <button type="button" onClick={onFitBuildToView}>
                  <Maximize2 size={16} />
                  Fit view
                </button>
                <button type="button" onClick={onTakeScreenshot}>
                  <Download size={16} />
                  Screenshot
                </button>
                <button type="button" onClick={onStartTutorial}>
                  <HelpCircle size={16} />
                  Tutorial
                </button>
                <button type="button" className="mobile-action-grid__wide" onClick={() => onSetActiveTab('price')}>
                  <DollarSign size={16} />
                  Get price
                </button>
                <AppLink to="/contact" onNavigate={onNavigate} className="mobile-action-grid__wide mobile-request-link">
                  Request this build
                </AppLink>
              </div>
            </div>
          )}
        </div>
      )}
      {drawerOpen && (
        <button
          type="button"
          ref={drawerRailRef}
          className="mobile-drawer-scroll-rail"
          style={{
            '--drawer-scroll-progress': `${drawerScroll.progress}`,
            '--drawer-scroll-thumb': `${drawerScroll.thumbHeight}px`,
          }}
          hidden={!drawerScroll.scrollable}
          aria-label="Scroll build controls"
          onPointerDown={handleDrawerRailPointerDown}
          onPointerMove={handleDrawerRailPointerMove}
          onPointerUp={handleDrawerRailPointerEnd}
          onPointerCancel={handleDrawerRailPointerEnd}
        >
          <span aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function MobilePageScrollRail() {
  const railRef = useRef(null);
  const railDragRef = useRef(false);
  const [pageScroll, setPageScroll] = useState({
    progress: 0,
    thumbHeight: 58,
    scrollable: false,
  });

  const syncPageScroll = useCallback(() => {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
    const scrollable = maxScroll > 6;
    const thumbHeight = scrollable
      ? Math.max(52, Math.min(116, (window.innerHeight / scrollingElement.scrollHeight) * window.innerHeight))
      : 58;

    setPageScroll({
      progress: scrollable ? clampUnit(window.scrollY / maxScroll) : 0,
      thumbHeight,
      scrollable,
    });
  }, []);

  const scrollPageFromRail = useCallback((clientY) => {
    const rail = railRef.current;
    const scrollingElement = document.scrollingElement || document.documentElement;
    if (!rail) return;

    const maxScroll = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
    if (!maxScroll) return;

    const rect = rail.getBoundingClientRect();
    const trackTravel = Math.max(1, rect.height - pageScroll.thumbHeight);
    const thumbTop = clampUnit((clientY - rect.top - pageScroll.thumbHeight / 2) / trackTravel);
    window.scrollTo({ top: thumbTop * maxScroll, behavior: 'auto' });
  }, [pageScroll.thumbHeight]);

  const handleRailPointerDown = useCallback((event) => {
    event.preventDefault();
    railDragRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    scrollPageFromRail(event.clientY);
  }, [scrollPageFromRail]);

  const handleRailPointerMove = useCallback((event) => {
    if (!railDragRef.current) return;
    event.preventDefault();
    scrollPageFromRail(event.clientY);
  }, [scrollPageFromRail]);

  const handleRailPointerEnd = useCallback((event) => {
    railDragRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleRailKeyDown = useCallback((event) => {
    const step = Math.round(window.innerHeight * 0.38);

    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      window.scrollBy({ top: step, behavior: 'smooth' });
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      window.scrollBy({ top: -step, behavior: 'smooth' });
    }

    if (event.key === 'Home') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (event.key === 'End') {
      event.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const sync = () => syncPageScroll();
    const frame = window.requestAnimationFrame(sync);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);

    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    resizeObserver?.observe(document.documentElement);
    resizeObserver?.observe(document.body);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      resizeObserver?.disconnect();
    };
  }, [syncPageScroll]);

  if (!pageScroll.scrollable) return null;

  return (
    <button
      type="button"
      ref={railRef}
      className="mobile-page-scroll-rail"
      style={{
        '--page-scroll-progress': `${pageScroll.progress}`,
        '--page-scroll-thumb': `${pageScroll.thumbHeight}px`,
      }}
      aria-label="Scroll SOL X page"
      onPointerDown={handleRailPointerDown}
      onPointerMove={handleRailPointerMove}
      onPointerUp={handleRailPointerEnd}
      onPointerCancel={handleRailPointerEnd}
      onKeyDown={handleRailKeyDown}
    >
      <span aria-hidden="true" />
    </button>
  );
}

export default function SolXConfigurator({ onNavigate }) {
  const isMobileBuilder = useMobileBuilderMode();
  const [parts, setParts] = useState(createStarterScene);
  const [buildName, setBuildName] = useState(DEFAULT_BUILD_NAME);
  const [selectedId, setSelectedId] = useState('base-1');
  const [feedback, setFeedback] = useState('Build ready.');
  const [activeDrag, setActiveDrag] = useState(null);
  const [pendingTapPartKey, setPendingTapPartKey] = useState(null);
  const [hoverConnectorId, setHoverConnectorId] = useState(null);
  const [floorHover, setFloorHover] = useState(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [fitCameraToken, setFitCameraToken] = useState(0);
  const [mobileDrawerState, setMobileDrawerState] = useState('half');
  const [mobileTab, setMobileTab] = useState('parts');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
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
  const lastPlacementTimeRef = useRef(0);
  const mobileViewerGestureRef = useRef(null);

  const layout = useMemo(() => buildBuilderLayout(parts), [parts]);
  const connectors = useMemo(() => buildOutputConnectors(parts, layout), [layout, parts]);
  const selectedPart = parts.find((part) => part.id === selectedId) ?? null;
  const selectedPartLabel = selectedPart ? solxParts[selectedPart.partKey].label : 'None';
  const selectedRootPart = selectedPart ? getRootPart(parts, selectedPart.id) : null;
  const selectedPartPlacement = selectedPart ? layout.placements.get(selectedPart.id) : null;
  const activeRotationIndex = selectedPart ? nearestPentagonIndex(selectedPart.rotation?.[1] ?? 0) : 0;
  const rotationTarget = selectedPart && selectedPartPlacement
    ? {
      partId: selectedPart.id,
      position: selectedPartPlacement.position,
      activeIndex: activeRotationIndex,
    }
    : null;
  const rootBaseCount = parts.filter((part) => !part.parentId && part.partKey === 'base').length;
  const priceEstimate = useMemo(() => estimateSolXBuild(parts), [parts]);
  const placementIntent = activeDrag ?? (pendingTapPartKey ? { kind: 'new', partKey: pendingTapPartKey } : null);

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  useEffect(() => {
    activeDragRef.current = activeDrag;
  }, [activeDrag]);

  useEffect(() => () => window.clearTimeout(feedbackTimeout.current), []);

  useEffect(() => {
    document.body.classList.add('solx-configurator-active');
    return () => document.body.classList.remove('solx-configurator-active');
  }, []);

  useEffect(() => {
    if (!isMobileBuilder) setPendingTapPartKey(null);
  }, [isMobileBuilder]);

  const showFeedback = useCallback((message, persistent = false) => {
    setFeedback(message);
    window.clearTimeout(feedbackTimeout.current);
    if (!persistent) {
      feedbackTimeout.current = window.setTimeout(() => {
        setFeedback('Build ready.');
      }, FEEDBACK_TIMEOUT);
    }
  }, []);

  const startTutorial = useCallback(() => {
    setTutorialStep(0);
    setTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    window.localStorage.setItem(TUTORIAL_KEY, 'true');
    setTutorialOpen(false);
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
    if (event.cancelable && event.pointerType !== 'touch') {
      event.preventDefault();
    }
    const nextDrag = {
      ...drag,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
    };
    setActiveDrag(nextDrag);
    setPendingTapPartKey(null);
    setHoverConnectorId(null);
    setFloorHover(null);
    showFeedback(drag.partKey === 'base' ? 'Drop it on the floor or snap it to a shade.' : 'Move it near a glowing connector.', true);
    trackConfiguratorInteraction('drag_start', {
      part_key: drag.partKey,
      drag_kind: drag.kind,
    });
  }, [showFeedback]);

  const beginTrayDrag = useCallback((event, partKey) => {
    if (isMobileBuilder) return;
    startDrag(event, { kind: 'new', partKey });
  }, [isMobileBuilder, startDrag]);

  const beginSceneDrag = useCallback((event, id) => {
    if (isMobileBuilder && event.pointerType === 'touch') return;

    const part = partsRef.current.find((nextPart) => nextPart.id === id);
    if (!part) return;
    startDrag(event, { kind: 'existing', id, partKey: part.partKey });
  }, [isMobileBuilder, startDrag]);

  const placeDragAtPoint = useCallback((drag, clientX, clientY, options = {}) => {
    if (!drag) return;

    const currentParts = partsRef.current;
    const target = nearestConnectorForPoint(drag, connectorScreensRef.current, currentParts, clientX, clientY);
    const viewerBounds = viewerRef.current?.getBoundingClientRect();
    const insideViewer = viewerBounds
      ? clientX >= viewerBounds.left && clientX <= viewerBounds.right && clientY >= viewerBounds.top && clientY <= viewerBounds.bottom
      : false;
    const floorPosition = screenToFloorRef.current?.(clientX, clientY, fineSnap) ?? null;

    if (target) {
      let placedPartId = drag.id;
      if (drag.kind === 'new') {
        const nextPart = createPart(drag.partKey, { parentId: target.partId });
        placedPartId = nextPart.id;
        setParts((current) => [...current, nextPart]);
        setSelectedId(nextPart.id);
      } else {
        setParts((current) => current.map((part) => (part.id === drag.id ? { ...part, parentId: target.partId } : part)));
        setSelectedId(drag.id);
      }

      lastPlacementTimeRef.current = Date.now();
      showFeedback(solxParts[drag.partKey].type === 'divider' ? 'Add a shade to finish this connector.' : 'Snapped into place.');
      trackConfiguratorInteraction('place_part', {
        part_key: drag.partKey,
        part_id: placedPartId,
        drag_kind: drag.kind,
        placement_type: 'connector',
        parent_part_key: target.partKey,
      });
      return true;
    } else if (insideViewer && floorPosition && canPlaceOnFloor(drag, freePlacement)) {
      let placedPartId = drag.id;
      if (drag.kind === 'new') {
        const nextPart = createPart(drag.partKey, { position: floorPosition, parentId: null });
        placedPartId = nextPart.id;
        setParts((current) => [...current, nextPart]);
        setSelectedId(nextPart.id);
      } else {
        setParts((current) => current.map((part) => (part.id === drag.id ? { ...part, parentId: null, position: floorPosition } : part)));
        setSelectedId(drag.id);
      }
      lastPlacementTimeRef.current = Date.now();
      showFeedback(drag.partKey === 'base' ? 'Base placed on the floor.' : 'Placed in experimental free mode.');
      trackConfiguratorInteraction('place_part', {
        part_key: drag.partKey,
        part_id: placedPartId,
        drag_kind: drag.kind,
        placement_type: 'floor',
      });
      return true;
    } else if (insideViewer && (options.moved || options.showInvalid)) {
      showFeedback(options.invalidMessage ?? "This part can't connect there.");
    }

    return false;
  }, [createPart, fineSnap, freePlacement, showFeedback]);

  const finishDrop = useCallback((event) => {
    const drag = activeDragRef.current;
    if (!drag) return;

    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8;
    placeDragAtPoint(drag, event.clientX, event.clientY, { moved });

    setActiveDrag(null);
    setHoverConnectorId(null);
    setFloorHover(null);
  }, [placeDragAtPoint]);

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

  const chooseMobilePart = useCallback((partKey) => {
    setPendingTapPartKey(partKey);
    setActiveDrag(null);
    setHoverConnectorId(null);
    setFloorHover(null);
    const eligibleConnectors = eligibleConnectorsForDrag({ kind: 'new', partKey }, connectors, parts);
    const hasBase = parts.some((part) => part.partKey === 'base');
    const message = partKey === 'base'
      ? 'Base selected.'
      : eligibleConnectors.length
        ? `${solxParts[partKey].shortLabel ?? solxParts[partKey].label} selected.`
        : hasBase
          ? 'No valid connectors available.'
          : 'Add a base first.';
    showFeedback(
      message,
      true,
    );
    trackConfiguratorInteraction('select_part', {
      part_key: partKey,
      input_mode: 'mobile_tap',
      valid_connectors: eligibleConnectors.length,
    });
  }, [connectors, parts, showFeedback]);

  const handleCanvasTapPlacement = useCallback((event) => {
    if (!pendingTapPartKey || activeDragRef.current) return;
    const placed = placeDragAtPoint(
      { kind: 'new', partKey: pendingTapPartKey },
      event.clientX,
      event.clientY,
      {
        showInvalid: true,
        invalidMessage: pendingTapPartKey === 'base'
          ? 'Floor target required.'
          : 'Connector target required.',
      },
    );
    if (placed) setPendingTapPartKey(null);
    setHoverConnectorId(null);
    setFloorHover(null);
  }, [pendingTapPartKey, placeDragAtPoint]);

  const updateSelectedColor = (color) => {
    if (!selectedPart) return;
    setParts((current) => current.map((part) => (part.id === selectedPart.id ? { ...part, color } : part)));
    trackConfiguratorInteraction('change_color', {
      part_key: selectedPart.partKey,
      color,
    });
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
    trackConfiguratorInteraction('delete_part', {
      part_key: selectedPart.partKey,
      removed_count: deleteIds.size,
    });
  };

  const resetScene = () => {
    const nextScene = createStarterScene();
    idCounter.current = nextCounterFromParts(nextScene);
    setParts(nextScene);
    setSelectedId(nextScene[0].id);
    setActiveDrag(null);
    setPendingTapPartKey(null);
    setHoverConnectorId(null);
    setFloorHover(null);
    showFeedback('Scene reset to one starter base.');
    trackConfiguratorInteraction('reset_scene', {
      module_count: nextScene.length,
    });
  };

  const resetColors = () => {
    setParts((current) => current.map((part) => ({ ...part, color: solxBuilderConfig.defaultColor })));
    showFeedback('Colors reset.');
    trackConfiguratorInteraction('reset_colors', {
      module_count: parts.length,
    });
  };

  const duplicateSelectedPart = () => {
    if (!selectedPart) {
      showFeedback('Select a part first.');
      return;
    }

    const rootPart = getRootPart(parts, selectedPart.id);
    if (!rootPart) {
      showFeedback('Select a build first.');
      return;
    }

    const branchIds = getBranchIds(parts, rootPart.id);
    const idMap = new Map();
    const rootPlacement = layout.placements.get(rootPart.id);
    const rootPosition = rootPlacement
      ? normalizeFloorPosition([rootPlacement.position.x + 0.2, 0, rootPlacement.position.z + 0.16], fineSnap)
      : normalizeFloorPosition([0.16, 0, 0.12], fineSnap);
    const branchParts = parts.filter((part) => branchIds.has(part.id));
    branchParts.forEach((part) => {
      idMap.set(part.id, `${part.partKey}-${idCounter.current}`);
      idCounter.current += 1;
    });

    const duplicates = branchParts.map((part) => {
      return {
        ...part,
        id: idMap.get(part.id),
        parentId: part.parentId && branchIds.has(part.parentId) ? idMap.get(part.parentId) : null,
        position: part.id === rootPart.id ? rootPosition : part.position,
        rotation: part.id === rootPart.id ? (part.rotation ?? [0, 0, 0]) : part.rotation,
      };
    });

    setParts((current) => [...current, ...duplicates]);
    setSelectedId(idMap.get(rootPart.id));
    showFeedback('Duplicated selected build.');
    trackConfiguratorInteraction('duplicate_build_branch', {
      root_part_key: rootPart.partKey,
      duplicated_count: duplicates.length,
    });
  };

  const nudgeSelectedRoot = (dx, dz) => {
    if (!selectedPart) {
      showFeedback('Select a build first.');
      return;
    }

    const rootPart = getRootPart(parts, selectedPart.id);
    if (!rootPart) {
      showFeedback('Select a build first.');
      return;
    }

    setParts((current) => current.map((part) => {
      if (part.id !== rootPart.id) return part;
      const currentPosition = part.position ?? [0, 0, 0];
      return {
        ...part,
        position: normalizeFloorPosition([currentPosition[0] + dx, 0, currentPosition[2] + dz], fineSnap),
      };
    }));
    trackConfiguratorInteraction('nudge_build', {
      root_part_key: rootPart.partKey,
      dx,
      dz,
    });
  };

  const rotateSelectedRoot = (amount) => {
    if (!selectedPart) {
      showFeedback('Select a build first.');
      return;
    }

    const rootPart = getRootPart(parts, selectedPart.id);
    if (!rootPart) {
      showFeedback('Select a build first.');
      return;
    }

    setParts((current) => current.map((part) => {
      if (part.id !== rootPart.id) return part;
      const rotation = part.rotation ?? [0, 0, 0];
      return {
        ...part,
        rotation: [rotation[0], rotation[1] + amount, rotation[2]],
      };
    }));
    trackConfiguratorInteraction('rotate_root', {
      root_part_key: rootPart.partKey,
      amount,
    });
  };

  const fitBuildToView = () => {
    setFitCameraToken((token) => token + 1);
    showFeedback('Framed the current build.');
    trackConfiguratorInteraction('fit_build_to_view', {
      module_count: parts.length,
    });
  };

  const rotateSelectedToPentagonPoint = (index) => {
    if (!selectedPart) {
      showFeedback('Select a part first.');
      return;
    }

    const angle = index * PENTAGON_STEP;
    setParts((current) => current.map((part) => {
      if (part.id !== selectedPart.id) return part;
      const rotation = part.rotation ?? [0, 0, 0];
      return {
        ...part,
        rotation: [rotation[0], angle, rotation[2]],
      };
    }));
    showFeedback(`Rotated to SOL point ${index + 1}.`);
    trackConfiguratorInteraction('rotate_to_sol_point', {
      part_key: selectedPart.partKey,
      point_index: index + 1,
    });
  };

  const rotateSelectedByStep = (direction) => {
    if (!selectedPart) {
      showFeedback('Select a part first.');
      return;
    }

    const currentIndex = nearestPentagonIndex(selectedPart.rotation?.[1] ?? 0);
    const nextIndex = (currentIndex + direction + PENTAGON_POINTS) % PENTAGON_POINTS;
    rotateSelectedToPentagonPoint(nextIndex);
  };

  const saveBuild = () => {
    const incompleteDividers = findIncompleteDividers(parts, layout);
    if (incompleteDividers.length) {
      showFeedback('Add a shade to finish each divider before saving.');
      return;
    }

    const payload = {
      version: 2,
      name: buildName.trim() || DEFAULT_BUILD_NAME,
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
          rotation: part.rotation ?? [0, 0, 0],
          worldRotation: [euler.x, euler.y, euler.z],
        };
      }),
    };

    window.localStorage.setItem(solxBuilderConfig.storageKey, JSON.stringify(payload));
    showFeedback('Build saved to this browser.');
    trackConfiguratorInteraction('save_build', {
      module_count: parts.length,
      estimated_total: priceEstimate.total,
    });
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
    setBuildName(payload.name || DEFAULT_BUILD_NAME);
    setSelectedId(loadedParts[0]?.id ?? null);
    showFeedback('Saved build loaded.');
    trackConfiguratorInteraction('load_build', {
      module_count: loadedParts.length,
    });
  };

  const clearSavedBuild = () => {
    window.localStorage.removeItem(solxBuilderConfig.storageKey);
    showFeedback('Saved build cleared.');
    trackConfiguratorInteraction('clear_saved_build');
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
      trackConfiguratorInteraction('download_screenshot', {
        module_count: parts.length,
      });
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

  const handleViewerTouchStart = useCallback((event) => {
    if (!isMobileBuilder || event.touches.length !== 1) {
      mobileViewerGestureRef.current = null;
      return;
    }

    const touch = event.touches[0];
    mobileViewerGestureRef.current = {
      mode: '',
      startX: touch.clientX,
      startY: touch.clientY,
      lastY: touch.clientY,
    };
  }, [isMobileBuilder]);

  const handleViewerTouchMove = useCallback((event) => {
    const gesture = mobileViewerGestureRef.current;
    if (!isMobileBuilder || !gesture || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!gesture.mode && Math.max(absX, absY) > 10) {
      gesture.mode = absY > absX * 1.15 ? 'page-scroll' : 'viewer';
    }

    if (gesture.mode !== 'page-scroll') return;

    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    window.scrollBy({ top: gesture.lastY - touch.clientY, behavior: 'auto' });
    gesture.lastY = touch.clientY;
  }, [isMobileBuilder]);

  const handleViewerTouchEnd = useCallback(() => {
    mobileViewerGestureRef.current = null;
  }, []);

  const mobileBuilderControls = isMobileBuilder ? (
    <MobileBuilderDrawer
      activeTab={mobileTab}
      activeRotationIndex={activeRotationIndex}
      buildName={buildName}
      drawerState={mobileDrawerState}
      estimate={priceEstimate}
      feedback={feedback}
      onBuildNameChange={setBuildName}
      onChoosePart={chooseMobilePart}
      onClearSavedBuild={clearSavedBuild}
      onDeleteSelectedPart={deleteSelectedPart}
      onDuplicateSelectedPart={duplicateSelectedPart}
      onFitBuildToView={fitBuildToView}
      onLoadSavedBuild={loadSavedBuild}
      onNavigate={onNavigate}
      onNudgeSelectedRoot={nudgeSelectedRoot}
      onResetCamera={() => setResetCameraToken((token) => token + 1)}
      onResetScene={resetScene}
      onRotateStepLeft={() => rotateSelectedByStep(-1)}
      onRotateStepRight={() => rotateSelectedByStep(1)}
      onRotateToSnap={rotateSelectedToPentagonPoint}
      onSaveBuild={saveBuild}
      onSetActiveTab={setMobileTab}
      onStartTutorial={startTutorial}
      onTakeScreenshot={takeScreenshot}
      onToggleDrawer={() => setMobileDrawerState((current) => (current === 'collapsed' ? 'half' : 'collapsed'))}
      onUpdateSelectedColor={updateSelectedColor}
      pendingPartKey={pendingTapPartKey}
      selectedPart={selectedPart}
      selectedPartLabel={selectedPartLabel}
    />
  ) : null;

  return (
    <main className="route-page configurator-page configurator-page--immersive" data-music-section="solX">
      <section className="configurator-stage" aria-label="SOL X creative builder">
        {isMobileBuilder && (
          <MobileConfiguratorHeader
            partsCount={parts.length}
            rootBaseCount={rootBaseCount}
          />
        )}
        <div
          ref={viewerRef}
          className="configurator-viewer configurator-viewer--immersive"
          aria-label="Interactive SOL X modular builder"
          onTouchStartCapture={handleViewerTouchStart}
          onTouchMoveCapture={handleViewerTouchMove}
          onTouchEndCapture={handleViewerTouchEnd}
          onTouchCancelCapture={handleViewerTouchEnd}
        >
          <BuilderScene
            activeDrag={activeDrag}
            connectorScreensRef={connectorScreensRef}
            connectors={connectors}
            fitCameraToken={fitCameraToken}
            floorHover={floorHover}
            freePlacement={freePlacement}
            gridVisible={gridVisible}
            hoverConnectorId={hoverConnectorId}
            layout={layout}
            lightingMode={lightingMode}
            mobile={isMobileBuilder}
            onBeginSceneDrag={beginSceneDrag}
            onCanvasTap={handleCanvasTapPlacement}
            onClearSelection={() => {
              if (Date.now() - lastPlacementTimeRef.current < 350) return;
              if (!activeDragRef.current && !pendingTapPartKey) setSelectedId(null);
            }}
            onRotateToSnap={rotateSelectedToPentagonPoint}
            onSelect={setSelectedId}
            parts={parts}
            placementIntent={placementIntent}
            resetCameraToken={resetCameraToken}
            rotationTarget={rotationTarget}
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
                    onClick={() => {
                      if (isMobileBuilder) chooseMobilePart(partKey);
                    }}
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
                  <div className="builder-rotation-card">
                    <span>Pentagonal rotation</span>
                    <RotateStepControls onRotateLeft={() => rotateSelectedByStep(-1)} onRotateRight={() => rotateSelectedByStep(1)} />
                    <PentagonPointButtons activeIndex={activeRotationIndex} onRotateToSnap={rotateSelectedToPentagonPoint} />
                  </div>
                </>
              ) : (
                <p className="builder-empty-selection">Select a module to tune its color or remove it.</p>
              )}
            </div>

            {!isMobileBuilder && (
              <ShopBuildPanel
                buildName={buildName}
                estimate={priceEstimate}
                onBuildNameChange={setBuildName}
                onNavigate={onNavigate}
                onRefreshPrice={() => showFeedback('Price estimate updated.')}
                onSaveBuild={saveBuild}
                onTakeScreenshot={takeScreenshot}
              />
            )}

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
              <button type="button" onClick={fitBuildToView}>
                <Maximize2 size={15} />
                <span>Fit build</span>
              </button>
              <button type="button" onClick={takeScreenshot}>
                <Download size={15} />
                <span>Screenshot</span>
              </button>
              <button type="button" onClick={startTutorial}>
                <HelpCircle size={15} />
                <span>Tutorial</span>
              </button>
              <button type="button" onClick={() => showFeedback('Price estimate updated.')}>
                <DollarSign size={15} />
                <span>Estimate price</span>
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

          {tutorialOpen && (
            <TutorialOverlay
              stepIndex={tutorialStep}
              onNext={() => setTutorialStep((step) => Math.min(step + 1, tutorialSteps.length - 1))}
              onClose={closeTutorial}
              onSkip={closeTutorial}
            />
          )}
        </div>

        {activeDrag && (
          <div className="builder-drag-ghost" style={{ left: activeDrag.x, top: activeDrag.y }}>
            {solxParts[activeDrag.partKey].label}
          </div>
        )}
        {mobileBuilderControls}
        {isMobileBuilder && <MobilePageScrollRail />}
      </section>
    </main>
  );
}

solxPartOrder.forEach((partKey) => useGLTF.preload(solxParts[partKey].file));
