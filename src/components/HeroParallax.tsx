import { useEffect, useRef, useState } from 'react';
import heroParallax from "@/assets/add.png";
export default function HeroParallax() {
  const heroRef = useRef(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Ketika hero keluar viewport, background jadi fixed
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* HERO SECTION */}
      <div
        ref={heroRef}
        className="relative h-screen overflow-hidden"
      >
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: heroParallax,
            backgroundAttachment: isHeroVisible ? 'scroll' : 'fixed',
            transition: 'background-attachment 0.3s ease',
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />

       
      </div>

      {/* TRIGGER SECTION - Background mulai fixed dari sini */}
      <div className="relative z-20 bg-white" />
    </>
  );
}