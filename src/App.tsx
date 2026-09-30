import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TargetSheet } from './components/TargetSheet';
import { PriceList } from './components/PriceList';
import { DealerApplicationForm } from './components/DealerApplicationForm';
import { TravelingExpenses } from './components/TravelingExpenses';
import { Reporting } from './components/Reporting';
import { Settings } from './components/Settings';
import { OrderCalculatorBill } from './components/OrderCalculatorBill';
import { Scheme } from './components/Scheme';
import { UserManagement } from './components/UserManagement';
import { OrderCollection } from './components/OrderCollection';
import { DailyActivityLog } from './components/DailyActivityLog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { A4PrintPreviewModal } from './components/A4PrintPreviewModal';
import {
  LayoutDashboard,
  CalendarCheck2,
  Receipt,
  Target,
  Menu,
  ArrowUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, language } = useApp();

  const [printPreviewState, setPrintPreviewState] = useState<{
    isOpen: boolean;
    elementId: string;
    title: string;
    landscape: boolean;
    filename: string;
  }>({
    isOpen: false,
    elementId: '',
    title: '',
    landscape: false,
    filename: '',
  });

  React.useEffect(() => {
    const handleOpenPrintPreview = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.elementId) {
        setPrintPreviewState({
          isOpen: true,
          elementId: customEvent.detail.elementId,
          title: customEvent.detail.title || 'Blackworm Document',
          landscape: !!customEvent.detail.landscape,
          filename: customEvent.detail.filename || customEvent.detail.title || 'Document',
        });
      }
    };

    window.addEventListener('open-print-preview', handleOpenPrintPreview);
    return () => {
      window.removeEventListener('open-print-preview', handleOpenPrintPreview);
    };
  }, []);

  // Ensure PDF download is always a direct file download without opening mobile share sheet
  React.useEffect(() => {
    try {
      if (typeof navigator !== 'undefined') {
        Object.defineProperty(navigator, 'canShare', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        (navigator as any).share = undefined;
      }
    } catch (_) {}
  }, []);

  // Synchronize input, textarea, and select DOM attributes for high-fidelity print & PDF capture
  React.useEffect(() => {
    const syncInputValues = () => {
      document.querySelectorAll('input, textarea, select').forEach((node) => {
        const inputEl = node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (inputEl.tagName === 'INPUT') {
          const type = (inputEl as HTMLInputElement).type;
          if (type === 'checkbox' || type === 'radio') {
            if ((inputEl as HTMLInputElement).checked) {
              inputEl.setAttribute('checked', 'checked');
            } else {
              inputEl.removeAttribute('checked');
            }
          } else {
            inputEl.setAttribute('value', inputEl.value || '');
          }
        } else if (inputEl.tagName === 'TEXTAREA') {
          inputEl.textContent = inputEl.value || '';
        } else if (inputEl.tagName === 'SELECT') {
          const selNode = inputEl as HTMLSelectElement;
          Array.from(selNode.options).forEach((opt) => {
            if (opt.selected) opt.setAttribute('selected', 'selected');
            else opt.removeAttribute('selected');
          });
        }
      });
    };

    window.addEventListener('beforeprint', syncInputValues);
    window.addEventListener('input', syncInputValues);
    return () => {
      window.removeEventListener('beforeprint', syncInputValues);
      window.removeEventListener('input', syncInputValues);
    };
  }, []);

  // STRICT AUTH GUARD: Without a valid logged-in user, render ONLY the login page
  const [showBackToTop, setShowBackToTop] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentUser) {
    return (
      <div className="bg-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-red-500 selection:text-white">
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-red-600 tracking-tight uppercase">
            Blackworm Agritech Pvt Ltd
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Authorized Login System
          </p>
        </div>
        <div className="w-full max-w-md">
          <ErrorBoundary>
            <UserManagement />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'order-calculator':
        return <OrderCalculatorBill />;
      case 'target-sheet':
        return <TargetSheet />;
      case 'price-list':
        return <PriceList />;
      case 'dealer-form':
        return <DealerApplicationForm />;
      case 'travel-expenses':
        return <TravelingExpenses />;
      case 'scheme':
        return <Scheme />;
      case 'reporting':
        return <Reporting />;
      case 'settings':
        return <Settings />;
      case 'user-management':
        return <UserManagement />;
      case 'order-collection':
        return <OrderCollection />;
      default:
        return <Dashboard />;
    }
  };

  const mobileBottomNavItems = [
    { id: 'dashboard' as const, labelMr: 'डॅशबोर्ड', labelEn: 'Dashboard', icon: LayoutDashboard },
    { id: 'order-collection' as const, labelMr: 'ऑर्डर व वसुली', labelEn: 'Orders', icon: Receipt },
    { id: 'target-sheet' as const, labelMr: 'टार्गेट', labelEn: 'Targets', icon: Target },
    { id: 'settings' as const, labelMr: 'सेटिंग', labelEn: 'Settings', icon: Menu },
  ];

  return (
    <div className="bg-slate-50 flex flex-col selection:bg-red-500 selection:text-white font-sans text-slate-800 pb-32 md:pb-8">
      {/* Top Main Navigation Header */}
      <Header />

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ErrorBoundary key={activeTab} onReset={() => setActiveTab('dashboard')}>
          {renderTabContent()}
        </ErrorBoundary>
      </main>

      {/* Mobile-First WhatsApp-style Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-app-bar"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg md:hidden"
      >
        <div className="grid grid-cols-4 h-14">
          {mobileBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`mobile-bot-nav-${item.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 text-center transition-colors cursor-pointer active:scale-95 ${
                  isActive ? 'text-red-600 font-black' : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-red-50 text-red-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] leading-tight truncate px-0.5 max-w-[64px]">
                  {item.labelMr}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50 p-4 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition-colors cursor-pointer group active:scale-95"
            aria-label="Back to Top"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Global High-Fidelity A4 Print Preview Modal */}
      {printPreviewState.isOpen && (
        <A4PrintPreviewModal
          isOpen={printPreviewState.isOpen}
          onClose={() => setPrintPreviewState((prev) => ({ ...prev, isOpen: false }))}
          elementId={printPreviewState.elementId}
          title={printPreviewState.title}
          defaultLandscape={printPreviewState.landscape}
          filename={printPreviewState.filename}
          language={language}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
