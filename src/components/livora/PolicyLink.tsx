import { useState, type ReactNode } from "react";
import { PolicyDialog } from "./PolicyDialog";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/content/legal/consultationPolicies";

/** Teks yang membuka Terms/Privacy di pop-up, tanpa pindah halaman. */
export function PolicyLink({ doc, className, children }: { doc: "terms" | "privacy"; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={show}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && show(e)}
        className={`cursor-pointer ${className ?? ""}`}
      >
        {children}
      </span>
      <PolicyDialog doc={doc === "terms" ? TERMS_OF_SERVICE : PRIVACY_POLICY} open={open} onOpenChange={setOpen} />
    </>
  );
}
