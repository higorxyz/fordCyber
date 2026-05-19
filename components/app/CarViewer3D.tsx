"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function RaptorModel() {
  const { scene } = useGLTF("/models/ford_ranger_raptor.glb");
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);
    scene.position.y += box.getSize(new THREE.Vector3()).y * 0.1;
  }, [scene]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={ref} dispose={null}>
      <primitive object={scene} scale={0.43} />
    </group>
  );
}

function NeonUnderGlow() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const breath = 0.6 + Math.sin(t * 1.2) * 0.4;
    ref.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) {
        const offset = i * 0.3;
        mat.opacity = (0.08 + Math.sin(t * 1.2 + offset) * 0.04) * breath;
      }
    });
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 2.4, 64]} />
        <meshBasicMaterial color="#0068D6" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.3, 64]} />
        <meshBasicMaterial color="#3DA0FF" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 3.2, 64]} />
        <meshBasicMaterial color="#003478" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.6, 5.2);
    camera.lookAt(0, 0.4, 0);
  }, [camera]);
  return null;
}

function LoadingFallback() {
  return (
    <mesh rotation={[0, 0.5, 0]}>
      <boxGeometry args={[2, 0.5, 3.5]} />
      <meshStandardMaterial color="#0068D6" wireframe transparent opacity={0.1} />
    </mesh>
  );
}

export default function CarViewer3D() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ fov: 28 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 14, 26]} />
        <CameraSetup />

        <ambientLight intensity={1.2} />
        <hemisphereLight args={["#ffffff", "#0a1a3a", 0.8]} />

        <directionalLight position={[3, 4, 5]} intensity={2} />
        <directionalLight position={[-4, 3, 2]} intensity={1.2} />
        <directionalLight position={[0, 2, -4]} intensity={0.8} />
        <directionalLight position={[0, 6, 0]} intensity={1} />

        <pointLight position={[-4, 0.8, 0]} intensity={0.35} color="#0068D6" distance={10} />
        <pointLight position={[4, 0.8, 0]} intensity={0.25} color="#0068D6" distance={10} />

        <Suspense fallback={<LoadingFallback />}>
          <RaptorModel />
        </Suspense>

        <OrbitControls
          target={[0, 0.4, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.35}
          maxPolarAngle={Math.PI * 0.55}
          autoRotate={false}
          rotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/ford_ranger_raptor.glb");
