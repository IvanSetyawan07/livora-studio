import { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import hotel from "@/assets/project-hotel.jpg";
import residential from "@/assets/project-residential.jpg";
import office from "@/assets/project-office.jpg";

const projects = [
  { name: "Harmony One", category: "Hotel", location: "Batam", img: hotel, span: "md:col-span-7 md:row-span-2 aspect-[4/5] md:aspect-auto" },
  { name: "AM House", category: "Residential", location: "PIK 2, Jakarta", img: residential, span: "md:col-span-5 aspect-[4/3]" },
  { name: "Flytek Sinarmas Tower", category: "Office", location: "Jakarta", img: office, span: "md:col-span-5 aspect-[4/3]" },
];

const categories = ["All", "Hotel", "Residential", "Office"];

export const Projects = () => {
  const [filter, setFilter] = useState("All");
  const filtered = projects.filter((p) => filter === "All" || p.category === filter);

  return (
    <section id="projects" className="py-28 md:py-40 container-livora">
      <SectionHeader
        eyebrow="05 — Our Projects"
        title={<>Selected works, <em className="italic">crafted to last.</em></>}
      />

      <div className="reveal flex gap-2 mb-10 md:mb-14 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`text-[10px] uppercase tracking-[0.3em] px-5 py-2.5 border transition-all duration-500 ${
              filter === c
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground/70 hover:border-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-4 md:gap-6">
        {filtered.map((p, i) => (
          <a
            key={p.name}
            href="#contact"
            className={`reveal group relative block hover-zoom ${p.span}`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <img
              src={p.img}
              alt={`${p.name} — ${p.category}`}
              width={1280}
              height={896}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-primary-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
              <p className="text-[10px] uppercase tracking-[0.4em] mb-2 opacity-80">{p.category} — {p.location}</p>
              <h3 className="serif text-3xl md:text-4xl font-light">{p.name}</h3>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
