/**
 * Blok "integrasi belum tersambung" yang JUJUR.
 *
 * Dipakai untuk semua permukaan yang datanya harus datang dari platform luar
 * (Meta Ads, Google Ads, GA4, TikTok, YouTube, Google Business Profile, dst).
 * Selama kredensialnya belum dipasang di backend, halaman TIDAK boleh
 * menampilkan angka contoh — cukup jelaskan apa yang hilang dan di mana
 * kredensialnya dipasang.
 */
import { KeyRound } from "lucide-react";
import { Panel } from "./primitives";

export type IntegrationEnvKey = { key: string; note?: string };

export function IntegrationRequired({
  title,
  description,
  provider,
  envKeys = [],
  configPath = "backend/config/services.php",
}: {
  title: string;
  description: string;
  provider: string;
  envKeys?: IntegrationEnvKey[];
  configPath?: string;
}) {
  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-border-strong px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          <KeyRound className="size-3" /> Not connected
        </span>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {provider}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>

      {envKeys.length > 0 ? (
        <div className="mt-4 rounded-sm border border-border bg-background/40 p-4">
          <p className="label-eyebrow">Pasang kredensial di sini</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <code className="font-mono">backend/.env</code> — lalu dibaca lewat{" "}
            <code className="font-mono">{configPath}</code>
          </p>
          <ul className="mt-3 space-y-1.5">
            {envKeys.map((e) => (
              <li key={e.key} className="text-xs">
                <code className="font-mono text-brass">{e.key}</code>
                {e.note ? <span className="text-muted-foreground"> — {e.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
