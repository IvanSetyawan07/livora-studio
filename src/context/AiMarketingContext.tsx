import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AiChatContextKey } from "@/lib/ai/types";

interface AiMarketingContextValue {
  /** Which page/agent the user is currently looking at — read by the Ask AI
   * drawer so it never makes the user re-explain what they're asking about. */
  context: AiChatContextKey;
  askOpen: boolean;
  openAsk: () => void;
  closeAsk: () => void;
}

const AiMarketingCtx = createContext<AiMarketingContextValue | null>(null);

export function AiMarketingProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<AiChatContextKey>("overview");
  const [askOpen, setAskOpen] = useState(false);

  const value = useMemo<AiMarketingContextValue>(
    () => ({
      context,
      askOpen,
      openAsk: () => setAskOpen(true),
      closeAsk: () => setAskOpen(false),
    }),
    [context, askOpen],
  );

  return (
    <AiMarketingCtx.Provider value={{ ...value, context }}>
      <AiMarketingContextSetterBridge setContextState={setContextState}>{children}</AiMarketingContextSetterBridge>
    </AiMarketingCtx.Provider>
  );
}

// Internal — keeps the public hook API small (just `useAiMarketingContext`)
// while still letting pages register their context key.
const SetterCtx = createContext<((key: AiChatContextKey) => void) | null>(null);

function AiMarketingContextSetterBridge({
  setContextState,
  children,
}: {
  setContextState: (key: AiChatContextKey) => void;
  children: ReactNode;
}) {
  const setter = useCallback((key: AiChatContextKey) => setContextState(key), [setContextState]);
  return <SetterCtx.Provider value={setter}>{children}</SetterCtx.Provider>;
}

export function useAiMarketingContext() {
  const ctx = useContext(AiMarketingCtx);
  if (!ctx) throw new Error("useAiMarketingContext must be used within AiMarketingProvider");
  return ctx;
}

/** Call once per page (e.g. `usePageContext("seo")`) so Ask AI knows what
 * the user is looking at without them having to say so. */
export function usePageContext(key: AiChatContextKey) {
  const setter = useContext(SetterCtx);
  useEffect(() => {
    setter?.(key);
  }, [setter, key]);
}
