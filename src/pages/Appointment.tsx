import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Navbar } from "@/components/livora/Navbar";
import { Footer } from "@/components/livora/Footer";
import { toast } from "sonner";

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
const GOLD = "#B08A5B";
const GOLD_SOFT = "#C9A96E";

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
    className="text-[10px] tracking-[0.32em] uppercase font-light"
    style={{ color: light ? GOLD_SOFT : GOLD }}
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
    // Backend wiring akan disambungkan di Batch 2.
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Thank you — we've received your inquiry. Our team will be in touch soon.");
      setForm({
        first_name: "", last_name: "", email: "", phone: "",
        contact_method: "", location: "", project_type: "",
        estimated_area: "", preferred_style: "", message: "", agree: false,
      });
    }, 800);
  };

  return (
    <div className="bg-background text-foreground">
      <Navbar />

      {/* ══════════ HERO ══════════ */}
      <section className="relative w-full min-h-[92vh] flex items-end overflow-hidden">
        <motion.img
          src={hero}
          alt="Livora design consultation"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        <div className="container-livora relative pb-24 md:pb-32 pt-40 md:pt-48">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-2xl text-white"
          >
            <div className="mb-6"><Eyebrow light>Design Consultation</Eyebrow></div>
            <h1 className="serif font-light text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
              Designing<br />Spaces. Enriching<br />Lives.
            </h1>
            <p className="text-white/75 text-sm md:text-base font-light max-w-md leading-relaxed mb-10">
              Tell us about your space and our team will be in touch to guide you to the next step.
            </p>
            <a
              href="#appointment-form"
              className="group inline-flex items-center gap-3 px-7 py-4 text-xs uppercase tracking-[0.28em] font-light transition-all duration-500"
              style={{ backgroundColor: GOLD, color: "#fff" }}
            >
              Start Your Design Journey
              <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
            </a>
          </motion.div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
                    active ? "ring-1 ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={active ? { boxShadow: `0 20px 50px -20px ${GOLD}55` } : undefined}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={c.img}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div
                      className="absolute left-5 bottom-5 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors duration-500"
                      style={{ backgroundColor: active ? GOLD : "rgba(20,15,10,0.85)" }}
                    >
                      <Icon size={16} className="text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="px-5 py-6">
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
      <section className="py-24 md:py-32" style={{ backgroundColor: "hsl(32 22% 93%)" }}>
        <div className="container-livora">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-16 items-end mb-14"
          >
            <div>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="serif text-4xl md:text-5xl font-light leading-tight mt-5">
                Your journey,<br />in 3 simple steps.
              </h2>
              <div className="w-16 h-px mt-8" style={{ backgroundColor: GOLD }} />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
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
                    style={{ color: GOLD_SOFT }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="px-6 py-7">
                  <h3 className="serif text-xl font-light mb-3">{s.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ THE RIGHT QUESTIONS ══════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container-livora grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-12 lg:gap-20 items-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Eyebrow>Great design begins with</Eyebrow>
            <h2 className="serif text-4xl md:text-5xl font-light leading-tight mt-5 mb-8">
              The Right Questions
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-md mb-8">
              Every project is unique. By getting to know you, your lifestyle, and the things you love — from your existing furniture to your taste in materials, colours and art — we can make suggestions and bring your new ideas to life.
            </p>
            <a
              href="#appointment-form"
              className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] font-light border-b pb-1"
              style={{ color: GOLD, borderColor: GOLD }}
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
      <section className="py-24 md:py-32" style={{ backgroundColor: "hsl(32 22% 93%)" }}>
        <div className="container-livora">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-14">
            <Eyebrow>How would you like to meet?</Eyebrow>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {MEET_OPTIONS.map((m, i) => {
              const Icon = m.icon;
              const active = meetChoice === m.value;
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  onClick={() => setMeetChoice(m.value)}
                  variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
                  className={`group relative overflow-hidden text-left aspect-[4/5] transition-all duration-500 ${
                    active ? "ring-2" : ""
                  }`}
                  style={active ? { boxShadow: `0 20px 50px -20px ${GOLD}66` , ["--tw-ring-color" as any]: GOLD } : undefined}
                >
                  <img
                    src={m.img}
                    alt={m.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  <div className="relative h-full flex flex-col justify-between p-7 text-white">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md"
                      style={{ backgroundColor: active ? GOLD : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
                    >
                      <Icon size={16} strokeWidth={1.4} />
                    </div>
                    <div>
                      <h3 className="serif text-xl md:text-2xl font-light mb-3">{m.title}</h3>
                      <p className="text-xs md:text-[13px] text-white/75 font-light leading-relaxed max-w-[280px] mb-5">
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
      <section className="py-24 md:py-32" style={{ backgroundColor: "#1a1613" }}>
        <div className="container-livora">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-12 lg:gap-20">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Eyebrow light>Why choose Livora</Eyebrow>
              <h2 className="serif text-3xl md:text-4xl font-light leading-tight text-white mt-5">
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
                    className="border-t pt-6"
                    style={{ borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    <Icon size={26} strokeWidth={1.2} style={{ color: GOLD_SOFT }} className="mb-5" />
                    <h3 className="serif text-lg font-light text-white mb-3">{v.title}</h3>
                    <p className="text-[13px] text-white/60 font-light leading-relaxed">{v.desc}</p>
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
        className="py-24 md:py-32"
        style={{ backgroundColor: "hsl(36 33% 96%)" }}
      >
        <div className="container-livora grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)] gap-12 lg:gap-20 items-start">
          {/* Left column */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:sticky lg:top-28">
            <Eyebrow>Start Your Consultation</Eyebrow>
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
            className="bg-white p-8 md:p-12"
            style={{ boxShadow: "0 30px 80px -50px rgba(30,20,10,0.25)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
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
                  <span className="px-3 border border-r-0 border-[#e2ddd3] text-sm font-light text-muted-foreground flex items-center bg-[#faf7f1]">+62</span>
                  <input
                    value={form.phone}
                    onChange={(e) => upd("phone", e.target.value)}
                    placeholder="Enter your phone number"
                    className="flex-1 border border-[#e2ddd3] px-3 py-3 text-sm font-light outline-none focus:border-[#B08A5B] transition-colors"
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
                  className="w-full border border-[#e2ddd3] px-3 py-3 text-sm font-light outline-none focus:border-[#B08A5B] transition-colors resize-none"
                />
              </Field>

              <Field label="Upload (Optional)" full>
                <label className="flex items-center justify-between gap-3 border border-dashed border-[#d9d1c1] bg-[#faf7f1] px-4 py-3 cursor-pointer hover:border-[#B08A5B] transition-colors">
                  <span className="text-xs text-muted-foreground font-light">Floor plan, photos, or inspiration images</span>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-light" style={{ color: GOLD }}>
                    <Upload size={14} /> Upload Files
                  </span>
                  <input type="file" multiple className="hidden" />
                </label>
              </Field>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-10 pt-6 border-t border-[#eee7db]">
              <label className="flex items-start gap-3 text-xs text-muted-foreground font-light max-w-sm">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) => upd("agree", e.target.checked)}
                  className="mt-1 accent-[#B08A5B]"
                />
                <span>
                  I agree to the{" "}
                  <a className="underline" style={{ color: GOLD }} href="#">Terms of Service</a>{" "}and{" "}
                  <a className="underline" style={{ color: GOLD }} href="#">Privacy Policy</a>.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-xs uppercase tracking-[0.28em] font-light disabled:opacity-60"
                style={{ backgroundColor: GOLD, color: "#fff" }}
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
        {label} {required && <span style={{ color: GOLD }}>*</span>}
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
      className="w-full border border-[#e2ddd3] px-3 py-3 text-sm font-light outline-none focus:border-[#B08A5B] transition-colors bg-white"
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
      className="w-full border border-[#e2ddd3] px-3 py-3 text-sm font-light outline-none focus:border-[#B08A5B] transition-colors bg-white"
    >
      <option value="">{placeholder ?? "Select an option"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
