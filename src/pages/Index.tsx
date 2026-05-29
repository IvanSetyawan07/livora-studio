import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Loader } from "@/components/livora/Loader";
import { Navbar } from "@/components/livora/Navbar";
import { Hero } from "@/components/livora/Hero";
import { Style } from "@/components/livora/Style";
import { Scope } from "@/components/livora/Scope";
import { Projects } from "@/components/livora/Projects";
import { Furniture } from "@/components/livora/Furniture";
import { Contact } from "@/components/livora/Contact";
import { Footer } from "@/components/livora/Footer";
import { useReveal } from "@/hooks/useReveal";

const Index = () => {
  useReveal();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // wait for sections to render
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [location.hash, location.key]);

  useEffect(() => {
    document.title = "LIVORA — Imagine. Create. Realize. | Interior Design Studio";
    const meta = document.querySelector('meta[name="description"]') ?? (() => {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "Livora is a one-stop interior ecosystem — design, supply and construction merged seamlessly. Modern, quiet, European.");
  }, []);

  return (
    <>
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <Style />
        <Scope />
        <Projects />
        <Furniture />
        <Contact />
      </main>
      <Footer />
    </>
  );
};

export default Index;
