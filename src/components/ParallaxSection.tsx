import { ReactNode, useEffect, useRef, useState } from 'react';

interface ParallaxSectionProps {
  backgroundImage: string;
  children: ReactNode;
  overlayOpacity?: number;
}

export function ParallaxSection({
  backgroundImage,
  children,
  overlayOpacity = 0.4,
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [sectionTop, setSectionTop] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (sectionRef.current) {
      setSectionTop(sectionRef.current.offsetTop);
    }
  }, []);

  // Hitung parallax offset dengan delay
  const getParallaxOffset = () => {
    // Posisi relative section
    const relativeScroll = scrollY - sectionTop;

    // Parallax effect dengan ratio 0.3 (lebih lambat dari scroll)
    // Ini yang create "delay" effect
    const offset = relativeScroll * 0.3;

    return offset;
  };

  return (
    <div ref={sectionRef} className="relative">
      {/* Background Parallax */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translateY(${getParallaxOffset()}px)`,
          transition: 'transform 0.08s ease-out',
        }}
      />

      {/* Overlay */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}