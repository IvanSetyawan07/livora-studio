import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { projects as staticProjects } from "@/data/projects";
import { api } from "@/lib/api";
import { imgUrl, trackClick } from "@/lib/adminApi";

const categories = ["All", "Hotel", "Residential", "Office"];

type Hi = { id: number; slug: string; title: string; subtitle?: string; location?: string; hero_image?: string; scope?: { name: string } };

export const Projects = () => {
  const [filter, setFilter] = useState("All");
  const [apiHighlights, setApiHighlights] = useState<Hi[] | null>(null);

  useEffect(() => {
    api.get("/landing/highlights")
      .then((r) => setApiHighlights(r.data))
      .catch(() => setApiHighlights([]));
  }, []);

  // If admin has selected highlights, use them. Otherwise fall back to legacy static.
  const useApi = apiHighlights && apiHighlights.length > 0;
  const filteredStatic = staticProjects
    .filter((p) => filter === "All" || p.category === filter)
    .slice(0, 3);

  return (
    <section id="projects" className="py-28 md:py-40 container-livora">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <SectionHeader
          eyebrow="Our Projects"
          title={<>Selected works, <em className="italic">crafted to last.</em></>}
        />
        <Link
          to="/projects"
          className="reveal mb-12 md:mb-16 text-[11px] uppercase tracking-[0.3em] text-foreground/70 hover:text-foreground underline-grow"
        >
          Others →
        </Link>
      </div>

      {!useApi && (
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
      )}

      <div className="grid md:grid-cols-12 gap-4 md:gap-6">
        {useApi
          ? apiHighlights!.map((p, i) => (
              <Link
                key={p.id}
                to={`/projects/${p.slug}`}
                onClick={() => trackClick("project", p.id)}
                className={`reveal group relative block hover-zoom cursor-pointer ${
                  i === 0 ? "md:col-span-8 aspect-[16/10]" : "md:col-span-4 aspect-[4/5]"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <img
                  src={imgUrl(p.hero_image)}
                  alt={`${p.title} — ${p.scope?.name || ""}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-primary-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
                  <p className="text-[10px] uppercase tracking-[0.4em] mb-2 opacity-80">
                    {p.scope?.name || ""}{p.location ? ` — ${p.location}` : ""}
                  </p>
                  <h3 className="serif text-3xl md:text-4xl font-light">{p.title}</h3>
                </div>
              </Link>
            ))
          : filteredStatic.map((p, i) => (
              <Link
                key={p.name}
                to={`/projects/${p.slug}`}
                className={`reveal group relative block hover-zoom cursor-pointer ${p.span}`}
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
              </Link>
            ))}
      </div>
    </section>
  );
};
