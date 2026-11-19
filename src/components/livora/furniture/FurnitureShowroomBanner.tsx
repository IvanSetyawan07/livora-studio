import React from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
  ArrowRight,
  Building2,
  Clock,
  HardHat,
  MapPin,
  Sofa,
} from "lucide-react";

const PILLARS = [
  {
    icon: Building2,
    title: "Architecture",
    sub: "Struktur & fasad",
  },
  {
    icon: Armchair,
    title: "Interior Design",
    sub: "Tata ruang & konsep",
  },
  {
    icon: HardHat,
    title: "Construction",
    sub: "Eksekusi presisi",
  },
  {
    icon: Sofa,
    title: "Furniture",
    sub: "Kurasi & custom",
  },
];

/**
 * Signature Architectural Bottom Banner: "Designing Better Spaces Together."
 * Terinspirasi langsung dari identitas resmi LIVORA (Deep Navy #0B426E + faceted geometric polygons).
 */
export const FurnitureShowroomBanner: React.FC = () => {
  return (
    <section className="py-12 md:py-20 bg-[#F8F9FB]">
      <div className="container-livora">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B426E] text-white px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          {/* Faceted Blue Geometric Brand Motif (Bottom-Right & Subtle Top-Left) */}
          <svg
            aria-hidden
            viewBox="0 0 640 420"
            fill="none"
            className="pointer-events-none absolute -right-10 -bottom-10 w-[340px] sm:w-[460px] lg:w-[560px] h-auto opacity-85"
          >
            <polygon points="360,420 640,420 640,140" fill="#083357" />
            <polygon points="220,420 430,420 520,255" fill="#12558B" fillOpacity="0.65" />
            <polygon points="430,420 640,420 520,255" fill="#1E88C7" fillOpacity="0.48" />
            <polygon points="520,255 640,420 640,175" fill="#38A3D8" fillOpacity="0.28" />
            <polygon points="335,345 520,255 465,165" fill="#1E88C7" fillOpacity="0.22" />
            <polygon points="520,255 640,175 565,95" fill="#8AD5F0" fillOpacity="0.16" />
          </svg>

          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #38A3D8 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* LEFT COLUMN: Brand Manifesto & 4 Pillars */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-[#9BD8F4] font-medium mb-4">
                <span className="inline-block w-7 h-px bg-[#9BD8F4]/70" />
                <span>One Stop Design for Your Space</span>
              </div>

              <h2 className="serif text-4xl sm:text-5xl lg:text-[56px] font-light leading-[1.06] tracking-[-0.015em] text-white text-balance">
                Designing Better Spaces Together.
              </h2>

              <p className="mt-4 sm:mt-5 text-sm sm:text-[15px] text-white/78 font-light leading-relaxed max-w-xl">
                Sebagai bagian dari PT Langgeng Cipta Ruang, LIVORA menyatukan arsitektur, desain interior, konstruksi presisi, hingga furnitur terkurasi dalam satu ekosistem desain yang terpadu.
              </p>

              {/* 4 Architectural Pillars */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PILLARS.map(({ icon: Icon, title, sub }) => (
                  <div
                    key={title}
                    className="rounded-2xl bg-white/[0.06] border border-white/12 p-4 hover:bg-white/[0.1] hover:border-white/25 transition-colors duration-300"
                  >
                    <Icon className="w-[18px] h-[18px] text-[#8AD5F0] stroke-[1.5] mb-3" />
                    <p className="text-[13px] font-medium text-white leading-snug">
                      {title}
                    </p>
                    <p className="text-[11px] text-white/62 mt-0.5 leading-snug">
                      {sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVORA Experience Showroom Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/[0.09] backdrop-blur-sm border border-white/15 p-6 sm:p-8 flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/12">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.26em] text-[#9BD8F4] font-medium">
                      Private Viewing
                    </p>
                    <h3 className="serif text-2xl sm:text-[28px] font-light text-white mt-1 leading-tight">
                      LIVORA Showroom
                    </h3>
                    <p className="text-xs text-white/65 mt-0.5">
                      PT Langgeng Cipta Ruang
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-[#9BD8F4]">
                    <MapPin className="w-4 h-4 stroke-[1.6]" />
                  </div>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#8AD5F0] shrink-0 mt-0.5 stroke-[1.6]" />
                    <div className="text-white/90 leading-relaxed">
                      <p className="font-medium text-[13.5px]">
                        Jl. Bangka Raya No. 45, Bangka 45 Lt. 2
                      </p>
                      <p className="text-xs text-white/68">
                        Jakarta Selatan, Indonesia
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#8AD5F0] shrink-0 mt-0.5 stroke-[1.6]" />
                    <div className="text-white/90 leading-relaxed">
                      <p className="font-medium text-[13.5px]">
                        Senin – Minggu · 10.00 – 19.00 WIB
                      </p>
                      <p className="text-xs text-white/68">
                        Experience our materials, craftsmanship, and bespoke furniture collections in person.
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/appointment"
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white hover:bg-[#EAF4FA] text-[#0B426E] px-6 py-3.5 text-[13px] font-medium tracking-[0.02em] transition-all duration-300 active:scale-[0.99]"
                >
                  <span>Make an Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
