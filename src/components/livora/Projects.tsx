import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SectionHeader } from "./SectionHeader";
import { useHighlightProjects, useAllProjects } from "@/lib/projectsApi";

export const Projects = () => {
  const highlights = useHighlightProjects();
  const all = useAllProjects();
  const [filter, setFilter] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(all.map((p) => p.category).filter(Boolean)))],
    [all],
  );

  const filtered = useMemo(() => {
    if (filter === "All") return highlights;
    return all.filter((p) => p.category === filter).slice(0, 3);
  }, [filter, highlights, all]);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [filtered]);

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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
        {filtered.map((p, i) => (
          <Link
            key={p.slug}
            to={`/projects/${p.slug}`}
            className={`reveal group relative block overflow-hidden cursor-pointer ${
              i === 0 ? "md:col-span-3 md:row-span-2 aspect-[4/5] md:aspect-auto md:h-full min-h-[400px]" : "md:col-span-2 aspect-[4/3]"
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <img
              src={p.img}
              alt={`${p.name} — ${p.category}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-primary-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700">
              <p className="text-[10px] uppercase tracking-[0.4em] mb-2 opacity-80">{p.category} — {p.location}</p>
              <h3 className="serif text-3xl md:text-4xl font-light">{p.name}</h3>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 px-6 md:px-8 py-5 flex justify-end items-end opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}
            >
              <span className="uppercase text-white" style={{ fontSize: "13px", letterSpacing: "0.1em" }}>
                View Project →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};