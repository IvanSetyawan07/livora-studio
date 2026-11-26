import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Percent, X, Loader2, ArrowRight, Ban } from "lucide-react";
import { bulkDiscountItems } from "@/lib/promoApi";

interface BulkDiscountModalProps {
  isOpen: boolean;
  selectedIds: number[];
  selectedItems: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkDiscountModal({
  isOpen,
  selectedIds,
  selectedItems,
  onClose,
  onSuccess,
}: BulkDiscountModalProps) {
  const isSingle = selectedItems.length === 1;
  const single = isSingle ? selectedItems[0] : null;

  const [discountValue, setDiscountValue] = useState<string>("20");
  const [badgeText, setBadgeText] = useState<string>("20% OFF");
  const [badgeTouched, setBadgeTouched] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Pre-fill data eksisting bila mengatur promo 1 item
  useEffect(() => {
    if (!isOpen) return;
    setBadgeTouched(false);
    if (single) {
      const existingDisc = single.discount_value && Number(single.discount_value) > 0 ? String(single.discount_value) : "20";
      setDiscountValue(existingDisc);
      setBadgeText(single.promo_badge_text || `${Math.round(Number(existingDisc))}% OFF`);
      setStartDate(single.promo_start_date ? String(single.promo_start_date).slice(0, 16) : "");
      setEndDate(single.promo_end_date ? String(single.promo_end_date).slice(0, 16) : "");
    } else {
      setDiscountValue("20");
      setBadgeText("20% OFF");
      setStartDate("");
      setEndDate("");
    }
  }, [isOpen, single]);

  useEffect(() => {
    if (badgeTouched) return;
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val > 0) {
      setBadgeText(`${Math.min(100, Math.round(val))}% OFF`);
    }
  }, [discountValue, badgeTouched]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error("Masukkan persentase diskon antara 1% – 100%.");
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("Tanggal selesai promo tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setSaving(true);
    try {
      const res = await bulkDiscountItems({
        item_ids: selectedIds,
        discount_type: "PERCENTAGE",
        discount_value: val,
        promo_badge_text: badgeText.trim() || undefined,
        promo_start_date: startDate || undefined,
        promo_end_date: endDate || undefined,
      });
      toast.success(
        res.message ||
          (isSingle
            ? `Promo diterapkan pada "${single?.title}".`
            : `Promo diterapkan pada ${selectedIds.length} produk.`),
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menerapkan promo");
    } finally {
      setSaving(false);
    }
  };

  const handleClearPromo = async () => {
    setSaving(true);
    try {
      await bulkDiscountItems({
        item_ids: selectedIds,
        discount_value: 0,
        promo_badge_text: undefined,
      });
      toast.success(isSingle ? `Promo pada "${single?.title}" dinonaktifkan.` : "Promo dinonaktifkan.");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menonaktifkan promo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#EAE4DA] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAE4DA] bg-[#FAF8F4] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDF4F8] text-[#5E93B8]">
              <Percent className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-header text-xl text-[#232528]">
                {isSingle ? "Atur Promo Produk" : "Atur Promo Massal"}
              </h2>
              <p className="text-xs text-[#656B73]">
                {isSingle ? (
                  <>
                    Produk: <strong>{single?.title}</strong>
                  </>
                ) : (
                  <>
                    Terapkan diskon sekaligus ke <strong>{selectedIds.length} produk</strong> terpilih.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-full p-1.5 text-[#656B73] hover:bg-black/5 hover:text-[#232528]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#232528]">Persentase Promo (%) *</label>
            <div className="relative">
              <input
                required
                type="number"
                min="1"
                max="100"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="contoh: 20"
                className="h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 pr-8 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#656B73]">%</span>
            </div>
            <p className="mt-1 text-[11px] text-[#656B73]">
              Harga nominal tetap dirahasiakan dari katalog publik; pengunjung melihat label promo di kartu produk.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#232528]">Teks Label Badge Promo</label>
            <input
              value={badgeText}
              onChange={(e) => {
                setBadgeTouched(true);
                setBadgeText(e.target.value);
              }}
              placeholder="mis. 20% OFF / SPECIAL OFFER"
              className="h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-3 text-sm text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#232528]">Mulai Promo (Opsional)</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-2.5 text-xs text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#232528]">Selesai Promo (Opsional)</label>
              <input
                type="datetime-local"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2DACF] bg-[#FAF8F4] px-2.5 text-xs text-[#232528] outline-none focus:border-[#5E93B8] focus:bg-white"
              />
            </div>
          </div>

          {!isSingle && (
            <div className="rounded-xl border border-[#EAE4DA] bg-[#FAF8F4] p-3 text-xs">
              <span className="mb-1.5 block font-medium text-[#656B73]">Produk yang akan terkena promo:</span>
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {selectedItems.map((item) => (
                  <span
                    key={item.id}
                    className="max-w-[180px] truncate rounded-full border border-[#E2DACF] bg-white px-2.5 py-0.5 text-[11px] text-[#232528]"
                  >
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4DA] pt-4">
            {isSingle && single?.is_on_promo ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleClearPromo()}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" /> Nonaktifkan Promo
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-full border border-[#E2DACF] px-4 py-2 text-xs font-medium text-[#232528] hover:bg-[#FAF8F4]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#232528] px-5 py-2 text-xs font-medium text-white hover:bg-[#34383D] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menerapkan…
                  </>
                ) : (
                  <>
                    Terapkan Promo <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
