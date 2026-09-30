import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TargetItem, MonthTargetRow } from '../types';
import {
  DEFAULT_MONTH_NAMES,
  generateDefaultMonthlyBreakdown,
  createTargetSheetForUser,
  samplePravinTargetSheet,
} from '../utils/targetHelpers';
import { exportElementToPDF, exportElementToPrintOrPDF, triggerPrint } from '../utils/printHelpers';
import { BlackwormLogo } from './BlackwormLogo';
import { PrintActions } from './PrintActions';
import {
  Target,
  Plus,
  TrendingUp,
  Printer,
  FileDown,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  Calendar,
  Building,
  RotateCcw,
  Sparkles,
  Search,
  SlidersHorizontal,
  Check,
  Calculator,
  RefreshCw,
  Wallet,
} from 'lucide-react';

const getFinMonthSrNo = (dateStr: string): number => {
  if (!dateStr) return 1;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 1;
  const month = date.getMonth(); // 0-11 (Jan is 0)
  // FY starts in April (SrNo 1)
  // April (3) -> 1
  // May (4) -> 2
  // ...
  // Dec (11) -> 9
  // Jan (0) -> 10
  // Feb (1) -> 11
  // Mar (2) -> 12
  const srNo = month >= 3 ? month - 2 : month + 10;
  return srNo;
};

export const TargetSheet: React.FC = React.memo(() => {
  const {
    language,
    targets,
    addTarget,
    updateTarget,
    deleteTarget,
    users,
    currentUser,
    companyDetails,
    dealerOrders,
    dealerCollections,
  } = useApp();

  const isAdmin = currentUser ? (
    currentUser.role === 'admin' || 
    currentUser.loginId === 'admin' ||
    currentUser.loginId === 'pravin waghmare'
  ) : false;

  // Visible targets list based on role (excluding deleted users)
  const visibleTargets = useMemo(() => {
    if (!currentUser) return [];

    const activeUserIds = new Set(users.map((u) => u.id));
    const activeUserNames = users.map((u) => (u.fullName || u.name || '').toLowerCase()).filter(Boolean);

    // Filter out target sheets belonging to users who no longer exist
    const validTargets = targets.filter((t) => {
      if (t.userId && !activeUserIds.has(t.userId)) return false;
      if (t.executiveId && !activeUserIds.has(t.executiveId)) return false;
      if (t.personName || t.executiveName) {
        const pName = (t.personName || t.executiveName || '').toLowerCase();
        // Keep sample/default target if matched or if user exists
        return activeUserNames.some((uName) => uName.includes(pName) || pName.includes(uName)) || activeUserIds.has(t.userId || '');
      }
      return true;
    });

    const targetList = isAdmin ? (validTargets.length > 0 ? validTargets : targets) : validTargets.filter((t) => {
      const currentName = (currentUser.fullName || currentUser.name || '').toLowerCase();
      const pName = (t.personName || t.executiveName || '').toLowerCase();
      return pName.includes(currentName) || currentName.includes(pName) || t.userId === currentUser.id;
    });

    // Deduplicate by normalized name to ensure exact unique officers (no duplicate Shridhar Balkrishna Shinde etc.)
    const seenNames = new Set<string>();
    const uniqueTargets = targetList.filter((t) => {
      const nameKey = (t.executiveName || t.personName || '').trim().toLowerCase();
      if (!nameKey) return true;
      if (seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
      return true;
    });

    if (uniqueTargets.length > 0) return uniqueTargets;

    // Default target for officer if none created yet
    const fallbackTarget: TargetItem = {
      id: `TGT-${currentUser.id}`,
      executiveId: currentUser.id,
      personName: currentUser.fullName || currentUser.name,
      executiveName: currentUser.fullName || currentUser.name,
      executiveRole: currentUser.designation || 'Field Officer',
      designation: currentUser.designation || 'Field Officer',
      headquarter: currentUser.village || currentUser.territory || 'Headquarters',
      territory: currentUser.territory || 'Territory',
      centre: currentUser.territory || 'Territory',
      financialYear: '2026-2027',
      year: '2026 - 27',
      salesTargetLakh: 50,
      salesAchievedLakh: 0,
      collectionTargetLakh: 50,
      targetAmount: 5000000,
      achievedAmount: 0,
      month: 'FY 2026-27',
      monthsData: generateDefaultMonthlyBreakdown(50),
    };
    return [fallbackTarget];
  }, [isAdmin, targets, currentUser]);

  // Selected Target Sheet
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    return visibleTargets[0]?.id || samplePravinTargetSheet.id;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sheet' | 'cards'>('sheet');
  const [savedBadge, setSavedBadge] = useState(false);

  // Currently viewed Target Item
  const activeTarget: TargetItem = useMemo(() => {
    const found = visibleTargets.find((t) => t.id === selectedTargetId);
    if (found) return found;
    return visibleTargets[0] || samplePravinTargetSheet;
  }, [visibleTargets, selectedTargetId]);

  // Ensure 12-month data exists
  const monthsData: MonthTargetRow[] = useMemo(() => {
    if (activeTarget.monthsData && activeTarget.monthsData.length === 12) {
      return activeTarget.monthsData.map((m) => {
        const ach = Number(m.achievementLakh) || 0;
        const tgt = Number(m.targetLakh) || 0;
        const col = Number(m.collectionLakh) || 0;
        const actCol = Number(m.actualCollectionLakh) || 0;
        const colPct = m.collectionPercentage ?? 100;
        const actualColPct = m.percentCollection ?? (ach > 0 ? Number(((actCol / ach) * 100).toFixed(2)) : (col > 0 ? Number(((actCol / col) * 100).toFixed(2)) : 0));
        return {
          ...m,
          collectionPercentage: colPct,
          percentCollection: actualColPct,
        };
      });
    }
    return generateDefaultMonthlyBreakdown(activeTarget.salesTargetLakh || 75);
  }, [activeTarget]);

  // Quarters breakdown calculation
  const q1Months = monthsData.filter((m) => m.quarter === 'Q1');
  const q2Months = monthsData.filter((m) => m.quarter === 'Q2');
  const q3Months = monthsData.filter((m) => m.quarter === 'Q3');
  const q4Months = monthsData.filter((m) => m.quarter === 'Q4');

  const calcQuarterSum = (months: MonthTargetRow[]) => {
    const target = months.reduce((s, m) => s + (Number(m.targetLakh) || 0), 0);
    const achievement = months.reduce((s, m) => s + (Number(m.achievementLakh) || 0), 0);
    const percent = target > 0 ? (achievement / target) * 100 : 0;
    const collection = months.reduce((s, m) => s + (Number(m.collectionLakh) || 0), 0);
    const actualCollection = months.reduce((s, m) => s + (Number(m.actualCollectionLakh) || 0), 0);
    const actualColPct = achievement > 0 
      ? (actualCollection / achievement) * 100 
      : (collection > 0 ? (actualCollection / collection) * 100 : 0);

    return {
      target: Number(target.toFixed(2)),
      achievement: Number(achievement.toFixed(2)),
      percent: Number(percent.toFixed(2)),
      collection: Number(collection.toFixed(2)),
      actualCollection: Number(actualCollection.toFixed(2)),
      actualColPct: Number(actualColPct.toFixed(2)),
    };
  };

  const q1Total = calcQuarterSum(q1Months);
  const q2Total = calcQuarterSum(q2Months);
  const q3Total = calcQuarterSum(q3Months);
  const q4Total = calcQuarterSum(q4Months);

  const grandTotal = {
    target: Number((q1Total.target + q2Total.target + q3Total.target + q4Total.target).toFixed(2)),
    achievement: Number((q1Total.achievement + q2Total.achievement + q3Total.achievement + q4Total.achievement).toFixed(2)),
    collection: Number((q1Total.collection + q2Total.collection + q3Total.collection + q4Total.collection).toFixed(2)),
    actualCollection: Number((q1Total.actualCollection + q2Total.actualCollection + q3Total.actualCollection + q4Total.actualCollection).toFixed(2)),
  };

  const grandPercent = grandTotal.target > 0 ? Number(((grandTotal.achievement / grandTotal.target) * 100).toFixed(2)) : 0;
  const grandActualColPct = grandTotal.achievement > 0 
    ? Number(((grandTotal.actualCollection / grandTotal.achievement) * 100).toFixed(2)) 
    : (grandTotal.collection > 0 ? Number(((grandTotal.actualCollection / grandTotal.collection) * 100).toFixed(2)) : 0);
  const balanceRemaining = Number(Math.max(0, grandTotal.target - grandTotal.achievement).toFixed(2));

  // Direct Inline editing on the table with auto calculation and instant save
  const handleInlineMonthChange = (
    srNo: number,
    field: 'targetLakh' | 'achievementLakh' | 'collectionLakh' | 'actualCollectionLakh',
    rawValue: string
  ) => {
    const val = rawValue === '' ? 0 : parseFloat(rawValue) || 0;
    const currentMonths: MonthTargetRow[] = JSON.parse(JSON.stringify(monthsData));
    const idx = currentMonths.findIndex((m) => m.srNo === srNo);
    if (idx === -1) return;

    const row = { ...currentMonths[idx] };

    if (field === 'targetLakh') {
      row.targetLakh = val;
      row.percentAchievement = val > 0 ? Number(((row.achievementLakh / val) * 100).toFixed(2)) : 0;
    } else if (field === 'achievementLakh') {
      row.achievementLakh = val;
      row.percentAchievement = row.targetLakh > 0 ? Number(((val / row.targetLakh) * 100).toFixed(2)) : 0;
      
      // Auto-calc Collection in Lakhs using currentYearOutstandingPercent if defined, else 100%
      const outPct = activeTarget.currentYearOutstandingPercent && activeTarget.currentYearOutstandingPercent > 0 
        ? activeTarget.currentYearOutstandingPercent 
        : 100;
      row.collectionLakh = Number(((val * outPct) / 100).toFixed(2));
      row.percentCollection = val > 0 ? Number(((row.actualCollectionLakh / val) * 100).toFixed(2)) : 0;
    } else if (field === 'collectionLakh') {
      row.collectionLakh = val;
      row.percentCollection = row.achievementLakh > 0 
        ? Number(((row.actualCollectionLakh / row.achievementLakh) * 100).toFixed(2)) 
        : (val > 0 ? Number(((row.actualCollectionLakh / val) * 100).toFixed(2)) : 0);
    } else if (field === 'actualCollectionLakh') {
      row.actualCollectionLakh = val;
      row.percentCollection = row.achievementLakh > 0
        ? Number(((val / row.achievementLakh) * 100).toFixed(2))
        : (row.collectionLakh > 0 ? Number(((val / row.collectionLakh) * 100).toFixed(2)) : 0);
    }

    currentMonths[idx] = row;

    const updatedTotalTarget = currentMonths.reduce((s, m) => s + (Number(m.targetLakh) || 0), 0);
    const updatedTotalAchieved = currentMonths.reduce((s, m) => s + (Number(m.achievementLakh) || 0), 0);
    const updatedTotalActualCollection = currentMonths.reduce((s, m) => s + (Number(m.actualCollectionLakh) || 0), 0);

    updateTarget(activeTarget.id, {
      monthsData: currentMonths,
      salesTargetLakh: Number(updatedTotalTarget.toFixed(2)),
      targetAmount: updatedTotalTarget * 100000,
      achievedAmount: updatedTotalAchieved * 100000,
      collectionAmount: updatedTotalActualCollection * 100000,
      lastUpdated: new Date().toISOString(),
    });

    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  const handleSyncWithRealData = () => {
    if (!activeTarget) return;
    
    const offName = (activeTarget.executiveName || activeTarget.personName || '').toLowerCase();
    const officerId = activeTarget.executiveId || activeTarget.userId;
    
    const updatedMonths = monthsData.map((m) => {
      let monthlyAchRs = 0;
      let monthlyColRs = 0;
      
      // Calculate achievements (orders) for this month
      dealerOrders.forEach((o) => {
        const isOfficer = 
          o.officerName?.toLowerCase().includes(offName) || 
          offName.includes(o.officerName?.toLowerCase() || '') ||
          o.items?.some((item: any) => item.officerId === officerId);
          
        if (isOfficer && o.createdAt) {
          const mSrNo = getFinMonthSrNo(o.createdAt.split('T')[0]);
          if (mSrNo === m.srNo) {
            monthlyAchRs += o.totalAmount || 0;
          }
        }
      });
      
      // Calculate collections for this month
      dealerCollections.forEach((c) => {
        const isOfficer = 
          c.officerName?.toLowerCase().includes(offName) || 
          offName.includes(c.officerName?.toLowerCase() || '') ||
          c.recordedBy === officerId;
          
        if (isOfficer && c.collectionDate) {
          const mSrNo = getFinMonthSrNo(c.collectionDate);
          if (mSrNo === m.srNo) {
            monthlyColRs += c.amount || 0;
          }
        }
      });
      
      const achievementLakh = Number((monthlyAchRs / 100000).toFixed(2));
      const actualCollectionLakh = Number((monthlyColRs / 100000).toFixed(2));
      
      return {
        ...m,
        achievementLakh,
        percentAchievement: m.targetLakh > 0 ? Number(((achievementLakh / m.targetLakh) * 100).toFixed(2)) : 0,
        actualCollectionLakh,
        percentCollection: achievementLakh > 0 ? Number(((actualCollectionLakh / achievementLakh) * 100).toFixed(2)) : 0,
      };
    });
    
    const totalAchievedLakh = updatedMonths.reduce((s, m) => s + (m.achievementLakh || 0), 0);
    const totalCollectedLakh = updatedMonths.reduce((s, m) => s + (m.actualCollectionLakh || 0), 0);
    
    updateTarget(activeTarget.id, {
      monthsData: updatedMonths,
      achievedAmount: totalAchievedLakh * 100000,
      collectionAmount: totalCollectedLakh * 100000,
      lastUpdated: new Date().toISOString(),
    });
    
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  // Quick Inline change for Last Year Sales, Outstanding, Last Year Collection and Outstanding %
  const handleQuickMetaChange = (
    field: 'lastYearSale' | 'lastYearOpeningOutstanding' | 'lastYearOutstanding' | 'lastYearCollection' | 'currentYearOutstandingPercent',
    value: number
  ) => {
    const patch: Partial<TargetItem> = {
      [field]: value,
      lastUpdated: new Date().toISOString(),
    };

    const currentOpening = activeTarget.lastYearOpeningOutstanding ?? ((activeTarget.lastYearOutstanding ?? 5) + (activeTarget.lastYearCollection ?? 0));
    const currentCol = activeTarget.lastYearCollection ?? 0;

    if (field === 'lastYearCollection') {
      patch.lastYearCollection = value;
      patch.lastYearOpeningOutstanding = currentOpening;
      patch.lastYearOutstanding = Number(Math.max(0, currentOpening - value).toFixed(2));
    } else if (field === 'lastYearOutstanding') {
      patch.lastYearOutstanding = value;
      patch.lastYearOpeningOutstanding = Number((value + currentCol).toFixed(2));
    } else if (field === 'lastYearOpeningOutstanding') {
      patch.lastYearOpeningOutstanding = value;
      patch.lastYearOutstanding = Number(Math.max(0, value - currentCol).toFixed(2));
    }

    // If Current Year Outstanding % is updated, recalculate all collection amounts in Lakhs
    if (field === 'currentYearOutstandingPercent' && value > 0) {
      const updatedMonths = monthsData.map((m) => {
        const ach = Number(m.achievementLakh) || 0;
        const newCol = Number(((ach * value) / 100).toFixed(2));
        return {
          ...m,
          collectionLakh: newCol > 0 ? newCol : (m.collectionLakh || 0),
        };
      });
      patch.monthsData = updatedMonths;
    }

    updateTarget(activeTarget.id, patch);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 2000);
  };

  // Edit Modal Form State
  const [editFormData, setEditFormData] = useState({
    officerName: '',
    designation: '',
    centre: '',
    financialYear: '2026-2027',
    year: '2026 - 27',
    lastYearSale: 0,
    salesTargetLakh: 75,
    lastYearAchievement: 0,
    lastYearOutstanding: 0,
    currentYearOutstandingPercent: 10,
    months: [] as MonthTargetRow[],
  });

  const handleOpenEdit = () => {
    setEditFormData({
      officerName: activeTarget.executiveName || '',
      designation: activeTarget.executiveRole || 'Sr.Sales Officer',
      centre: activeTarget.territory || activeTarget.centre || '',
      financialYear: activeTarget.financialYear || '2026-2027',
      year: typeof activeTarget.year === 'string' ? activeTarget.year : '2026 - 27',
      lastYearSale: activeTarget.lastYearSale || 0,
      salesTargetLakh: activeTarget.salesTargetLakh || grandTotal.target || 75,
      lastYearAchievement: activeTarget.lastYearAchievement || 0,
      lastYearOutstanding: activeTarget.lastYearOutstanding || 0,
      currentYearOutstandingPercent: activeTarget.currentYearOutstandingPercent || 10,
      months: JSON.parse(JSON.stringify(monthsData)),
    });
    setIsEditModalOpen(true);
  };

  // Apply Current Year Outstanding % to all months in modal
  const handleApplyOutstandingPercent = (pct: number) => {
    const updatedMonths = editFormData.months.map((m) => {
      const ach = Number(m.achievementLakh) || 0;
      const calcCol = Number(((ach * pct) / 100).toFixed(2));
      return {
        ...m,
        collectionLakh: calcCol,
      };
    });
    setEditFormData({
      ...editFormData,
      currentYearOutstandingPercent: pct,
      months: updatedMonths,
    });
  };

  const handleMonthValueChange = (index: number, field: keyof MonthTargetRow, val: number) => {
    const updatedMonths = [...editFormData.months];
    const item = { ...updatedMonths[index], [field]: val };
    
    if (field === 'targetLakh' || field === 'achievementLakh') {
      const tgt = field === 'targetLakh' ? val : item.targetLakh;
      const ach = field === 'achievementLakh' ? val : item.achievementLakh;
      item.percentAchievement = tgt > 0 ? Number(((ach / tgt) * 100).toFixed(2)) : 0;
      
      const outPct = editFormData.currentYearOutstandingPercent > 0 ? editFormData.currentYearOutstandingPercent : 100;
      item.collectionLakh = Number(((ach * outPct) / 100).toFixed(2));
      item.percentCollection = ach > 0 ? Number(((item.actualCollectionLakh / ach) * 100).toFixed(2)) : 0;
    } else if (field === 'collectionLakh') {
      item.collectionLakh = val;
    } else if (field === 'actualCollectionLakh') {
      item.actualCollectionLakh = val;
      item.percentCollection = item.achievementLakh > 0
        ? Number(((val / item.achievementLakh) * 100).toFixed(2))
        : (item.collectionLakh > 0 ? Number(((val / item.collectionLakh) * 100).toFixed(2)) : 0);
    }

    updatedMonths[index] = item;
    setEditFormData({ ...editFormData, months: updatedMonths });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTotalTarget = editFormData.months.reduce((s, m) => s + (Number(m.targetLakh) || 0), 0);
    const updatedTotalAchieved = editFormData.months.reduce((s, m) => s + (Number(m.achievementLakh) || 0), 0);
    const updatedTotalActualCollection = editFormData.months.reduce((s, m) => s + (Number(m.actualCollectionLakh) || 0), 0);

    const patch: Partial<TargetItem> = {
      executiveName: editFormData.officerName,
      executiveRole: editFormData.designation,
      territory: editFormData.centre,
      centre: editFormData.centre,
      financialYear: editFormData.financialYear,
      year: editFormData.year,
      lastYearSale: editFormData.lastYearSale,
      salesTargetLakh: Number(updatedTotalTarget.toFixed(2)),
      lastYearAchievement: editFormData.lastYearAchievement,
      lastYearOutstanding: editFormData.lastYearOutstanding,
      currentYearOutstandingPercent: editFormData.currentYearOutstandingPercent,
      monthsData: editFormData.months,
      targetAmount: updatedTotalTarget * 100000,
      achievedAmount: updatedTotalAchieved * 100000,
      collectionAmount: updatedTotalActualCollection * 100000,
      lastUpdated: new Date().toISOString(),
    };

    updateTarget(activeTarget.id, patch);
    setIsEditModalOpen(false);
  };

  // New Target Sheet modal form
  const [newSheetUser, setNewSheetUser] = useState(users[0]?.id || '');
  const [newSheetTargetLakh, setNewSheetTargetLakh] = useState(75);

  const handleCreateNewSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const userObj = users.find((u) => u.id === newSheetUser) || users[0];
    if (!userObj) return;

    const newTargetData = createTargetSheetForUser(userObj, userObj.id, newSheetTargetLakh);
    addTarget(newTargetData);
    setIsNewSheetModalOpen(false);
  };

  // Direct PDF Download
  const handlePrintSheet = async () => {
    await exportElementToPDF(
      'target-sheet-printable',
      `Blackworm_Target_Sheet_${(activeTarget.executiveName || 'Officer').replace(/\s+/g, '_')}`,
      {
        orientation: 'portrait',
        scale: 2,
      }
    );
  };

  // Browser Direct Print
  const handleBrowserDirectPrint = () => {
    triggerPrint();
  };

  const cleanOfficerName = (name: string) => {
    if (!name) return '';
    return name
      .replace(/Sales Officer/gi, '')
      .replace(/Sr\.Sales Officer/gi, '')
      .replace(/Field Officer/gi, '')
      .replace(/Owner SR/gi, '')
      .replace(/SR/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* PERFECT A4 PRINT CSS FOR TARGET SHEET */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 4mm 4mm 4mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
          }
          header, nav, footer, .no-print, .print\\:hidden {
            display: none !important;
          }
          #target-sheet-printable {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          #target-sheet-printable > div {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          [class*="min-w-"], .min-w-full {
            min-width: 0 !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 2px 3px !important;
            border: 1px solid #000000 !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: normal !important;
            font-size: 8.5px !important;
            line-height: 1.25 !important;
          }
          input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            outline: none !important;
            width: 100% !important;
            font-weight: bold !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {/* Top Header & Toolbar */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">
                {language === 'mr' ? 'सेल्स टार्गेट शीट' : 'Sales Target Sheet'}
              </h1>
              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[10px] sm:text-xs border border-red-200 whitespace-nowrap">
                2026-27
              </span>
              {savedBadge && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] sm:text-xs border border-emerald-200 animate-in fade-in duration-100 whitespace-nowrap">
                  <Check className="w-3 h-3" />
                  <span>{language === 'mr' ? 'सेव्ह!' : 'Saved!'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls - Optimized for Mobile responsiveness */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Officer Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 flex-1 md:flex-none min-w-0">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {isAdmin ? (
              <select
                id="select-officer-target-sheet"
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full max-w-[120px] sm:max-w-none truncate"
              >
                {visibleTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {cleanOfficerName(t.executiveName || t.personName || '')}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">
                {cleanOfficerName(activeTarget.executiveName || activeTarget.personName || '')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* PDF Download Icon Button Only */}
            <button
              type="button"
              onClick={() => {
                exportElementToPDF('target-sheet-printable', `Blackworm-Target-Sheet-${activeTarget.executiveName || activeTarget.personName || 'Officer'}.pdf`);
              }}
              title={language === 'mr' ? 'पीडीएफ डाऊनलोड करा' : 'Download PDF'}
              className="p-2 sm:p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Download PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>

            {/* Sync Live Icon Button Only */}
            <button
              type="button"
              onClick={handleSyncWithRealData}
              title={language === 'mr' ? 'लाईव्ह सिंक करा' : 'Sync Live Data'}
              className="p-2 sm:p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="Sync Live Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>



      {/* =========================================================================
          OFFICIAL TARGET SHEET LAYOUT (FULL FIDELITY & RESPONSIVE ON BOTH MOBILE & MONITOR)
          ========================================================================= */}
      <div
        id="target-sheet-printable"
        className="bg-white p-3 sm:p-6 rounded-2xl border-2 border-black shadow-sm overflow-x-auto print:p-0 print:border-none print:shadow-none"
      >
        <div className="min-w-[850px] w-full">
          {/* Sheet Title Headers with Official Blackworm Logo on Left */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3 pb-3 border-b-2 border-black">
            <div className="shrink-0 flex items-center justify-center">
              <BlackwormLogo variant="icon" size="xl" className="w-16 h-16 sm:w-22 sm:h-22 md:w-24 md:h-24 drop-shadow-xs" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-3xl font-black text-red-700 uppercase tracking-wider font-sans leading-tight">
                BLACKWORM AGRITECH PVT LTD
              </h1>
              <h2 className="text-xs sm:text-base font-black text-emerald-800 uppercase tracking-wide mt-1">
                SALES TARGET SHEET {activeTarget.financialYear || '2026-2027'}
              </h2>
            </div>
          </div>

          {/* Officer and Territory Meta Box */}
          <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm mb-0">
            <tbody>
              {/* Row 1: Centre and Name Of Officer */}
              <tr>
                <td colSpan={4} className="border border-black p-2 bg-slate-50 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 shrink-0">Centre :- </span>
                    <input
                      type="text"
                      value={activeTarget.territory || activeTarget.centre || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateTarget(activeTarget.id, {
                          centre: val,
                          territory: val,
                          lastUpdated: new Date().toISOString(),
                        });
                        setSavedBadge(true);
                        setTimeout(() => setSavedBadge(false), 2000);
                      }}
                      placeholder="उदा. Tasgaon, Palus, Kadegaon, Khanapur (Vita)"
                      className="flex-1 font-bold text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-white focus:ring-1 focus:ring-black rounded px-1.5 py-0.5 border border-transparent focus:border-black focus:outline-none"
                      title="Centre / Headquarter (सेंटर एडिट करा)"
                    />
                  </div>
                </td>
                <td colSpan={4} className="border border-black p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Name Of Officer :-</span>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase">
                      {activeTarget.executiveName}
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 2: Last Year Sale and Designation */}
              <tr>
                <td colSpan={4} className="border border-black p-2 bg-slate-50 font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900">Last Year Sale 2025-26 :- </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={activeTarget.lastYearSale ?? 0}
                        onChange={(e) => handleQuickMetaChange('lastYearSale', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right font-mono font-bold text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100 rounded border-b border-transparent focus:border-black focus:outline-none"
                        title="Last Year Sale (Lac)"
                      />
                      <span className="font-mono font-bold text-slate-600 text-xs">Lac</span>
                    </div>
                  </div>
                </td>
                <td colSpan={4} className="border border-black p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Designation :-</span>
                    <span className="font-bold text-slate-800">
                      {activeTarget.executiveRole || 'Sr.Sales Officer'}
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 3: Last Year Collection and Sales Target */}
              <tr>
                <td colSpan={4} className="border border-black p-2 bg-emerald-50/40 font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900 font-bold">Last Year Collection :- </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={activeTarget.lastYearCollection ?? 0}
                        onChange={(e) => handleQuickMetaChange('lastYearCollection', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right font-mono font-black text-emerald-800 bg-white border border-emerald-300 rounded px-1.5 py-0.5 focus:border-emerald-600 focus:outline-none"
                        title="मागील वर्षाची वसूल झालेली रक्कम (Last Year Collection in Lac)"
                      />
                      <span className="font-mono font-bold text-emerald-800 text-xs">Lac</span>
                    </div>
                  </div>
                </td>
                <td colSpan={4} className="border border-black p-2 bg-white font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900">Sales Target 2026-27 :-</span>
                    <span className="font-extrabold text-red-700 font-mono text-sm sm:text-base">
                      {activeTarget.salesTargetLakh || grandTotal.target || 75} Lac
                    </span>
                  </div>
                </td>
              </tr>

              {/* Row 4: Achievement and Last Year Outstanding */}
              <tr>
                <td colSpan={4} className="border border-black p-2 bg-slate-50 font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900">Achievement :- </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {grandTotal.achievement || 0}
                    </span>
                  </div>
                </td>
                <td colSpan={4} className="border border-black p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-900">Last Year Outstanding:-</span>
                      {(activeTarget.lastYearCollection || 0) > 0 && (
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          ({(activeTarget.lastYearOpeningOutstanding ?? ((activeTarget.lastYearOutstanding ?? 5) + (activeTarget.lastYearCollection ?? 0)))} - {activeTarget.lastYearCollection ?? 0} =)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={activeTarget.lastYearOutstanding !== undefined ? activeTarget.lastYearOutstanding : Number(Math.max(0, (activeTarget.lastYearOpeningOutstanding ?? 5) - (activeTarget.lastYearCollection ?? 0)).toFixed(2))}
                        onChange={(e) => handleQuickMetaChange('lastYearOutstanding', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right font-mono font-bold text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100 rounded border-b border-slate-300 focus:border-black focus:outline-none"
                        title="Last Year Outstanding (₹ / Lakh)"
                      />
                      <span className="font-mono font-bold text-slate-600 text-xs">Lac</span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Row 5: Current Year Outstanding % and Year */}
              <tr>
                <td colSpan={4} className="border border-black p-2 bg-amber-50/70 font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-950 font-extrabold">Current Year Outstanding % :-</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="200"
                        value={activeTarget.currentYearOutstandingPercent ?? 10}
                        onChange={(e) => handleQuickMetaChange('currentYearOutstandingPercent', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center font-mono font-extrabold text-amber-900 bg-white border border-amber-300 rounded px-1 py-0.5 focus:border-amber-600 focus:outline-none"
                        title="करंट इयर आऊटस्टँडिंग पर्सेंटेज (उदा. 10% किंवा 50%)"
                      />
                      <span className="font-extrabold text-amber-900">%</span>
                    </div>
                  </div>
                </td>
                <td colSpan={4} className="border border-black p-1.5 bg-slate-100 text-center font-bold">
                  <span className="text-slate-700">YEAR : </span>
                  <span className="font-extrabold text-slate-900 font-mono ml-1">
                    {activeTarget.year || '2026 - 27'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 12-Month Detailed Excel Table with Direct Inline Editing */}
          <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm mt-1">
            <thead>
              <tr className="bg-slate-200 text-black font-extrabold border-b-2 border-black text-center whitespace-nowrap">
                <th className="border border-black p-1.5 sm:p-2 w-10 sm:w-12 text-center font-black">Sr . No .</th>
                <th className="border border-black p-1.5 sm:p-2 text-center w-24 sm:w-28 font-black">Month</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black">Target (lakh)</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black">Achievement (Lakh)</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black">% Achievement</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black bg-blue-50/70">Collection (Lakh)</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black">Actual Collection (Lakh)</th>
                <th className="border border-black p-1.5 sm:p-2 text-center font-black bg-blue-100/70">% Collection</th>
              </tr>
            </thead>
            <tbody className="whitespace-nowrap text-center">
              {/* --- Q1 Months --- */}
              {q1Months.map((row) => (
                <tr key={row.srNo} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-amber-950 bg-amber-50/30">
                    {row.srNo}
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-black text-slate-900">
                    {row.month}
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.targetLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'targetLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="टार्गेट बदला"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-emerald-800">
                    <input
                      type="number"
                      step="0.01"
                      value={row.achievementLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'achievementLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-emerald-800 bg-transparent hover:bg-emerald-50 focus:bg-emerald-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="झालेला सेल / साध्य बदला"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-slate-900">
                    {row.percentAchievement.toFixed(2)}%
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-blue-900 bg-blue-50/30">
                    <input
                      type="number"
                      step="0.01"
                      value={row.collectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'collectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-blue-900 bg-transparent hover:bg-blue-50 focus:bg-blue-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="अपेक्षित वसुली रक्कम"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.actualCollectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'actualCollectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="प्रत्यक्ष मिळालेली वसुली"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black bg-blue-50/50 text-blue-900">
                    {(row.percentCollection || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {/* Q1 Subtotal */}
              <tr className="bg-[#fef08a] font-extrabold text-black border-y-2 border-black">
                <td colSpan={2} className="border border-black p-1.5 sm:p-2 text-center font-black tracking-wider uppercase">
                  Q1
                </td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q1Total.target}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-emerald-950">{q1Total.achievement}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q1Total.percent.toFixed(2)}%</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q1Total.collection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q1Total.actualCollection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q1Total.actualColPct.toFixed(2)}%</td>
              </tr>

              {/* --- Q2 Months --- */}
              {q2Months.map((row) => (
                <tr key={row.srNo} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-amber-950 bg-amber-50/30">
                    {row.srNo}
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-black text-slate-900">
                    {row.month}
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.targetLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'targetLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="टार्गेट बदला"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-emerald-800">
                    <input
                      type="number"
                      step="0.01"
                      value={row.achievementLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'achievementLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-emerald-800 bg-transparent hover:bg-emerald-50 focus:bg-emerald-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="झालेला सेल / साध्य बदला"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-slate-900">
                    {row.percentAchievement.toFixed(2)}%
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-blue-900 bg-blue-50/30">
                    <input
                      type="number"
                      step="0.01"
                      value={row.collectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'collectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-blue-900 bg-transparent hover:bg-blue-50 focus:bg-blue-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="अपेक्षित वसुली रक्कम"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.actualCollectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'actualCollectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="प्रत्यक्ष मिळालेली वसुली"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black bg-blue-50/50 text-blue-900">
                    {(row.percentCollection || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {/* Q2 Subtotal */}
              <tr className="bg-[#fef08a] font-extrabold text-black border-y-2 border-black">
                <td colSpan={2} className="border border-black p-1.5 sm:p-2 text-center font-black tracking-wider uppercase">
                  Q2
                </td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q2Total.target}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-emerald-950">{q2Total.achievement}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q2Total.percent.toFixed(2)}%</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q2Total.collection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q2Total.actualCollection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q2Total.actualColPct.toFixed(2)}%</td>
              </tr>

              {/* --- Q3 Months --- */}
              {q3Months.map((row) => (
                <tr key={row.srNo} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-amber-950 bg-amber-50/30">
                    {row.srNo}
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-black text-slate-900">
                    {row.month}
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.targetLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'targetLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="टार्गेट बदला"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-emerald-800">
                    <input
                      type="number"
                      step="0.01"
                      value={row.achievementLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'achievementLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-emerald-800 bg-transparent hover:bg-emerald-50 focus:bg-emerald-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="झालेला सेल / साध्य बदला"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-slate-900">
                    {row.percentAchievement.toFixed(2)}%
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-blue-900 bg-blue-50/30">
                    <input
                      type="number"
                      step="0.01"
                      value={row.collectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'collectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-blue-900 bg-transparent hover:bg-blue-50 focus:bg-blue-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="अपेक्षित वसुली रक्कम"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.actualCollectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'actualCollectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="प्रत्यक्ष मिळालेली वसुली"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black bg-blue-50/50 text-blue-900">
                    {(row.percentCollection || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {/* Q3 Subtotal */}
              <tr className="bg-[#fef08a] font-extrabold text-black border-y-2 border-black">
                <td colSpan={2} className="border border-black p-1.5 sm:p-2 text-center font-black tracking-wider uppercase">
                  Q3
                </td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q3Total.target}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-emerald-950">{q3Total.achievement}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q3Total.percent.toFixed(2)}%</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q3Total.collection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q3Total.actualCollection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q3Total.actualColPct.toFixed(2)}%</td>
              </tr>

              {/* --- Q4 Months --- */}
              {q4Months.map((row) => (
                <tr key={row.srNo} className="hover:bg-slate-50 transition-colors">
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-amber-950 bg-amber-50/30">
                    {row.srNo}
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-black text-slate-900">
                    {row.month}
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.targetLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'targetLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="टार्गेट बदला"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-emerald-800">
                    <input
                      type="number"
                      step="0.01"
                      value={row.achievementLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'achievementLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-emerald-800 bg-transparent hover:bg-emerald-50 focus:bg-emerald-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="झालेला सेल / साध्य बदला"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-slate-900">
                    {row.percentAchievement.toFixed(2)}%
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-blue-900 bg-blue-50/30">
                    <input
                      type="number"
                      step="0.01"
                      value={row.collectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'collectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-blue-900 bg-transparent hover:bg-blue-50 focus:bg-blue-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="अपेक्षित वसुली रक्कम"
                    />
                  </td>
                  <td className="border border-black p-1 sm:p-1.5 text-center font-mono font-black text-slate-900">
                    <input
                      type="number"
                      step="0.01"
                      value={row.actualCollectionLakh || ''}
                      onChange={(e) => handleInlineMonthChange(row.srNo, 'actualCollectionLakh', e.target.value)}
                      className="w-16 sm:w-20 text-center font-mono font-black text-slate-900 bg-transparent hover:bg-amber-50 focus:bg-amber-100/90 rounded border-b border-transparent focus:border-black focus:outline-none transition-colors"
                      title="प्रत्यक्ष मिळालेली वसुली"
                    />
                  </td>
                  <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black bg-blue-50/50 text-blue-900">
                    {(row.percentCollection || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {/* Q4 Subtotal */}
              <tr className="bg-[#fef08a] font-extrabold text-black border-y-2 border-black">
                <td colSpan={2} className="border border-black p-1.5 sm:p-2 text-center font-black tracking-wider uppercase">
                  Q4
                </td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q4Total.target}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-emerald-950">{q4Total.achievement}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q4Total.percent.toFixed(2)}%</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q4Total.collection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black">{q4Total.actualCollection}</td>
                <td className="border border-black p-1.5 sm:p-2 text-center font-mono font-black text-blue-950">{q4Total.actualColPct.toFixed(2)}%</td>
              </tr>

              {/* --- Grand Total Row --- */}
              <tr className="bg-[#bbf7d0] font-black text-black border-t-2 border-black text-sm sm:text-base">
                <td colSpan={2} className="border border-black p-2 sm:p-2.5 text-center font-black tracking-wider uppercase">
                  Total
                </td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black">{grandTotal.target}</td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black text-emerald-950">{grandTotal.achievement}</td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black">{grandPercent.toFixed(2)}%</td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black text-blue-950">{grandTotal.collection}</td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black">{grandTotal.actualCollection}</td>
                <td className="border border-black p-2 sm:p-2.5 text-center font-mono font-black text-blue-950">{grandActualColPct.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>

          {/* Shortfall / Balance Display */}
          <div className="mt-3 flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-slate-50 border-2 border-black rounded-lg">
            <div className="text-xs font-bold text-slate-800">
              <span>Balance Shortfall Target: </span>
              <span className="font-mono font-extrabold text-red-700 text-sm ml-1">
                {balanceRemaining} Lac
              </span>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 text-[10px] sm:text-[11px] font-bold text-slate-600 pt-3 sm:pt-0">
              <div className="text-center border-t border-slate-400 px-3 sm:px-4 pt-1">
                <span>स्वाक्षरी (अधिकारी)</span>
              </div>
              <div className="text-center border-t border-slate-400 px-3 sm:px-4 pt-1">
                <span>क्षेत्रीय व्यवस्थापक (ASM)</span>
              </div>
              <div className="text-center border-t border-slate-400 px-3 sm:px-4 pt-1">
                <span>संचालक (Director)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULL EDIT MODAL (WITH LAST YEAR OUTSTANDING & CURRENT YEAR OUTSTANDING %)
          ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'mr' ? 'टार्गेट सीट व आऊटस्टँडिंग टक्केवारी एडिट करा' : 'Edit Target Sheet Details & Outstanding %'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5 mt-4">
              {/* Officer Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'अधिकार्याचे नाव' : 'Officer Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.officerName}
                    onChange={(e) => setEditFormData({ ...editFormData, officerName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'पद (Designation)' : 'Designation'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'mr' ? 'सेंटर / कार्यक्षेत्र (Centres)' : 'Centre / Territory'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.centre}
                    onChange={(e) => setEditFormData({ ...editFormData, centre: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* 2 Key Parameters: Last Year Outstanding & Current Year Outstanding % */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-3 text-amber-900 font-bold text-xs">
                  <Calculator className="w-4 h-4 text-amber-700" />
                  <span>{language === 'mr' ? 'आऊटस्टँडिंग व वसुली कॅल्क्युलेशन पर्याय' : 'Outstanding & Collection Percentage Parameters'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">
                      1. {language === 'mr' ? 'लास्ट इयर आऊटस्टँडिंग (Last Year Outstanding ₹ / Lakh)' : 'Last Year Outstanding (in Lakhs)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.lastYearOutstanding}
                        onChange={(e) => setEditFormData({ ...editFormData, lastYearOutstanding: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold"
                        placeholder="e.g. 5.50"
                      />
                      <span className="font-bold text-xs text-slate-600">Lac</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">
                      2. {language === 'mr' ? 'करंट इयर आऊटस्टँडिंग टक्केवारी (उदा. 10% किंवा 50%)' : 'Current Year Outstanding % (e.g. 10% or 50%)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="200"
                        value={editFormData.currentYearOutstandingPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleApplyOutstandingPercent(val);
                        }}
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-extrabold text-amber-900"
                        placeholder="10"
                      />
                      <span className="font-extrabold text-xs text-amber-900">%</span>
                      <button
                        type="button"
                        onClick={() => handleApplyOutstandingPercent(editFormData.currentYearOutstandingPercent)}
                        className="shrink-0 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                        title="ह्या टक्केवारीनुसार सर्व महिन्यांची वसुली कॅल्क्युलेट करा"
                      >
                        {language === 'mr' ? 'लागू करा' : 'Apply'}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1">
                      {language === 'mr' 
                        ? '💡 जेव्हा तुम्ही 10% किंवा 50% टाकता, तेव्हा झालेल्या सेलच्या टक्केवारीनुसार वसुली रक्कम (Lakh) आपोआप कॅल्क्युलेट होईल.'
                        : '💡 When you enter 10% or 50%, collection amount in Lakhs is calculated automatically from sales.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 12 Months Table Inputs */}
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                    <tr className="text-center">
                      <th className="p-2">#</th>
                      <th className="p-2 text-left">महिना</th>
                      <th className="p-2">टार्गेट (Lakh)</th>
                      <th className="p-2">साध्य (Lakh)</th>
                      <th className="p-2">% साध्य</th>
                      <th className="p-2 bg-blue-50/70">वसुली (Lakh)</th>
                      <th className="p-2">प्रत्यक्ष वसुली (Lakh)</th>
                      <th className="p-2 bg-blue-100/70">% वसुली</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-center">
                    {editFormData.months.map((m, idx) => (
                      <tr key={m.srNo} className="hover:bg-slate-50">
                        <td className="p-2 font-bold font-mono text-amber-950">{m.srNo}</td>
                        <td className="p-2 font-bold text-slate-900 text-left">{m.month}</td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={m.targetLakh}
                            onChange={(e) => handleMonthValueChange(idx, 'targetLakh', parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 bg-white border border-slate-200 rounded text-center font-mono font-bold"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={m.achievementLakh}
                            onChange={(e) => handleMonthValueChange(idx, 'achievementLakh', parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 bg-emerald-50 border border-emerald-300 rounded text-center font-mono font-bold text-emerald-800"
                          />
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-700">
                          {m.percentAchievement.toFixed(1)}%
                        </td>
                        <td className="p-1 bg-blue-50/30">
                          <input
                            type="number"
                            step="0.01"
                            value={m.collectionLakh}
                            onChange={(e) => handleMonthValueChange(idx, 'collectionLakh', parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 bg-blue-50 border border-blue-300 rounded text-center font-mono font-bold text-blue-800"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={m.actualCollectionLakh}
                            onChange={(e) => handleMonthValueChange(idx, 'actualCollectionLakh', parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 bg-white border border-slate-200 rounded text-center font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 font-mono font-bold text-blue-900 bg-blue-50/30">
                          {(m.percentCollection || 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  {language === 'mr' ? 'बदल सेव्ह करा' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW TARGET SHEET MODAL
          ========================================================================= */}
      {isNewSheetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'mr' ? 'नवीन टार्गेट सीट तयार करा' : 'Create New Target Sheet'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewSheetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSheet} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'अधिकारी / युजर निवडा' : 'Select Officer / User'}
                </label>
                <select
                  value={newSheetUser}
                  onChange={(e) => setNewSheetUser(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.name} ({u.role}) - {u.territory}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'mr' ? 'एकूण वार्षिक टार्गेट (Lakhs मध्ये)' : 'Annual Sales Target (in Lakhs)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newSheetTargetLakh}
                  onChange={(e) => setNewSheetTargetLakh(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm"
                  placeholder="e.g. 75"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * 12 महिन्यांमध्ये प्रमाणित प्रमाणात उद्दिष्ट विभागले जाईल.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSheetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  {language === 'mr' ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-xs"
                >
                  {language === 'mr' ? 'सीट तयार करा' : 'Create Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
