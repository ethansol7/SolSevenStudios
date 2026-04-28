import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { solXComponents } from '../data/products.js';
import { solxParts } from '../data/solxParts.js';

function ComponentModel({ component, index, isolated, count }) {
  const part = solxParts[component.partKey];
  const { scene } = useGLTF(component.path);
  const clone = useMemo(() => {
    const next = scene.clone(true);
    if (part?.inputAnchor) {
      next.position.set(-part.inputAnchor[0], -part.inputAnchor[1], -part.inputAnchor[2]);
    }
    next.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = Math.min(child.material.roughness ?? 0.62, 0.72);
        child.material.metalness = Math.max(child.material.metalness ?? 0, 0.02);
        if (child.material.color) {
          child.material.color.lerp(new THREE.Color('#f3efe5'), 0.18);
        }
      }
    });
    return next;
  }, [part, scene]);

  const spacing = count > 4 ? 2.25 : 2.28;
  const x = isolated ? 0 : (index - (count - 1) / 2) * spacing;
  const scale = isolated ? 12.5 : 8.6;

  return (
    <group position={[x, 0, 0]} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

function ViewerRig({ activeIndex }) {
  const group = useRef();
  const isolated = activeIndex !== 'all';
  const components = isolated ? [solXComponents[activeIndex]] : solXComponents;
  const count = components.length;

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.24) * 0.04;
  });

  return (
    <Bounds fit clip observe margin={1.55}>
      <group ref={group}>
        {components.map((component, index) => (
          <ComponentModel
            key={component.path}
            component={component}
            index={isolated ? 1.5 : index}
            isolated={isolated}
            count={count}
          />
        ))}
      </group>
    </Bounds>
  );
}

function SceneAtmosphere() {
  return (
    <>
      <color attach="background" args={['#f4f1e8']} />
      <fog attach="fog" args={['#f4f1e8', 8, 18]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[5, 6, 5]} intensity={2.1} color="#fff7e8" />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#c4d4ca" />
    </>
  );
}

export default function SolXViewer() {
  const [activeIndex, setActiveIndex] = useState('all');

  return (
    <div className="solx-viewer">
      <div className="solx-viewer__canvas" aria-label="Interactive SOL X component viewer">
        <Canvas
          camera={{ position: [4.2, 2.4, 5.2], fov: 36 }}
          dpr={[1, 1.65]}
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <SceneAtmosphere />
          <Suspense fallback={null}>
            <ViewerRig activeIndex={activeIndex} />
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.42}
            enablePan={false}
            minDistance={3.2}
            maxDistance={15}
            maxPolarAngle={Math.PI * 0.72}
            minPolarAngle={Math.PI * 0.2}
          />
        </Canvas>
      </div>
      <div className="solx-viewer__controls" aria-label="SOL X model controls">
        <button type="button" className={activeIndex === 'all' ? 'active' : ''} onClick={() => setActiveIndex('all')}>
          Full set
        </button>
        {solXComponents.map((component, index) => (
          <button type="button" key={component.path} className={activeIndex === index ? 'active' : ''} onClick={() => setActiveIndex(index)}>
            {component.label.replace('SOL X ', '')}
          </button>
        ))}
      </div>
    </div>
  );
}

solXComponents.forEach((component) => useGLTF.preload(component.path));
