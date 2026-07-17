import { ArrowRight, User, Box, Palette, Truck } from "lucide-react";

interface Props {
  image?: string;
  onBook?: () => void;
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80&auto=format&fit=crop";

/**
 * Dark, wide consultation banner. Purely presentational — the CTA is a plain
 * button that logs a click for now (no route yet). Drop into detail pages.
 */
export function BookConsultation({ image = DEFAULT_IMAGE, onBook }: Props) {
  const perks = [
    { icon: User, label: "Personalized Consultation" },
    { icon: Box, label: "3D Room Planning" },
    { icon: Palette, label: "Material & Finish Guidance" },
    { icon: Truck, label: "Delivery & Installation" },
  ];

  return (
    <section className="container-livora py-16 md:py-20">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 text-white">
        <div className="grid grid-cols-1 md:grid-cols-[36%_28%_36%] items-stretch">
          {/* LEFT: image */}
          <div className="relative h-52 md:h-auto min-h-[220px]">
            <img
              src={image}
              alt="Design consultation"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-neutral-900" />
          </div>

          {/* MIDDLE: copy + CTA */}
          <div className="px-8 md:px-10 py-10 md:py-12 flex flex-col justify-center">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">
              Need Help Choosing?
            </p>
            <h3 className="serif font-light text-2xl md:text-[28px] leading-[1.2] mb-6">
              Our design consultants are here to help you create the perfect space.
            </h3>
            <button
              type="button"
              onClick={onBook}
              className="inline-flex items-center gap-3 self-start bg-white text-neutral-900 px-6 py-3 text-[11px] tracking-[0.28em] uppercase hover:bg-white/90 transition-colors"
            >
              Book Consultation
              <ArrowRight size={14} />
            </button>
          </div>

          {/* RIGHT: perks list */}
          <div className="px-8 md:px-10 py-10 md:py-12 flex flex-col justify-center gap-5 border-t md:border-t-0 md:border-l border-white/10">
            {perks.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white/80" strokeWidth={1.4} />
                </span>
                <p className="text-sm text-white/85 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
