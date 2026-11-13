import React from "react";

interface PromoBadgeProps {
  text?: string | null;
  className?: string;
}

/**
 * Badge diskon promosi mewah khas LIVORA (Gold / Dark frosted pill).
 * Menampilkan label promo seperti "40% OFF" atau "PROMO SPESIAL".
 */
export const PromoBadge: React.FC<PromoBadgeProps> = ({ text = "SPECIAL OFFER", className = "" }) => {
  if (!text) return null;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em] font-medium bg-[#1F1E1C]/90 text-[#D7B483] border border-[#D7B483]/40 shadow-sm backdrop-blur-sm ${className}`}
    >
      {text}
    </span>
  );
};

/**
 * Sesuai arahan: harga barang tidak ditampilkan di website publik LIVORA.
 * Komponen ini sengaja dikosongkan agar aman dan tidak merender harga apapun.
 */
export const PromoPriceTag: React.FC<any> = () => {
  return null;
};
