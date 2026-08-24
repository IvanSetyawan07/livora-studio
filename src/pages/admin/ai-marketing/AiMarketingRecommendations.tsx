import React, { useState } from 'react';
import { Check, X, Megaphone, Search, AlertCircle } from 'lucide-react';

// Mock data yang diperbarui dengan berbagai status
const mockRecommendations = [
  {
    id: 'rec-1',
    title: 'Shift budget to high-quality one stop service keywords',
    description: 'Current budget is being consumed by generic interior design terms with low conversion rates.',
    why: 'Search intent for "high quality one stop interior service" yields 40% higher lead quality for contractor projects.',
    expectedImpact: 'CPL ↓ 15%, Lead Quality ↑',
    confidence: '92%',
    priority: 'HIGH',
    risk: 'LOW',
    agent: 'SEO & Ads Agent',
    status: 'Needs Review', // Status disesuaikan
    actionText: 'Reallocate $150/day'
  },
  {
    id: 'rec-2',
    title: 'Optimize catalog pages for imported furniture',
    description: 'Bounce rate on imported furniture pages increased by 18% on mobile devices.',
    why: 'Images are loading too slowly (LCP > 3.5s) on 3G/4G connections.',
    expectedImpact: 'Mobile Conversion ↑ 8-10%',
    confidence: '85%',
    priority: 'MEDIUM',
    risk: 'LOW',
    agent: 'CRO Agent',
    status: 'Needs Review', // Status disesuaikan
    actionText: 'Compress & Serve WebP'
  },
  {
    id: 'rec-3',
    title: 'A/B Test new hero banner for Q3 Promo',
    description: 'Testing two different value propositions for the upcoming clearance sale.',
    why: 'Historical data shows tailored messaging increases CTR by 22%.',
    expectedImpact: 'CTR ↑ 20%',
    confidence: '78%',
    priority: 'LOW',
    risk: 'LOW',
    agent: 'Content Agent',
    status: 'Scheduled', // Status disesuaikan
    actionText: 'Launch Test'
  }
];

export default function AiMarketingRecommendations() {
  const [activeTab, setActiveTab] = useState('Needs Review');

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'HIGH': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500';
    }
  };

  // Logika filter data berdasarkan tab yang aktif
  const filteredRecommendations = mockRecommendations.filter(
    (rec) => rec.status === activeTab
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-slate-400 mb-1">AI CENTER</h1>
        <h2 className="text-3xl font-semibold text-white tracking-tight">Recommendations & Actions</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-6">
        {['Needs Review', 'Scheduled', 'Running', 'Completed', 'Failed'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 outline-none ${
              activeTab === tab 
                ? 'border-purple-500 text-purple-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((rec) => (
            <div key={rec.id} className="bg-[#131825] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{rec.title}</h3>
                    <p className="text-sm text-slate-400">{rec.description}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRiskColor(rec.risk)}`}>
                  Risk: {rec.risk}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 p-4 bg-[#0B0F19] rounded-lg border border-slate-800/50">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Why this matters:</span>
                  <p className="text-sm text-slate-300">{rec.why}</p>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expected Impact:</span>
                    <span className="text-pink-400 font-medium">{rec.expectedImpact}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">AI Confidence:</span>
                    <span className="text-white font-medium">{rec.confidence}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Source:</span>
                    <span className="text-slate-300">{rec.agent}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons hanya muncul jika statusnya Needs Review */}
              {activeTab === 'Needs Review' && (
                <div className="flex justify-end gap-3 border-t border-slate-800/50 pt-4">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                    <Check className="w-4 h-4" /> Approve & Execute: {rec.actionText}
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          // Empty State jika tidak ada data di tab tersebut
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-xl bg-[#131825]/50">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-slate-300 font-medium">No actions found</h3>
            <p className="text-sm text-slate-500 mt-1">There are no recommendations in the '{activeTab}' queue.</p>
          </div>
        )}
      </div>
    </div>
  );
}