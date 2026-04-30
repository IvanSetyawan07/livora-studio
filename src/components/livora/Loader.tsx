import { useEffect, useState } from "react";

export const Loader = () => {
  const [gone, setGone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 1400);
    const t2 = setTimeout(() => setHidden(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-700 ${gone ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="serif text-5xl tracking-[0.4em] loader-pulse">LIVORA</div>
        <div className="h-px w-24 bg-foreground/30 overflow-hidden">
          <div className="h-full w-full bg-foreground origin-left animate-[scale-x_1.4s_ease-out_forwards]" style={{ animation: "loader-line 1.4s ease-out forwards" }} />
        </div>
      </div>
      <style>{`@keyframes loader-line { from { transform: scaleX(0);} to { transform: scaleX(1);} } .loader-pulse + div > div { transform-origin: left; }`}</style>
    </div>
  );
};
