import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, X, Send } from "lucide-react";
import { useLocation } from "react-router-dom";

interface MarketingAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarketingAiDrawer({ isOpen, onClose }: MarketingAiDrawerProps) {
  const location = useLocation();
  
  // Deteksi context berdasarkan route
  const getContext = () => {
    const path = location.pathname;
    if (path.includes('seo')) return 'SEO';
    if (path.includes('ads')) return 'Ads';
    if (path.includes('content')) return 'Content';
    if (path.includes('campaigns')) return 'Campaigns';
    return 'General Overview';
  };

  const currentContext = getContext();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0B0F19] border-l border-slate-800 text-slate-200 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <SheetTitle className="text-slate-100 m-0">Livora Marketing AI</SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-center">
            <span className="bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
              Current Context: <span className="text-purple-400 font-medium">{currentContext}</span>
            </span>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 text-sm">
            <p className="mb-3 text-slate-300">What can I help you with?</p>
            <p className="text-xs text-slate-500 mb-2 font-semibold">Suggested questions:</p>
            <ul className="space-y-2 text-slate-400">
              <li className="hover:text-purple-400 cursor-pointer transition-colors">• Why did traffic drop this week?</li>
              <li className="hover:text-purple-400 cursor-pointer transition-colors">• What should I fix today?</li>
              <li className="hover:text-purple-400 cursor-pointer transition-colors">• Which campaign needs attention?</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-[#0B0F19]">
          <div className="relative">
            <input 
              type="text" 
              placeholder={`Ask about ${currentContext}...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-400 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}