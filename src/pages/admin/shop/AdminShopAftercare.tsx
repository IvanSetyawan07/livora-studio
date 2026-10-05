import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminShop, openPrivate, rupiah } from "@/lib/shop";
import { useConfirm } from "@/components/shop/useConfirm";

const CLAIM_TYPE: Record<string, string> = { kerusakan: "Rusak", salah_ukuran: "Salah ukuran", garansi: "Garansi", lainnya: "Lainnya" };

/** Antrean klaim (Produksi) dan refund (Keuangan). */
export default function AdminShopAftercare() {
  const [tab, setTab] = useState<"claims" | "refunds">("claims");
  const [claims, setClaims] = useState<any[] | null>(null);
  const [refunds, setRefunds] = useState<any[] | null>(null);
  const [open, setOpen] = useState(true);
  const confirm = useConfirm();

  const load = useCallback(() => {
    adminShop.claims(open ? "diajukan,ditinjau,disetujui" : undefined).then(setClaims).catch(() => setClaims([]));
    adminShop.refunds(open ? "diajukan,disetujui,dikirim" : undefined).then(setRefunds).catch(() => setRefunds([]));
  }, [open]);
  useEffect(() => { load(); }, [load]);

  const claimAct = async (c: any, status: string) => {
    let resolution: string | undefined;
    if (status !== "ditinjau") {
      const r = await confirm.ask({ title: status === "ditolak" ? "Tolak klaim" : status === "disetujui" ? "Setujui klaim" : "Tandai selesai", text: "Tulisan ini dikirim ke pelanggan.",
        inputLabel: status === "disetujui" ? "Penyelesaian (mis. ganti unit baru, dikirim 10 Okt)" : "Keterangan untuk pelanggan", danger: status === "ditolak" });
      if (typeof r !== "string") return;
      resolution = r;
    }
    try { await adminShop.updateClaim(c.id, status, resolution); toast.success("Klaim diperbarui"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const refundAct = async (r: any, action: string) => {
    let note: string | undefined;
    let proof: File | null = null;
    if (action === "tolak") {
      const v = await confirm.ask({ title: "Tolak refund", inputLabel: "Alasan penolakan", danger: true, confirmLabel: "Tolak" });
      if (typeof v !== "string") return;
      note = v;
    } else if (action === "setujui") {
      if (!(await confirm.ask({ title: `Setujui refund ${rupiah(r.amount)}?`, text: "Pesanan akan dibatalkan dan stok dilepas. Pelanggan diberi tahu." }))) return;
    } else if (action === "kirim") {
      proof = await pickFile();
      if (!(await confirm.ask({ title: "Dana sudah ditransfer?", text: `${rupiah(r.amount)} ke ${r.bank_name} ${r.account_number} a.n. ${r.account_holder}.${proof ? " Bukti transfer terlampir." : ""}` }))) return;
    }
    try { await adminShop.updateRefund(r.id, action, { note, proof }); toast.success("Refund diperbarui"); load(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      {confirm.node}
      <div><h1 className="text-2xl font-semibold">Klaim & Refund</h1><p className="text-sm text-muted-foreground">Klaim kerusakan/garansi ditangani Produksi; pengembalian dana oleh Keuangan.</p></div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {([["claims", `Klaim${claims ? ` (${claims.length})` : ""}`], ["refunds", `Refund${refunds ? ` (${refunds.length})` : ""}`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>{l}</button>
        ))}
        <label className="ml-auto flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Hanya yang terbuka</label>
      </div>

      {tab === "claims" ? (
        claims === null ? <Loader2 className="h-5 w-5 animate-spin" /> : claims.length === 0 ? <Empty /> : (
          <ul className="space-y-3">
            {claims.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/shop/orders/${c.code}`} className="font-mono font-medium hover:underline">{c.code}</Link>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{CLAIM_TYPE[c.type] ?? c.type}</span>
                  <span className="text-xs text-muted-foreground">{c.status} · {new Date(c.created_at).toLocaleDateString("id-ID")}</span>
                </div>
                <p className="mt-1">{c.customer_name} · {c.customer_phone}</p>
                <p className="mt-2">{c.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">{(c.photos ?? []).map((p: string, i: number) => <button key={p} type="button" className="text-xs underline" onClick={() => openPrivate(`/admin/shop/files?path=${encodeURIComponent(p)}`).catch((e) => toast.error(e.message))}>Foto {i + 1}</button>)}</div>
                {c.resolution && <p className="mt-2 rounded-lg bg-muted p-2">{c.resolution}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "diajukan" && <B onClick={() => claimAct(c, "ditinjau")}>Tandai ditinjau</B>}
                  {["diajukan", "ditinjau"].includes(c.status) && <B dark onClick={() => claimAct(c, "disetujui")}>Setujui</B>}
                  {["diajukan", "ditinjau"].includes(c.status) && <B onClick={() => claimAct(c, "ditolak")}>Tolak</B>}
                  {c.status === "disetujui" && <B dark onClick={() => claimAct(c, "selesai")}>Tandai selesai</B>}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : refunds === null ? <Loader2 className="h-5 w-5 animate-spin" /> : refunds.length === 0 ? <Empty /> : (
        <ul className="space-y-3">
          {refunds.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/shop/orders/${r.code}`} className="font-mono font-medium hover:underline">{r.code}</Link>
                <b>{rupiah(r.amount)}</b><span className="text-xs text-muted-foreground">{r.status} · {new Date(r.created_at).toLocaleDateString("id-ID")}</span>
              </div>
              <p className="mt-1">{r.customer_name} · {r.reason}</p>
              <p className="mt-1 text-muted-foreground">{r.bank_name ?? "—"} {r.account_number ?? ""} {r.account_holder ? `a.n. ${r.account_holder}` : ""}</p>
              {r.admin_note && <p className="mt-1">Catatan: {r.admin_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "diajukan" && <><B dark onClick={() => refundAct(r, "setujui")}>Setujui</B><B onClick={() => refundAct(r, "tolak")}>Tolak</B></>}
                {r.status === "disetujui" && <B dark onClick={() => refundAct(r, "kirim")}>Tandai sudah ditransfer</B>}
                {r.status === "dikirim" && <B onClick={() => refundAct(r, "selesai")}>Selesai</B>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pickFile(): Promise<File | null> {
  return new Promise((res) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*,application/pdf";
    i.onchange = () => res(i.files?.[0] ?? null);
    i.oncancel = () => res(null);
    i.click();
  });
}
function B({ children, onClick, dark }: { children: React.ReactNode; onClick: () => void; dark?: boolean }) {
  return <button type="button" onClick={onClick} className={`h-9 rounded-lg px-3 text-sm ${dark ? "bg-foreground text-background" : "border border-border"}`}>{children}</button>;
}
function Empty() {
  return <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Tidak ada data.</p>;
}
