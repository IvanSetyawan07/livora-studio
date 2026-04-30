import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Instagram, MapPin, Phone, Globe, ArrowUpRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Invalid email").max(160),
  message: z.string().trim().min(5, "Tell us a little more").max(1000),
});

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Thank you. We'll be in touch shortly.");
      setForm({ name: "", email: "", message: "" });
      setSubmitting(false);
    }, 700);
  };

  return (
    <section id="contact" className="py-28 md:py-40 container-livora">
      <SectionHeader
        eyebrow="07 — Contact"
        title={<>Let's <em className="italic">begin</em> your space.</>}
      />

      <div className="grid md:grid-cols-12 gap-10 md:gap-16">
        <div className="md:col-span-5 reveal space-y-10">
          <div className="space-y-5 text-foreground/80">
            <a href="https://maps.google.com/?q=Jl.+Bangka+Raya+No.45+Jakarta+Selatan" target="_blank" rel="noreferrer" className="flex items-start gap-4 group">
              <MapPin size={18} className="mt-1 shrink-0" />
              <span className="underline-grow">Jl. Bangka Raya No.45, Jakarta Selatan</span>
            </a>
            <a href="tel:+6281218602045" className="flex items-center gap-4 group">
              <Phone size={18} />
              <span className="underline-grow">+62 812 1860 2045</span>
            </a>
            <a href="https://www.livora.com" target="_blank" rel="noreferrer" className="flex items-center gap-4 group">
              <Globe size={18} />
              <span className="underline-grow">www.livora.com</span>
            </a>
            <a href="https://instagram.com/livoraid" target="_blank" rel="noreferrer" className="flex items-center gap-4 group">
              <Instagram size={18} />
              <span className="underline-grow">@livoraid</span>
            </a>
          </div>

          <div className="aspect-[4/3] overflow-hidden border border-border">
            <iframe
              title="Livora office location"
              src="https://www.google.com/maps?q=Jl.+Bangka+Raya+No.45+Jakarta+Selatan&output=embed"
              className="w-full h-full grayscale contrast-110"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <form onSubmit={onSubmit} className="md:col-span-7 reveal space-y-8">
          {[
            { k: "name", l: "Your Name", type: "text" },
            { k: "email", l: "Email Address", type: "email" },
          ].map((f) => (
            <div key={f.k} className="border-b border-border pb-3 focus-within:border-foreground transition-colors">
              <label className="block text-[10px] uppercase tracking-[0.4em] text-foreground/60 mb-2">{f.l}</label>
              <input
                type={f.type}
                value={form[f.k as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full bg-transparent outline-none text-lg font-light placeholder:text-foreground/30"
                maxLength={f.k === "name" ? 80 : 160}
              />
            </div>
          ))}
          <div className="border-b border-border pb-3 focus-within:border-foreground transition-colors">
            <label className="block text-[10px] uppercase tracking-[0.4em] text-foreground/60 mb-2">Tell us about your project</label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full bg-transparent outline-none text-lg font-light resize-none placeholder:text-foreground/30"
              maxLength={1000}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-xs uppercase tracking-[0.3em] hover:bg-accent transition-colors duration-500 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Start Your Project"}
            <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
          </button>
        </form>
      </div>
    </section>
  );
};
