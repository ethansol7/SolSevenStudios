import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, ContactShadows, Float, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { assetUrl } from '../content.js';

const heroModelUrl = assetUrl('assets/3d/sol-lamp-exploded.glb');

function LampModel() {
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
    <group ref={group} position={[0.65, -0.48, 0]} rotation={[0, -0.35, 0]} scale={3.05}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}

function StudioRig() {
  return (
    <>
      <color attach="background" args={['#f7f5ef']} />
      <fog attach="fog" args={['#f7f5ef', 7, 16]} />
      <ambientLight intensity={1.45} />
      <directionalLight position={[5, 6, 4]} intensity={2.2} color="#fff8ea" />
      <directionalLight position={[-4, 2, -3]} intensity={0.75} color="#b9d1c3" />
      <spotLight position={[0, 5, 5]} angle={0.34} penumbra={0.9} intensity={5} color="#ffe9b7" />
      <ContactShadows position={[0, -2.12, 0]} opacity={0.22} scale={8} blur={2.6} far={4} />
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <Canvas dpr={[1, 1.65]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
        <PerspectiveCamera makeDefault position={[0, 0.2, 6.2]} fov={36} />
        <StudioRig />
        <Suspense fallback={null}>
          <Float speed={0.65} rotationIntensity={0.18} floatIntensity={0.18}>
            <LampModel />
          </Float>
        </Suspense>
      </Canvas>
      <div className="hero-scene__grain" />
    </div>
  );
}

useGLTF.preload(heroModelUrl);
