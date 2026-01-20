import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
        LayoutDashboard,
        Users,
        FileText,
        Building2,
        Calculator,
        MessageSquare,
        Settings,
        Bell,
        Menu,
        X,
        ChevronDown,
        ChevronRight,
        LogOut,
        User,
        Briefcase,
        FolderOpen,
        ClipboardList,
        TrendingUp,
        PanelLeftClose,
        PanelLeft,
        Bot,
        FileOutput,
        Scale,
        Search,
        Plus,
        Building,
        Mail,
        Rocket,
        Sparkles,
        Zap,
        CheckCircle,
        Globe,
} from 'lucide-react';

const scrollbarStyles = `
  .sidebar-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background-color: #475569;
    border-radius: 3px;
  }
  .sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #64748b;
  }
`;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    tools: true,
    admin: true,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (href) => {
    const pageName = href.replace('/', '');
    return currentPageName === pageName || location.pathname === href;
  };

  const mainNav = [
    { name: 'Dashboard', href: '/Dashboard', icon: LayoutDashboard },
    { name: 'Pipeline', href: '/Pipeline', icon: TrendingUp },
    { name: 'Leads', href: '/Leads', icon: Users },
    { name: 'Loans', href: '/Loans', icon: Briefcase },
    { name: 'Contacts', href: '/Contacts', icon: Users },
  ];

  const toolsNav = [
      { name: 'Quote Generator', href: '/QuoteGenerator', icon: FileOutput },
      { name: 'AI Hub', href: '/AIAssistant', icon: Bot },
      { name: 'Communications', href: '/Communications', icon: Mail },
      { name: 'Email Sequences', href: '/EmailSequences', icon: Zap },
      { name: 'Reports', href: '/Reports', icon: FileText },
    ];

  // Internal/testing pages only shown in dev mode
  const showInternalPages = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.search.includes('internal=true') ||
     import.meta.env?.VITE_ENABLE_INTERNAL_PAGES === 'true');

  const adminNav = [
    { name: 'Users & Permissions', href: '/Users', icon: Users },
    { name: 'Lender Partners', href: '/LenderIntegrations', icon: Building },
    { name: 'Borrower Portal', href: '/PortalSettings', icon: Globe },
    { name: 'System Health', href: '/SystemHealth', icon: Zap },
    ...(showInternalPages ? [
      { name: 'Smoke Tests', href: '/SmokeTests', icon: Rocket },
      { name: 'Testing Hub', href: '/TestingHub', icon: Sparkles },
      { name: 'QA Audit', href: '/QAAudit', icon: Search },
    ] : []),
    { name: 'Underwriting', href: '/Underwriting', icon: Scale },
    { name: 'Compliance', href: '/ComplianceDashboard', icon: CheckCircle },
    { name: 'MISMO Profiles', href: '/MISMOExportProfiles', icon: FileOutput },
    { name: 'MISMO Import/Export', href: '/MISMOImportExport', icon: FileText },
    { name: 'Integrations', href: '/AdminIntegrations', icon: Zap },
    { name: 'Settings', href: '/Settings', icon: Settings },
  ];

  const NavItem = ({ item, collapsed = false }) => {
    const active = isActive(item.href);
    
    const content = (
      <Link
        to={createPageUrl(item.href.replace('/', ''))}
        className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          active
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
        {!collapsed && (
          <span className="font-medium text-sm">{item.name}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  const SectionHeader = ({ title, expanded, onToggle, collapsed }) => {
    if (collapsed) return null;
    
    return (
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
    );
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <style>{scrollbarStyles}</style>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-800 border-r border-slate-700 z-40 transition-all duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarOpen ? 'w-60' : 'w-20'}`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-slate-700 ${isSidebarOpen ? 'px-4' : 'justify-center'}`}>
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">LoanGenius</span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 sidebar-scroll">
          {/* Main Section */}
          <div className="space-y-1">
            <SectionHeader
              title="MAIN"
              expanded={expandedSections.main}
              onToggle={() => toggleSection('main')}
              collapsed={!isSidebarOpen}
            />
            {(expandedSections.main || !isSidebarOpen) && mainNav.map((item) => (
              <NavItem key={item.name} item={item} collapsed={!isSidebarOpen} />
            ))}
          </div>

          {/* Tools Section */}
          <div className="space-y-1 pt-4">
            <SectionHeader
              title="TOOLS"
              expanded={expandedSections.tools}
              onToggle={() => toggleSection('tools')}
              collapsed={!isSidebarOpen}
            />
            {(expandedSections.tools || !isSidebarOpen) && toolsNav.map((item) => (
              <NavItem key={item.name} item={item} collapsed={!isSidebarOpen} />
            ))}
          </div>

          {/* Admin Section */}
          <div className="space-y-1 pt-4">
            <SectionHeader
              title="ADMIN"
              expanded={expandedSections.admin}
              onToggle={() => toggleSection('admin')}
              collapsed={!isSidebarOpen}
            />
            {(expandedSections.admin || !isSidebarOpen) && adminNav.map((item) => (
              <NavItem key={item.name} item={item} collapsed={!isSidebarOpen} />
            ))}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors"
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span className="text-sm">Collapse</span>
              </>
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <header
        className={`fixed top-0 right-0 h-16 bg-slate-800 border-b border-slate-700 z-30 transition-all duration-300 hidden lg:flex items-center justify-between px-6 ${
          isSidebarOpen ? 'left-60' : 'left-20'
        }`}
      >
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals, borrowers, documents..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link 
            to={createPageUrl('BusinessPurposeApplication')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Business Purpose App
          </Link>
          
          <Link 
            to={createPageUrl('LoanApplicationWizard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Quick Application
          </Link>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-slate-800 border-slate-700">
              <div className="p-3 font-medium text-white border-b border-slate-700">Notifications</div>
              <DropdownMenuItem className="p-3 hover:bg-slate-700 cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-white">New document uploaded</span>
                  <span className="text-xs text-slate-400">Deal #DL-2024-001 • 5 minutes ago</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 hover:bg-slate-700 cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-white">Task assigned to you</span>
                  <span className="text-xs text-slate-400">Review appraisal • 1 hour ago</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
              <div className="p-3 border-b border-slate-700">
                <p className="font-medium text-white">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('Settings')} className="flex items-center text-white cursor-pointer hover:bg-slate-700 px-2 py-1.5 rounded">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-slate-700 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-800 border-b border-slate-700 z-20 flex items-center justify-between px-16">
        <span className="font-bold text-white">LoanGenius</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 pt-16 min-h-screen flex-1 pb-20 md:pb-0 ${
          isSidebarOpen ? 'lg:pl-60' : 'lg:pl-20'
        }`}
      >
        <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Toast Notifications */}
      <Toaster />
      </div>
      );
      }