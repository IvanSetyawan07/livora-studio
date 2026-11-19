import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import { ItemIllustration } from "@/components/livora/ItemIllustration";
import { WHATSAPP_NUMBER } from "@/components/livora/WhatsAppButton";
import type { ShortlistedPiece } from "./types";

interface FurnitureShortlistDrawerProps {
  open: boolean;
  items: ShortlistedPiece[];
  onClose: () => void;
  onRemove: (slug: string) => void;
  onClear: () => void;
}

/**
 * Saved Shortlist Drawer (slide-over dari kanan).
 * Menampilkan karya furnitur yang disimpan klien beserta pilihan finishing-nya
 * tanpa harga atau alur checkout e-commerce.
 */
export const FurnitureShortlistDrawer: React.FC<FurnitureShortlistDrawerProps> = ({
  open,
  items,
  onClose,
  onRemove,
  onClear,
}) => {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const waListLines = items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.name} (${it.code}) — Finish: ${it.finishName} · ${it.dimensionsLabel}`,
    )
    .join("\n");

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Halo Tim LIVORA,\n\nBerikut daftar furnitur pilihan (Shortlist) yang ingin saya diskusikan bersama desainer LIVORA:\n\n${waListLines}\n\nMohon informasi jadwal konsultasi atau kunjungan ke LIVORA Showroom.`,
  )}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Pieces Shortlist"
      className="fixed inset-0 z-[85] flex justify-end bg-[#07243D]/45 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[100dvh] bg-[#F8F9FB] border-l border-[#0B426E]/10 flex flex-col animate-in slide-in-from-right duration-300"
        style={{ boxShadow: "-20px 0 60px -24px rgba(7, 36, 61, 0.25)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-[#0B426E]/10 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#1E88C7] font-medium">
              Curated Shortlist
            </p>
            <h2 className="serif text-2xl font-light text-[#0B426E] mt-0.5">
              Saved Pieces{" "}
              <span className="font-sans text-xs font-medium text-[#4B5E71] align-middle ml-1">
                ({items.length})
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-[#4B5E71] hover:text-[#0B426E] px-2.5 py-1.5 rounded-full hover:bg-[#EEF1F5] transition-colors"
              >
                Bersihkan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup daftar shortlist"
              className="w-9 h-9 rounded-full hover:bg-[#EEF1F5] text-[#0B426E] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF4FA] text-[#1E88C7] flex items-center justify-center mb-4">
                <Bookmark className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="serif text-2xl font-light text-[#0B426E]">
                Shortlist Anda Masih Kosong
              </h3>
              <p className="text-[13px] text-[#4B5E71] mt-2 leading-relaxed max-w-xs">
                Simpan furnitur pilihan Anda beserta finishing favorit untuk dibahas bersama tim desainer LIVORA.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#0B426E] text-white px-6 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-[#083559] transition-colors"
              >
                Eksplorasi Koleksi
              </button>
            </div>
          ) : (
            items.map((piece) => {
              const pieceHref =
                typeof piece.finishId === "number"
                  ? `/items/${piece.slug}?variant=${piece.finishId}`
                  : `/items/${piece.slug}`;
              return (
              <div
                key={piece.slug}
                className="group flex gap-4 p-3 rounded-2xl bg-white border border-[#0B426E]/8 hover:border-[#1E88C7]/35 transition-colors"
              >
                <Link
                  to={pieceHref}
                  onClick={onClose}
                  className="w-20 h-24 rounded-xl bg-[#EEF1F5] overflow-hidden shrink-0 flex items-center justify-center p-2"
                >
                  {piece.image ? (
                    <img
                      src={piece.image}
                      alt={piece.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ItemIllustration name={piece.name} size={64} />
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={pieceHref}
                        onClick={onClose}
                        className="text-left text-[14px] font-medium text-[#0B426E] hover:text-[#1E88C7] line-clamp-1 transition-colors"
                      >
                        {piece.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemove(piece.slug)}
                        aria-label={`Hapus ${piece.name}`}
                        className="p-1 text-[#4B5E71]/70 hover:text-[#0B426E] rounded-full hover:bg-[#EEF1F5] transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#4B5E71] mt-0.5">
                      {piece.category} · {piece.code}
                    </p>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F9FB] border border-[#0B426E]/10 px-2.5 py-0.5 text-[11px] text-[#0B426E]">
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/15 shrink-0"
                        style={{ backgroundColor: piece.finishHex }}
                      />
                      <span className="truncate">{piece.finishName}</span>
                    </div>
                    <p className="text-[11.5px] text-[#4B5E71] truncate">
                      {piece.dimensionsLabel}
                    </p>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Footer Consultation CTAs (ZERO Price / Checkout) */}
        {items.length > 0 && (
          <div className="p-6 bg-white border-t border-[#0B426E]/10 space-y-2.5">
            <p className="text-[11.5px] text-[#4B5E71] leading-relaxed mb-3">
              Bawa daftar pilihan ini untuk sesi konsultasi material, tata ruang, dan kustomisasi dimensi bersama arsitek &amp; desainer LIVORA.
            </p>

            <Link
              to="/appointment"
              state={{ shortlist: items }}
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0B426E] hover:bg-[#083559] text-white px-5 py-3.5 text-[13px] font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Consultation with Selected Pieces</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#0B426E]/20 bg-[#F8F9FB] hover:bg-[#EAF4FA] text-[#0B426E] px-5 py-3 text-[12.5px] font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#1E88C7]" />
              <span>Kirim Shortlist ke Tim Desainer via WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
