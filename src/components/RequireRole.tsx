import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { rememberIntendedPath } from "@/lib/authGuard";

type Props = { roles: string[] };

/**
 * Guard route berbasis role. Memverifikasi lewat /me (server) — bukan
 * localStorage — lalu menolak rapi dengan toast, bukan halaman rusak.
 */
export default function RequireRole({ roles }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (!alive) return;
        if (!roles.includes(data?.role)) {
          toast.error("Halaman ini tidak tersedia untuk akun Anda");
          navigate("/", { replace: true });
          return;
        }
        setStatus("ok");
      } catch {
        if (!alive) return;
        rememberIntendedPath();
        toast.error("Silakan masuk terlebih dahulu");
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate, roles]);

  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa akses…
      </div>
    );

  return <Outlet />;
}
