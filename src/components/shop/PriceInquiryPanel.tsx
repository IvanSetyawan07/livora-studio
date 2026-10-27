import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Send, Tag } from "lucide-react";
import { toast } from "sonner";
import { adminShop } from "@/lib/shop";
import { imgUrl } from "@/lib/adminApi";

type DiscountType = "" | "percent" | "nominal";
interface Row { price: string; type: DiscountType; value: string; note: string }

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const num = (v: string) => Number(String(v).replace(/\D/g, "")) || 0;
const finalOf = (price: number, type: DiscountType, value: number) =>
  type === "percent" ? Math.round((price * (100 - Math.min(value, 90))) / 100) : type === "nominal" ? Math.max(0, price - value) : price;

/**
 * Panel "Cek harga dari Livi" di Inbox. Admin mengisi harga manual (info saja, BUKAN penawaran/pesanan);
 * setelah dikirim, Livi menyampaikannya ke customer dengan bahasa natural + foto produk.
 */
export default function PriceInquiryPanel({ conversationId, windowOpen, onSent }: { conversationId: number; windowOpen: boolean; onSent?: () => void }) {
  const [inq, setInq] = useState<any | null | undefined>(undefined);
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await adminShop.priceInquiry(conversationId);
      setInq(r.inquiry);
      setRows((prev) => {
        const next: Record<number, Row> = { ...prev };
        for (const it of r.inquiry?.items ?? []) {
          if (next[it.item_id]) continue;
          const a = it.answer;
          next[it.item_id] = a
            ? { price: String(a.price), type: (a.discount_type ?? "") as DiscountType, value: a.discount_value ? String(a.discount_value) : "", note: a.note ?? "" }
            : { price: "", type: "", value: "", note: "" };
        }
        return next;
      });
    } catch { setInq(null); }
  }, [conversationId]);

  useEffect(() => { setInq(undefined); setRows({}); setNote(""); load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const items: any[] = inq?.items ?? [];
  const pending = inq?.status === "pending";
  const filled = useMemo(() => items.filter((i) => num(rows[i.item_id]?.price ?? "") > 0).length, [items, rows]);
  const set = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  if (inq === undefined || !inq) return null;
  // Jawaban lama tidak perlu menumpuk di thread: tampil hanya 24 jam setelah dijawab
  if (!pending && inq.answered_at && Date.now() - new Date(inq.answered_at).getTime() > 24 * 3600 * 1000) return null;

  const send = async () => {
    setBusy(true);
    try {
      const answers = items
        .filter((i) => num(rows[i.item_id]?.price ?? "") > 0)
        .map((i) => {
          const r = rows[i.item_id];
          return { item_id: i.item_id, price: num(r.price), discount_type: r.type || null, discount_value: r.type ? num(r.value) : null, note: r.note.trim() || null };
        });
      const res = await adminShop.answerPriceInquiry(conversationId, { inquiry_id: inq.id, answers, admin_note: note.trim() || null });
      toast.success(res.relayed ? "Harga terkirim. Livi menyampaikannya ke customer." : "Harga tersimpan, tapi sebagian pesan gagal terkirim. Cek menu Kesehatan sistem.");
      await load();
      onSent?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e.message);
    } finally { setBusy(false); }
  };

  return (
    <section className={`border-b border-border p-3 ${pending ? "bg-amber-50/70" : "bg-muted/30"}`} aria-label="Cek harga dari Livi">
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="h-4 w-4" />
        <h2 className="text-sm font-semibold">{pending ? "Livi menunggu harga dari tim" : "Cek harga sudah dijawab"}</h2>
        <span className="text-[11px] text-muted-foreground">Info saja, bukan penawaran/pesanan. Livi yang menyampaikan ke customer.</span>
      </div>
      {inq.question && <p className="mt-1 text-xs text-muted-foreground">Pertanyaan customer: “{inq.question}”</p>}

      <ul className="mt-2 space-y-2">
        {items.map((it) => {
          const r = rows[it.item_id] ?? { price: "", type: "" as DiscountType, value: "", note: "" };
          const price = num(r.price);
          const val = num(r.value);
          const fin = finalOf(price, r.type, val);
          return (
            <li key={it.item_id} className="rounded-lg border border-border bg-card p-2">
              <div className="flex gap-3">
                {it.image ? <img src={imgUrl(it.image)} alt="" className="h-14 w-14 shrink-0 rounded object-cover" /> : <div className="h-14 w-14 shrink-0 rounded bg-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.title} <span className="text-xs font-normal text-muted-foreground">x{it.quantity}{it.code ? ` · ${it.code}` : ""}</span></p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.dimensions ?? "dimensi belum ada"}
                    {it.reference_price ? ` · harga di katalog ${rp(it.reference_price)} (acuan, tidak dikirim otomatis)` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <label className="text-xs">Harga (Rp)
                  <input inputMode="numeric" disabled={!pending} value={r.price ? num(r.price).toLocaleString("id-ID") : ""} onChange={(e) => set(it.item_id, { price: e.target.value })} placeholder="mis. 5.500.000"
                    className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-60" />
                </label>
                <label className="text-xs">Diskon
                  <select disabled={!pending} value={r.type} onChange={(e) => set(it.item_id, { type: e.target.value as DiscountType, value: "" })}
                    className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-60">
                    <option value="">Tanpa diskon</option><option value="percent">Persen (%)</option><option value="nominal">Nominal (Rp)</option>
                  </select>
                </label>
                {r.type && (
                  <label className="text-xs">{r.type === "percent" ? "Diskon (%)" : "Potongan (Rp)"}
                    <input inputMode="numeric" disabled={!pending} value={r.value ? num(r.value).toLocaleString("id-ID") : ""} onChange={(e) => set(it.item_id, { value: e.target.value })}
                      className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-60 sm:w-28" />
                  </label>
                )}
              </div>
              {price > 0 && r.type && val > 0 && <p className="mt-1 text-xs text-emerald-700">Harga setelah diskon yang akan disampaikan Livi: <strong>{rp(fin)}</strong></p>}
              <label className="mt-2 block text-xs">Catatan untuk Livi (opsional, mis. alasan/syarat diskon, masa berlaku)
                <input disabled={!pending} value={r.note} onChange={(e) => set(it.item_id, { note: e.target.value })} maxLength={300} placeholder="mis. promo akhir bulan, berlaku sampai 31 Okt"
                  className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-60" />
              </label>
            </li>
          );
        })}
      </ul>

      {pending ? (
        <div className="mt-2 space-y-2">
          <label className="block text-xs">Catatan umum (opsional)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="mis. harga belum termasuk ongkir, stok dicek saat pesan"
              className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm" />
          </label>
          {!windowOpen && <p className="text-xs text-destructive">Jendela 24 jam tertutup: Livi tidak bisa mengirim. Minta customer mengirim pesan dulu.</p>}
          <button type="button" onClick={send} disabled={busy || filled === 0 || !windowOpen}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm text-background disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim ke Livi ({filled}/{items.length} barang)
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Dijawab {inq.answered_at ? new Date(inq.answered_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
          {inq.relayed_at ? " · sudah disampaikan Livi ke customer" : " · belum terkirim ke customer"}
        </p>
      )}
    </section>
  );
}
