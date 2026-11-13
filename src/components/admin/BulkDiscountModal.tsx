import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Percent, Tag, X, Sparkles, Loader2, ArrowRight } from "lucide-react";
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
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>("30");
  const [badgeText, setBadgeText] = useState<string>("30% OFF");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Auto-update badge text when discount value changes
  useEffect(() => {
    const val = parseFloat(discountValue);
    if (!isNaN(val) && val > 0) {
      if (discountType === "PERCENTAGE") {
        setBadgeText(`${Math.round(val)}% OFF`);
      } else {
        setBadgeText(`HEMAT Rp ${Math.round(val).toLocaleString("id-ID")}`);
      }
    } else {
      setBadgeText("");
    }
  }, [discountValue, discountType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Masukkan nilai diskon yang valid (lebih dari 0)");
      return;
    }
    if (discountType === "PERCENTAGE" && val > 100) {
      toast.error("Diskon persentase maksimal 100%");
      return;
    }

    setSaving(true);
    try {
      const res = await bulkDiscountItems({
        item_ids: selectedIds,
        discount_type: discountType,
        discount_value: val,
        promo_badge_text: badgeText.trim() || undefined,
        promo_start_date: startDate || undefined,
        promo_end_date: endDate || undefined,
      });
      toast.success(res.message || `Diskon berhasil diterapkan pada ${selectedIds.length} item.`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menerapkan diskon massal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D7B483]/15 text-[#A88247] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h2 className="serif text-xl font-light">Atur Diskon Massal</h2>
              <p className="text-xs text-muted-foreground">
                Terapkan promo sekaligus untuk <strong>{selectedIds.length} item</strong> terpilih.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Discount Type Selector */}
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1.5">
              Tipe Diskon
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType("PERCENTAGE")}
                className={`py-2 px-3 rounded-lg border text-xs uppercase tracking-wider font-medium transition-all ${
                  discountType === "PERCENTAGE"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("FIXED_AMOUNT")}
                className={`py-2 px-3 rounded-lg border text-xs uppercase tracking-wider font-medium transition-all ${
                  discountType === "FIXED_AMOUNT"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                Nominal Tetap (Rp)
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1">
              {discountType === "PERCENTAGE" ? "Persentase Diskon (%) *" : "Potongan Harga (Rp) *"}
            </label>
            <div className="relative">
              <input
                required
                type="number"
                min="1"
                max={discountType === "PERCENTAGE" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "PERCENTAGE" ? "contoh: 30" : "contoh: 2500000"}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                {discountType === "PERCENTAGE" ? "%" : "IDR"}
              </span>
            </div>
          </div>

          {/* Badge Text */}
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1">
              Label Badge Promo
            </label>
            <input
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="misal: 30% OFF / SPECIAL OFFER"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1">
                Mulai Promo (Opsional)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium block mb-1">
                Selesai Promo (Opsional)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Selected items preview preview pill */}
          <div className="bg-muted/40 rounded-lg p-3 border border-border/60 text-xs">
            <span className="text-muted-foreground block mb-1">Item yang akan terkena promo:</span>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedItems.map((item) => (
                <span
                  key={item.id}
                  className="bg-background border border-border px-2 py-0.5 rounded text-[11px] truncate max-w-[180px]"
                >
                  {item.title}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-border text-xs uppercase tracking-wider hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded bg-foreground text-background text-xs uppercase tracking-wider font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menerapkan…
                </>
              ) : (
                <>
                  Terapkan Diskon <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
