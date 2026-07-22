import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValueEvent } from "framer-motion";
import {
  Lightbulb,
  Armchair,
  LayoutGrid,
  Home as HomeIcon,
  Store,
  Video,
  MapPin,
  ArrowRight,
  Play,
  Pause,
  Sparkles,
  Compass,
  Award,
  Palette,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { toast } from "sonner";
import { submitConsultation } from "@/lib/consultations";

import hero from "@/assets/appointment/hero-consultation.jpg";
import helpInspiration from "@/assets/appointment/help-inspiration.jpg";
import helpProduct from "@/assets/appointment/help-product.jpg";
import helpRoom from "@/assets/appointment/help-room.jpg";
import helpFull from "@/assets/appointment/help-full.jpg";
import stepDesigner from "@/assets/appointment/step-designer.jpg";
import stepVision from "@/assets/appointment/step-vision.jpg";
import stepLife from "@/assets/appointment/step-life.jpg";
import questionsMedia from "@/assets/appointment/questions-video.jpg";
import meetShowroom from "@/assets/appointment/meet-showroom.jpg";
import meetVirtual from "@/assets/appointment/meet-virtual.jpg";
import meetSpace from "@/assets/appointment/meet-space.jpg";
import formSide from "@/assets/appointment/form-side.jpg";

/* ────────── Design tokens (inline, konsisten Livora) ────────── */
// Tidak ada gold/coklat sama sekali — hanya hitam, putih, dan netral abu-abu.
const BLACK = "#000000";
const WHITE = "#ffffff";
// Overlay gambar pakai near-black netral (bukan warm-brown) supaya tetap tegas tanpa kesan coklat.
const OVERLAY = "#141414";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HELP_CARDS = [
  { icon: Lightbulb, title: "Inspiration & Styling", desc: "You are looking for inspiration or styling tips.", img: helpInspiration },
  { icon: Armchair, title: "Product Selection", desc: "You need help finding the right furniture.", img: helpProduct },
  { icon: LayoutGrid, title: "Room Design", desc: "You are about to design or redesign a room.", img: helpRoom },
  { icon: HomeIcon, title: "Full Interior Project", desc: "You need advice for a complete home makeover.", img: helpFull },
];

const STEPS = [ 
  { n: "01", title: "Meet Your Designer", desc: "We'll get to know you, your lifestyle, needs, and design goals.", img: stepDesigner },
  { n: "02", title: "Shape Your Vision", desc: "Explore materials, layouts, furniture, and the overall atmosphere.", img: stepVision },
  
  { n: "03", title: "Bring Your Space to Life", desc: "From concept to final execution, we turn your vision into reality.", img: stepLife },

];


const MEET_OPTIONS = [
  { icon: Store, title: "Visit Our Showroom", desc: "Explore materials, see our collection, and discuss your project in person.", img: meetShowroom, value: "showroom" },
  { icon: Video, title: "Virtual Consultation", desc: "Connect with our designer through a video call from the comfort of your home.", img: meetVirtual, value: "virtual" },
  { icon: MapPin, title: "At Your Space", desc: "Our designer comes to you to understand your space and your needs.", img: meetSpace, value: "at_space" },
];

const VALUES = [
  { icon: Sparkles, title: "Personalized Design", desc: "Tailored solutions that reflect your lifestyle, needs, and personality." },
  { icon: Compass, title: "Thoughtful Process", desc: "A clear, seamless journey from concept to completion." },
  { icon: Award, title: "Quality & Craftsmanship", desc: "We use premium materials and partner with skilled craftsmen you can trust." },
  { icon: Palette, title: "From Concept to Completion", desc: "We take care of every detail so you can enjoy a beautiful, well-designed space." },
];

/* ────────── Small primitives ────────── */

const Eyebrow = ({ children, light = false }: { children: React.ReactNode; light?: boolean }) => (
  <span
    className="text-[10px] tracking-[0.28em] uppercase font-light"
    style={{ color: light ? WHITE : BLACK }}
  >
    {children}
  </span>
);

/* ────────── Page ────────── */

export default function Appointment() {
  const [meetChoice, setMeetChoice] = useState<string>("showroom");
  const [helpChoice, setHelpChoice] = useState<string>("");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hero motion — entrance animation + subtle scroll parallax, selaras dengan CatalogHero
  const heroRef = useRef<HTMLElement>(null);
  const [heroMounted, setHeroMounted] = useState(false);
  const [heroHeight, setHeroHeight] = useState(800);
  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 800], [0, 120]);
  const heroImgScale = useTransform(scrollY, [0, 800], [1, 1.08]);
  const ease = [0.22, 1, 0.36, 1] as const;

  useEffect(() => {
    const t = setTimeout(() => setHeroMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Navbar fixed transparan di atas hero, jadi solid + blur setelah discroll melewati hero — sama seperti CatalogPage
  useEffect(() => {
    const measure = () => {
      if (heroRef.current) setHeroHeight(heroRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const navbarBgOpacity = useTransform(
    scrollY,
    [0, heroHeight * 0.3, heroHeight * 0.7],
    [0, 0.5, 1],
    { clamp: true }
  );
  const navbarBlurAmount = useTransform(scrollY, [0, heroHeight * 0.7], [0, 12], { clamp: true });
  const navbarBg = useMotionTemplate`rgba(0,0,0,${navbarBgOpacity})`;
  const navbarBlur = useMotionTemplate`blur(${navbarBlurAmount}px)`;

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    contact_method: "",
    location: "",
    project_type: "",
    estimated_area: "",
    preferred_style: "",
    message: "",
    agree: false,
  });

  const upd = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setFiles((prev) => [...prev, ...picked].slice(0, 6)); // batasi 6 file
    e.target.value = ""; // supaya bisa pilih file yang sama lagi kalau perlu
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setForm({
      first_name: "", last_name: "", email: "", phone: "",
      contact_method: "", location: "", project_type: "",
      estimated_area: "", preferred_style: "", message: "", agree: false,
    });
    setHelpChoice("");
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email || !form.message) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    if (!form.agree) {
      toast.error("Please agree to the Terms & Privacy Policy.");
      return;
    }

    setSubmitting(true);
    try {
      await submitConsultation(
        {
          first_name: form.first_name,
          last_name: form.last_name || undefined,
          email: form.email,
          phone: form.phone ? `+62${form.phone}` : undefined,
          contact_method: form.contact_method || undefined,
          consultation_type: meetChoice || undefined,
          location: form.location || undefined,
          service_type: helpChoice || undefined,
          project_type: form.project_type || undefined,
          estimated_area: form.estimated_area || undefined,
          preferred_style: form.preferred_style || undefined,
          message: form.message,
        },
        files
      );
      toast.success(
        "Thank you — email konfirmasi sudah dikirim ke inbox kamu. Tim kami akan meninjau dan menghubungi dalam 1×24 jam.",
        { duration: 6000 }
      );
      resetForm();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ??
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : null);
      toast.error(apiMessage ?? "Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      {/* Navbar fixed & transparan di atas hero — teks putih saat di posisi paling atas, lalu jadi solid + blur saat discroll */}
      <motion.div
        style={{ backgroundColor: navbarBg }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/0 transition-colors duration-300"
      >
        <motion.div style={{ backdropFilter: navbarBlur }} className="w-full">
          <Navbar />
        </motion.div>
      </motion.div>

      {/* ══════════ HERO ══════════ */}
      <section ref={heroRef} className="relative w-full min-h-[92vh] flex items-end overflow-hidden">
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={{ y: heroImgY, scale: heroImgScale }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease }}
        >
          <img
            src={hero}
            alt="Livora design consultation"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>

        {/* Overlay dikurangi supaya foto hero tetap terlihat jelas, teks tetap terbaca */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${OVERLAY}99 0%, ${OVERLAY}4D 45%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${OVERLAY}40 0%, transparent 35%, transparent 100%)`,
          }}
        />

        <div className="container-livora relative pb-24 md:pb-32 pt-40 md:pt-48">
          <div className="max-w-2xl text-white">
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, x: -40 }}
              animate={heroMounted ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
              transition={{ duration: 1, ease, delay: 0.2 }}
            >
              <Eyebrow light>Livora | Design Consultation</Eyebrow>
            </motion.div>

            <h1 className="serif font-light text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
              <motion.span
                className="block"
                initial={{ opacity: 0, x: -80, filter: "blur(8px)" }}
                animate={heroMounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -80, filter: "blur(8px)" }}
                transition={{ duration: 1.2, ease, delay: 0.45 }}
              >
                Designing
              </motion.span>
              <motion.span
                className="block"
                initial={{ opacity: 0, x: -80, filter: "blur(8px)" }}
                animate={heroMounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -80, filter: "blur(8px)" }}
                transition={{ duration: 1.2, ease, delay: 0.65 }}
              >
                Spaces. Enriching
              </motion.span>
              <motion.span
                className="block"
                initial={{ opacity: 0, x: -80, filter: "blur(8px)" }}
                animate={heroMounted ? { opacity: 1, x: 0, filter: "blur(0px)" } : { opacity: 0, x: -80, filter: "blur(8px)" }}
                transition={{ duration: 1.2, ease, delay: 0.85 }}
              >
                Lives.
              </motion.span>
            </h1>

            <motion.p
              className="text-white/75 text-sm md:text-base font-light max-w-md leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={heroMounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 1, ease, delay: 1.0 }}
            >
              Tell us about your space and our team will be in touch to guide you to the next step.
            </motion.p>

            <motion.a
              href="#appointment-form"
              className="group inline-flex items-center gap-3 px-7 py-4 text-xs uppercase tracking-[0.28em] font-light transition-all duration-500"
              style={{ backgroundColor: WHITE, color: BLACK, border: `1px solid ${BLACK}` }}
              initial={{ opacity: 0, y: 16 }}
              animate={heroMounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.8, ease, delay: 1.25 }}
            >
              Start Your Design Journey
              <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
            </motion.a>
          </div>
        </div>
      </section>

      {/* ══════════ WHAT CAN WE HELP ══════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-livora">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}
            className="mb-16"
          >
            <Eyebrow>What can we help you with?</Eyebrow>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {HELP_CARDS.map((c, i) => {
              const Icon = c.icon;
              const active = helpChoice === c.title;
              return (
                <motion.button
                  key={c.title}
                  type="button"
                  onClick={() => setHelpChoice(c.title)}
                  variants={fadeUp}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-50px" }}
                  className={`group relative text-left overflow-hidden bg-white transition-all duration-500 ${
                    active ? "ring-1 ring-black ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={active ? { boxShadow: "0 20px 50px -20px rgba(0,0,0,0.35)" } : undefined}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={c.img}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div
                      className="absolute left-5 bottom-5 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors duration-500"
                      style={{ backgroundColor: active ? WHITE : `${OVERLAY}D9` }}
                    >
                      <Icon size={16} className={active ? "text-black" : "text-white"} strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="px-5 py-5">
                    <h3 className="serif text-lg font-light text-foreground mb-2">{c.title}</h3>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">{c.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="py-24 md:py-32 bg-secondary/30 border-y border-border">
        <div className="container-livora">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-12 items-center">
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            >
              <Eyebrow>Livora | Process</Eyebrow>
              <h2 className="serif text-3xl md:text-4xl font-light leading-tight mt-5">
                Your journey,<br />in 3 simple steps.
              </h2>
              <div className="w-16 h-px mt-8" style={{ backgroundColor: BLACK }} />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.n}
                  variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
                  className="group bg-white overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={s.img}
                      alt={s.title}
                      className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      className="absolute top-5 left-5 serif text-2xl font-light"
                      style={{ color: WHITE }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <div className="px-5 py-6">
                    <h3 className="serif text-lg font-light mb-2">{s.title}</h3>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ THE RIGHT QUESTIONS ══════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-livora grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-12 lg:gap-20 items-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Eyebrow>Livora | Great design begins with</Eyebrow>
            <h2 className="serif text-4xl md:text-5xl font-light leading-tight mt-5 mb-8">
              The Right Questions
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-md mb-8">
              Every project is unique. By getting to know you, your lifestyle, and the things you love — from your existing furniture to your taste in materials, colours and art — we can make suggestions and bring your new ideas to life.
            </p>
            <a
              href="#appointment-form"
              className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] font-light border-b pb-1"
              style={{ color: BLACK, borderColor: BLACK }}
            >
              Discover Our Process
              <ArrowRight size={13} className="transition-transform duration-500 group-hover:translate-x-1" />
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative aspect-[16/10] overflow-hidden bg-neutral-900"
          >
            <img src={questionsMedia} alt="Livora interior process" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/15" />
            <button
              type="button"
              onClick={() => setVideoPlaying((v) => !v)}
              aria-label={videoPlaying ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className="w-16 h-16 md:w-20 md:h-20 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)" }}
              >
                {videoPlaying
                  ? <Pause size={22} className="text-white" strokeWidth={1.2} />
                  : <Play size={22} className="text-white translate-x-0.5" strokeWidth={1.2} />}
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ══════════ HOW WOULD YOU LIKE TO MEET ══════════ */}
      <section className="py-24 md:py-32 bg-secondary/30 border-y border-border">
        <div className="container-livora">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-14">
            <Eyebrow>How would you like to meet?</Eyebrow>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {MEET_OPTIONS.map((m, i) => {
              const Icon = m.icon;
              const active = meetChoice === m.value;
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  onClick={() => setMeetChoice(m.value)}
                  variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
                  className={`group relative overflow-hidden text-left aspect-[4/3] transition-all duration-500 ${
                    active ? "ring-2" : ""
                  }`}
                  style={active ? { boxShadow: "0 20px 50px -20px rgba(0,0,0,0.45)", ["--tw-ring-color" as any]: BLACK } : undefined}
                >
                  <img
                    src={m.img}
                    alt={m.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, ${OVERLAY}E0 0%, ${OVERLAY}66 45%, ${OVERLAY}1A 100%)`,
                    }}
                  />
                  <div className="relative h-full flex flex-col justify-between p-6 text-white">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md"
                      style={{ backgroundColor: active ? WHITE : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
                    >
                      <Icon size={16} strokeWidth={1.4} className={active ? "text-black" : "text-white"} />
                    </div>
                    <div>
                      <h3 className="serif text-lg md:text-xl font-light mb-2">{m.title}</h3>
                      <p className="text-xs md:text-[13px] text-white/75 font-light leading-relaxed max-w-[320px] mb-3">
                        {m.desc}
                      </p>
                      <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/80 group-hover:text-white transition-colors">
                        <ArrowRight size={13} className="transition-transform duration-500 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ WHY CHOOSE LIVORA ══════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-livora">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-12 lg:gap-20">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Eyebrow>Livora | Philosophy</Eyebrow>
              <h2 className="serif text-3xl md:text-4xl font-light leading-tight text-foreground mt-5">
                More than just<br />beautiful furniture,<br />we design better<br />ways of living.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div
                    key={v.title}
                    variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
                    className="border-t border-border pt-6"
                  >
                    <Icon size={26} strokeWidth={1.2} style={{ color: BLACK }} className="mb-5" />
                    <h3 className="serif text-lg font-light text-foreground mb-3">{v.title}</h3>
                    <p className="text-[13px] text-muted-foreground font-light leading-relaxed">{v.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ APPOINTMENT FORM ══════════ */}
      <section
        id="appointment-form"
        className="py-24 md:py-32 bg-secondary/20 border-t border-border"
      >
        <div className="container-livora max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start px-5 md:px-8">
          {/* Left column */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:sticky lg:top-28">
            <Eyebrow>Livora | Start Your Consultation</Eyebrow>
            <h2 className="serif text-4xl md:text-5xl font-light leading-tight mt-5 mb-6">
              Let's start your<br />design journey.
            </h2>
            <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-sm mb-10">
              Fill in the details below and our team will review your inquiry and get in touch with you.
            </p>
            <div className="hidden lg:block relative aspect-[3/4] overflow-hidden max-w-[280px]">
              <img src={formSide} alt="Livora consultation" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="bg-white p-6 md:p-10 lg:p-12 w-full"
            style={{ boxShadow: "0 30px 80px -50px rgba(0,0,0,0.25)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <Field label="First Name" required>
                <Input value={form.first_name} onChange={(v) => upd("first_name", v)} placeholder="Enter your first name" />
              </Field>
              <Field label="Last Name" required>
                <Input value={form.last_name} onChange={(v) => upd("last_name", v)} placeholder="Enter your last name" />
              </Field>
              <Field label="Email Address" required>
                <Input type="email" value={form.email} onChange={(v) => upd("email", v)} placeholder="Enter your email" />
              </Field>

              <Field label="Phone Number" required>
                <div className="flex">
                  <span className="px-3 border border-r-0 border-[#e5e5e5] text-sm font-light text-muted-foreground flex items-center bg-[#fafafa]">+62</span>
                  <input
                    value={form.phone}
                    onChange={(e) => upd("phone", e.target.value)}
                    placeholder="Enter your phone number"
                    className="flex-1 border border-[#e5e5e5] px-3 py-3 text-sm font-light outline-none focus:border-black transition-colors"
                  />
                </div>
              </Field>

              <Field label="Preferred Contact Method" required>
                <Select value={form.contact_method} onChange={(v) => upd("contact_method", v)}
                  options={["WhatsApp", "Email", "Google Meet / Video Call", "Phone Call"]}
                  placeholder="Select an option" />
              </Field>

              <Field label="Location / City" required>
                <Select value={form.location} onChange={(v) => upd("location", v)}
                  options={["Jakarta", "Bandung", "Surabaya", "Bali", "Other"]}
                  placeholder="Select your city" />
              </Field>

              <Field label="What are you looking for?" required>
                <Select value={helpChoice} onChange={setHelpChoice}
                  options={HELP_CARDS.map((c) => c.title)}
                  placeholder="Select an option" />
              </Field>

              <Field label="Project Type" required>
                <Select value={form.project_type} onChange={(v) => upd("project_type", v)}
                  options={["Residential", "Apartment", "Villa", "Hospitality", "Office", "Retail"]}
                  placeholder="Select an option" />
              </Field>

              <Field label="Estimated Area (sqm)">
                <Input value={form.estimated_area} onChange={(v) => upd("estimated_area", v)} placeholder="Enter area" />
              </Field>

              <Field label="Preferred Style">
                <Select value={form.preferred_style} onChange={(v) => upd("preferred_style", v)}
                  options={["Modern", "Classic", "Japandi", "Scandinavian", "Industrial", "Mid-century", "Contemporary Luxury"]}
                  placeholder="Select your style" />
              </Field>

              <Field label="Tell us about your project" required full>
                <textarea
                  value={form.message}
                  onChange={(e) => upd("message", e.target.value)}
                  rows={4}
                  placeholder="Share your ideas, needs, and anything we should know about your space."
                  className="w-full border border-[#e5e5e5] px-3 py-3 text-sm font-light outline-none focus:border-black transition-colors resize-none"
                />
              </Field>

              <Field label="Upload (Optional)" full>
                <label className="flex items-center justify-between gap-3 border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-3 cursor-pointer hover:border-black transition-colors">
                  <span className="text-xs text-muted-foreground font-light">Floor plan, photos, or inspiration images</span>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-light" style={{ color: BLACK }}>
                    <Upload size={14} /> Upload Files
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                </label>

                {files.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {files.map((f, idx) => (
                      <li
                        key={`${f.name}-${idx}`}
                        className="flex items-center gap-2 text-[11px] font-light px-3 py-2 bg-[#fafafa] border border-[#e5e5e5]"
                      >
                        <FileText size={13} className="text-muted-foreground shrink-0" />
                        <span className="max-w-[140px] truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          aria-label={`Remove ${f.name}`}
                          className="text-muted-foreground hover:text-black transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-10 pt-6 border-t border-[#e5e5e5]">
              <label className="flex items-start gap-3 text-xs text-muted-foreground font-light max-w-sm">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) => upd("agree", e.target.checked)}
                  className="mt-1 accent-black"
                />
                <span>
                  I agree to the{" "}
                  <a className="underline" style={{ color: BLACK }} href="#">Terms of Service</a>{" "}and{" "}
                  <a className="underline" style={{ color: BLACK }} href="#">Privacy Policy</a>.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-xs uppercase tracking-[0.28em] font-light disabled:opacity-60"
                style={{ backgroundColor: WHITE, color: BLACK, border: `1px solid ${BLACK}` }}
              >
                {submitting ? "Submitting..." : "Submit Your Inquiry"}
                <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
              </button>
            </div>
          </motion.form>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ────────── Form primitives ────────── */

function Field({
  label, required, full, children,
}: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="block text-[11px] uppercase tracking-[0.18em] font-light text-foreground/70 mb-2">
        {label} {required && <span style={{ color: "#000000" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#e5e5e5] px-3 py-3 text-sm font-light outline-none focus:border-black transition-colors bg-white"
    />
  );
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[#e5e5e5] px-3 py-3 text-sm font-light outline-none focus:border-black transition-colors bg-white"
    >
      <option value="">{placeholder ?? "Select an option"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
