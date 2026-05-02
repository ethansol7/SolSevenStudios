import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, ContactShadows, Float, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { assetUrl } from '../content.js';

const heroModelUrl = assetUrl('assets/3d/sol-lamp-exploded.glb');

const heroLayouts = {
  desktop: {
    camera: { position: [0, 0.2, 6.2], fov: 36 },
    model: { position: [0.65, -0.48, 0], rotation: [0, -0.35, 0], scale: 3.05 },
    shadow: { position: [0, -2.12, 0], scale: 8 },
  },
  tablet: {
    camera: { position: [0, 0.15, 6.15], fov: 36 },
    model: { position: [0.04, -0.14, 0], rotation: [0, -0.32, 0], scale: 3.6 },
    shadow: { position: [0, -1.82, 0], scale: 7.25 },
  },
  mobile: {
    camera: { position: [0, 0.08, 5.65], fov: 36 },
    model: { position: [0, -0.08, 0], rotation: [0, -0.3, 0], scale: 4.32 },
    shadow: { position: [0, -1.62, 0], scale: 7.05 },
  },
};

function useHeroLayout() {
  const [layoutKey, setLayoutKey] = useState('desktop');

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 520px)');
    const tabletQuery = window.matchMedia('(max-width: 820px)');
    const syncLayout = () => {
      if (mobileQuery.matches) {
        setLayoutKey('mobile');
      } else if (tabletQuery.matches) {
        setLayoutKey('tablet');
      } else {
        setLayoutKey('desktop');
      }
    };

    syncLayout();
    mobileQuery.addEventListener('change', syncLayout);
    tabletQuery.addEventListener('change', syncLayout);
    return () => {
      mobileQuery.removeEventListener('change', syncLayout);
      tabletQuery.removeEventListener('change', syncLayout);
    };
  }, []);

  return heroLayouts[layoutKey];
}

function LampModel({ layout }) {
  const group = useRef();
  const { scene } = useGLTF(heroModelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const { pointer } = useThree();

  useFrame((state) => {
    if (!group.current) return;

    const time = state.clock.elapsedTime;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.22 + time * 0.055, 0.035);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -0.08 + pointer.y * 0.08, 0.035);
    group.current.position.y = Math.sin(time * 0.75) * 0.035;
  });

  return (
    <group ref={group} position={layout.model.position} rotation={layout.model.rotation} scale={layout.model.scale}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}

function StudioRig({ layout }) {
  return (
    <>
      <color attach="background" args={['#f7f5ef']} />
      <fog attach="fog" args={['#f7f5ef', 9, 24]} />
      <ambientLight intensity={1.18} />
      <directionalLight position={[5, 6, 4]} intensity={2.35} color="#fff8ea" />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#b9d1c3" />
      <spotLight position={[0, 5, 5]} angle={0.34} penumbra={0.9} intensity={3.7} color="#ffe9b7" />
      <ContactShadows position={layout.shadow.position} opacity={0.34} scale={layout.shadow.scale} blur={2.2} far={4.6} />
    </>
  );
}

export default function HeroScene() {
  const layout = useHeroLayout();

  return (
    <div className="hero-scene" aria-hidden="true">
      <Canvas dpr={[1, 1.65]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <PerspectiveCamera makeDefault position={layout.camera.position} fov={layout.camera.fov} />
        <StudioRig layout={layout} />
        <Suspense fallback={null}>
          <Float speed={0.65} rotationIntensity={0.18} floatIntensity={0.18}>
            <LampModel layout={layout} />
          </Float>
        </Suspense>
      </Canvas>
      <div className="hero-scene__grain" />
    </div>
  );
}

useGLTF.preload(heroModelUrl);
