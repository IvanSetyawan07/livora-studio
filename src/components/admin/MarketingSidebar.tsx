import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Sparkles, Bot, Briefcase, 
  ShieldCheck, Server, ChevronDown, ChevronRight,
  ListTodo, PlaySquare, CheckSquare, Activity,
  Target, BarChart3, Users, Settings, Database
} from 'lucide-react';

interface NavGroupProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const NavGroup = ({ title, icon: Icon, children, defaultOpen = false }: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-slate-400" />
          {title}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="ml-9 mt-1 space-y-1 flex flex-col border-l border-slate-800 pl-2">
          {children}
        </div>
      )}
    </div>
  );
};

const NavItem = ({ to, children }: { to: string, children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <NavLink 
      to={to}
      className={`text-sm py-1.5 px-3 rounded-md transition-colors ${
        isActive ? 'bg-purple-500/10 text-purple-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      {children}
    </NavLink>
  );
};

export default function MarketingSidebar() {
  return (
    <div className="w-64 min-h-screen bg-[#0B0F19] border-r border-slate-800 flex flex-col">
      <div className="p-6">
        <h2 className="text-lg font-bold text-white tracking-wide">LIVORA</h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Marketing OS</p>
      </div>

      <div className="flex-1 px-4 overflow-y-auto space-y-2">
        <NavLink 
          to="/admin/ai-marketing/overview"
          className={({ isActive }) => `flex items-center gap-3 p-2 rounded-lg text-sm font-medium transition-colors mb-4 ${
            isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview
        </NavLink>

        <NavGroup title="AI Center" icon={Sparkles} defaultOpen={true}>
          <NavItem to="/admin/ai-marketing/recommendations">Recommendations</NavItem>
          <NavItem to="/admin/ai-marketing/actions">Actions Hub</NavItem>
        </NavGroup>

        <NavGroup title="Agents" icon={Bot}>
          <NavItem to="/admin/ai-marketing/seo">SEO Agent</NavItem>
          <NavItem to="/admin/ai-marketing/content">Content Agent</NavItem>
          <NavItem to="/admin/ai-marketing/ads">Ads Agent</NavItem>
          <NavItem to="/admin/ai-marketing/leads">Lead Intelligence</NavItem>
          <NavItem to="/admin/ai-marketing/cro">CRO Agent</NavItem>
        </NavGroup>

        <NavGroup title="Workspace" icon={Briefcase}>
          <NavItem to="/admin/ai-marketing/campaigns">Campaigns</NavItem>
          <NavItem to="/admin/ai-marketing/impact">Impact Tracking</NavItem>
        </NavGroup>

        <NavGroup title="Governance" icon={ShieldCheck}>
          <NavItem to="/admin/ai-marketing/approvals">Approvals</NavItem>
          <NavItem to="/admin/ai-marketing/activity">Activity Log</NavItem>
        </NavGroup>

        <NavGroup title="AI System" icon={Server}>
          <NavItem to="/admin/ai-marketing/usage">Usage & Cost</NavItem>
          <NavItem to="/admin/ai-marketing/routing">Providers & Routing</NavItem>
          <NavItem to="/admin/ai-marketing/settings">Settings</NavItem>
        </NavGroup>
      </div>
    </div>
  );
}