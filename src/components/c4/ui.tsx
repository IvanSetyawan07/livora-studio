// Komponen UI kecil khusus modul C4 (tombol, modal, konfirmasi, toast, dll).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import type { Toast } from "@/hooks/useC4";

export function Btn({
  children,
  icon,
  onClick,
  variant = "ghost",
  title,
  disabled,
  active,
  type = "button",
  size = "md",
  testId,
}: {
  children?: ReactNode;
  icon?: string;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "danger" | "accent";
  title?: string;
  disabled?: boolean;
  active?: boolean;
  type?: "button" | "submit";
  size?: "sm" | "md";
  testId?: string;
}) {
  return (
    <button type={type} className={`c4-btn c4-btn--${variant} c4-btn--${size}${active ? " is-active" : ""}`} onClick={onClick} title={title} aria-label={title} disabled={disabled} data-testid={testId}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children != null && children !== false && <span>{children}</span>}
    </button>
  );
}

export function Badge({ children, tone = "mute", color }: { children: ReactNode; tone?: "mute" | "ok" | "warn" | "err" | "info"; color?: string }) {
  return (
    <span className={`c4-badge c4-badge--${tone}`} style={color ? ({ "--b": color } as React.CSSProperties) : undefined}>
      {children}
    </span>
  );
}

export function Modal({ title, onClose, children, width = 520, footer }: { title: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="c4-modal-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="c4-modal-bg" onClick={onClose} />
      <div className="c4-modal" style={{ width }}>
        <div className="c4-modal__head">
          <h3>{title}</h3>
          <Btn icon="close" variant="ghost" size="sm" onClick={onClose} title="Tutup" />
        </div>
        <div className="c4-modal__body">{children}</div>
        {footer && <div className="c4-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel = "Ya, lanjutkan", danger, onYes, onNo }: { title: string; text: ReactNode; confirmLabel?: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Modal
      title={title}
      onClose={onNo}
      width={440}
      footer={
        <>
          <Btn onClick={onNo}>Batal</Btn>
          <Btn variant={danger ? "danger" : "solid"} onClick={onYes} testId="c4-confirm-yes">
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="c4-note">{text}</div>
    </Modal>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="c4-field">
      <span className="c4-field__label">{label}</span>
      {children}
      {hint && <span className="c4-field__hint">{hint}</span>}
    </label>
  );
}

export function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="c4-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`c4-toast c4-toast--${t.kind}`} role="status" onClick={() => dismiss(t.id)}>
          <Icon name={t.kind === "err" ? "alert" : t.kind === "ok" ? "check" : "bolt"} size={15} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Input dengan debounce sederhana untuk kolom pencarian tabel. */
export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    t.current = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t.current);
  }, [value, ms]);
  return v;
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!isFinite(s)) return "—";
  if (s < 45) return "baru saja";
  if (s < 3600) return `${Math.round(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}
