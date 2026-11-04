import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { ThemeTokens } from "./useThemeTokens";

type BarDatum = { label: string; value: number };

type Props = {
  data: BarDatum[];
  palette: Pick<ThemeTokens, "ink" | "bronze" | "accent" | "border">;
  isDark: boolean;
  onSelect?: (index: number) => void;
  emptyLabel?: string;
  className?: string;
};

/**
 * Bar chart 3D: batang tumbuh saat masuk, terangkat + menyala saat di-hover,
 * grup berputar halus mengikuti kursor, klik batang memicu onSelect.
 */
export default function ThreeBars({
  data,
  palette,
  isDark,
  onSelect,
  emptyLabel = "Belum ada data klik pada periode ini.",
  className = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const signature = data.map((item) => `${item.label}:${item.value}`).join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || data.length === 0) return;

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
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 2.7, 7.2);
    camera.lookAt(0, 0.95, 0);

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

    const bars_data = data.slice(0, 8);
    const maxValue = Math.max(1, ...bars_data.map((item) => item.value));
    const count = Math.max(1, bars_data.length);
    const step = Math.min(1.08, 6.8 / count);
    const barWidth = step * 0.56;

    /* --- cahaya --- */
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.55 : 0.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.4 : 2.0);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(new THREE.Color(palette.accent), 22, 20, 2);
    rimLight.position.set(-5, 2.6, -2.5);
    scene.add(rimLight);

    /* --- panggung --- */
    const planeGeometry = new THREE.PlaneGeometry(16, 16);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDark ? "#131110" : "#f1ebe1"),
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.6,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.004;
    scene.add(plane);

    const grid = new THREE.GridHelper(
      11,
      22,
      new THREE.Color(palette.ink),
      new THREE.Color(palette.border),
    );
    grid.position.y = 0.002;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = isDark ? 0.22 : 0.4;
      material.depthWrite = false;
    });
    scene.add(grid);

    /* --- batang --- */
    const group = new THREE.Group();
    scene.add(group);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const bars: THREE.Mesh[] = [];
    const materials: THREE.MeshStandardMaterial[] = [];
    const padGeometry = new THREE.CircleGeometry(barWidth * 0.62, 24);
    const padMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });

    bars_data.forEach((item, index) => {
      const height = 0.18 + (item.value / maxValue) * 2.35;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.bronze),
        roughness: 0.34,
        metalness: 0.42,
        emissive: new THREE.Color(palette.accent),
        emissiveIntensity: 0.06,
      });
      const bar = new THREE.Mesh(boxGeometry, material);
      const x = (index - (count - 1) / 2) * step;
      bar.scale.set(barWidth, 0.001, barWidth);
      bar.position.set(x, 0.001, 0);
      bar.userData = { index, targetHeight: height };
      group.add(bar);
      bars.push(bar);
      materials.push(material);

      const pad = new THREE.Mesh(padGeometry, padMaterial);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.006, 0);
      group.add(pad);
    });

    /* --- interaksi --- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pointer = { x: 0, y: 0 };
    let hoverIndex: number | null = null;

    const updateTooltip = (clientX: number, clientY: number) => {
      const tip = tipRef.current;
      if (!tip) return;
      const rect = host.getBoundingClientRect();
      tip.style.transform = `translate3d(${clientX - rect.left + 16}px, ${
        clientY - rect.top - 12
      }px, 0)`;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      pointer.x = (localX / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = (localY / Math.max(1, rect.height)) * 2 - 1;

      ndc.x = pointer.x;
      ndc.y = -pointer.y;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(bars, false)[0];
      const next = hit ? Number(hit.object.userData.index) : null;

      if (next !== hoverIndex) {
        hoverIndex = next;
        setHovered(next);
      }
      if (tipRef.current) {
        tipRef.current.style.opacity = next === null ? "0" : "1";
      }
      if (next !== null) updateTooltip(event.clientX, event.clientY);
    };

    const onPointerLeave = () => {
      hoverIndex = null;
      setHovered(null);
      if (tipRef.current) tipRef.current.style.opacity = "0";
    };

    const onClick = () => {
      if (hoverIndex !== null) selectRef.current?.(hoverIndex);
    };

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("click", onClick);

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

    const motionOff =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clock = new THREE.Clock();
    const startTime = performance.now();
    let frame = 0;
    let disposed = false;

    const render = () => {
      frame = requestAnimationFrame(render);
      if (disposed || !inView || document.visibilityState !== "visible") return;

      const time = clock.getElapsedTime();
      const growth = motionOff ? 1 : Math.min(1, (performance.now() - startTime) / 900);
      const eased = 1 - Math.pow(1 - growth, 3);

      bars.forEach((bar, index) => {
        const targetHeight = Number(bar.userData.targetHeight);
        const isHovered = hoverIndex === index;
        const desired = (targetHeight * (isHovered ? 1.14 : 1) + 0.001) * eased;
        bar.scale.y += (desired - bar.scale.y) * 0.18;
        bar.position.y = bar.scale.y / 2;

        const material = bar.material as THREE.MeshStandardMaterial;
        const emissiveTarget = isHovered ? 0.38 : 0.06;
        material.emissiveIntensity +=
          (emissiveTarget - material.emissiveIntensity) * 0.15;
      });

      if (!motionOff) {
        group.rotation.y = Math.sin(time * 0.16) * 0.26 + pointer.x * 0.16;
        group.rotation.x = -pointer.y * 0.04;
      }

      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("click", onClick);

      boxGeometry.dispose();
      materials.forEach((material) => material.dispose());
      padGeometry.dispose();
      padMaterial.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      grid.geometry.dispose();
      gridMaterials.forEach((material) => material.dispose());

      scene.clear();
      renderer.dispose();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, palette.ink, palette.bronze, palette.accent, palette.border, isDark]);

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full cursor-pointer touch-none overflow-hidden rounded-lg ${className}`}
      aria-label="Bar chart 3D top items berdasarkan klik"
      role="img"
    >
      {failed ? (
        <div className="flex h-full items-end justify-center gap-2 px-6 pb-8">
          {data.slice(0, 8).map((item) => {
            const max = Math.max(1, ...data.map((entry) => entry.value));
            return (
              <div
                key={item.label}
                className="w-full max-w-[42px] rounded-t bg-[hsl(var(--livora-bronze)/0.7)]"
                style={{ height: `${20 + (item.value / max) * 70}%` }}
                title={`${item.label}: ${item.value}`}
              />
            );
          })}
        </div>
      ) : null}

      <div
        ref={tipRef}
        className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[220px] rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
        style={{ opacity: 0 }}
      >
        {hovered !== null && data[hovered] ? (
          <>
            <p className="truncate text-[11px] font-medium text-foreground">
              {data[hovered].label}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {data[hovered].value.toLocaleString("id-ID")} klik
            </p>
          </>
        ) : null}
      </div>

      <p className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Gerakkan kursor · klik batang
      </p>
    </div>
  );
}
