import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ConsultationChat from "./ConsultationChat";

type Props = {
  consultationId: number;
  unreadCount?: number;
  locked?: boolean;
};

const GOLD = "#C9974A";

/**
 * Kartu kecil "Chat with Livora Design Team" yang selalu terlihat di sidebar
 * kanan (tanpa perlu scroll ke bawah halaman). Klik "Open Chat" membuka
 * ConsultationChat yang sama persis (tidak diubah) di dalam Sheet slide-over —
 * pola yang sudah ada di codebase ini (lihat ConsultationDetailSheet.tsx).
 */
export default function ConsultationChatCard({ consultationId, unreadCount = 0, locked }: Props) {
  const [open, setOpen] = useState(false);
  const hasUnread = unreadCount > 0;

  return (
    <>
      <div className="bg-card border border-border rounded-sm p-6 md:p-7">
        <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-3">
          Chat with Livora Design Team
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground mb-4">
          {hasUnread
            ? `${unreadCount} pesan baru dari tim desain.`
            : "Ada pertanyaan atau kendala? Tim desain siap membantu kapan saja."}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative w-full inline-flex items-center justify-center gap-2 rounded-sm bg-foreground text-background px-4 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={14} /> Open Chat
          {hasUnread && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium text-white flex items-center justify-center"
              style={{ backgroundColor: GOLD }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            {/* Judul visual sudah ada di header internal ConsultationChat;
                ini cuma dipakai untuk aksesibilitas (screen reader). */}
            <SheetTitle className="sr-only">Chat with Livora Design Team</SheetTitle>
          </SheetHeader>
          <div className="p-5">
            <ConsultationChat consultationId={consultationId} mode="user" locked={locked} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}