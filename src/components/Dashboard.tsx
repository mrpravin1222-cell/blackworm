import React from 'react';
import { useApp } from '../context/AppContext';
import { NavTab } from '../types';
import { isTabAllowedForUser } from '../utils/permissionHelpers';
import {
  Target,
  UserCheck,
  Receipt,
  Calculator,
  FileSpreadsheet,
  Users,
  Compass,
  Gift,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    currentUser,
    setActiveTab, 
    language, 
    dealerApplications, 
    travelExpenses, 
    setCurrentUser, 
    showNotification 
  } = useApp();

  // Pending counts
  const pendingDealersCount = dealerApplications.filter((d) => d.status === 'pending').length;
  const pendingExpensesCount = travelExpenses.filter((e) => e.status === 'pending').length;

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('user-management');
    showNotification(
      language === 'mr' ? 'यशस्वीरित्या लॉग आऊट झाले!' : 'Logged out successfully!',
      'info'
    );
  };

  // All menu options in a clean grid layout
  const dashboardIcons: {
    id: NavTab | 'logout';
    titleMr: string;
    titleEn: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    badge?: number;
  }[] = [
    {
      id: 'target-sheet',
      titleMr: 'टार्गेट सीट',
      titleEn: 'Target Sheet',
      icon: Target,
      iconBg: 'bg-blue-100 text-blue-600 hover:bg-blue-200/80',
    },
    {
      id: 'user-management',
      titleMr: 'युजर',
      titleEn: 'User',
      icon: UserCheck,
      iconBg: 'bg-teal-100 text-teal-700 hover:bg-teal-200/80',
    },
    {
      id: 'order-collection',
      titleMr: 'ऑर्डर व कलेक्शन',
      titleEn: 'Order & Collection',
      icon: Receipt,
      iconBg: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200/80',
    },
    {
      id: 'order-calculator',
      titleMr: 'ऑर्डर कॅल्क्युलेटर',
      titleEn: 'Order Calculator',
      icon: Calculator,
      iconBg: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200/80',
    },
    {
      id: 'price-list',
      titleMr: 'प्राइस लिस्ट',
      titleEn: 'Price List',
      icon: FileSpreadsheet,
      iconBg: 'bg-sky-100 text-sky-600 hover:bg-sky-200/80',
    },
    {
      id: 'dealer-form',
      titleMr: 'डीलर',
      titleEn: 'Dealer',
      icon: Users,
      iconBg: 'bg-rose-100 text-rose-600 hover:bg-rose-200/80',
      badge: pendingDealersCount,
    },
    {
      id: 'travel-expenses',
      titleMr: 'ट्रॅव्हल',
      titleEn: 'Travel',
      icon: Compass,
      iconBg: 'bg-amber-100 text-amber-600 hover:bg-amber-200/80',
      badge: pendingExpensesCount,
    },
    {
      id: 'scheme',
      titleMr: 'स्कीम',
      titleEn: 'Scheme',
      icon: Gift,
      iconBg: 'bg-purple-100 text-purple-600 hover:bg-purple-200/80',
    },
    {
      id: 'reporting',
      titleMr: 'रिपोर्ट',
      titleEn: 'Report',
      icon: BarChart3,
      iconBg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200/80',
    },
    {
      id: 'settings',
      titleMr: 'सेटिंग',
      titleEn: 'Setting',
      icon: Settings,
      iconBg: 'bg-slate-100 text-slate-700 hover:bg-slate-200/80',
    },
    {
      id: 'logout',
      titleMr: 'लॉग आऊट',
      titleEn: 'Logout',
      icon: LogOut,
      iconBg: 'bg-red-100 text-red-600 hover:bg-red-200/80',
    },
  ];

  const visibleIcons = dashboardIcons.filter((item) => {
    if (item.id === 'logout') return true;
    return isTabAllowedForUser(item.id as NavTab, currentUser);
  });

  return (
    <div className="py-4 sm:py-6 animate-in fade-in duration-200">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 space-y-4">
        {/* Logged in User Profile (Single Clean Line: Icon + Name + Small Designation) */}
        {currentUser && (
          <div className="flex items-center justify-center text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs whitespace-nowrap">
              <span className="text-xs sm:text-sm shrink-0">👤</span>
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {currentUser.fullName || currentUser.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                ({currentUser.designation || currentUser.role || 'Sales Officer'})
              </span>
            </div>
          </div>
        )}

        {/* All icons in a clean grid layout */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-y-7 sm:gap-y-9 gap-x-2 sm:gap-x-6 justify-items-center pt-2">
          {visibleIcons.map((item) => {
            const Icon = item.icon;
            const title = language === 'mr' ? item.titleMr : item.titleEn;

            return (
              <button
                key={item.id}
                id={`dash-icon-${item.id}`}
                onClick={() => {
                  if (item.id === 'logout') {
                    handleLogout();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className="group flex flex-col items-center text-center cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 w-full max-w-[105px] sm:max-w-[125px]"
              >
                {/* Single app icon box with notification badge support */}
                <div
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-2xs group-hover:shadow-xs ${item.iconBg}`}
                >
                  <Icon className="w-7 h-7 sm:w-8 sm:h-8 transition-transform" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-xs border-2 border-white animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <span className="font-semibold text-slate-800 text-[11px] sm:text-xs text-center mt-2 leading-tight group-hover:text-slate-950 transition-colors whitespace-nowrap">
                  {title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

