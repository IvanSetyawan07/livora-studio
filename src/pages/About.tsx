import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";
import aboutImg from "@/assets/about-livora.jpg";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { PageBreadcrumb } from "@/components/livora/Breadcrumb";
import { useReveal } from "@/hooks/useReveal";

const missions = [
  { t: "Integrate", d: "the complex journey of interior designing." },
  { t: "Construct", d: "top-class quality and adaptive design, furniture and installation." },
  { t: "Create", d: "long-lasting and meaningful impact in every space." },
];

const teamMembers = [
  { name: "Andreas Wijaya", role: "Founder & Chief Executive Officer", img: "men/11" },
  { name: "Putri Anggraini", role: "Chief Operating Officer", img: "women/12" },
  { name: "Rizky Hartono", role: "Chief Financial Officer", img: "men/13" },
  { name: "Sarah Lestari", role: "Chief of Staff", img: "women/14" },
  { name: "Dimas Pratama", role: "Director of Agent Success", img: "men/15" },
  { name: "Bayu Nugroho", role: "Chief Technology Officer", img: "men/16" },
  { name: "Maya Setiawan", role: "Director of Growth", img: "women/17" },
  { name: "Reza Saputra", role: "Regional Manager", img: "men/18" },
  { name: "Intan Permata", role: "Property Data Manager", img: "women/19" },
  { name: "Clara Halim", role: "Executive Assistant", img: "women/20" },
  { name: "Yoga Prasetyo", role: "Agent Support", img: "men/3" },
  { name: "Nadia Kusuma", role: "Accounting Assistant", img: "women/5" },
];

const SwiperScrollbar = ({ trackRef }: { trackRef: React.RefObject<HTMLDivElement> }) => {
  const [thumb, setThumb] = useState({ width: 20, left: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0 });

  const update = () => {
    const el = trackRef.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const ratio = el.clientWidth / el.scrollWidth;
    const width = Math.max(ratio * 100, 8);
    const max = el.scrollWidth - el.clientWidth;
    const progress = max > 0 ? el.scrollLeft / max : 0;
    const left = progress * (100 - width);
    setThumb({ width, left });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const bar = barRef.current;
    const el = trackRef.current;
    if (!bar || !el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { down: true, startX: e.clientX, startLeft: thumb.left };
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const bar = barRef.current;
    const el = trackRef.current;
    if (!bar || !el) return;
    const barW = bar.clientWidth;
    const dx = e.clientX - drag.current.startX;
    const dxPct = (dx / barW) * 100;
    const newLeft = Math.min(Math.max(drag.current.startLeft + dxPct, 0), 100 - thumb.width);
    const max = el.scrollWidth - el.clientWidth;
    const progress = newLeft / (100 - thumb.width || 1);
    el.scrollLeft = progress * max;
  };
  const onPointerUp = () => {
    drag.current.down = false;
  };

  return (
    <div
      ref={barRef}
      className="swiper-scrollbar core-team_scrollbar__g2y6z relative mt-8 h-1 rounded-full bg-foreground/10"
      onPointerDown={(e) => {
        const bar = barRef.current;
        const el = trackRef.current;
        if (!bar || !el) return;
        const rect = bar.getBoundingClientRect();
        const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
        const targetLeft = Math.min(Math.max(clickPct - thumb.width / 2, 0), 100 - thumb.width);
        const max = el.scrollWidth - el.clientWidth;
        const progress = targetLeft / (100 - thumb.width || 1);
        el.scrollTo({ left: progress * max, behavior: "smooth" });
      }}
    >
      <div
        role="scrollbar"
        aria-orientation="horizontal"
        className="absolute top-0 h-full rounded-full bg-foreground cursor-grab active:cursor-grabbing transition-colors hover:bg-foreground/80"
        style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
};

const AboutPage = () => {
  useReveal();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, moved: false });



  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : 1;
    setActiveIndex(Math.round(el.scrollLeft / step));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el) return;
    dragState.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScroll - dx;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.down = false;
    try { trackRef.current?.releasePointerCapture(e.pointerId); } catch {}
  };

  useEffect(() => {
    document.title = "About — LIVORA";
    const meta =
      document.querySelector('meta[name="description"]') ??
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    meta.setAttribute(
      "content",
      "About LIVORA — a single point of contact for your dream space. Our vision and mission for interior creation.",
    );
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "80px", background: "hsl(var(--background))" }}>
        <PageBreadcrumb items={[{ label: "Home", to: "/" }, { label: "About" }]} />

        <section className="container-livora pt-8 pb-28 md:pb-40">
          {/* About Us */}
          <div className="reveal mb-12 md:mb-16">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-foreground/60 mb-5">
              <span className="divider-line" />
              About Us
            </p>
            <h1 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
              A single point of contact for <em className="italic">your dream space.</em>
            </h1>
          </div>

          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <div className="reveal md:col-span-7 hover-zoom">
              <img
                src={aboutImg}
                alt="Livora founder portrait"
                width={1280}
                height={896}
                loading="lazy"
                className="w-full aspect-[5/4] object-cover"
              />
            </div>
            <div className="reveal md:col-span-5 md:pt-8 space-y-8">
              <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
                At Livora, we believe creating your dream space shouldn't be a complex struggle. Most paths to a
                beautiful interior are blocked by disconnected services. We were founded to solve that fundamental
                problem.
              </p>
              <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-light">
                We act as your <span className="text-foreground">Designers</span> — tailoring spaces to your needs; your{" "}
                <span className="text-foreground">Importers</span> — sourcing high-quality materials directly; and your{" "}
                <span className="text-foreground">Contractors</span> — ensuring every detail is installed to perfection.
              </p>
            </div>
          </div>

          {/* Vision */}
          <div className="reveal mt-24 md:mt-32 max-w-4xl">
            <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
              <span className="divider-line" />
              Vision
            </p>
            <h3 className="serif text-3xl md:text-5xl font-light italic leading-snug text-foreground/90">
              "To be the leading One-Stop ecosystem for interior creation — where design, supply and construction merge
              seamlessly."
            </h3>
          </div>

          {/* Mission */}
          <div className="mt-24 md:mt-32">
            <div className="reveal mb-12 md:mb-16">
              <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
                <span className="divider-line" />
                Mission
              </p>
              <h3 className="serif text-4xl md:text-5xl font-light leading-tight">
                Three principles, <em className="italic">one philosophy.</em>
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {missions.map((m, i) => (
                <div key={m.t} className="reveal group mission-card" style={{ transitionDelay: `${i * 100}ms` }}>
                  <h4
                    className="serif text-3xl md:text-4xl font-light mb-4 origin-left transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    style={{ color: "#1A1A1A" }}
                  >
                    {m.t}
                  </h4>
                  <p className="font-light" style={{ color: "#6B6B6B", lineHeight: 1.7 }}>
                    {m.d}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Meet the Livora Team */}
          <section className="mt-24 md:mt-32 -mx-6 md:-mx-10 px-6 md:px-10 py-20 md:py-28" style={{ background: "#F9F9F9" }}>
            <div className="reveal mb-12 md:mb-16">
              <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 mb-5">
                <span className="divider-line" />
                Our Team
              </p>
              <h2 className="serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] text-balance">
                Meet the <em className="italic">Livora Team.</em>
              </h2>
              <p className="mt-6 max-w-2xl text-base md:text-lg text-foreground/70 font-light leading-relaxed">
                Our team is as passionate as our mission — dedicated to delivering exceptional property experiences.
              </p>
            </div>

            <div className="relative">
              <div
                ref={trackRef}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 -mx-6 md:-mx-10 px-6 md:px-10 cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {teamMembers.map((m, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <div
                      key={m.name}
                      data-card
                      className={`group snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[32%] lg:w-[23%] transition-all duration-500 ease-out ${
                        isActive ? "scale-[1.03]" : "scale-100 opacity-80"
                      }`}
                    >
                      <div className="overflow-hidden rounded-xl aspect-[3/4] mb-4 bg-muted shadow-sm group-hover:shadow-xl transition-shadow duration-500">
                        <img
                          src={`https://randomuser.me/api/portraits/${m.img}.jpg`}
                          alt={m.name}
                          loading="lazy"
                          draggable={false}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                      </div>
                      <h4 className="font-semibold text-[16px] text-foreground">{m.name}</h4>
                      <p className="text-[14px] mt-1" style={{ color: "#6B7280" }}>{m.role}</p>
                    </div>
                  );
                })}
              </div>

              {/* Swiper-style scrollbar */}
              <SwiperScrollbar trackRef={trackRef} />
            </div>
          </section>

          <div className="mt-20">
            <Link
              to="/"
              className="text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow"
            >
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AboutPage;
