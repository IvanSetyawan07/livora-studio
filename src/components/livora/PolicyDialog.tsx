import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PolicyDocument, formatPolicyDate } from "@/content/legal/consultationPolicies";

type PolicyDialogProps = {
  doc: PolicyDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PolicyDialog({ doc, open, onOpenChange }: PolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[820px] max-h-[85vh] p-0 gap-0 overflow-hidden">
        {doc && (
          <>
            <DialogHeader className="px-6 sm:px-10 pt-8 pb-5 border-b border-border text-left space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-light tracking-tight">
                {doc.modalTitle}
              </DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-[0.2em] font-light">
                Terakhir diperbarui: {formatPolicyDate()}
              </DialogDescription>
            </DialogHeader>

            {/* FIX: Tambahan data-lenis-prevent dan overscroll-contain agar scroll native jalan & tidak bocor ke background */}
            <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-6 sm:px-10 py-8 max-h-[calc(85vh-7rem)]">
              <h3 className="text-base sm:text-lg font-normal mb-4">{doc.title}</h3>
              {doc.intro.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed font-light text-muted-foreground mb-3">
                  {p}
                </p>
              ))}

              {doc.sections.map((section) => (
                <section key={section.heading} className="mt-8">
                  <h4 className="text-sm font-medium tracking-wide mb-3">{section.heading}</h4>
                  {section.paragraphs?.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed font-light text-muted-foreground mb-3">
                      {p}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-1.5">
                      {section.bullets.map((b) => (
                        <li key={b} className="text-sm leading-relaxed font-light text-muted-foreground">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}