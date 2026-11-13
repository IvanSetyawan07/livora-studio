import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/livora/Navbar";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 pt-20">
        <div className="text-center max-w-md">
          <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-3">404</p>
          <h1 className="serif mb-4 text-4xl sm:text-5xl font-light text-foreground">Page not found</h1>
          <p className="mb-8 text-sm text-muted-foreground font-light">
            Halaman yang Anda cari tidak ditemukan atau sudah dipindahkan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-foreground text-background text-xs uppercase tracking-[0.22em]"
            >
              Return Home
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 border border-border text-xs uppercase tracking-[0.22em] hover:border-foreground"
            >
              View Projects
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
