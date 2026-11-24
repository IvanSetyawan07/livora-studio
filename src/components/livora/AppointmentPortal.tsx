import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Store, Video, MapPin } from "lucide-react";
import {
  gsap,
  ScrollTrigger,
  registerGsap,
  prefersReducedMotion,
} from "@/lib/motionTokens";
import splitDoorImg from "@/assets/appointment-split-door.jpg";

type MeetMode = "showroom" | "virtual" | "at_space";

const MEET_PILLS: { value: MeetMode; label: string; sub: string; Icon: typeof Store }[] = [
  { value: "showroom", label: "Visit Showroom", sub: "Jl. Bangka Raya", Icon: Store },
  { value: "virtual", label: "Virtual Call", sub: "Online Session", Icon: Video },
  { value: "at_space", label: "At Your Space", sub: "Site Visit", Icon: MapPin },
];

export const AppointmentPortal = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement | null>(null);
  const doorsLayerRef = useRef<HTMLDivElement | null>(null);

  const [meet, setMeet] = useState<MeetMode>("showroom");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [doorsOpen, setDoorsOpen] = useState(false);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || typeof window === "undefined") {
      setDoorsOpen(true);
      return;
    }
    registerGsap();

    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop & Tablet: Sticky Split-Door Architectural Opening
      mm.add("(min-width: 768px)", () => {
        const leftDoor = root.querySelector<HTMLElement>("[data-door-left]");
        const rightDoor = root.querySelector<HTMLElement>("[data-door-right]");
        const doorHint = root.querySelector<HTMLElement>("[data-door-hint]");
        const seamLight = root.querySelector<HTMLElement>("[data-door-seam]");
        const sanctuary = root.querySelector<HTMLElement>("[data-portal-sanctuary]");
        const lines = root.querySelectorAll<HTMLElement>("[data-portal-line]");

        if (!leftDoor || !rightDoor || !sanctuary) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.28,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Unlock pointer interaction once doors part sufficiently
              setDoorsOpen(self.progress >= 0.42);
            },
          },
        });

        // Subtle morning-light seam glow & hint fade right as scroll begins
        if (doorHint) {
          tl.to(doorHint, { opacity: 0, y: -16, duration: 0.16, ease: "power2.out" }, 0);
        }
        if (seamLight) {
          tl.fromTo(
            seamLight,
            { opacity: 0, scaleX: 1 },
            { opacity: 0.9, scaleX: 16, duration: 0.18, ease: "power2.out" },
            0.04,
          ).to(seamLight, { opacity: 0, duration: 0.18, ease: "none" }, 0.24);
        }

        // Weighted travertine & oak double-door leaves sliding outward from exact center seam
        tl.fromTo(
          leftDoor,
          { xPercent: 0 },
          { xPercent: -102, duration: 0.68, ease: "power2.inOut" },
          0.08,
        ).fromTo(
          rightDoor,
          { xPercent: 0 },
          { xPercent: 102, duration: 0.68, ease: "power2.inOut" },
          0.08,
        );

        // Unveiled bright sanctuary gently blooms into focus behind the opening doors
        tl.fromTo(
          sanctuary,
          { scale: 0.94, opacity: 0.2 },
          { scale: 1, opacity: 1, duration: 0.56, ease: "power2.out" },
          0.14,
        );

        if (lines.length) {
          tl.fromTo(
            lines,
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.06, duration: 0.42, ease: "power3.out" },
            0.22,
          );
        }

        // Hold open comfortably from 0.76 -> 1.00 so visitor can interact effortlessly
        tl.to({}, { duration: 0.24 });
      });

      // Mobile: Gentle door parting preview above the open sanctuary
      mm.add("(max-width: 767px)", () => {
        setDoorsOpen(true);
        const mLeft = root.querySelector<HTMLElement>("[data-mobile-door-left]");
        const mRight = root.querySelector<HTMLElement>("[data-mobile-door-right]");
        const mStage = root.querySelector<HTMLElement>("[data-mobile-door-stage]");
        if (mLeft && mRight && mStage) {
          gsap.to(mLeft, {
            xPercent: -26,
            ease: "none",
            scrollTrigger: {
              trigger: mStage,
              start: "top 75%",
              end: "bottom 35%",
              scrub: 0.28,
            },
          });
          gsap.to(mRight, {
            xPercent: 26,
            ease: "none",
            scrollTrigger: {
              trigger: mStage,
              start: "top 75%",
              end: "bottom 35%",
              scrub: 0.28,
            },
          });
        }
      });
    }, root);

    const tId = setTimeout(() => ScrollTrigger.refresh(), 140);
    return () => {
      clearTimeout(tId);
      ctx.revert();
    };
  }, []);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("meet", meet);
    if (name.trim()) params.set("name", name.trim());
    if (note.trim()) params.set("note", note.trim());
    navigate(`/appointment?${params.toString()}#appointment-form`);
  };

  const renderSanctuaryContent = (idPrefix: string) => (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-6 sm:px-10 py-14 sm:py-16 text-center">
      <p
        data-portal-line
        className="inline-flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[#5E93B8] font-medium mb-5"
      >
        <span className="h-px w-8 bg-[#5E93B8]/60" />
        Private Consultation
        <span className="h-px w-8 bg-[#5E93B8]/60" />
      </p>

      <h2
        data-portal-line
        className="serif text-4xl sm:text-6xl lg:text-[74px] font-light leading-[0.95] tracking-[-0.02em] text-[#232528] text-balance"
      >
        READY TO REALIZE
        <br />
        YOUR DREAM{" "}
        <em className="italic font-light text-[#5E93B8]">SPACE?</em>
      </h2>

      <p
        data-portal-line
        className="mt-5 mx-auto max-w-[48ch] text-sm sm:text-[15px] font-light leading-relaxed text-[#656B73]"
      >
        Share three quiet details below — we will carry them straight into your private LIVORA appointment booking.
      </p>

      {/* ── 3-Line Quick Hand-Off (Minimal Editorial Hairlines) ── */}
      <form
        onSubmit={handleContinue}
        data-portal-line
        className="mt-10 sm:mt-12 text-left space-y-6"
      >
        {/* Line 1: Meeting Mode Selector */}
        <div className="pb-5 border-b border-[#232528]/14">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#656B73] mb-3 text-center">
            01 · How would you like to meet?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {MEET_PILLS.map(({ value, label, sub, Icon }) => {
              const active = meet === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMeet(value)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2.5 rounded-full px-4 sm:px-5 py-2.5 text-xs transition-all duration-300 border ${
                    active
                      ? "bg-[#232528] text-[#FAF8F4] border-[#232528] shadow-[0_10px_24px_-10px_rgba(35,37,40,0.4)]"
                      : "bg-white/80 text-[#232528] border-[#232528]/14 hover:border-[#5E93B8]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-[#9BC4DF]" : "text-[#5E93B8]"}`} />
                  <span className="font-medium tracking-wide">{label}</span>
                  <span
                    className={`hidden sm:inline text-[10px] tracking-wider ${
                      active ? "text-white/65" : "text-[#656B73]"
                    }`}
                  >
                    · {sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line 2 & Line 3: Minimal Hairline Editorial Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="border-b border-[#232528]/18 focus-within:border-[#5E93B8] transition-colors pb-2">
            <label
              htmlFor={`${idPrefix}-name`}
              className="block text-[10px] uppercase tracking-[0.3em] text-[#656B73] mb-1.5"
            >
              02 · Your Name
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nadia Pratama"
              className="w-full bg-transparent py-1.5 text-base font-light text-[#232528] placeholder:text-[#232528]/35 focus:outline-none"
            />
          </div>

          <div className="border-b border-[#232528]/18 focus-within:border-[#5E93B8] transition-colors pb-2">
            <label
              htmlFor={`${idPrefix}-note`}
              className="block text-[10px] uppercase tracking-[0.3em] text-[#656B73] mb-1.5"
            >
              03 · Space or Vision (Optional)
            </label>
            <input
              id={`${idPrefix}-note`}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Living room & custom sofa for South Jakarta home"
              className="w-full bg-transparent py-1.5 text-base font-light text-[#232528] placeholder:text-[#232528]/35 focus:outline-none"
            />
          </div>
        </div>

        {/* CTA Row */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-3 w-full sm:w-auto rounded-full bg-[#232528] px-8 py-4 text-[11px] uppercase tracking-[0.28em] font-medium text-[#FAF8F4] shadow-[0_18px_36px_-16px_rgba(35,37,40,0.45)] hover:bg-[#5E93B8] transition-colors duration-300"
          >
            <span>Continue to Appointment</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <Link
            to="/appointment"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-[#656B73] hover:text-[#232528] transition-colors underline-grow py-2"
          >
            <span>Explore Full Consultation</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </form>
    </div>
  );

  return (
    <section
      id="begin-appointment"
      ref={rootRef}
      className="relative md:h-[235vh] bg-[#FAF8F4] text-[#232528]"
    >
      {/* ══════════════════════════════════════════════════════════════
          DESKTOP / TABLET: FULL-SCREEN SPLIT-DOOR ARCHITECTURAL PORTAL
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex sticky top-0 h-[100svh] w-full overflow-hidden items-center justify-center">
        {/* Layer 1: Bright Calm Sunlit Morning Sanctuary (Revealed Underneath) */}
        <div
          data-portal-sanctuary
          className="relative z-10 flex h-full w-full items-center justify-center will-change-transform"
          style={{
            background:
              "radial-gradient(ellipse at 50% 24%, #FFFFFF 0%, #EDF4F8 46%, #F6F2EA 100%)",
          }}
        >
          {/* Delicate centered architectural arch ring in background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto h-[78vh] w-[min(92vw,960px)] rounded-full border border-[#5E93B8]/12"
          />
          {renderSanctuaryContent("portal-desktop")}
        </div>

        {/* Layer 2: Symmetrical Bespoke Roman Travertine & Fluted Oak Double Doors */}
        <div
          ref={doorsLayerRef}
          aria-hidden={doorsOpen}
          className={`absolute inset-0 z-20 flex overflow-hidden ${
            doorsOpen ? "pointer-events-none" : "pointer-events-auto"
          }`}
        >
          {/* Left Architectural Door Wing */}
          <div
            data-door-left
            className="relative w-1/2 h-full overflow-hidden bg-[#EFEAE1] shadow-[16px_0_48px_rgba(35,37,40,0.18)] will-change-transform"
          >
            <img
              src={splitDoorImg}
              alt="LIVORA travertine and fluted oak architectural double doors — left wing"
              loading="eager"
              decoding="async"
              className="absolute inset-y-0 left-0 w-[200%] max-w-none h-full object-cover object-center"
            />
          </div>

          {/* Right Architectural Door Wing */}
          <div
            data-door-right
            className="relative w-1/2 h-full overflow-hidden bg-[#EFEAE1] shadow-[-16px_0_48px_rgba(35,37,40,0.18)] will-change-transform"
          >
            <img
              src={splitDoorImg}
              alt="LIVORA travertine and fluted oak architectural double doors — right wing"
              loading="eager"
              decoding="async"
              className="absolute inset-y-0 right-0 w-[200%] max-w-none h-full object-cover object-center"
            />
          </div>

          {/* Soft shaft of morning light down exact center seam as doors begin to part */}
          <div
            data-door-seam
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-white blur-[2px] opacity-0"
          />

          {/* Quiet Frosted Invitation Badge on Closed Doors */}
          <div
            data-door-hint
            className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex items-center gap-3 rounded-full bg-white/90 backdrop-blur-md border border-[#232528]/10 px-6 py-2.5 text-[10px] uppercase tracking-[0.34em] text-[#232528] shadow-[0_14px_34px_rgba(35,37,40,0.14)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#5E93B8]" />
            <span>Scroll to Open · Begin Your Space</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE: PARTING ARCHITECTURAL DOORS PRELUDE + OPEN SANCTUARY
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden"
        style={{
          background:
            "linear-gradient(180deg, #FAF8F4 0%, #EDF4F8 55%, #F6F2EA 100%)",
        }}
      >
        <div
          data-mobile-door-stage
          className="relative mx-5 pt-6 overflow-hidden"
        >
          <div className="relative flex h-[240px] sm:h-[300px] w-full overflow-hidden rounded-[24px] bg-[#EDF4F8] shadow-sm">
            {/* Soft sunlit glow revealed in the parting gap */}
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="serif italic text-xl text-[#5E93B8]">
                Step Inside
              </span>
            </div>
            <div
              data-mobile-door-left
              className="relative z-10 w-1/2 h-full overflow-hidden will-change-transform"
            >
              <img
                src={splitDoorImg}
                alt="LIVORA architectural door left"
                loading="lazy"
                decoding="async"
                className="absolute inset-y-0 left-0 w-[200%] max-w-none h-full object-cover object-center"
              />
            </div>
            <div
              data-mobile-door-right
              className="relative z-10 w-1/2 h-full overflow-hidden will-change-transform"
            >
              <img
                src={splitDoorImg}
                alt="LIVORA architectural door right"
                loading="lazy"
                decoding="async"
                className="absolute inset-y-0 right-0 w-[200%] max-w-none h-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {renderSanctuaryContent("portal-mobile")}
      </div>
    </section>
  );
};
