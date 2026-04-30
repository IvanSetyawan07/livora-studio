import { useEffect } from "react";
import { Loader } from "@/components/livora/Loader";
import { Navbar } from "@/components/livora/Navbar";
import { Hero } from "@/components/livora/Hero";
import { About } from "@/components/livora/About";
import { Mission } from "@/components/livora/Mission";
import { Style } from "@/components/livora/Style";
import { Scope } from "@/components/livora/Scope";
import { Projects } from "@/components/livora/Projects";
import { Furniture } from "@/components/livora/Furniture";
import { Contact } from "@/components/livora/Contact";
import { Footer } from "@/components/livora/Footer";
import { useReveal } from "@/hooks/useReveal";

const Index = () => {
  useReveal();

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
        <About />
        <Mission />
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
