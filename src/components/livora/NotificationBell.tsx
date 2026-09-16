import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { ConsultationActivity } from "../../lib/consultations";

type Props = {
  activities: ConsultationActivity[];
  unreadCount: number;
  /** Field that marks an activity read for the current audience. */
  readField: "user_read_at" | "admin_read_at";
  /** Called once when the dropdown is opened — used to mark activities read. */
  onOpen?: () => void;
  /** Called when a single activity row is clicked. */
  onItemClick?: (activity: ConsultationActivity) => void;
  light?: boolean;
  label?: string;
};

export default function NotificationBell({
  activities,
  unreadCount,
  readField,
  onOpen,
  onItemClick,
  light,
  label = "Notifications",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next) onOpen?.();
      return next;
    });
  };

  const recent = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={toggle}
        className={`p-2 relative transition-colors duration-500 ${
          light ? "text-white/90 hover:text-white" : "text-foreground/80 hover:text-foreground"
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-background border border-border rounded-lg shadow-xl overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-medium">{label}</p>
            {unreadCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">No notifications yet.</p>
            ) : (
              recent.map((a) => {
                const isUnread = !a[readField];
                const who = a.consultation
                  ? `${a.consultation.first_name} ${a.consultation.last_name ?? ""}`.trim()
                  : null;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setOpen(false);
                      onItemClick?.(a);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-secondary/60 transition-colors ${
                      isUnread ? "bg-secondary/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isUnread ? "font-medium" : ""}`}>{a.title}</p>
                        {a.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>}
                        <div className="flex items-center justify-between mt-1">
                          {who && (
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                              {who}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(a.created_at).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}