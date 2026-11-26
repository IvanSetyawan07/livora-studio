/**
 * Blok "integrasi belum tersambung" yang JUJUR & ramah untuk admin non-teknis.
 * Penjelasan ramah tampil di depan, sementara nama variabel .env / file konfigurasi
 * disembunyikan di balik accordion "Info Teknis untuk Tim IT".
 */
import type { ReactNode } from "react";
import { KeyRound } from "lucide-react";
import { Panel } from "./primitives";

export type IntegrationEnvKey = { key: string; note?: string };

export function IntegrationRequired({
  title,
  description,
  provider,
  envKeys = [],
  configPath = "backend/config/services.php",
  children,
}: {
  title: string;
  description: string;
  provider: string;
  envKeys?: IntegrationEnvKey[];
  configPath?: string;
  children?: ReactNode;
}) {
  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-secondary/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <KeyRound className="size-3" /> Belum Terhubung
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {provider}
          </span>
        </div>
        {children}
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>

      {envKeys.length > 0 ? (
        <details className="mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-xs">
          <summary className="cursor-pointer font-medium text-foreground">
            Info Teknis untuk Tim IT (Kredensial Server)
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Pasang kredensial di <code className="rounded bg-white px-1 py-0.5 font-mono text-foreground">backend/.env</code>{" "}
            (dibaca lewat <code className="rounded bg-white px-1 py-0.5 font-mono text-foreground">{configPath}</code>):
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {envKeys.map((e) => (
              <li key={e.key} className="text-xs">
                <code className="font-mono font-medium text-ai">{e.key}</code>
                {e.note ? <span className="text-muted-foreground"> — {e.note}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}
