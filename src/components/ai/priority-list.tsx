import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { PriorityItem } from "@/lib/ai/types";
import { agentById } from "@/lib/ai/data";
import { Panel, PriorityPill } from "./primitives";

export function PriorityList({ items }: { items: PriorityItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const agent = agentById(item.agent);
        return (
          <Link
            key={item.id}
            to={item.href}
            className="animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] block"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Panel hover className="group flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityPill priority={item.priority} />
                  {agent ? <span className="label-eyebrow">{agent.name}</span> : null}
                </div>
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.explanation}</p>
              </div>
              {item.expectedImpact ? (
                <p className="hidden shrink-0 text-right text-xs text-success sm:block">{item.expectedImpact}</p>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Panel>
          </Link>
        );
      })}
    </div>
  );
}
