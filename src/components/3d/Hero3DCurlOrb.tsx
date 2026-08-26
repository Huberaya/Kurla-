import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const Hero3DCurlOrb: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const container = containerRef.current;
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 300;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Abstract Hair Curl Orb geometry (TorusKnot)
      const geometry = new THREE.TorusKnotGeometry(1, 0.38, 128, 32, 2, 3);

      // Material with warm glossy Cacao / Copper / Caramel satin reflections
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#C8753D'),
        roughness: 0.25,
        metalness: 0.65,
        emissive: new THREE.Color('#3A2218'),
        emissiveIntensity: 0.3,
      });

      const curlMesh = new THREE.Mesh(geometry, material);
      scene.add(curlMesh);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xfff7ef, 1.2);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xd49a63, 3.0);
      mainLight.position.set(4, 5, 4);
      scene.add(mainLight);

      const copperLight = new THREE.PointLight(0xc8753d, 4.0, 10);
      copperLight.position.set(-3, -2, 2);
      scene.add(copperLight);

      const handleResize = () => {
        if (!containerRef.current || !renderer) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      // Render loop
      let clock = new THREE.Clock();
      const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        curlMesh.rotation.x = elapsedTime * 0.25;
        curlMesh.rotation.y = elapsedTime * 0.35;
        curlMesh.position.y = Math.sin(elapsedTime * 1.2) * 0.12;

        renderer?.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        geometry.dispose();
        material.dispose();
        renderer?.dispose();
      };
    } catch (err) {
      console.warn('WebGL initialization failed, rendering fallback:', err);
      setHasWebGL(false);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {hasWebGL ? (
        <canvas ref={canvasRef} className="w-full h-full pointer-events-none drop-shadow-[0_20px_40px_rgba(200,117,61,0.25)]" />
      ) : (
        /* CSS/SVG Fallback */
        <div className="relative w-56 h-56 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#3A2218] via-[#C8753D] to-[#D49A63] opacity-30 blur-2xl animate-pulse" />
          <svg viewBox="0 0 200 200" className="w-48 h-48 animate-spin" style={{ animationDuration: '20s' }}>
            <path
              d="M 100,20 C 140,20 180,60 180,100 C 180,140 140,180 100,180 C 60,180 20,140 20,100 C 20,60 60,20 100,20 Z"
              fill="none"
              stroke="url(#copperGrad)"
              strokeWidth="12"
              strokeDasharray="150 50"
            />
            <defs>
              <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C8753D" />
                <stop offset="50%" stopColor="#D49A63" />
                <stop offset="100%" stopColor="#3A2218" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
};
