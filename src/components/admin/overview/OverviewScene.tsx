import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { ThemeTokens } from "./useThemeTokens";

type Props = {
  palette: Pick<ThemeTokens, "ink" | "bronze" | "accent" | "border">;
  isDark: boolean;
  /** 0..1 — makin tinggi, makin cepat rotasi orb. */
  energy?: number;
  className?: string;
};

/**
 * Orb 3D: kerangka ikosahedron, awan partikel, ring orbit, dan node yang
 * mengelilingi inti. Kursor menggeser kamera (parallax halus).
 */
export default function OverviewScene({ palette, isDark, energy = 0.5, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const probe = document.createElement("canvas");
    const supported = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
    if (!supported) {
      setFailed(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.15, 6.6);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.zIndex = "0";
    host.appendChild(canvas);

    const ink = new THREE.Color(palette.ink);
    const bronze = new THREE.Color(palette.bronze);
    const accent = new THREE.Color(palette.accent);

    const root = new THREE.Group();
    scene.add(root);

    /* --- kerangka luar + inti --- */
    const shellGeometry = new THREE.IcosahedronGeometry(1.62, 1);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.34 : 0.26,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    root.add(shell);

    const coreGeometry = new THREE.IcosahedronGeometry(0.9, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: bronze,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.5 : 0.3,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    root.add(core);

    /* --- awan partikel (sebaran fibonacci sphere) --- */
    const COUNT = 760;
    const positions = new Float32Array(COUNT * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const spread = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const radius = 1.35 + Math.random() * 0.75;
      positions[i * 3] = Math.cos(theta) * spread * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(theta) * spread * radius;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: bronze,
      size: 0.038,
      sizeAttenuation: true,
      transparent: true,
      opacity: isDark ? 0.9 : 0.55,
      depthWrite: false,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    root.add(particles);

    /* --- ring orbit --- */
    const rings = new THREE.Group();
    root.add(rings);
    const ringGeometry = new THREE.TorusGeometry(2.24, 0.006, 6, 180);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: ink,
      transparent: true,
      opacity: isDark ? 0.4 : 0.18,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.55;
      ring.rotation.y = i * 0.6;
      rings.add(ring);
    }

    /* --- node yang mengorbit --- */
    const nodeGeometry = new THREE.SphereGeometry(0.045, 12, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: bronze });
    const nodes: Array<{
      mesh: THREE.Mesh;
      radius: number;
      speed: number;
      phase: number;
      tilt: number;
    }> = [];
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      root.add(mesh);
      nodes.push({
        mesh,
        radius: 2.02 + (i % 2) * 0.24,
        speed: 0.32 + i * 0.08,
        phase: (i / 5) * Math.PI * 2,
        tilt: (i - 2) * 0.2,
      });
    }

    /* --- interaksi --- */
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.targetY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    };
    const onPointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    let inView = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    intersectionObserver.observe(host);

    const onVisibility = () => {
      if (document.visibilityState === "visible") clock.getDelta();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const motionOff =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = 0.35 + Math.min(1, Math.max(0, energy)) * 0.9;
    const clock = new THREE.Clock();

    let frame = 0;
    let disposed = false;

    const render = () => {
      frame = requestAnimationFrame(render);
      if (disposed || !inView || document.visibilityState !== "visible") return;

      const time = clock.getElapsedTime();

      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      if (!motionOff) {
        root.rotation.y += 0.0016 * speed;
        shell.rotation.x = Math.sin(time * 0.22) * 0.14;
        core.rotation.y -= 0.0022 * speed;
        particles.rotation.y -= 0.0009;
        rings.rotation.z = time * 0.06 * speed;
        rings.rotation.x = Math.sin(time * 0.18) * 0.16;
        nodes.forEach((node) => {
          const angle = node.phase + time * node.speed;
          node.mesh.position.set(
            Math.cos(angle) * node.radius,
            Math.sin(angle * 0.8) * node.tilt,
            Math.sin(angle) * node.radius * 0.55,
          );
        });
      }

      camera.position.x = pointer.x * 1.05;
      camera.position.y = 0.15 - pointer.y * 0.6;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);

      shellGeometry.dispose();
      shellMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();

      scene.clear();
      renderer.dispose();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
    // Palette masuk sebagai string warna, jadi rebuild hanya saat tema berubah.
  }, [palette.ink, palette.bronze, palette.accent, palette.border, isDark, energy]);

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full touch-none ${className}`}
      aria-label="Visualisasi 3D aktivitas Livora"
      role="img"
    >
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-56 w-56">
            <div className="absolute inset-0 rounded-full border border-[hsl(var(--livora-bronze)/0.35)]" />
            <div className="absolute inset-6 rounded-full border border-[hsl(var(--livora-bronze)/0.25)]" />
            <div className="absolute inset-12 rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(var(--accent)/0.85),hsl(var(--livora-bronze)/0.35)_55%,transparent_75%)] blur-[1px]" />
            <div className="absolute inset-0 rounded-full border border-dashed border-[hsl(var(--livora-bronze)/0.3)] [transform:rotateX(65deg)]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
