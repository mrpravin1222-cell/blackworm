import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BlackwormLogo } from './BlackwormLogo';
import { NavTab } from '../types';
import { isTabAllowedForUser } from '../utils/permissionHelpers';
import {
  LayoutDashboard,
  CalendarCheck2,
  Target,
  FileSpreadsheet,
  Users,
  UserCheck,
  Compass,
  BarChart3,
  Settings,
  Calculator,
  Gift,
  Languages,
  Receipt,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = React.memo(() => {
  const {
    language,
    setLanguage,
    activeTab,
    setActiveTab,
    dealerApplications,
    travelExpenses,
    currentUser,
    setCurrentUser,
    users,
    showNotification,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('user-management');
    showNotification(
      language === 'mr' ? 'यशस्वीरित्या लॉग आऊट झाले!' : 'Logged out successfully!',
      'info'
    );
  };

  // Counts for pending items
  const pendingDealersCount = dealerApplications.filter((d) => d.status === 'pending').length;
  const pendingExpensesCount = travelExpenses.filter((e) => e.status === 'pending').length;

  const navItems: { id: NavTab; labelMr: string; labelEn: string; icon: React.ComponentType<{ className?: string }>; badge?: number; hasUpdate?: boolean }[] = [
    { id: 'dashboard', labelMr: 'डॅशबोर्ड', labelEn: 'Dashboard', icon: LayoutDashboard },
    { id: 'target-sheet', labelMr: 'टार्गेट सीट', labelEn: 'Target Sheet', icon: Target, hasUpdate: true },
    { id: 'user-management', labelMr: 'युजर', labelEn: 'User', icon: UserCheck },
    { id: 'order-collection', labelMr: 'ऑर्डर आणि कलेक्शन', labelEn: 'Order & Collection', icon: Receipt, hasUpdate: true },
    { id: 'price-list', labelMr: 'प्राइस लिस्ट', labelEn: 'Price List', icon: FileSpreadsheet },
    { id: 'dealer-form', labelMr: 'डीलर', labelEn: 'Dealer', icon: Users, badge: pendingDealersCount, hasUpdate: true },
    { id: 'travel-expenses', labelMr: 'ट्रॅव्हल', labelEn: 'Travel', icon: Compass, badge: pendingExpensesCount, hasUpdate: true },
    { id: 'scheme', labelMr: 'स्कीम', labelEn: 'Scheme', icon: Gift },
    { id: 'reporting', labelMr: 'रिपोर्ट', labelEn: 'Report', icon: BarChart3, hasUpdate: true },
    { id: 'settings', labelMr: 'सेटिंग', labelEn: 'Setting', icon: Settings },
  ];

  const allowedNavItems = navItems.filter((item) => isTabAllowedForUser(item.id, currentUser));

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        {/* Top Bar: Logo | Company Name | Language Toggle Icon | 3-Line Menu */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
            {/* 1. Brand Logo */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center focus:outline-hidden hover:opacity-95 transition-opacity text-left cursor-pointer"
                id="header-brand-logo-btn"
                title="Blackworm Agritech"
              >
                <BlackwormLogo size="md" showTagline={false} />
              </button>
            </div>

            {/* 2. Company Name */}
            <div className="flex-1 min-w-0 text-center px-1">
              <h1 className="text-[11px] min-[360px]:text-xs sm:text-base md:text-lg lg:text-xl font-black text-red-600 tracking-tight uppercase leading-tight truncate">
                {language === 'mr' ? 'ब्लॅकवर्म ॲग्रिटेक प्रा. लि.' : 'BLACKWORM AGRITECH PVT LTD'}
              </h1>
            </div>

            {/* 3 & 4. Right Utility Icons: Language & Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                id="lang-toggle-btn"
                onClick={() => setLanguage(language === 'mr' ? 'en' : 'mr')}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 bg-slate-50/80"
                title={language === 'mr' ? 'Switch to English' : 'मराठीत बदला'}
                aria-label="Toggle Language"
              >
                <Languages className="w-5 h-5 text-red-600 shrink-0" />
              </button>

              <button
                type="button"
                id="menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 bg-slate-50/80 relative"
                aria-label="Toggle Navigation Menu"
                title={language === 'mr' ? 'मेन्यू' : 'Menu'}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-red-600" />
                ) : (
                  <>
                    <Menu className="w-5 h-5 text-slate-800" />
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 animate-pulse" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Nav Bar for Monitor / Desktop (Quick 1-Click Access across Desktop) */}
        <div className="hidden md:block bg-slate-50/90 border-t border-slate-200/80 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1.5 min-w-max">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`desktop-nav-${item.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'mr' ? item.labelMr : item.labelEn}</span>
                  {item.hasUpdate && !isActive && (
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse absolute -top-1 -right-0.5" />
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white shrink-0 ml-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Dropdown Drawer (Full menu for mobile & desktop drawer) */}
        {mobileMenuOpen && (
          <div className="bg-white border-t border-slate-200 p-4 shadow-xl space-y-2 animate-in slide-in-from-top duration-200 relative z-50">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                {language === 'mr' ? 'मेन्यू पर्याय (Navigation Menu)' : 'Navigation Menu'}
              </span>
              {currentUser && (
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  👤 {currentUser.name} ({currentUser.role})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`drawer-nav-${item.id}`}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-98 relative ${
                      isActive
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-800 border border-slate-200 bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{language === 'mr' ? item.labelMr : item.labelEn}</span>
                      {item.hasUpdate && !isActive && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shrink-0 ml-1">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout button in drawer */}
            {currentUser && (
              <div className="pt-3 mt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === 'mr' ? 'लॉग आऊट (Logout)' : 'Log Out'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Backdrop overlay for closing drawer when clicking outside */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
});
