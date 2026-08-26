import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const Routine3DProductStage: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const container = containerRef.current;
      const width = container.clientWidth || 360;
      const height = container.clientHeight || 320;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
      camera.position.set(0, 2.8, 6.5);
      camera.lookAt(0, 0.5, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Luxury Circular Podium
      const podiumGroup = new THREE.Group();

      const baseGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.4, 64);
      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1A0F0A'),
        roughness: 0.3,
        metalness: 0.8,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = -0.2;
      podiumGroup.add(baseMesh);

      const ringGeo = new THREE.TorusGeometry(2.42, 0.05, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8753D'),
        metalness: 0.9,
        roughness: 0.1,
        emissive: new THREE.Color('#C8753D'),
        emissiveIntensity: 0.4,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0;
      podiumGroup.add(ringMesh);

      // Product 1: Cream Bottle (Cylinder + Cap)
      const bottleGroup = new THREE.Group();
      const bottleGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 32);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3A2218'),
        roughness: 0.2,
        metalness: 0.5,
      });
      const bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
      bottleMesh.position.y = 0.7;
      bottleGroup.add(bottleMesh);

      const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 32);
      const capMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D49A63'),
        roughness: 0.1,
        metalness: 0.9,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.y = 1.6;
      bottleGroup.add(capMesh);

      bottleGroup.position.set(-0.9, 0, 0.4);
      podiumGroup.add(bottleGroup);

      // Product 2: Hair Mask Jar (Short wide Cylinder + Glossy lid)
      const jarGroup = new THREE.Group();
      const jarGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.7, 32);
      const jarMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFF7EF'),
        roughness: 0.4,
      });
      const jarMesh = new THREE.Mesh(jarGeo, jarMat);
      jarMesh.position.y = 0.35;
      jarGroup.add(jarMesh);

      const jarLidGeo = new THREE.CylinderGeometry(0.67, 0.67, 0.2, 32);
      const jarLidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8753D'),
        metalness: 0.7,
        roughness: 0.2,
      });
      const jarLidMesh = new THREE.Mesh(jarLidGeo, jarLidMat);
      jarLidMesh.position.y = 0.8;
      jarGroup.add(jarLidMesh);

      jarGroup.position.set(0.8, 0, -0.2);
      podiumGroup.add(jarGroup);

      // Product 3: Serum Dropper (Thin cylinder + Sphere tip)
      const serumGroup = new THREE.Group();
      const serumGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.1, 32);
      const serumMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8753D'),
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const serumMesh = new THREE.Mesh(serumGeo, serumMat);
      serumMesh.position.y = 0.55;
      serumGroup.add(serumMesh);

      const dropperGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const dropperMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#050403') });
      const dropperMesh = new THREE.Mesh(dropperGeo, dropperMat);
      dropperMesh.position.y = 1.25;
      serumGroup.add(dropperMesh);

      serumGroup.position.set(0.1, 0, 0.9);
      podiumGroup.add(serumGroup);

      scene.add(podiumGroup);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xfff7ef, 1.0);
      scene.add(ambientLight);

      const spotlight = new THREE.SpotLight(0xd49a63, 6.0);
      spotlight.position.set(3, 8, 5);
      spotlight.angle = Math.PI / 4;
      spotlight.penumbra = 0.8;
      scene.add(spotlight);

      const copperFill = new THREE.PointLight(0xc8753d, 3.0, 8);
      copperFill.position.set(-4, 2, 2);
      scene.add(copperFill);

      const handleResize = () => {
        if (!containerRef.current || !renderer) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      const clock = new THREE.Clock();
      const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        podiumGroup.rotation.y = elapsedTime * 0.3;

        renderer?.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        baseGeo.dispose();
        baseMat.dispose();
        renderer?.dispose();
      };
    } catch (err) {
      console.warn('3D Product Stage WebGL fallback triggered:', err);
      setHasWebGL(false);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-[320px] flex items-center justify-center ${className}`}>
      {hasWebGL ? (
        <canvas ref={canvasRef} className="w-full h-full pointer-events-none drop-shadow-[0_20px_40px_rgba(200,117,61,0.2)]" />
      ) : (
        /* CSS Fallback Stage */
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-64 h-24 bottom-6 rounded-full bg-gradient-to-r from-[#1A0F0A] via-[#C8753D]/40 to-[#1A0F0A] border border-[#C8753D]/40 shadow-2xl flex items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold">Stage Routine Luxe KURLA</span>
          </div>
          <div className="flex gap-4 items-end mb-12">
            <div className="w-16 h-28 rounded-t-xl bg-[#3A2218] border border-[#C8753D]/40 flex flex-col justify-between p-2">
              <span className="w-6 h-6 rounded-full bg-[#D49A63] mx-auto" />
              <span className="text-[10px] text-[#FFF7EF] text-center">Leave-In</span>
            </div>
            <div className="w-20 h-20 rounded-xl bg-[#FFF7EF] text-[#111] p-2 flex flex-col justify-between">
              <span className="w-full h-3 rounded bg-[#C8753D]" />
              <span className="text-[10px] font-bold text-center">Masque</span>
            </div>
            <div className="w-12 h-24 rounded-t-lg bg-[#C8753D] p-2 flex flex-col justify-between">
              <span className="w-4 h-4 rounded-full bg-[#050403] mx-auto" />
              <span className="text-[9px] text-white text-center">Sérum</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
