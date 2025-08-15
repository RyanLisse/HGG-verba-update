'use client';

import { Float, PresentationControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

let prefix = '';
if (process.env.NODE_ENV === 'production') {
  prefix = '/static';
} else {
  prefix = '';
}

const VerbaThree = ({
  color,
  useMaterial,
  model_path,
}: {
  color: string;
  useMaterial: boolean;
  model_path: string;
}) => {
  const verba_model = useGLTF(prefix + model_path);

  const material = useMemo(
    () =>
      new THREE.MeshMatcapMaterial({
        color: '#e6e6e6',
        matcap: new THREE.TextureLoader().load(`${prefix}/ice_cap.png`),
      }),
    []
  );

  useEffect(() => {
    verba_model.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (useMaterial) {
          (child.material as any).roughness = 0.3;
          (child.material as any).metalness = 0.2;
        } else {
          child.material = material;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [verba_model, material, useMaterial]);

  return (
    <>
      <color args={[color]} attach="background" />
      <PresentationControls
        azimuth={[-1, 0.75]}
        global
        polar={[-0.4, 0.2]}
        rotation={[0.13, 0.1, 0]}
        snap={true}
      >
        <Float rotationIntensity={1} speed={2}>
          <primitive
            object={verba_model.scene}
            position-x={0}
            position-y={0}
            position-z={0}
            rotation-x={-0.2}
            rotation-y={0.2}
            scale={0.6}
          />
        </Float>
      </PresentationControls>
    </>
  );
};

export default function ThreeLoginScene({
  production,
}: {
  production: 'Local' | 'Demo' | 'Production';
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 50 }}
      className="size-full touch-none"
    >
      <color args={['#FAFAFA']} attach="background" />
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        intensity={1}
        position={[-1, 1, 1]}
        shadow-mapSize={1024}
      />
      <directionalLight
        castShadow
        intensity={1}
        position={[1, 1, -1]}
        shadow-mapSize={1024}
      />
      <directionalLight
        castShadow
        intensity={1}
        position={[0, 1, 1]}
        shadow-mapSize={1024}
      />
      <VerbaThree
        color="#FAFAFA"
        model_path={production === 'Local' ? '/verba.glb' : '/weaviate.glb'}
        useMaterial={true}
      />
    </Canvas>
  );
}
