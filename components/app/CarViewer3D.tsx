"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function CarViewer3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let model: THREE.Object3D | null = null;
    let modelPivot: THREE.Group | null = null;
    let rafId = 0;
    let disposed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 1.6, 5.2);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(3, 4, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.0);
    fill.position.set(-4, 3, 2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.75);
    rim.position.set(0, 2, -4);
    scene.add(rim);

    const top = new THREE.DirectionalLight(0xffffff, 0.8);
    top.position.set(0, 6, 0);
    scene.add(top);

    const underGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 2.7, 96),
      new THREE.MeshBasicMaterial({
        color: "#0068D6",
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
      })
    );
    underGlow.position.set(0, 0.02, 0);
    underGlow.rotation.x = -Math.PI / 2;
    scene.add(underGlow);

    modelPivot = new THREE.Group();
    scene.add(modelPivot);

    const loader = new GLTFLoader();
    loader.load(
      "/models/ford_ranger_raptor.glb",
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.scale.setScalar(0.43);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const minY = box.min.y;

        model.position.set(-center.x, -minY + 0.02, -center.z);

        modelPivot?.add(model);
        if (overlayRef.current) {
          overlayRef.current.style.opacity = "0";
        }
      },
      undefined,
      () => {
        if (disposed) return;
        if (overlayRef.current) {
          overlayRef.current.textContent = "Falha ao carregar modelo 3D";
          overlayRef.current.style.opacity = "1";
        }
      }
    );

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      if (modelPivot) {
        modelPivot.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      observer.disconnect();

      if (model) {
        model.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material?.dispose();
          }
        });
      }

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(0, 104, 214, 0.22), transparent 58%), radial-gradient(circle at 50% 100%, rgba(0, 52, 120, 0.45), transparent 62%)",
        }}
      />
      <div ref={mountRef} className="absolute inset-0" />

      <div
        ref={overlayRef}
        className="absolute inset-0 flex items-center justify-center bg-black/15 text-[10px] font-mono-tech uppercase tracking-[0.3em] text-ford-blue-light/60 transition-opacity duration-500 pointer-events-none"
      >
        Carregando 3D...
      </div>
    </div>
  );
}
