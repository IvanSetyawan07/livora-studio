import { useState, type ReactNode } from "react";
import { PolicyDialog } from "./PolicyDialog";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/content/legal/consultationPolicies";
import { ACCOUNT_PRIVACY_POLICY, ACCOUNT_TERMS_OF_SERVICE } from "@/content/legal/accountPolicies";

/**
 * Teks yang membuka Terms/Privacy di pop-up, tanpa pindah halaman.
 * scope="account" (default): ketentuan akun/website, dipakai di Create Account & Login.
 * scope="consultation": ketentuan khusus My Consultation.
 */
export function PolicyLink({
  doc,
  scope = "account",
  className,
  children,
}: {
  doc: "terms" | "privacy";
  scope?: "account" | "consultation";
  className?: string;
  children: ReactNode;
}) {
  const policyDoc =
    scope === "consultation"
      ? doc === "terms" ? TERMS_OF_SERVICE : PRIVACY_POLICY
      : doc === "terms" ? ACCOUNT_TERMS_OF_SERVICE : ACCOUNT_PRIVACY_POLICY;
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
      <PolicyDialog doc={policyDoc} open={open} onOpenChange={setOpen} />
    </>
  );
}