import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X, Plus } from "lucide-react";
import { imgUrl } from "@/lib/adminApi";
import {
  fetchProjectLayouts,
  type ProjectLayout,
  type ProjectRoom,
  type RoomHotspot,
} from "@/lib/projectSpaces";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  EASE,
  DUR,
  STAGGER,
  SCRUB,
  prefersReducedMotion,
} from "@/lib/motionTokens";

const src = (p?: string | null) => (p ? imgUrl(p) : "");

/* ────────────────────────────────────────────────────────────
   Hotspot dot + micro panel (same language as catalog)
   ──────────────────────────────────────────────────────────── */
const HotspotDot = ({
  spot,
  active,
  onToggle,
}: {
  spot: RoomHotspot;
  active: boolean;
  onToggle: () => void;
}) => {
  const placeRight = spot.x < 55;
  const placeBelow = spot.y < 45;

  return (
    <div
      className="absolute z-20"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: "translate(-50%,-50%)" }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={spot.label}
        className="relative grid place-items-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: active ? "#C9A97A" : "rgba(255,255,255,0.92)",
          color: active ? "#FFFFFF" : "#1A1A1A",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          cursor: "pointer",
          transition: "background .35s ease, transform .35s ease",
        }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: "1px solid rgba(201,169,122,0.65)",
            animation: "hs-ping 2.4s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <Plus size={14} strokeWidth={1.6} style={{ transform: active ? "rotate(45deg)" : "none", transition: "transform .3s ease" }} />
      </button>

      {active && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.16)] p-3 flex items-center gap-3 w-[240px] sm:w-[280px] animate-scale-in"
          style={{
            left: placeRight ? 22 : undefined,
            right: !placeRight ? 22 : undefined,
            top: placeBelow ? 12 : undefined,
            bottom: !placeBelow ? 12 : undefined,
          }}
        >
          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#F1EEE9] grid place-items-center">
            {spot.image ? (
              <img src={src(spot.image)} alt={spot.label} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[8px] uppercase tracking-[0.15em] text-[#8A8A8A]">N/A</span>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-[14px] leading-tight text-[#1A1A1A] truncate">{spot.label}</p>
            {spot.description && (
              <p className="text-[12px] text-[#7A7A7A] leading-snug line-clamp-2 mt-0.5">{spot.description}</p>
            )}
            {spot.item_slug && (
              <Link
                to={`/items/${spot.item_slug}`}
                className="inline-flex items-center gap-1 mt-1.5 text-[12px] text-[#C9A97A]"
              >
                View item <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            )}
          </div>
          <button
            onClick={onToggle}
            aria-label="Close"
            className="absolute top-2 right-2 text-[#9A9A9A] hover:text-[#1A1A1A]"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Room visual (image + hotspots + parallax)
   ──────────────────────────────────────────────────────────── */
const RoomVisual = ({
  room,
  index,
  onActive,
}: {
  room: ProjectRoom;
  index: number;
  onActive: (i: number) => void;
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [activeSpot, setActiveSpot] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    registerGsap();
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.fromTo(
          el,
          { clipPath: "inset(14% 10% 14% 10% round 2px)", scale: 1.06, opacity: 0.35 },
          {
            clipPath: "inset(0% 0% 0% 0% round 2px)",
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            duration: DUR.card,
            ease: EASE.card,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          },
        );

        gsap.fromTo(
          imgRef.current,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: EASE.scrub,
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: SCRUB },
          },
        );
      }

      ScrollTrigger.create({
        trigger: el,
        start: "top 60%",
        end: "bottom 40%",
        onToggle: (self) => self.isActive && onActive(index),
      });
    }, el);

    return () => ctx.revert();
  }, [index, onActive, room.id]);

  return (
    <div className="relative" data-room-visual>
      <div
        ref={wrapRef}
        className="relative overflow-hidden bg-[#EFEDE8]"
        onClick={() => setActiveSpot(null)}
        style={{ aspectRatio: "4 / 3" }}
      >
        <img
          ref={imgRef}
          src={src(room.image)}
          alt={room.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ scale: "1.12" }}
          loading="lazy"
        />
        {(room.hotspots ?? []).map((h, i) => (
          <HotspotDot
            key={h.id ?? i}
            spot={h}
            active={activeSpot === i}
            onToggle={() => setActiveSpot(activeSpot === i ? null : i)}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#9A9184]">
        {String(index + 1).padStart(2, "0")} — {room.title}
      </p>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Sticky detail panel (right column) — swaps per active room
   ──────────────────────────────────────────────────────────── */
const RoomDetail = ({ room }: { room?: ProjectRoom }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current!.querySelectorAll("[data-anim]"),
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: DUR.textFast, ease: EASE.text, stagger: STAGGER.items },
      );
    }, ref);
    return () => ctx.revert();
  }, [room?.id]);

  if (!room) return null;

  return (
    <div ref={ref} key={room.id}>
      <p data-anim className="text-[11px] uppercase tracking-[0.28em] text-[#C9A97A]">
        Room
      </p>
      <h3
        data-anim
        className="serif font-light text-[#1A1A1A] leading-[1.05] mt-3"
        style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
      >
        {room.title}
      </h3>

      {room.area && (
        <p data-anim className="serif font-light text-[#1A1A1A] mt-5" style={{ fontSize: "clamp(26px,3vw,40px)" }}>
          {room.area}
        </p>
      )}

      {room.description && (
        <p data-anim className="text-[15px] leading-[1.85] text-[#5A574F] mt-5 max-w-[46ch]">
          {room.description}
        </p>
      )}

      {(room.specs ?? []).length > 0 && (
        <div data-anim className="mt-8 border-t border-[#1A1A1A]/12">
          {(room.specs ?? []).map((s, i) => (
            <div key={i} className="flex items-baseline justify-between gap-6 py-3 border-b border-[#1A1A1A]/10">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A9184]">{s.label}</span>
              <span className="text-[14px] text-[#1A1A1A]">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {(room.hotspots ?? []).length > 0 && (
        <div data-anim className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#9A9184] mb-3">Items in this room</p>
          <div className="flex flex-wrap gap-2">
            {(room.hotspots ?? []).map((h, i) =>
              h.item_slug ? (
                <Link
                  key={i}
                  to={`/items/${h.item_slug}`}
                  className="text-[12px] px-3 py-1.5 rounded-full border border-[#1A1A1A]/12 text-[#1A1A1A] hover:border-[#C9A97A] hover:text-[#C9A97A] transition-colors"
                >
                  {h.label}
                </Link>
              ) : (
                <span
                  key={i}
                  className="text-[12px] px-3 py-1.5 rounded-full border border-[#1A1A1A]/12 text-[#5A574F]"
                >
                  {h.label}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Main section
   ──────────────────────────────────────────────────────────── */
const ProjectSpaces = ({ projectId }: { projectId?: number }) => {
  const [layouts, setLayouts] = useState<ProjectLayout[]>([]);
  const [layoutIdx, setLayoutIdx] = useState(0);
  const [activeRoom, setActiveRoom] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectLayouts(projectId)
      .then((d) => setLayouts(d.filter((l) => !!l.image || (l.rooms ?? []).length > 0)))
      .catch(() => setLayouts([]));
  }, [projectId]);

  const layout = layouts[layoutIdx];
  const rooms = useMemo(() => layout?.rooms ?? [], [layout]);

  useEffect(() => {
    setActiveRoom(0);
  }, [layoutIdx]);

  // Intro + floorplan reveal
  useLayoutEffect(() => {
    if (!sectionRef.current || !layout) return;
    registerGsap();
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      if (reduced) return;
      gsap.fromTo(
        "[data-spaces-intro] > *",
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DUR.text,
          ease: EASE.text,
          stagger: STAGGER.lines,
          scrollTrigger: { trigger: "[data-spaces-intro]", start: "top 85%", once: true },
        },
      );
      gsap.fromTo(
        "[data-floorplan]",
        { clipPath: "inset(0% 0% 100% 0%)", y: 40 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          y: 0,
          duration: 1.15,
          ease: EASE.card,
          scrollTrigger: { trigger: "[data-floorplan]", start: "top 88%", once: true },
        },
      );
      gsap.fromTo(
        "[data-plan-meta] > *",
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: DUR.textFast,
          ease: EASE.text,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: "[data-plan-meta]", start: "top 88%", once: true },
        },
      );
      ScrollTrigger.refresh();
    }, sectionRef);
    return () => ctx.revert();
  }, [layout?.id, layout]);

  if (!projectId || layouts.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative" style={{ background: "#FAFAF8" }}>
      <style>{`
        @keyframes hs-ping { 0%{transform:scale(1);opacity:.9} 70%{transform:scale(2.1);opacity:0} 100%{opacity:0} }
      `}</style>

      <div className="px-6 md:px-[60px] pt-16 md:pt-24 pb-10">
        <div data-spaces-intro className="max-w-[52ch]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9A97A]">The Spaces</p>
          <h2
            className="serif font-light text-[#1A1A1A] leading-[1.04] mt-4"
            style={{ fontSize: "clamp(32px, 5.4vw, 68px)" }}
          >
            Floor plans &amp; rooms
          </h2>
          <p className="text-[15px] leading-[1.85] text-[#5A574F] mt-5">
            Explore each level of the project — the plan, the rooms inside it, and every piece we
            placed within them.
          </p>
        </div>

        {/* Layout switcher */}
        {layouts.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-9">
            {layouts.map((l, i) => (
              <button
                key={l.id ?? i}
                onClick={() => setLayoutIdx(i)}
                className="text-[11px] uppercase tracking-[0.22em] px-5 py-2.5 rounded-full transition-all duration-500"
                style={{
                  background: i === layoutIdx ? "#1A1A17" : "transparent",
                  color: i === layoutIdx ? "#FAFAF8" : "#1A1A1A",
                  border: `1px solid ${i === layoutIdx ? "#1A1A17" : "rgba(26,26,26,0.15)"}`,
                }}
              >
                {l.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floor plan */}
      <div className="px-6 md:px-[60px] pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        <div className="lg:col-span-8">
          {layout?.image && (
            <img
              key={layout.id}
              data-floorplan
              src={src(layout.image)}
              alt={`${layout.title} floor plan`}
              className="w-full h-auto object-contain"
            />
          )}
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#9A9184]">
            <span className="text-[#1A1A1A]">{layout?.title}</span>
            {layout?.subtitle ? ` / ${layout.subtitle}` : ""}
          </p>
        </div>

        <div data-plan-meta className="lg:col-span-4 lg:pt-6 lg:border-l lg:border-[#1A1A1A]/12 lg:pl-10">
          {layout?.description && (
            <p className="text-[15px] leading-[1.85] text-[#5A574F] mb-8">{layout.description}</p>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A9184]">Rooms</p>
            <p className="serif font-light text-[#1A1A1A]" style={{ fontSize: "clamp(30px,3.6vw,46px)" }}>
              {rooms.length}
            </p>
          </div>
          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A9184]">Tagged items</p>
            <p className="serif font-light text-[#1A1A1A]" style={{ fontSize: "clamp(30px,3.6vw,46px)" }}>
              {rooms.reduce((a, r) => a + (r.hotspots?.length ?? 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Rooms — left visuals, right sticky detail */}
      {rooms.length > 0 && (
        <div className="px-6 md:px-[60px] pb-20 md:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7 space-y-16 md:space-y-28">
            {rooms.map((r, i) => (
              <div key={r.id ?? i}>
                <RoomVisual room={r} index={i} onActive={setActiveRoom} />
                {/* mobile inline detail */}
                <div className="lg:hidden mt-6">
                  <RoomDetail room={r} />
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-28">
              <RoomDetail room={rooms[activeRoom]} />
              <div className="mt-10 flex items-center gap-3">
                <span className="text-[11px] tracking-[0.24em] text-[#1A1A1A]">
                  {String(activeRoom + 1).padStart(2, "0")}
                </span>
                <div className="relative h-px flex-1 bg-[#1A1A1A]/12">
                  <span
                    className="absolute left-0 top-0 h-px bg-[#C9A97A] transition-all duration-700"
                    style={{ width: `${((activeRoom + 1) / rooms.length) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] tracking-[0.24em] text-[#9A9184]">
                  {String(rooms.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectSpaces;
