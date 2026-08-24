import React, { useState, useEffect } from 'react';
import { 
  Calendar, Info, ChevronRight, AlertCircle, AlertTriangle, 
  Megaphone, TrendingUp, Star, FileText, Activity, ShieldCheck, ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// --- ANIMATION HOOK ---
function useAnimatedNumber(endValue: number, duration: number = 1000, isCurrency: boolean = false): string {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setValue(easeProgress * endValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [endValue, duration]);

  if (isCurrency) return value.toFixed(1) + 'K';
  return Math.floor(value).toString();
}

// --- MOCK DATA ---
const performanceData = [
  { name: 'May 12', Traffic: 250, Leads: 180, Conversions: 120, Revenue: 80 },
  { name: 'May 13', Traffic: 300, Leads: 250, Conversions: 180, Revenue: 150 },
  { name: 'May 14', Traffic: 280, Leads: 220, Conversions: 190, Revenue: 160 },
  { name: 'May 15', Traffic: 450, Leads: 380, Conversions: 250, Revenue: 210 },
  { name: 'May 16', Traffic: 400, Leads: 320, Conversions: 210, Revenue: 190 },
  { name: 'May 17', Traffic: 600, Leads: 450, Conversions: 320, Revenue: 280 },
  { name: 'May 18', Traffic: 550, Leads: 420, Conversions: 300, Revenue: 260 },
];

const channelData = [
  { name: 'Paid Search', value: 18200, color: '#a855f7' }, // Purple
  { name: 'Organic Search', value: 12600, color: '#3b82f6' }, // Blue
  { name: 'Direct', value: 6800, color: '#10b981' }, // Green
  { name: 'Social Media', value: 3200, color: '#6366f1' }, // Indigo
  { name: 'Email', value: 2000, color: '#f97316' }, // Orange
];

export default function AiMarketingOverview() {
  const animatedHealth = useAnimatedNumber(85);
  const animatedRevenue = useAnimatedNumber(42.8, 1500, true);
  const animatedCampaigns = useAnimatedNumber(12);
  const animatedRecommendations = useAnimatedNumber(27);
  const animatedTasks = useAnimatedNumber(156);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-medium text-slate-400 mb-1">AI MARKETING</h1>
          <h2 className="text-3xl font-semibold text-white tracking-tight">Overview</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time intelligence and insights for Livora's digital growth.</p>
        </div>
        <div className="flex items-center">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#131825] border border-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">
            May 12 - May 18, 2025
            <Calendar className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ROW 1: KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {/* Health Score */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">Business Health Score <Info className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="flex items-baseline">
              <span className="text-4xl font-semibold text-pink-500">{animatedHealth}</span>
              <span className="text-sm text-slate-500 ml-1">/ 100</span>
            </div>
            {/* SVG Sparkline Mock */}
            <svg width="80" height="30" viewBox="0 0 100 30" className="opacity-80">
              <path d="M0 20 Q 15 5, 30 15 T 60 25 T 80 10 T 100 20" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-xs mt-3">
            <span className="text-green-500 font-medium">↑ 8 <span className="text-slate-500">pts vs last week</span></span>
            <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">Healthy</span>
          </div>
        </div>

        {/* Revenue Impact */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">Revenue Impact <Info className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="text-4xl font-semibold text-green-500">${animatedRevenue}</span>
            <svg width="80" height="30" viewBox="0 0 100 30" className="opacity-80">
              <path d="M0 25 Q 20 15, 40 20 T 70 10 T 100 5" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-xs mt-3">
            <span className="text-green-500 font-medium">↑ 12.5% <span className="text-slate-500">vs last week</span></span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Strong</span>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">Active Campaigns <Info className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="text-4xl font-semibold text-blue-500">{animatedCampaigns}</span>
            <svg width="80" height="30" viewBox="0 0 100 30" className="opacity-80">
              <path d="M0 15 Q 25 25, 50 15 T 80 5 T 100 20" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-xs mt-3">
            <span className="text-green-500 font-medium">↑ 2 <span className="text-slate-500">vs last week</span></span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">Active</span>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">AI Recommendations <Info className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="text-4xl font-semibold text-orange-500">{animatedRecommendations}</span>
            <svg width="80" height="30" viewBox="0 0 100 30" className="opacity-80">
              <path d="M0 25 Q 30 5, 50 20 T 75 15 T 100 10" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-xs mt-3">
            <span className="text-orange-500 font-medium">↑ 5 <span className="text-slate-500">new this week</span></span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">Review</span>
          </div>
        </div>

        {/* Tasks Automated */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[140px]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">Tasks Automated <Info className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <span className="text-4xl font-semibold text-purple-500">{animatedTasks}</span>
            <svg width="80" height="30" viewBox="0 0 100 30" className="opacity-80">
              <path d="M0 10 Q 20 25, 45 10 T 70 20 T 100 5" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex justify-between items-center text-xs mt-3">
            <span className="text-green-500 font-medium">↑ 23 <span className="text-slate-500">vs last week</span></span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">Automated</span>
          </div>
        </div>
      </div>

      {/* ROW 2: MIDDLE SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Top Priorities Today */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-slate-800/50 flex items-center gap-1 text-sm font-medium text-slate-200">
            Top Priorities Today <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex flex-col p-2">
            {[
              { level: 'High Priority', color: 'pink', title: 'ROAS dropped 27% in Campaign A', desc: 'AI recommends budget optimization to improve performance' },
              { level: 'Medium Priority', color: 'orange', title: 'Organic traffic decreased 12%', desc: 'Technical SEO issues detected on key pages' },
              { level: 'Medium Priority', color: 'orange', title: '15 reviews need response', desc: 'Quick responses can improve local SEO and reputation' },
              { level: 'Low Priority', color: 'green', title: 'New keyword opportunities found', desc: '3 high-potential keywords identified for content creation' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-800/30 rounded-lg cursor-pointer transition-colors border-b border-slate-800/50 last:border-0">
                <div className="flex gap-3">
                  <div className="mt-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-${item.color}-500/20`}>
                      <span className={`w-2 h-2 rounded-full bg-${item.color}-500`}></span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-bold text-${item.color}-500 mb-0.5 block`}>{item.level}</span>
                    <h4 className="text-sm text-slate-200 font-medium">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-200">
              AI Recommendations <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <a href="#" className="text-xs text-purple-400 hover:text-purple-300">View all</a>
          </div>
          <div className="flex flex-col p-3 gap-2">
            {[
              { icon: Megaphone, color: 'pink', title: 'Reduce Campaign A budget by 15%', desc: 'CPL increased 27% in the last 7 days', impact: 'High Impact', conf: '91%', risk: 'Low Risk' },
              { icon: TrendingUp, color: 'orange', title: 'Optimize product pages for SEO', desc: 'Traffic dropped 12% for key product pages', impact: 'Medium Impact', conf: '84%', risk: 'Low Risk' },
              { icon: Star, color: 'yellow', title: 'Respond to negative reviews', desc: '2 negative reviews need attention', impact: 'Medium Impact', conf: '78%', risk: 'Low Risk' },
              { icon: FileText, color: 'green', title: 'Create content for "wedding gifts"', desc: 'High search volume, low competition', impact: 'Low Impact', conf: '72%', risk: 'Low Risk' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-[#0B0F19]/50 border border-slate-800/60 rounded-lg hover:border-slate-700 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-${item.color}-500/10 border border-${item.color}-500/20`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium text-slate-200">{item.title} <Info className="w-3 h-3 inline text-slate-600" /></h4>
                    <button className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700">Review</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 mb-2">{item.desc}</p>
                  <div className="flex gap-3 text-[10px] font-medium">
                    <span className={`text-${item.color}-500`}>{item.impact}</span>
                    <span className="text-slate-400">{item.conf} Confidence</span>
                    <span className="text-green-500">{item.risk}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Activity Feed */}
        <div className="bg-[#131825] border border-slate-800 rounded-xl flex flex-col">
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-200">
              AI Activity Feed <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col relative">
            {/* Vertical line connecting timeline */}
            <div className="absolute left-[39px] top-6 bottom-10 w-px bg-slate-800"></div>
            
            {[
              { time: '10:30 AM', title: 'Analyzed 42 pages across collections', agent: 'SEO Agent', color: 'orange', icon: Activity },
              { time: '10:24 AM', title: 'Detected 7 optimization opportunities', agent: 'SEO Agent', color: 'green', icon: TrendingUp },
              { time: '10:18 AM', title: 'Campaign A performance alert', agent: 'Ads Agent', color: 'pink', icon: AlertTriangle },
              { time: '10:15 AM', title: 'Generated 3 content recommendations', agent: 'Content Agent', color: 'purple', icon: FileText },
              { time: '10:12 AM', title: 'Lead scoring model updated', agent: 'Lead Intelligence', color: 'blue', icon: ShieldCheck },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 mb-5 relative z-10">
                <div className="text-[10px] text-slate-500 w-[50px] pt-1.5 text-right shrink-0">{item.time}</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-${item.color}-500/10 border border-${item.color}-500/20 bg-[#131825]`}>
                  <item.icon className={`w-3.5 h-3.5 text-${item.color}-500`} />
                </div>
                <div className="pt-0.5">
                  <h4 className="text-xs text-slate-200 font-medium">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.agent}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-slate-800/50 flex justify-center">
            <button className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors">
              View all activity <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ROW 3: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Performance Overview (Area Chart) */}
        <div className="lg:col-span-3 bg-[#131825] border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-200">
              Performance Overview <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300">
              7 Days <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Custom Chart Legend */}
          <div className="flex gap-4 mb-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-1 rounded-full bg-pink-500"></span> Traffic</div>
            <div className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-1 rounded-full bg-blue-500"></span> Leads</div>
            <div className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-1 rounded-full bg-green-500"></span> Conversions</div>
            <div className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-1 rounded-full bg-orange-500"></span> Revenue</div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }} itemStyle={{ color: '#e2e8f0' }}/>
                <Area type="monotone" dataKey="Traffic" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorTraffic)" />
                <Area type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="Conversions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
                <Area type="monotone" dataKey="Revenue" stroke="#f97316" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Performance (Donut Chart) */}
        <div className="lg:col-span-2 bg-[#131825] border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-1 text-sm font-medium text-slate-200 mb-6">
            Channel Performance <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          
          <div className="flex-1 flex items-center justify-between relative">
            <div className="h-[200px] w-[200px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Text Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-lg font-semibold text-white">$42.8K</span>
              </div>
            </div>
            
            {/* Custom Legend */}
            <div className="flex-1 ml-6 flex flex-col gap-3">
              {[
                { name: 'Paid Search', amount: '$18.2K', pct: '42.5%', color: 'bg-purple-500' },
                { name: 'Organic Search', amount: '$12.6K', pct: '29.4%', color: 'bg-blue-500' },
                { name: 'Direct', amount: '$6.8K', pct: '15.9%', color: 'bg-green-500' },
                { name: 'Social Media', amount: '$3.2K', pct: '7.5%', color: 'bg-indigo-500' },
                { name: 'Email', amount: '$2.0K', pct: '4.7%', color: 'bg-orange-500' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800/30 p-1 rounded transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                    <span className="text-slate-300 group-hover:text-slate-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-slate-200">{item.amount}</span>
                    <span className="text-slate-500 w-10 text-right">{item.pct}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}