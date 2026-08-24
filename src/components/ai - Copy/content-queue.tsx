import { Facebook, Globe, Instagram, Music2, PenLine, Youtube } from "lucide-react";
import type { ContentQueueItem } from "@/lib/ai/types";
import { Panel, Pill } from "./primitives";

const platformIcon = {
  Instagram,
  Facebook,
  TikTok: Music2,
  YouTube: Youtube,
  Blog: PenLine,
  Website: Globe,
} as const;

const statusTone = {
  Draft: "neutral",
  Scheduled: "info",
  Published: "success",
  "Needs Review": "warning",
} as const;

export function ContentQueue({ items }: { items: ContentQueueItem[] }) {
  return (
    <div className="scroll-rail -mx-1 flex gap-4 px-1 pb-3">
      {items.map((item) => {
        const Icon = platformIcon[item.platform];
        return (
          <Panel
            key={item.id}
            hover
            className="flex w-[270px] shrink-0 flex-col justify-between p-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="size-3.5 text-brass" />
                  {item.platform}
                </span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {item.scheduledFor}
                </span>
              </div>
              <p className="mt-3 text-sm leading-snug">{item.title}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <Pill tone={statusTone[item.status]}>{item.status}</Pill>
              {item.aiAssisted ? (
                <span className="font-mono text-[10px] tracking-[0.14em] text-brass uppercase">
                  AI assisted
                </span>
              ) : null}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
