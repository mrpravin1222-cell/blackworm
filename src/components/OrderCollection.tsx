import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  DealerOrderBill,
  DealerOrderBillItem,
  DealerCollectionRecord,
  DealerApplication,
  PriceListItem,
} from '../types';
import { DEFAULT_MONTH_NAMES } from '../utils/targetHelpers';
import { exportElementToPDF, exportElementToPrintOrPDF, triggerPrint } from '../utils/printHelpers';
import { BlackwormLogo } from './BlackwormLogo';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import {
  Receipt,
  ShoppingBag,
  Plus,
  Trash2,
  Printer,
  FileDown,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  Building2,
  Calendar,
  IndianRupee,
  User,
  Phone,
  MapPin,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles,
  Percent,
} from 'lucide-react';

export const OrderCollection: React.FC = () => {
  const {
    language,
    currentUser,
    companyDetails,
    dealerApplications,
    priceList,
    dealerOrders,
    dealerCollections,
    addDealerOrder,
    updateDealerOrder,
    deleteDealerOrder,
    addDealerCollection,
    updateDealerCollection,
    deleteDealerCollection,
    targets,
  } = useApp();

  // Check if current user is admin
  const isAdmin = currentUser ? (
    currentUser.role === 'admin' || 
    (currentUser.name || currentUser.fullName || '').toLowerCase().includes('pravin') || 
    (currentUser.name || currentUser.fullName || '').toLowerCase().includes('shinde') || 
    currentUser.id === 'USR-001'
  ) : false;

  // Visible orders based on officer role
  const visibleOrders = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return dealerOrders;
    const currentName = (currentUser.fullName || currentUser.name || '').toLowerCase();
    return dealerOrders.filter((o) => {
      const officer = (o.officerName || '').toLowerCase();
      return !officer || officer.includes(currentName) || currentName.includes(officer);
    });
  }, [isAdmin, dealerOrders, currentUser]);

  // Visible collections based on officer role
  const visibleCollections = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return dealerCollections;
    const currentName = (currentUser.fullName || currentUser.name || '').toLowerCase();
    return dealerCollections.filter((c) => {
      const officer = (c.officerName || '').toLowerCase();
      return !officer || officer.includes(currentName) || currentName.includes(officer);
    });
  }, [isAdmin, dealerCollections, currentUser]);

  // Active Approved or Registered Dealers
  const activeDealers: DealerApplication[] = useMemo(() => {
    return dealerApplications.filter(
      (d) => d.status === 'approved' || d.status === 'pending' || d.status === 'under_review' || !d.status
    );
  }, [dealerApplications]);

  // UI State: Sub-Tab Selection
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'collections' | 'ledger'>('orders');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [activePrintBill, setActivePrintBill] = useState<DealerOrderBill | null>(null);
  const [activePrintReceipt, setActivePrintReceipt] = useState<DealerCollectionRecord | null>(null);
  const [isLedgerPreviewOpen, setIsLedgerPreviewOpen] = useState(false);

  // Helper to extract Marathi / English month name from date string (YYYY-MM-DD)
  const getMonthNameFromDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'April';
      const mIdx = d.getMonth(); // 0-based: Jan=0, Feb=1, Mar=2, Apr=3...
      const mapping = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return mapping[mIdx] || 'April';
    } catch {
      return 'April';
    }
  };

  // Helper to calculate total bill, total collection and live outstanding for any dealer
  const getDealerBalance = (dealerId: string) => {
    const orders = visibleOrders.filter((o) => o.dealerId === dealerId && o.status !== 'cancelled');
    const collections = visibleCollections.filter((c) => c.dealerId === dealerId);

    const totalOrders = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCollections = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const currentOutstanding = Math.max(0, totalOrders - totalCollections);

    return {
      totalOrders,
      totalCollections,
      currentOutstanding,
      orderCount: orders.length,
      collectionCount: collections.length,
    };
  };

  // Overall Financial Totals
  const overallStats = useMemo(() => {
    const totalSales = visibleOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const totalCollected = visibleCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalOutstanding = Math.max(0, totalSales - totalCollected);

    return {
      totalSales,
      totalCollected,
      totalOutstanding,
      totalOrders: visibleOrders.length,
      totalCollections: visibleCollections.length,
    };
  }, [visibleOrders, visibleCollections]);

  // Selected Dealer Object
  const selectedDealerObj = useMemo(() => {
    return activeDealers.find((d) => d.id === selectedDealerId);
  }, [activeDealers, selectedDealerId]);

  const singleDealerBalance = useMemo(() => {
    if (!selectedDealerId) return null;
    return getDealerBalance(selectedDealerId);
  }, [selectedDealerId, visibleOrders, visibleCollections]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return visibleOrders.filter((o) => {
      if (selectedDealerId && o.dealerId !== selectedDealerId) return false;
      if (selectedMonthFilter !== 'all') {
        const m = getMonthNameFromDate(o.billDate);
        if (m !== selectedMonthFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = o.billNumber.toLowerCase().includes(q);
        const matchName = o.dealerName.toLowerCase().includes(q);
        const matchCode = (o.dealerCode || '').toLowerCase().includes(q);
        return matchNo || matchName || matchCode;
      }
      return true;
    });
  }, [visibleOrders, selectedDealerId, selectedMonthFilter, searchQuery]);

  // Filtered Collections
  const filteredCollections = useMemo(() => {
    return visibleCollections.filter((c) => {
      if (selectedDealerId && c.dealerId !== selectedDealerId) return false;
      if (selectedMonthFilter !== 'all' && c.targetMonth !== selectedMonthFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchReceipt = c.receiptNo.toLowerCase().includes(q);
        const matchName = c.dealerName.toLowerCase().includes(q);
        const matchRef = (c.referenceNo || '').toLowerCase().includes(q);
        return matchReceipt || matchName || matchRef;
      }
      return true;
    });
  }, [visibleCollections, selectedDealerId, selectedMonthFilter, searchQuery]);

  // Dealer Ledger Entries (Chronological sort of bills and receipts)
  const ledgerEntries = useMemo(() => {
    if (!selectedDealerId) return [];

    const orders = visibleOrders
      .filter((o) => o.dealerId === selectedDealerId && o.status !== 'cancelled')
      .map((o) => ({
        id: o.id,
        date: o.billDate,
        type: 'INVOICE' as const,
        refNo: o.billNumber,
        particulars: `Sales Order Tax Invoice (${o.items.length} items)`,
        debit: o.totalAmount,
        credit: 0,
        rawObj: o,
      }));

    const collections = visibleCollections
      .filter((c) => c.dealerId === selectedDealerId)
      .map((c) => ({
        id: c.id,
        date: c.collectionDate,
        type: 'COLLECTION' as const,
        refNo: c.receiptNo || c.referenceNo || 'RECEIPT',
        particulars: `Payment Received via ${c.paymentMode.toUpperCase()} (${c.targetMonth})`,
        debit: 0,
        credit: c.amount,
        rawObj: c,
      }));

    const combined = [...orders, ...collections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    return combined.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });
  }, [selectedDealerId, visibleOrders, visibleCollections]);

  // ==========================================
  // NEW ORDER BILL FORM STATE
  // ==========================================
  const [orderFormDealerId, setOrderFormDealerId] = useState(activeDealers[0]?.id || '');
  const [orderFormBillDate, setOrderFormBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [orderFormBillNo, setOrderFormBillNo] = useState(() => 'BW-INV-' + Math.floor(1000 + Math.random() * 9000));
  const [orderFormNotes, setOrderFormNotes] = useState('');
  const [orderFormDiscount, setOrderFormDiscount] = useState(0);
  const [orderFormGstPercent, setOrderFormGstPercent] = useState(18);

  const getInitialProduct = () => {
    const p = priceList[0];
    const pName = p ? (language === 'mr' ? p.nameMr : p.nameEn) || p.nameMr || p.nameEn : 'Blackworm Gold Liquid';
    const pRate = p?.dealerPrice || 600;
    return {
      id: 'item-1',
      productId: p?.id || 'p1',
      productName: pName,
      packing: p?.packing || '1 Liter',
      quantity: 10,
      rate: pRate,
      gstRate: p?.gstRate || 18,
      total: pRate * 10,
    };
  };

  const [orderItems, setOrderItems] = useState<DealerOrderBillItem[]>([getInitialProduct()]);

  const handleOpenNewOrder = (preselectDealerId?: string) => {
    const targetDealerId = preselectDealerId || selectedDealerId || activeDealers[0]?.id || '';
    setOrderFormDealerId(targetDealerId);
    setOrderFormBillDate(new Date().toISOString().split('T')[0]);
    setOrderFormBillNo('BW-INV-' + Math.floor(1000 + Math.random() * 9000));
    setOrderFormDiscount(0);
    setOrderFormNotes('');
    if (priceList.length > 0) {
      const p = priceList[0];
      const pName = (language === 'mr' ? p.nameMr : p.nameEn) || p.nameMr || p.nameEn;
      setOrderItems([
        {
          id: 'item-' + Date.now(),
          productId: p.id,
          productName: pName,
          packing: p.packing,
          quantity: 20,
          rate: p.dealerPrice,
          gstRate: p.gstRate || 18,
          total: p.dealerPrice * 20,
        },
      ]);
    }
    setIsOrderModalOpen(true);
  };

  const handleAddOrderItem = () => {
    const defaultProd = priceList[0];
    if (!defaultProd) return;
    const pName = (language === 'mr' ? defaultProd.nameMr : defaultProd.nameEn) || defaultProd.nameMr || defaultProd.nameEn;
    setOrderItems((prev) => [
      ...prev,
      {
        id: 'item-' + Date.now() + Math.random().toString().slice(-3),
        productId: defaultProd.id,
        productName: pName,
        packing: defaultProd.packing,
        quantity: 10,
        rate: defaultProd.dealerPrice,
        gstRate: defaultProd.gstRate || 18,
        total: defaultProd.dealerPrice * 10,
      },
    ]);
  };

  const handleRemoveOrderItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleOrderItemChange = (
    itemId: string,
    field: 'productId' | 'quantity' | 'rate',
    val: string | number
  ) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (field === 'productId') {
          const matched = priceList.find((p) => p.id === val);
          if (matched) {
            const pName = (language === 'mr' ? matched.nameMr : matched.nameEn) || matched.nameMr || matched.nameEn;
            return {
              ...item,
              productId: matched.id,
              productName: pName,
              packing: matched.packing,
              rate: matched.dealerPrice,
              gstRate: matched.gstRate || 18,
              total: matched.dealerPrice * item.quantity,
            };
          }
        } else if (field === 'quantity') {
          const qty = Math.max(1, Number(val) || 0);
          return {
            ...item,
            quantity: qty,
            total: qty * item.rate,
          };
        } else if (field === 'rate') {
          const rate = Math.max(0, Number(val) || 0);
          return {
            ...item,
            rate: rate,
            total: item.quantity * rate,
          };
        }
        return item;
      })
    );
  };

  const orderFormSubtotal = useMemo(() => {
    return orderItems.reduce((s, it) => s + (it.total || 0), 0);
  }, [orderItems]);

  const orderFormGstAmount = useMemo(() => {
    const discounted = Math.max(0, orderFormSubtotal - orderFormDiscount);
    return Number(((discounted * orderFormGstPercent) / 100).toFixed(2));
  }, [orderFormSubtotal, orderFormDiscount, orderFormGstPercent]);

  const orderFormGrandTotal = useMemo(() => {
    const discounted = Math.max(0, orderFormSubtotal - orderFormDiscount);
    return Math.round(discounted + orderFormGstAmount);
  }, [orderFormSubtotal, orderFormDiscount, orderFormGstAmount]);

  const handleSaveOrderBill = (e: React.FormEvent) => {
    e.preventDefault();
    const dealer = activeDealers.find((d) => d.id === orderFormDealerId);
    if (!dealer) return;

    const newBill = addDealerOrder({
      billNumber: orderFormBillNo,
      dealerId: dealer.id,
      dealerName: dealer.firmName || dealer.proprietorName,
      dealerCode: dealer.dealerCode || 'BW-DLR',
      proprietorName: dealer.proprietorName,
      mobile: dealer.mobile,
      territory: dealer.taluka ? `${dealer.taluka}, ${dealer.district}` : dealer.district,
      officerName: currentUser?.name || 'Sales Officer',
      billDate: orderFormBillDate,
      items: orderItems,
      subtotal: orderFormSubtotal,
      discountPercent: orderFormSubtotal > 0 ? Number(((orderFormDiscount / orderFormSubtotal) * 100).toFixed(1)) : 0,
      discountAmount: orderFormDiscount,
      taxableAmount: Math.max(0, orderFormSubtotal - orderFormDiscount),
      gstAmount: orderFormGstAmount,
      totalAmount: orderFormGrandTotal,
      status: 'confirmed',
      notes: orderFormNotes,
    });

    setIsOrderModalOpen(false);
    setSelectedDealerId(dealer.id);
    setActivePrintBill(newBill);
  };

  // ==========================================
  // NEW COLLECTION FORM STATE
  // ==========================================
  const [colFormDealerId, setColFormDealerId] = useState(activeDealers[0]?.id || '');
  const [colFormDate, setColFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [colFormAmount, setColFormAmount] = useState<number>(50000);
  const [colFormMode, setColFormMode] = useState<DealerCollectionRecord['paymentMode']>('rtgs_neft');
  const [colFormRefNo, setColFormRefNo] = useState('');
  const [colFormBank, setColFormBank] = useState('HDFC Bank');
  const [colFormRemarks, setColFormRemarks] = useState('');
  const [colFormTargetMonth, setColFormTargetMonth] = useState<string>('auto');

  const detectedTargetMonth = useMemo(() => {
    if (colFormTargetMonth !== 'auto') return colFormTargetMonth;
    return getMonthNameFromDate(colFormDate);
  }, [colFormDate, colFormTargetMonth]);

  const handleOpenNewCollection = (preselectDealerId?: string) => {
    const targetDealerId = preselectDealerId || selectedDealerId || activeDealers[0]?.id || '';
    setColFormDealerId(targetDealerId);
    setColFormDate(new Date().toISOString().split('T')[0]);
    setColFormAmount(50000);
    setColFormTargetMonth('auto');
    setColFormMode('rtgs_neft');
    setColFormRefNo('UTR-' + Math.floor(100000 + Math.random() * 900000));
    setColFormRemarks('');
    setIsCollectionModalOpen(true);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    const dealer = activeDealers.find((d) => d.id === colFormDealerId);
    if (!dealer) return;

    const receiptNumber = 'BW-RCT-' + Math.floor(10000 + Math.random() * 90000);
    const finalTargetMonth = colFormTargetMonth === 'auto' ? getMonthNameFromDate(colFormDate) : colFormTargetMonth;

    const newCol = addDealerCollection({
      receiptNo: receiptNumber,
      dealerId: dealer.id,
      dealerName: dealer.firmName || dealer.proprietorName,
      dealerCode: dealer.dealerCode || 'BW-DLR',
      territory: dealer.taluka ? `${dealer.taluka}, ${dealer.district}` : dealer.district,
      amount: Number(colFormAmount) || 0,
      collectionDate: colFormDate,
      targetMonth: finalTargetMonth,
      paymentMode: colFormMode,
      referenceNo: colFormRefNo,
      bankName: colFormBank,
      officerName: currentUser?.name || 'Pravin Waghmare',
      remarks: colFormRemarks,
    });

    setIsCollectionModalOpen(false);
    setSelectedDealerId(dealer.id);
    setActivePrintReceipt(newCol);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'ऑर्डर आणि कलेक्शन पोर्टल' : 'Order & Collection Portal'}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-xs border border-red-200">
                {language === 'mr' ? 'लाईव्ह आऊटस्टँडिंग व टार्गेट सिंक' : 'Live Sync'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'mr'
                ? 'डीलर ऑर्डर बिलिंग, करंट आऊटस्टँडिंग ट्रॅकिंग आणि टार्गेट सीटमध्ये ऑटो-कलेक्शन सिंक'
                : 'Dealer billing, live outstanding management, and automatic Target Sheet collection synchronization'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="new-order-bill-btn"
            onClick={() => handleOpenNewOrder()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'mr' ? '+ नवीन ऑर्डर बिल' : '+ New Order Bill'}</span>
          </button>

          <button
            id="new-collection-receipt-btn"
            onClick={() => handleOpenNewCollection()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <IndianRupee className="w-4 h-4" />
            <span>{language === 'mr' ? '+ वसुली जमा करा' : '+ Record Collection'}</span>
          </button>
        </div>
      </div>

      {/* 3 Executive Summary Stat Cards */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'mr' ? 'एकूण विक्री बिले (Total Billed)' : 'Total Billed Sales'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              ₹{overallStats.totalSales.toLocaleString()}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              ({(overallStats.totalSales / 100000).toFixed(2)} Lac)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-semibold">
            {overallStats.totalOrders} {language === 'mr' ? 'बिले जारी केली' : 'invoices issued'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              {language === 'mr' ? 'एकूण प्रत्यक्ष वसुली (Actual Collected)' : 'Total Actual Collected'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-700">
              ₹{overallStats.totalCollected.toLocaleString()}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600">
              ({(overallStats.totalCollected / 100000).toFixed(2)} Lac)
            </span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'टार्गेट सीटमध्ये ऑटो-सिंक आहे' : 'Synced to Target Sheet'}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-2xs bg-linear-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {language === 'mr' ? 'एकूण करंट आऊटस्टँडिंग (Outstanding)' : 'Current Total Outstanding'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold font-mono">
              ₹
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-red-700">
              ₹{overallStats.totalOutstanding.toLocaleString()}
            </span>
            <span className="text-xs font-mono font-bold text-amber-800">
              ({(overallStats.totalOutstanding / 100000).toFixed(2)} Lac)
            </span>
          </div>
          <div className="text-[11px] text-amber-800 mt-1 font-semibold">
            {activeDealers.length} {language === 'mr' ? 'डीलर्सचे खाते' : 'dealers active'}
          </div>
        </div>
      </div>

      {/* Filter and Dealer Outstanding Spotlight Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Dealer Selector */}
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {language === 'mr' ? 'डीलर निवडा (Current Outstanding पहा)' : 'Select Dealer for Balance'}
            </label>
            <div className="relative">
              <select
                value={selectedDealerId}
                onChange={(e) => setSelectedDealerId(e.target.value)}
                className="w-full p-2.5 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                <option value="">
                  {language === 'mr' ? '-- सर्व डीलर्स (All Dealers) --' : '-- All Dealers --'}
                </option>
                {activeDealers.map((d) => {
                  const bal = getDealerBalance(d.id);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.firmName || d.proprietorName} ({d.dealerCode || 'DLR'}) - बाकी: ₹{bal.currentOutstanding.toLocaleString()}
                    </option>
                  );
                })}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Month Filter */}
          <div className="w-full md:w-48">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {language === 'mr' ? 'महिना फिल्टर' : 'Month Filter'}
            </label>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">{language === 'mr' ? 'सर्व महिने (All Months)' : 'All Months'}</option>
              {DEFAULT_MONTH_NAMES.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.month} {language === 'mr' ? `(${m.monthMr})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-64">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {language === 'mr' ? 'शोधा (Search Bill / Receipt)' : 'Search'}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={language === 'mr' ? 'बिल क्र., डीलर, संदर्भ...' : 'Bill No., Dealer...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>

        {/* Selected Dealer Spotlight Box */}
        {selectedDealerObj && singleDealerBalance && (
          <div className="p-4 rounded-xl bg-linear-to-r from-red-50/70 via-slate-50 to-amber-50/70 border border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px]">
                  {selectedDealerObj.dealerCode || 'BW-DLR'}
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {selectedDealerObj.firmName || selectedDealerObj.proprietorName}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {selectedDealerObj.proprietorName}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {selectedDealerObj.mobile}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedDealerObj.taluka ? `${selectedDealerObj.taluka}, ${selectedDealerObj.district}` : selectedDealerObj.district}
                </span>
              </div>
            </div>

            {/* Balances Display */}
            <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  {language === 'mr' ? 'एकूण बिल' : 'Total Billed'}
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                  ₹{singleDealerBalance.totalOrders.toLocaleString()}
                </span>
              </div>

              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">
                  {language === 'mr' ? 'एकूण जमा' : 'Collected'}
                </span>
                <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                  ₹{singleDealerBalance.totalCollections.toLocaleString()}
                </span>
              </div>

              <div className="text-right p-2 rounded-lg bg-amber-100/80 border border-amber-300">
                <span className="text-[10px] font-black text-amber-900 uppercase block">
                  {language === 'mr' ? 'करंट आऊटस्टँडिंग' : 'Current Outstanding'}
                </span>
                <span className="font-mono font-black text-red-700 text-sm sm:text-base">
                  ₹{singleDealerBalance.currentOutstanding.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="print:hidden flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{language === 'mr' ? 'ऑर्डर बिले (Orders & Bills)' : 'Order Bills'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeSubTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {filteredOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('collections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'collections'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{language === 'mr' ? 'कलेक्शन नोंदी (Collections)' : 'Collection Records'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeSubTab === 'collections' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {filteredCollections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{language === 'mr' ? 'डीलर खातेवही (Ledger)' : 'Dealer Ledger'}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ORDERS & BILLS LIST
          ========================================================================= */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? 'डीलर ऑर्डर बिलांची यादी' : 'Dealer Invoices & Orders'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {filteredOrders.length} {language === 'mr' ? 'बिले आढळली' : 'records found'}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewOrder()}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? '+ नवीन बिल' : '+ New Invoice'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">बिल क्र. (Bill No)</th>
                  <th className="p-3">दिनांक (Date)</th>
                  <th className="p-3">डीलरचे नाव (Dealer Name)</th>
                  <th className="p-3 text-center">वस्तू (Items)</th>
                  <th className="p-3 text-right">रक्कम (Subtotal)</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">एकूण बिल (Total Amount)</th>
                  <th className="p-3 text-center">स्थिती (Status)</th>
                  <th className="p-3 text-center">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      {language === 'mr'
                        ? 'कोणतेही ऑर्डर बिल उपलब्ध नाही. वरील बटण दाबून नवीन बिल बनवा.'
                        : 'No orders found. Click "+ New Order Bill" to create an invoice.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-red-700">
                        {order.billNumber}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {order.billDate}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{order.dealerName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{order.dealerCode}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">
                        {order.items?.length || 1}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        ₹{(order.subtotal || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        ₹{(order.gstAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                        ₹{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActivePrintBill(order)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="बिल प्रिंट करा"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('खरोखर हे बिल हटवायचे आहे का?')) {
                                deleteDealerOrder(order.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                            title="बिल हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: COLLECTION RECORDS LIST
          ========================================================================= */}
      {activeSubTab === 'collections' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? 'कलेक्शन व जमा पावत्यांची यादी' : 'Collection & Payment Receipts'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {filteredCollections.length} {language === 'mr' ? 'नोंदी आढळल्या' : 'records found'}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewCollection()}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? '+ वसुली नोंदवा' : '+ Record Payment'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">पावती क्र. (Receipt No)</th>
                  <th className="p-3">दिनांक (Date)</th>
                  <th className="p-3">डीलरचे नाव (Dealer Name)</th>
                  <th className="p-3">टार्गेट महिना (Month)</th>
                  <th className="p-3">पेमेंट प्रकार (Mode)</th>
                  <th className="p-3">संदर्भ क्र. (UTR / Ref)</th>
                  <th className="p-3 text-right">जमा रक्कम (Amount)</th>
                  <th className="p-3 text-right">लाखात (In Lakhs)</th>
                  <th className="p-3 text-center">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      {language === 'mr'
                        ? 'कोणतीही वसुली नोंद उपलब्ध नाही. वरील बटण दाबून नवीन वसुली नोंदवा.'
                        : 'No collection records found. Click "+ Record Collection" to add.'}
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-800">
                        {col.receiptNo || col.id}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {col.collectionDate}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{col.dealerName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{col.dealerCode}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {col.targetMonth}
                        </span>
                      </td>
                      <td className="p-3 font-mono uppercase font-bold text-slate-700">
                        {col.paymentMode}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {col.referenceNo || '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        ₹{col.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {(col.amountLakh || col.amount / 100000).toFixed(2)} Lac
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActivePrintReceipt(col)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="पावती प्रिंट करा"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('खरोखर ही वसुली नोंद हटवायची आहे का? टार्गेट शीटमधील आकडे देखील अद्ययावत होतील.')) {
                                deleteDealerCollection(col.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                            title="नोंद हटवा"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DEALER LEDGER (DEBIT / CREDIT / BALANCE STATEMENT)
          ========================================================================= */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? 'डीलर खातेवही पत्रक (Statement of Account)' : 'Statement of Account'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {selectedDealerObj
                  ? `${selectedDealerObj.firmName || selectedDealerObj.proprietorName} (${selectedDealerObj.dealerCode})`
                  : language === 'mr'
                  ? 'कृपया वरून डीलर निवडा'
                  : 'Please select a dealer from above'}
              </span>
            </div>
            {selectedDealerObj && (
              <button
                onClick={() => setIsLedgerPreviewOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer active:scale-95"
                title={language === 'mr' ? 'खातेवही A4 प्रिंट पूर्वावलोकन' : 'A4 Print Preview for Ledger'}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? '🖨️ खातेवही प्रिंट A4' : 'Print Ledger A4'}</span>
              </button>
            )}
          </div>

          <div id="printable-ledger-card" className="p-4 space-y-4">
            {!selectedDealerId ? (
              <div className="p-12 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">
                  {language === 'mr'
                    ? 'खातेवही पाहण्यासाठी वरील ड्रॉपडाऊनमधून डीलर निवडा.'
                    : 'Select a dealer to view their ledger statement.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300">
                      <tr>
                        <th className="p-2.5 border-r border-slate-200">दिनांक (Date)</th>
                        <th className="p-2.5 border-r border-slate-200">प्रकार (Type)</th>
                        <th className="p-2.5 border-r border-slate-200">संदर्भ / पावती क्र.</th>
                        <th className="p-2.5 border-r border-slate-200">तपशील (Particulars)</th>
                        <th className="p-2.5 border-r border-slate-200 text-right">नावे ₹ (Debit / Sale)</th>
                        <th className="p-2.5 border-r border-slate-200 text-right">जमा ₹ (Credit / Paid)</th>
                        <th className="p-2.5 text-right font-black bg-amber-50">बाकी ₹ (Balance)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ledgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-semibold">
                            {language === 'mr' ? 'कोणतेही व्यवहार उपलब्ध नाहीत.' : 'No transactions recorded for this dealer.'}
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-slate-700">
                              {row.date}
                            </td>
                            <td className="p-2.5 border-r border-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.type === 'INVOICE'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {row.type}
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-slate-900">
                              {row.refNo}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">
                              {row.particulars}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-red-700 bg-amber-50/50">
                              ₹{row.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-right border-r border-slate-200 uppercase">
                          {language === 'mr' ? 'एकूण / चालू बाकी (Current Outstanding):' : 'Closing Balance:'}
                        </td>
                        <td className="p-2.5 text-right font-mono border-r border-slate-200">
                          ₹{singleDealerBalance?.totalOrders.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono border-r border-slate-200 text-emerald-700">
                          ₹{singleDealerBalance?.totalCollections.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono text-red-700 text-sm bg-amber-100/70">
                          ₹{singleDealerBalance?.currentOutstanding.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NEW ORDER BILL FORM
          ========================================================================= */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'mr' ? 'नवीन डीलर ऑर्डर बिल (Create Order Invoice)' : 'Create Dealer Invoice'}
                </h3>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrderBill} className="space-y-4 mt-4">
              {/* Dealer and Bill Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'डीलर निवडा' : 'Select Dealer'}
                  </label>
                  <select
                    required
                    value={orderFormDealerId}
                    onChange={(e) => setOrderFormDealerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {activeDealers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firmName || d.proprietorName} ({d.dealerCode || 'DLR'}) - {d.taluka ? `${d.taluka}, ${d.district}` : d.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'बिल दिनांक' : 'Bill Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={orderFormBillDate}
                    onChange={(e) => setOrderFormBillDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 uppercase">
                    {language === 'mr' ? 'ऑर्डर उत्पादने (Order Items)' : 'Order Items'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOrderItem}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? '+ उत्पादन जोडा' : '+ Add Item'}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2">उत्पादन (Product)</th>
                        <th className="p-2 w-20 text-center">पॅकिंग</th>
                        <th className="p-2 w-20 text-center">नग (Qty)</th>
                        <th className="p-2 w-24 text-right">दर ₹ (Rate)</th>
                        <th className="p-2 w-28 text-right">रक्कम ₹ (Total)</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderItems.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2">
                            <select
                              value={it.productId}
                              onChange={(e) => handleOrderItemChange(it.id, 'productId', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                            >
                              {priceList.map((p) => {
                                const pName = (language === 'mr' ? p.nameMr : p.nameEn) || p.nameMr || p.nameEn;
                                return (
                                  <option key={p.id} value={p.id}>
                                    {pName} ({p.packing}) - ₹{p.dealerPrice}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="p-2 text-center text-slate-600 font-mono">
                            {it.packing}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleOrderItemChange(it.id, 'quantity', e.target.value)}
                              className="w-16 p-1 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={it.rate}
                              onChange={(e) => handleOrderItemChange(it.id, 'rate', e.target.value)}
                              className="w-20 p-1 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-black text-slate-900">
                            ₹{(it.total || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            {orderItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderItem(it.id)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & GST Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-bold">
                  <span>{language === 'mr' ? 'एकूण उप-रक्कम (Sub Total):' : 'Sub Total:'}</span>
                  <span className="font-mono text-slate-900">₹{orderFormSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-bold items-center">
                  <span>{language === 'mr' ? 'सूट / डिस्काउंट ₹:' : 'Discount ₹:'}</span>
                  <input
                    type="number"
                    min="0"
                    value={orderFormDiscount}
                    onChange={(e) => setOrderFormDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 p-1 text-right font-mono font-bold bg-white border border-slate-200 rounded"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-bold items-center">
                  <span>GST ({orderFormGstPercent}%):</span>
                  <span className="font-mono text-slate-900">₹{orderFormGstAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>{language === 'mr' ? 'एकूण अंतिम बिल रक्कम (Grand Total):' : 'Grand Total:'}</span>
                  <span className="font-mono text-red-700 text-base">₹{orderFormGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  {language === 'mr' ? 'बिल सेव्ह करा व आऊटस्टँडिंग अद्ययावत करा' : 'Save Invoice & Update Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RECORD COLLECTION / PAYMENT
          ========================================================================= */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'mr' ? 'डीलरकडून वसुली जमा करा (Record Collection)' : 'Record Payment Receipt'}
                </h3>
              </div>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="space-y-4 mt-4">
              {/* Dealer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'डीलर निवडा' : 'Select Dealer'}
                </label>
                <select
                  required
                  value={colFormDealerId}
                  onChange={(e) => setColFormDealerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {activeDealers.map((d) => {
                    const bal = getDealerBalance(d.id);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.firmName || d.proprietorName} ({d.dealerCode || 'DLR'}) - बाकी: ₹{bal.currentOutstanding.toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount and Live Lakh conversion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'जमा रक्कम ₹' : 'Amount Received ₹'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={colFormAmount}
                    onChange={(e) => setColFormAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono font-black text-emerald-800 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'रक्कम (लाखात - टार्गेट सीटसाठी)' : 'Amount in Lakhs'}
                  </label>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono font-black text-blue-900 text-base">
                    {(colFormAmount / 100000).toFixed(2)} Lac
                  </div>
                </div>
              </div>

              {/* Date & Target Month Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'जमा दिनांक' : 'Collection Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={colFormDate}
                    onChange={(e) => setColFormDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'वसुली वर्गवारी / टार्गेट महिना' : 'Collection Type / Target Month'}
                  </label>
                  <select
                    value={colFormTargetMonth}
                    onChange={(e) => setColFormTargetMonth(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="auto">
                      {language === 'mr' ? `ऑटो डिटेक्ट (${detectedTargetMonth})` : `Auto Detect (${detectedTargetMonth})`}
                    </option>
                    <option value="Last Year Dues">
                      {language === 'mr' ? 'मागील वर्षाची थकबाकी (Last Year Outstanding)' : 'Last Year Dues / Outstanding'}
                    </option>
                    <option value="April">April (एप्रिल)</option>
                    <option value="May">May (मे)</option>
                    <option value="June">June (जून)</option>
                    <option value="July">July (जुलै)</option>
                    <option value="August">August (ऑगस्ट)</option>
                    <option value="September">September (सप्टेंबर)</option>
                    <option value="October">October (ऑक्टोबर)</option>
                    <option value="November">November (नोव्हेंबर)</option>
                    <option value="December">December (डिसेंबर)</option>
                    <option value="January">January (जानेवारी)</option>
                    <option value="February">February (फेब्रुवारी)</option>
                    <option value="March">March (मार्च)</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'पेमेंट प्रकार' : 'Payment Mode'}
                  </label>
                  <select
                    value={colFormMode}
                    onChange={(e) => setColFormMode(e.target.value as DealerCollectionRecord['paymentMode'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="rtgs_neft">RTGS / NEFT</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cheque">Cheque (धनादेश)</option>
                    <option value="cash">Cash (रोख)</option>
                    <option value="bank_transfer">Bank Transfer / IMPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'बँकेचे नाव' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={colFormBank}
                    onChange={(e) => setColFormBank(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Reference / UTR Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'UTR क्र. / चेक क्र. / ट्रॅन्झॅक्शन आयडी' : 'Transaction ID / UTR / Cheque No.'}
                </label>
                <input
                  type="text"
                  placeholder="उदा. UTR783921829"
                  value={colFormRefNo}
                  onChange={(e) => setColFormRefNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              {/* Note about sync */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed">
                  {language === 'mr'
                    ? `ही वसुली जमा केल्यानंतर डीलरचे करंट आऊटस्टँडिंग ₹${colFormAmount.toLocaleString()} ने कमी होईल, आणि टार्गेट सीटमध्ये "${detectedTargetMonth}" महिन्याच्या ऍक्च्युअल कलेक्शन (Actual Collection) मध्ये ${(colFormAmount / 100000).toFixed(2)} Lac आपोआप अपडेट होईल!`
                    : `Saving this collection will reduce the dealer's outstanding balance and automatically update the "${detectedTargetMonth}" Actual Collection in the Target Sheet!`}
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {language === 'mr' ? 'वसुली नोंदवा व टार्गेट अपडेट करा' : 'Record & Sync Target Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE INVOICE BILL MODAL / PREVIEW
          ========================================================================= */}
      {activePrintBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? 'डीलर ऑर्डर बिल प्रिंट पूर्वावलोकन' : 'Tax Invoice Preview'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportElementToPrintOrPDF('printable-order-bill-card', `Blackworm_Bill_${activePrintBill.billNumber}`)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                  title="A4 कागदावर प्रिंट करा"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? '🖨️ प्रिंट A4' : 'Print A4'}</span>
                </button>
                <button
                  onClick={() => exportElementToPDF('printable-order-bill-card', `Blackworm_Bill_${activePrintBill.billNumber}`, { orientation: 'portrait', scale: 2 })}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                  title="A4 PDF डाऊनलोड करा"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'PDF डाऊनलोड' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => setActivePrintBill(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Actual Printable Invoice Layout */}
            <div id="printable-order-bill-card" className="p-4 bg-white border border-slate-300 rounded-xl mt-3 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-3">
                  <BlackwormLogo variant="icon" size="md" className="w-12 h-12" />
                  <div>
                    <h2 className="text-lg font-black text-red-700 uppercase">BLACKWORM AGRITECH PVT LTD</h2>
                    <p className="text-[10px] text-slate-600 font-bold">CIN: {companyDetails.cin} | GSTIN: {companyDetails.gstNo}</p>
                    <p className="text-[10px] text-slate-500">{companyDetails.address}, {companyDetails.taluka}, {companyDetails.district} - {companyDetails.pincode}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-xs uppercase">
                    TAX INVOICE
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-1">Bill: {activePrintBill.billNumber}</p>
                  <p className="text-xs font-mono text-slate-600">Date: {activePrintBill.billDate}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Billed To (Dealer):</span>
                  <p className="font-extrabold text-slate-900 text-sm">{activePrintBill.dealerName}</p>
                  <p className="text-slate-600 font-mono">Code: {activePrintBill.dealerCode}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Officer:</span>
                  <p className="font-bold text-slate-800">{activePrintBill.officerName || 'Sales Officer'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse border border-black">
                <thead className="bg-slate-200 font-black border-b border-black">
                  <tr>
                    <th className="p-2 border-r border-black">#</th>
                    <th className="p-2 border-r border-black">उत्पादन तपशील (Product Description)</th>
                    <th className="p-2 border-r border-black text-center">पॅकिंग</th>
                    <th className="p-2 border-r border-black text-center">नग (Qty)</th>
                    <th className="p-2 border-r border-black text-right">दर (Rate ₹)</th>
                    <th className="p-2 text-right">रक्कम (Amount ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {activePrintBill.items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="p-2 border-r border-black font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-black font-bold">{it.productName}</td>
                      <td className="p-2 border-r border-black text-center font-mono">{it.packing}</td>
                      <td className="p-2 border-r border-black text-center font-mono font-bold">{it.quantity}</td>
                      <td className="p-2 border-r border-black text-right font-mono">₹{it.rate.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-bold">₹{(it.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-black font-bold">
                  <tr>
                    <td colSpan={5} className="p-2 text-right border-r border-black">उप-रक्कम (Sub Total):</td>
                    <td className="p-2 text-right font-mono">₹{(activePrintBill.subtotal || 0).toLocaleString()}</td>
                  </tr>
                  {activePrintBill.discountAmount > 0 && (
                    <tr>
                      <td colSpan={5} className="p-2 text-right border-r border-black">सूट (Discount):</td>
                      <td className="p-2 text-right font-mono text-emerald-700">-₹{activePrintBill.discountAmount.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={5} className="p-2 text-right border-r border-black">GST Tax:</td>
                    <td className="p-2 text-right font-mono">₹{(activePrintBill.gstAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-sm">
                    <td colSpan={5} className="p-2 text-right border-r border-black">एकूण बिल रक्कम (Grand Total):</td>
                    <td className="p-2 text-right font-mono text-red-700">₹{activePrintBill.totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="pt-6 flex justify-between text-xs font-bold text-slate-700">
                <div className="border-t border-black pt-1 w-40 text-center">
                  डीलर स्वाक्षरी
                </div>
                <div className="border-t border-black pt-1 w-44 text-center">
                  For Blackworm Agritech Pvt Ltd
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE COLLECTION RECEIPT MODAL / PREVIEW
          ========================================================================= */}
      {activePrintReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? 'वसुली पावती पूर्वावलोकन' : 'Money Receipt Preview'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportElementToPrintOrPDF('printable-receipt-card', `Receipt_${activePrintReceipt.receiptNo || activePrintReceipt.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                  title="A4 कागदावर प्रिंट करा"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? '🖨️ प्रिंट A4' : 'Print A4'}</span>
                </button>
                <button
                  onClick={() => exportElementToPDF('printable-receipt-card', `Receipt_${activePrintReceipt.receiptNo || activePrintReceipt.id}`, { orientation: 'portrait', scale: 2 })}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                  title="A4 PDF डाऊनलोड करा"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'PDF डाऊनलोड' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => setActivePrintReceipt(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Actual Printable Receipt Layout */}
            <div id="printable-receipt-card" className="p-4 bg-white border-2 border-black rounded-xl mt-3 space-y-3 text-xs">
              <div className="text-center border-b pb-2">
                <h2 className="text-base font-black text-red-700 uppercase">BLACKWORM AGRITECH PVT LTD</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase border border-emerald-300">
                  MONEY RECEIPT (वसुली पावती)
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Receipt No: <strong className="font-mono">{activePrintReceipt.receiptNo || activePrintReceipt.id}</strong></p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">दिनांक (Date):</span>
                  <span className="font-mono font-bold">{activePrintReceipt.collectionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">डीलरचे नाव:</span>
                  <span className="font-extrabold text-slate-900">{activePrintReceipt.dealerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">पेमेंट प्रकार:</span>
                  <span className="font-bold uppercase text-slate-800">{activePrintReceipt.paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">संदर्भ / UTR No.:</span>
                  <span className="font-mono font-bold text-slate-700">{activePrintReceipt.referenceNo || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">टार्गेट महिना:</span>
                  <span className="font-bold text-blue-700">{activePrintReceipt.targetMonth || '-'}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-300 flex justify-between items-center mt-2">
                  <span className="font-black text-emerald-950">जमा रक्कम (Amount):</span>
                  <span className="font-mono font-black text-emerald-800 text-base">₹{activePrintReceipt.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between text-[11px] font-bold text-slate-600">
                <div className="border-t border-black pt-1 w-28 text-center">
                  डीलर स्वाक्षरी
                </div>
                <div className="border-t border-black pt-1 w-32 text-center">
                  अधिकृत स्वाक्षरी
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 Print Preview & Auto-Fit Modal for Ledger */}
      {selectedDealerObj && (
        <A4PrintPreviewModal
          isOpen={isLedgerPreviewOpen}
          onClose={() => setIsLedgerPreviewOpen(false)}
          elementId="printable-ledger-card"
          title={`डीलर खातेवही (Dealer Statement) - ${selectedDealerObj.firmName || selectedDealerObj.proprietorName} (${selectedDealerObj.dealerCode})`}
          filename={`Blackworm_Ledger_${selectedDealerObj.dealerCode || 'Dealer'}`}
          defaultLandscape={false}
          language={language}
        />
      )}
    </div>
  );
};
