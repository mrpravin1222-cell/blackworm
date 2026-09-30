import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer,
  FileDown,
  Save,
  User as UserIcon,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  MonthlyTravelSheetData,
  DailyTravelRow,
  generateMonthlyTravelSheet,
  getRowOtherExpenseAmount,
} from '../utils/travelSheetHelpers';
import { exportElementToPDF, exportElementToPrintOrPDF, triggerPrint } from '../utils/printHelpers';
import { A4PrintPreviewModal } from './A4PrintPreviewModal';
import { BLACKWORM_LOGO_BASE64 } from '../assets/logoBase64';

const getCurrentMonthYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const TravelingExpenses: React.FC = React.memo(() => {
  const { language, currentUser, users, showNotification, saveTravelSheet, companyDetails } = useApp();

  const isAdmin = currentUser ? (
    currentUser.role === 'admin' || 
    (currentUser.name || currentUser.fullName || '').toLowerCase().includes('pravin') || 
    (currentUser.name || currentUser.fullName || '').toLowerCase().includes('shinde') || 
    currentUser.id === 'USR-001'
  ) : false;
  const monthInputRef = React.useRef<HTMLInputElement>(null);

  const handleCalendarClick = () => {
    const elem = monthInputRef.current as HTMLInputElement | null;
    if (elem) {
      if ('showPicker' in elem && typeof elem.showPicker === 'function') {
        elem.showPicker();
      } else {
        elem.focus();
        elem.click();
      }
    }
  };

  // --- MONTHLY A4 TRAVEL SHEET STATE PER USER & MONTH ---
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || 'USR-001');
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getCurrentMonthYear());

  // Active target user
  const activeUser = users.find((u) => u.id === selectedUserId) || currentUser || users[0];

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const [sheetData, setSheetData] = useState<MonthlyTravelSheetData>(() => {
    const userId = currentUser?.id || 'USR-001';
    const currentMonth = getCurrentMonthYear();
    const storageKey = `blackworm_travel_sheet_${userId}_${currentMonth}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear out old sample data if present
        if (parsed.id === 'SHEET-AUG-2026-PRAVIN' && parsed.rows?.[2]?.openingKm === 10104) {
          localStorage.removeItem(storageKey);
        } else {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return generateMonthlyTravelSheet(
      activeUser.fullName || activeUser.name || 'Officer',
      activeUser.designation || 'Sales Officer',
      currentMonth
    );
  });

  const [officerName, setOfficerName] = useState<string>(
    activeUser.fullName || activeUser.name || 'Officer'
  );
  const [designation, setDesignation] = useState<string>(
    activeUser.designation || 'Sales Officer'
  );
  
  // Calculate dynamic initial date string (e.g., "8/1/2026")
  const initialMonthParts = selectedMonthYear.split('-');
  const initialMonthNum = parseInt(initialMonthParts[1] || '8', 10);
  const initialYearNum = parseInt(initialMonthParts[0] || '2026', 10);
  const [sheetDate, setSheetDate] = useState<string>(`${initialMonthNum}/1/${initialYearNum}`);

  // Helper to load sheet data for specific user & month
  const loadSheetData = (userId: string, monthYear: string) => {
    const targetUser = users.find((u) => u.id === userId) || currentUser || users[0];
    const storageKey = `blackworm_travel_sheet_${userId}_${monthYear}`;
    const saved = localStorage.getItem(storageKey);

    let loadedSheet: MonthlyTravelSheetData;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If old sample data was cached, purge it to show clean format
        if (parsed.id === 'SHEET-AUG-2026-PRAVIN' && parsed.rows?.[2]?.openingKm === 10104) {
          localStorage.removeItem(storageKey);
          loadedSheet = generateMonthlyTravelSheet(
            targetUser?.fullName || targetUser?.name || 'Officer',
            targetUser?.designation || 'Sales Officer',
            monthYear
          );
        } else {
          loadedSheet = parsed;
        }
      } catch (e) {
        loadedSheet = generateMonthlyTravelSheet(
          targetUser?.fullName || targetUser?.name || 'Officer',
          targetUser?.designation || 'Sales Officer',
          monthYear
        );
      }
    } else {
      loadedSheet = generateMonthlyTravelSheet(
        targetUser?.fullName || targetUser?.name || 'Officer',
        targetUser?.designation || 'Sales Officer',
        monthYear
      );
    }

    // Dynamic month-based date calculation for form header
    const [yearPart, monthPart] = monthYear.split('-');
    const mNum = parseInt(monthPart, 10);
    const yNum = parseInt(yearPart, 10);
    const dynamicSheetDate = `${mNum}/1/${yNum}`;

    setSheetData(loadedSheet);
    setOfficerName(
      loadedSheet.officerName || targetUser?.fullName || targetUser?.name || 'Officer'
    );
    setDesignation(
      loadedSheet.designation || targetUser?.designation || 'Sales Officer'
    );
    setSheetDate(dynamicSheetDate);
  };

  // Switch sheet whenever selectedUserId or selectedMonthYear changes
  useEffect(() => {
    // If selected user was deleted, switch to first available user
    if (users.length > 0 && !users.some((u) => u.id === selectedUserId)) {
      const fallbackId = (currentUser && users.some((u) => u.id === currentUser.id)) ? currentUser.id : users[0].id;
      setSelectedUserId(fallbackId);
      return;
    }
    loadSheetData(selectedUserId, selectedMonthYear);
  }, [selectedUserId, selectedMonthYear, users, currentUser]);

  // Ensure non-admin users cannot switch away from currentUser.id
  useEffect(() => {
    if (currentUser && !isAdmin && selectedUserId !== currentUser.id) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser, isAdmin, selectedUserId]);

  // Auto-save active sheet state to localStorage
  useEffect(() => {
    const storageKey = `blackworm_travel_sheet_${selectedUserId}_${selectedMonthYear}`;
    const updatedToSave = {
      ...sheetData,
      officerName,
      designation,
      sheetDate,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(updatedToSave));
  }, [
    sheetData,
    officerName,
    designation,
    sheetDate,
    selectedUserId,
    selectedMonthYear,
  ]);

  // Month change handler - automatically updates sheet header date
  const handleMonthChange = (newMonthYear: string) => {
    setSelectedMonthYear(newMonthYear);
    const [yearPart, monthPart] = newMonthYear.split('-');
    const mNum = parseInt(monthPart || '1', 10);
    const yNum = parseInt(yearPart || '2026', 10);
    setSheetDate(`${mNum}/1/${yNum}`);
  };

  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonthYear.split('-');
    let year = parseInt(yearStr || '2026', 10);
    let month = parseInt(monthStr || '8', 10);

    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }

    const newMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    handleMonthChange(newMonthStr);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonthYear.split('-');
    let year = parseInt(yearStr || '2026', 10);
    let month = parseInt(monthStr || '8', 10);

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    const newMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    handleMonthChange(newMonthStr);
  };

  // User Selection change (Admin only)
  const handleUserSelect = (newUserId: string) => {
    if (!isAdmin) return;
    setSelectedUserId(newUserId);
    const selected = users.find((u) => u.id === newUserId);
    showNotification(
      language === 'mr'
        ? `${selected?.fullName || selected?.name} यांची ट्रॅव्हल शीट उघडली.`
        : `Opened travel sheet for ${selected?.fullName || selected?.name}.`,
      'info'
    );
  };

  // Save sheet manually
  const handleSaveSheet = () => {
    const updated = {
      ...sheetData,
      officerName,
      designation,
      sheetDate,
      lastUpdated: new Date().toISOString(),
    };
    setSheetData(updated);

    const sheetKey = `${selectedUserId}_${selectedMonthYear}`;
    saveTravelSheet(sheetKey, updated);

    showNotification(
      language === 'mr'
        ? `${officerName} यांची ट्रॅव्हल सीट सेव्ह झाली!`
        : `Travel sheet for ${officerName} saved successfully!`,
      'success'
    );
  };

  // Row input change handler
  const handleRowChange = (rowId: string, field: keyof DailyTravelRow, value: any) => {
    const newRows = sheetData.rows.map((row) => {
      if (row.id !== rowId) return row;

      const updatedRow = { ...row, [field]: value };

      // Auto calculate KM if opening and closing KM are modified
      if (field === 'openingKm' || field === 'closingKm') {
        const open = field === 'openingKm' ? Number(value) || 0 : row.openingKm;
        const close = field === 'closingKm' ? Number(value) || 0 : row.closingKm;
        updatedRow.km = close > open && open > 0 ? close - open : 0;
      }

      return updatedRow;
    });

    const updated = {
      ...sheetData,
      rows: newRows,
      officerName,
      designation,
      sheetDate,
      lastUpdated: new Date().toISOString(),
    };

    setSheetData(updated);

    const sheetKey = `${selectedUserId}_${selectedMonthYear}`;
    saveTravelSheet(sheetKey, updated);
  };

  // Smart Route Formatting logic: Auto append comma on space unless period '.' was typed
  const handleRouteInput = (rowId: string, currentRoute: string, rawVal: string) => {
    let formatted = rawVal;

    // Check if user typed space at the end
    if (rawVal.length > currentRoute.length && rawVal.endsWith(' ')) {
      const trimmedBeforeSpace = rawVal.slice(0, -1);
      const lastChar = trimmedBeforeSpace.trim().slice(-1);

      // If last char is NOT a period '.', comma ',', dash '-', or slash '/'
      if (
        lastChar &&
        lastChar !== '.' &&
        lastChar !== ',' &&
        lastChar !== '-' &&
        lastChar !== '/'
      ) {
        formatted = trimmedBeforeSpace + ', ';
      }
    }

    handleRowChange(rowId, 'route', formatted);
  };

  // Calculate Sheet Totals
  const totalTravelAmount = sheetData.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalOtherExpenses = sheetData.rows.reduce((sum, r) => sum + getRowOtherExpenseAmount(r), 0);
  const grandTotalExpenses = totalTravelAmount + totalOtherExpenses;
  const totalKm = sheetData.rows.reduce((sum, r) => sum + (Number(r.km) || 0), 0);

  // Opening KM range
  const validOpenings = sheetData.rows.filter((r) => r.openingKm > 0);
  const validClosings = sheetData.rows.filter((r) => r.closingKm > 0);
  const minOpeningKm = validOpenings.length > 0 ? validOpenings[0].openingKm : 0;
  const maxClosingKm =
    validClosings.length > 0 ? validClosings[validClosings.length - 1].closingKm : 0;

  // Average Cost per KM using Grand Total Expenses
  const avgAmountPerKm = totalKm > 0 ? grandTotalExpenses / totalKm : 0;

  // Reliable Print Function for A4 with forced state capture & reflow
  const handlePrint = () => {
    // Force state capture to storage & real-time sync
    const sheetKey = `${selectedUserId}_${selectedMonthYear}`;
    const updatedToSave = {
      ...sheetData,
      officerName,
      designation,
      sheetDate,
      lastUpdated: new Date().toISOString(),
    };
    saveTravelSheet(sheetKey, updatedToSave);
    setIsPrintPreviewOpen(true);
  };

  // Direct PDF Download Function
  const handleDownloadPDF = async () => {
    const sheetKey = `${selectedUserId}_${selectedMonthYear}`;
    const updatedToSave = {
      ...sheetData,
      officerName,
      designation,
      sheetDate,
      lastUpdated: new Date().toISOString(),
    };
    saveTravelSheet(sheetKey, updatedToSave);

    await exportElementToPDF(
      'traveling-expenses-printable',
      `Blackworm_Travel_Expenses_${officerName.replace(/\s+/g, '_')}_${selectedMonthYear}`,
      {
        orientation: 'portrait',
        scale: 2,
      }
    );
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* PERFECT A4 PRINT CSS WITH NO BORDER OVERFLOW & FIXED TEXT FIT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 4mm 5mm 4mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 900 !important;
            font-family: Arial, sans-serif !important;
          }
          header, nav, footer, .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          [class*="min-w-"], .min-w-full {
            min-width: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
          }
          .print-table th, .print-table td {
            border: 1.5px solid #000000 !important;
            padding: 2px 2px !important;
            font-size: 8.5px !important;
            font-weight: 900 !important;
            line-height: 1.2 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            text-overflow: clip !important;
            overflow: visible !important;
            color: #000000 !important;
            box-sizing: border-box !important;
          }
          .print-input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            outline: none !important;
            font-size: 8.5px !important;
            font-weight: 900 !important;
            color: #000000 !important;
            width: 100% !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            box-sizing: border-box !important;
          }
          .print-header-row {
            background-color: #d1e7dd !important;
            -webkit-print-color-adjust: exact !important;
            font-weight: 900 !important;
          }
          .print-subtotal-row {
            background-color: #81c784 !important;
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* TOP CONTROLS BAR: OFFICER NAME (TOP ON MOBILE, FULL WIDTH) | 3 BUTTONS (LINE 2 ON MOBILE, SINGLE LINE ON DESKTOP) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs no-print">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* OFFICER SELECTION (FULL WIDTH ON MOBILE LINE 1, FLEX-1 ON DESKTOP) */}
          <div className="flex items-center gap-1.5 w-full md:w-auto md:flex-1 min-w-0">
            {isAdmin ? (
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-black text-amber-900 uppercase shrink-0">Officer:</span>
                <select
                  id="admin-officer-select"
                  value={selectedUserId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-400 font-black text-xs sm:text-sm focus:border-amber-600 focus:outline-hidden bg-amber-50 text-slate-950 flex-1 min-w-0 cursor-pointer shadow-2xs truncate"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <UserIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-black text-slate-800 uppercase shrink-0">Officer:</span>
                <div className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-black bg-slate-100 text-slate-950 flex-1 min-w-0 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="truncate">{currentUser ? (currentUser.fullName || currentUser.name) : 'Officer'}</span>
                </div>
              </div>
            )}
          </div>

          {/* 3 BUTTONS ROW (LINE 2 ON MOBILE, SINGLE ROW ON MONITOR / DESKTOP VIEW) */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto shrink-0 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-100 justify-between md:justify-end">
            {/* 1. CALENDAR / MONTH SELECTOR WITH PREVIOUS & NEXT ARROWS */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-amber-50/90 border border-amber-400 p-0.5 rounded-xl shadow-2xs shrink-0">
              {/* Previous Month Arrow */}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-amber-200/80 text-amber-900 transition-all cursor-pointer active:scale-90"
                title={language === 'mr' ? 'मागील महिना' : 'Previous Month'}
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 text-amber-900 shrink-0 font-black" />
              </button>

              {/* Month Picker Display */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={handleCalendarClick}
                  className="px-1.5 sm:px-2.5 py-1 text-amber-950 font-black text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap hover:bg-amber-100 rounded-lg transition-colors"
                  title="Select Month & Year"
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                  <span className="font-mono font-black text-[11px] sm:text-xs text-slate-950">{selectedMonthYear}</span>
                </button>
                <input
                  ref={monthInputRef}
                  type="month"
                  value={selectedMonthYear}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              {/* Next Month Arrow */}
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-amber-200/80 text-amber-900 transition-all cursor-pointer active:scale-90"
                title={language === 'mr' ? 'पुढील महिना' : 'Next Month'}
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4 text-amber-900 shrink-0 font-black" />
              </button>
            </div>

            {/* 2. SAVE BUTTON */}
            <button
              id="save-travel-sheet-btn"
              onClick={handleSaveSheet}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{language === 'mr' ? 'सेव्ह' : 'Save'}</span>
            </button>

            {/* 3. PDF DOWNLOAD BUTTON */}
            <button
              id="download-travel-pdf-btn"
              onClick={handleDownloadPDF}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-2xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
              <span>{language === 'mr' ? 'PDF' : 'PDF'}</span>
            </button>

            {/* 4. PRINT BUTTON */}
            <button
              id="print-a4-sheet-btn"
              onClick={handlePrint}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-2xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{language === 'mr' ? '🖨️ A4' : 'Print A4'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SINGLE MONTHLY TRAVEL SHEET (PRINTABLE A4 CONTAINER) */}
      <div id="traveling-expenses-printable" className="print-area bg-white p-2 sm:p-5 rounded-2xl border-2 border-slate-950 shadow-2xs w-full box-border max-w-full">
        {/* UNIFIED HORIZONTAL SCROLL CONTAINER FOR MOBILE FULL VIEW */}
        <div className="overflow-x-auto -mx-2 sm:mx-0 pb-3">
          <div className="min-w-[850px] sm:min-w-full p-1 box-border">
            {/* COMPANY HEADER WITH OFFICIAL LOGO & LEGAL INFO */}
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-3 mb-3">
              <div className="w-44 sm:w-48 shrink-0 flex items-center justify-center p-1.5 bg-white rounded-xl shadow-xs border border-slate-200">
                <img
                  src={companyDetails?.logoUrl || BLACKWORM_LOGO_BASE64}
                  alt="Blackworm Logo"
                  className="h-24 sm:h-28 w-auto max-w-[210px] object-contain mix-blend-multiply"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 text-center px-2">
                <h1 className="text-xl sm:text-3xl font-black text-red-600 uppercase tracking-tight font-serif">
                  {companyDetails?.name || 'BLACKWORM AGRITECH PVT LTD'}
                </h1>
                <p className="text-[11px] font-bold text-slate-900 mt-0.5">
                  CIN: {companyDetails?.cin || 'U01409PN2022PTC217246'} | GST No: {companyDetails?.gstNo || '27AALCB3069J1ZC'}
                </p>
                <p className="text-[10px] text-slate-800 mt-0.5">
                  {companyDetails?.address || 'Gat No. 17 Vijaynagar (Mhaisal), Tal - Miraj, Dist - Sangli. 416409'}
                </p>
              </div>
              <div className="w-36 shrink-0 text-right text-xs font-black text-slate-900">
                <span>Month: {selectedMonthYear}</span>
              </div>
            </div>

            {/* OFFICER INFORMATION HEADER BOX - CLEAR BOLD TEXT WITHOUT DOTTED LINES */}
            <div className="border-2 border-slate-950 text-xs sm:text-sm mb-3 font-black bg-slate-50/90 text-slate-950">
              <div className="flex border-b-2 border-slate-950 justify-between">
                <div className="p-2.5 px-3 flex-1 border-r-2 border-slate-950 flex items-center gap-1.5">
                  <span className="text-slate-950 font-black whitespace-nowrap">Officer Name :- </span>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="font-black text-slate-950 bg-transparent outline-none focus:bg-amber-100/50 px-1.5 flex-1 text-xs sm:text-sm"
                  />
                </div>
                <div className="p-2.5 px-3 w-56 sm:w-64 flex items-center justify-between gap-1.5">
                  <span className="text-slate-950 font-black whitespace-nowrap">Date :- </span>
                  <input
                    type="text"
                    value={sheetDate}
                    onChange={(e) => setSheetDate(e.target.value)}
                    className="font-black text-slate-950 bg-transparent outline-none focus:bg-amber-100/50 px-1.5 w-32 text-right text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="p-2.5 px-3 flex items-center gap-1.5">
                <span className="text-slate-950 font-black whitespace-nowrap">Designation :- </span>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="font-black text-slate-950 bg-transparent outline-none focus:bg-amber-100/50 px-1.5 flex-1 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* MONTHLY TRAVEL SHEET TABLE - UNBOXED DIRECT TYPING CELLS & FULL HEADERS */}
            <table className="print-table w-full text-left text-xs sm:text-sm border-collapse border-2 border-slate-950">
              <thead>
                <tr className="print-header-row bg-[#d1e7dd] text-slate-950 font-black border-b-2 border-slate-950">
                  <th className="keep-nowrap border-2 border-slate-950 py-2 px-2 text-center w-[12%] uppercase font-black text-slate-950 whitespace-nowrap">DATE</th>
                  <th className="keep-nowrap border-2 border-slate-950 py-2 px-2 text-center w-[12%] uppercase font-black text-slate-950 whitespace-nowrap">DAYS</th>
                  <th className="border-2 border-slate-950 py-2 px-3 text-left w-[29%] uppercase font-black text-slate-950">ROUTE</th>
                  <th className="border-2 border-slate-950 py-2 px-2 text-center w-[10%] uppercase font-black text-slate-950 whitespace-nowrap">OPENING KM</th>
                  <th className="border-2 border-slate-950 py-2 px-2 text-center w-[10%] uppercase font-black text-slate-950 whitespace-nowrap">CLOSING KM</th>
                  <th className="border-2 border-slate-950 py-2 px-2 text-center w-[11%] uppercase font-black text-slate-950 whitespace-nowrap">OTHER EXPENSES</th>
                  <th className="border-2 border-slate-950 py-2 px-2 text-center w-[9%] uppercase font-black text-slate-950 whitespace-nowrap">AMOUNT</th>
                  <th className="border-2 border-slate-950 py-2 px-2 text-center w-[7%] uppercase font-black text-slate-950 whitespace-nowrap">KM</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-950 font-black text-slate-950">
                {sheetData.rows.map((row) => {
                  const isSunday = row.dayName === 'sunday' || row.route.toLowerCase() === 'sunday';
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-950 transition-colors ${
                        isSunday ? 'bg-amber-100/70 font-black' : 'bg-white font-black'
                      }`}
                    >
                      <td className="keep-nowrap border border-slate-950 py-1.5 px-2 text-center font-mono text-xs sm:text-sm font-black text-slate-950 whitespace-nowrap">
                        {row.dateStr}
                      </td>
                      <td className="keep-nowrap border border-slate-950 py-1.5 px-2 text-center text-xs sm:text-sm capitalize font-black text-slate-950 whitespace-nowrap">
                        {row.dayName}
                      </td>
                      <td className="border border-slate-950 p-0 bg-transparent">
                        <input
                          type="text"
                          value={row.route}
                          onChange={(e) => handleRouteInput(row.id, row.route, e.target.value)}
                          placeholder="Route..."
                          className="print-input w-full px-2 py-1.5 text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:bg-amber-100/60 font-black text-slate-950 placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border border-slate-950 p-0 text-center font-mono bg-transparent">
                        <input
                          type="number"
                          value={row.openingKm || ''}
                          onChange={(e) => handleRowChange(row.id, 'openingKm', e.target.value)}
                          placeholder=""
                          className="print-input w-full text-center px-1 py-1.5 font-mono text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:bg-amber-100/60 font-black text-slate-950"
                        />
                      </td>
                      <td className="border border-slate-950 p-0 text-center font-mono bg-transparent">
                        <input
                          type="number"
                          value={row.closingKm || ''}
                          onChange={(e) => handleRowChange(row.id, 'closingKm', e.target.value)}
                          placeholder=""
                          className="print-input w-full text-center px-1 py-1.5 font-mono text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:bg-amber-100/60 font-black text-slate-950"
                        />
                      </td>
                      <td className="border border-slate-950 p-0 text-center font-mono bg-transparent">
                        <input
                          type="text"
                          value={row.otherExpensesNote}
                          onChange={(e) => handleRowChange(row.id, 'otherExpensesNote', e.target.value)}
                          placeholder=""
                          className="print-input w-full text-center px-1 py-1.5 text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:bg-amber-100/60 font-black text-slate-950 placeholder:text-slate-400"
                        />
                      </td>
                      <td className="border border-slate-950 p-0 text-center font-mono bg-transparent">
                        <input
                          type="number"
                          value={row.amount || ''}
                          onChange={(e) => handleRowChange(row.id, 'amount', Number(e.target.value))}
                          placeholder=""
                          className="print-input w-full text-center px-1 py-1.5 font-mono text-xs sm:text-sm bg-transparent border-none outline-none focus:outline-none focus:bg-amber-100/60 font-black text-slate-950"
                        />
                      </td>
                      <td className="border border-slate-950 py-1.5 px-2 text-center font-mono text-xs sm:text-sm font-black text-slate-950 whitespace-nowrap">
                        {row.km > 0 ? row.km : 0}
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal Green Row */}
                <tr className="print-subtotal-row bg-[#81c784] font-black text-xs sm:text-sm border-t-2 border-slate-950 text-slate-950">
                  <td colSpan={3} className="border-2 border-slate-950 py-2 px-3 text-right uppercase font-black whitespace-nowrap">
                    Subtotal:
                  </td>
                  <td className="border-2 border-slate-950 py-2 px-2 text-center font-mono font-black text-xs sm:text-sm whitespace-nowrap">
                    {minOpeningKm > 0 ? minOpeningKm : '-'}
                  </td>
                  <td className="border-2 border-slate-950 py-2 px-2 text-center font-mono font-black text-xs sm:text-sm whitespace-nowrap">
                    {maxClosingKm > 0 ? maxClosingKm : '-'}
                  </td>
                  <td className="border-2 border-slate-950 py-2 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    {totalOtherExpenses > 0 ? `₹${totalOtherExpenses.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="border-2 border-slate-950 py-2 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    ₹{totalTravelAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="border-2 border-slate-950 py-2 px-2 text-center font-mono font-black text-xs sm:text-sm whitespace-nowrap">
                    {totalKm}
                  </td>
                </tr>

                {/* AVERAGE COST PER KM BREAKDOWN ROW */}
                <tr className="border-t-2 border-slate-950 font-black text-xs sm:text-sm bg-amber-50">
                  <td colSpan={5} className="border-2 border-slate-950 py-2.5 px-3 text-right uppercase text-slate-950 font-black whitespace-nowrap">
                    AVERAGE COST PER KM
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    ₹{grandTotalExpenses} ÷ {totalKm} KM
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-red-700 text-sm sm:text-base whitespace-nowrap">
                    ₹{avgAmountPerKm.toFixed(2)}
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    / KM
                  </td>
                </tr>

                {/* TOTAL EXPENSES AMOUNT ROW */}
                <tr className="border-t-2 border-slate-950 font-black text-xs sm:text-sm bg-emerald-100">
                  <td colSpan={5} className="border-2 border-slate-950 py-2.5 px-3 text-right uppercase text-slate-950 font-black whitespace-nowrap">
                    TOTAL EXPENSES AMOUNT
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    ₹{totalTravelAmount} + ₹{totalOtherExpenses}
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-emerald-950 text-base sm:text-lg whitespace-nowrap">
                    ₹{grandTotalExpenses.toLocaleString('en-IN')}
                  </td>
                  <td className="border-2 border-slate-950 py-2.5 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-950 whitespace-nowrap">
                    TOTAL ₹
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* A4 Print Preview & Auto-Fit Modal */}
      <A4PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        elementId="traveling-expenses-printable"
        title={`Blackworm Travel Expenses - ${officerName} (${selectedMonthYear})`}
        filename={`Blackworm_Travel_Expenses_${officerName.replace(/\s+/g, '_')}_${selectedMonthYear}`}
        defaultLandscape={false}
        language={language}
      />
    </div>
  );
});
