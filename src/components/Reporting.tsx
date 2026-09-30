import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyLetterhead } from './CompanyLetterhead';
import { PrintActions } from './PrintActions';
import { exportElementToPDF, triggerPrint } from '../utils/printHelpers';
import {
  generateMonthlyTravelSheet,
  getRowOtherExpenseAmount,
  MonthlyTravelSheetData,
} from '../utils/travelSheetHelpers';
import { User, DealerCollectionRecord } from '../types';
import {
  BarChart3,
  Download,
  FileDown,
  User as UserIcon,
  Calendar,
  Compass,
  Target,
  Users,
  RefreshCw,
  CalendarCheck2,
  IndianRupee,
  Building2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Car,
  Receipt,
  Layers,
  Eye,
} from 'lucide-react';

const getTodayDateStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const Reporting: React.FC = React.memo(() => {
  const {
    language,
    targets,
    users,
    travelExpenses,
    dealerApplications,
    dealerOrders,
    dealerCollections,
    dailyActivities,
    currentUser,
    travelSheets,
    refreshData,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial sync check on mount
  useEffect(() => {
    refreshData().catch(() => {});
  }, [refreshData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (_) {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const isAdmin = currentUser
    ? currentUser.role === 'admin' ||
      currentUser.loginId === 'admin' ||
      currentUser.loginId === 'pravin' ||
      currentUser.id === 'USR-001' ||
      currentUser.id === 'USR-PRAVIN' ||
      (currentUser.fullName && (currentUser.fullName.toLowerCase().includes('shreedhar') || currentUser.fullName.toLowerCase().includes('pravin'))) ||
      (currentUser.name && (currentUser.name.toLowerCase().includes('shreedhar') || currentUser.name.toLowerCase().includes('pravin')))
    : false;

  // View Mode: 'all_officers_daily' (Master Daily Track Report) vs 'single_officer_detailed'
  const [reportViewMode, setReportViewMode] = useState<'all_officers_daily' | 'single_officer_detailed'>(() => {
    return isAdmin ? 'all_officers_daily' : 'single_officer_detailed';
  });

  // Selected Date for All Officers Daily Master Report (Default to current date, e.g. 2026-09-25)
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => {
    return getTodayDateStr();
  });

  // Selected Officer ID for Single Officer View
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    return currentUser?.id || 'USR-PRAVIN';
  });

  // Selected Month Year string (e.g. "2026-09")
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Non-admin officers are strictly forced to see ONLY their own report
  useEffect(() => {
    if (!isAdmin && currentUser) {
      setReportViewMode('single_officer_detailed');
      setSelectedOfficerId(currentUser.id);
    }
  }, [currentUser, isAdmin]);

  // Active Selected Officer
  const activeOfficer = useMemo(() => {
    if (!isAdmin && currentUser) return currentUser;
    return users.find((u) => u.id === selectedOfficerId) || currentUser || users[0];
  }, [users, selectedOfficerId, currentUser, isAdmin]);

  // Date comparison helper across YYYY-MM-DD, M/D/YYYY, ISO strings
  const isSameDate = (d1?: string, d2?: string): boolean => {
    if (!d1 || !d2) return false;
    const s1 = d1.split('T')[0].split(' ')[0].trim();
    const s2 = d2.split('T')[0].split(' ')[0].trim();
    if (s1 === s2) return true;

    const parse = (s: string) => {
      let year = 0, month = 0, day = 0;
      if (s.includes('-')) {
        const parts = s.split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
      } else if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
          const p1 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[1], 10);
          const p3 = parseInt(parts[2], 10);
          if (p3 > 1000) {
            year = p3;
            month = p1;
            day = p2;
          } else if (p1 > 1000) {
            year = p1;
            month = p2;
            day = p3;
          }
        }
      }
      return { year, month, day };
    };

    const p1 = parse(s1);
    const p2 = parse(s2);
    if (p1.year > 0 && p2.year > 0) {
      return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
    }
    return false;
  };

  // Convert calendar date to financial year month number (April=1, May=2, ..., Dec=9, Jan=10, Feb=11, Mar=12)
  const getFinMonthSrNo = (dateStr: string): number => {
    if (!dateStr) return 6;
    const parts = dateStr.split('-');
    const monthNum = parseInt(parts[1], 10);
    if (isNaN(monthNum)) return 6;
    if (monthNum >= 4) {
      return monthNum - 3;
    } else {
      return monthNum + 9;
    }
  };

  // Helper to compute target metrics for any given officer strictly from their TargetSheet
  const computeOfficerTargetMetrics = (officer: User, dateStr: string = selectedDailyDate) => {
    const offName = (officer.fullName || officer.name || '').toLowerCase();
    const targetSheet = targets.find((t) => {
      if (t.userId === officer.id || t.executiveId === officer.id || t.id === `TGT-${officer.id}`) return true;
      const tName = (t.executiveName || t.personName || '').toLowerCase();
      return tName && offName && (tName.includes(offName) || offName.includes(tName));
    });

    if (!targetSheet) {
      return {
        annualTargetRs: 0,
        tillDateTargetRs: 0,
        tillDateAchievedRs: 0,
        tillDateOrderValueRs: 0,
        tillDatePercent: 0,
        backlogRs: 0,
        surplusRs: 0,
        isAchieved: true,
        hasTargetSheet: false,
      };
    }

    const monthsData = targetSheet.monthsData || [];
    const activeFinMonthSrNo = getFinMonthSrNo(dateStr);

    let tillDateTargetLakh = 0;
    let tillDateCollectedRs = 0;
    let tillDateOrderValueRs = 0;

    // 1. Sum up targets up to current active month from target sheet
    monthsData.forEach((m) => {
      if (m.srNo <= activeFinMonthSrNo) {
        tillDateTargetLakh += Number(m.targetLakh) || 0;
      }
    });

    // Fallback: If monthsData target is 0 but salesTargetLakh exists, prorate target
    if (tillDateTargetLakh <= 0 && targetSheet.salesTargetLakh && targetSheet.salesTargetLakh > 0) {
      tillDateTargetLakh = (targetSheet.salesTargetLakh / 12) * activeFinMonthSrNo;
    }

    // 2. Calculate actual collections for this officer from dealerCollections
    dealerCollections.forEach((col) => {
      const isOfficer =
        col.recordedBy === officer.id ||
        (col.officerName && (col.officerName.toLowerCase().includes(offName) || offName.includes(col.officerName.toLowerCase())));
      if (isOfficer && col.collectionDate) {
        const colMonthSrNo = getFinMonthSrNo(col.collectionDate);
        if (colMonthSrNo <= activeFinMonthSrNo) {
          tillDateCollectedRs += col.amount || 0;
        }
      }
    });

    // 3. Calculate actual orders for this officer from dealerOrders
    dealerOrders.forEach((order) => {
      const isOfficer =
        (order.officerName && (order.officerName.toLowerCase().includes(offName) || offName.includes(order.officerName.toLowerCase()))) ||
        order.items?.some((item: any) => item.officerId === officer.id);
      if (isOfficer && order.createdAt) {
        const orderMonthSrNo = getFinMonthSrNo(order.createdAt.split('T')[0]);
        if (orderMonthSrNo <= activeFinMonthSrNo) {
          tillDateOrderValueRs += order.totalAmount || 0;
        }
      }
    });

    const tillDateTargetRs = Math.round(tillDateTargetLakh * 100000);
    const backlogRs = tillDateTargetRs - tillDateCollectedRs;
    const tillDatePercent = tillDateTargetRs > 0 ? Math.round((tillDateCollectedRs / tillDateTargetRs) * 100) : 0;

    return {
      annualTargetRs: (targetSheet.salesTargetLakh || 0) * 100000,
      tillDateTargetRs,
      tillDateAchievedRs: tillDateCollectedRs,
      tillDateOrderValueRs,
      tillDatePercent,
      backlogRs: backlogRs > 0 ? backlogRs : 0,
      surplusRs: backlogRs < 0 ? Math.abs(backlogRs) : 0,
      isAchieved: backlogRs <= 0,
      hasTargetSheet: true,
    };
  };

  // Helper to compute daily travel row for any given officer on selected date
  const getOfficerDailyTravelData = (officer: User, dateStr: string) => {
    const monthYear = dateStr.slice(0, 7);
    let sheetData: MonthlyTravelSheetData | null = null;

    const possibleKeys = [
      `${officer.id}_${monthYear}`,
      `${officer.loginId}_${monthYear}`,
      `blackworm_travel_sheet_${officer.id}_${monthYear}`,
      `blackworm_travel_sheet_${officer.loginId}_${monthYear}`,
    ];

    if (travelSheets) {
      for (const key of possibleKeys) {
        if (travelSheets[key] && Array.isArray(travelSheets[key].rows)) {
          sheetData = travelSheets[key];
          break;
        }
      }

      if (!sheetData) {
        const officerSearchName = (officer.fullName || officer.name || '').toLowerCase();
        for (const [k, v] of Object.entries(travelSheets)) {
          if (k.endsWith(`_${monthYear}`) && v && Array.isArray(v.rows)) {
            const pName = (v.officerName || '').toLowerCase();
            if (
              v.employeeId === officer.id ||
              (pName && officerSearchName && (pName.includes(officerSearchName) || officerSearchName.includes(pName)))
            ) {
              sheetData = v;
              break;
            }
          }
        }
      }
    }

    if (!sheetData) {
      for (const key of possibleKeys) {
        const directKey = key.startsWith('blackworm_travel_sheet_') ? key : `blackworm_travel_sheet_${key}`;
        const saved = localStorage.getItem(directKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.rows)) {
              sheetData = parsed;
              break;
            }
          } catch (_) { /* ignore */ }
        }
      }
    }

    const rowFromSheet = sheetData?.rows?.find((r) => isSameDate(r.dateStr, dateStr));

    let effectiveRoute = (rowFromSheet?.route || '').trim();
    let openingKm = Number(rowFromSheet?.openingKm) || 0;
    let closingKm = Number(rowFromSheet?.closingKm) || 0;
    let allowanceAmt = Number(rowFromSheet?.amount) || 0;
    let otherAmt = rowFromSheet ? getRowOtherExpenseAmount(rowFromSheet) : 0;

    let hasRealData = !!(effectiveRoute || openingKm > 0 || closingKm > 0 || allowanceAmt > 0 || otherAmt > 0);

    const officerSearchName = (officer.fullName || officer.name || '').toLowerCase();

    // 1. Travel expenses on dateStr
    travelExpenses.forEach((exp) => {
      if (
        (exp.employeeId === officer.id || (exp.employeeName && exp.employeeName.toLowerCase().includes(officerSearchName))) &&
        isSameDate(exp.travelDate, dateStr)
      ) {
        hasRealData = true;
        if (!effectiveRoute) {
          const locs = [exp.fromLocation, exp.toLocation, exp.purpose].filter(Boolean);
          if (locs.length > 0) effectiveRoute = locs.join(' → ');
        }
        if (allowanceAmt === 0) {
          allowanceAmt = (exp.fuelAmount || 0) + (exp.lodgingAmount || 0) + (exp.foodDaAmount || 0) + (exp.tollParkingAmount || 0);
        }
      }
    });

    // 2. Dealer Applications submitted on dateStr
    dealerApplications.forEach((app) => {
      if (
        (app.assignedOfficer && app.assignedOfficer.toLowerCase().includes(officerSearchName)) &&
        isSameDate(app.applicationDate, dateStr)
      ) {
        hasRealData = true;
        if (!effectiveRoute) {
          const loc = [app.district, app.taluka, app.firmName].filter(Boolean).join(', ');
          if (loc) effectiveRoute = loc;
        }
      }
    });

    // 3. Dealer Orders submitted on dateStr
    dealerOrders.forEach((ord) => {
      if (
        (ord.officerName && ord.officerName.toLowerCase().includes(officerSearchName)) &&
        (isSameDate(ord.createdAt, dateStr) || isSameDate(ord.billDate, dateStr))
      ) {
        hasRealData = true;
        if (!effectiveRoute && ord.dealerName) effectiveRoute = ord.dealerName;
      }
    });

    // 4. Dealer Collections logged on dateStr
    dealerCollections.forEach((col) => {
      if (
        (col.officerName && col.officerName.toLowerCase().includes(officerSearchName)) &&
        (isSameDate(col.createdAt, dateStr) || isSameDate(col.collectionDate, dateStr))
      ) {
        hasRealData = true;
        if (!effectiveRoute && col.dealerName) effectiveRoute = col.dealerName;
      }
    });

    // 5. Daily Activities logged on dateStr
    dailyActivities.forEach((act) => {
      if (
        (act.employeeId === officer.id || (act.employeeName && act.employeeName.toLowerCase().includes(officerSearchName))) &&
        isSameDate(act.date, dateStr)
      ) {
        hasRealData = true;
        if (!effectiveRoute) {
          effectiveRoute = act.village || act.dealerName || act.farmerOrPersonName || '';
        }
      }
    });

    const dayKm = closingKm > openingKm ? closingKm - openingKm : (rowFromSheet?.km || 0);
    const totalDailyExp = allowanceAmt + otherAmt;

    return {
      row: {
        id: rowFromSheet?.id || 'empty',
        dateStr,
        dayName: rowFromSheet?.dayName || '',
        route: effectiveRoute,
        openingKm,
        closingKm,
        otherExpensesNote: rowFromSheet?.otherExpensesNote || '',
        km: dayKm,
        amount: allowanceAmt,
      },
      dayKm,
      allowanceAmt,
      otherAmt,
      totalDailyExp,
      hasRealData,
    };
  };

  // Helper to compute daily collections for an officer on selected date
  const getOfficerDailyCollections = (officer: User, dateStr: string) => {
    const offName = (officer.fullName || officer.name || '').toLowerCase();
    const records = dealerCollections.filter((c) => {
      const isOfficer =
        c.recordedBy === officer.id ||
        (c.officerName && (c.officerName.toLowerCase().includes(offName) || offName.includes(c.officerName.toLowerCase())));
      return isOfficer && (isSameDate(c.collectionDate, dateStr) || isSameDate(c.createdAt, dateStr));
    });

    const totalAmount = records.reduce((sum, c) => sum + (c.amount || 0), 0);

    return {
      totalAmount,
      records,
    };
  };

  // Master Data for ALL OFFICERS on Selected Date (NO FILTERING OUT - SHOW EVERY OFFICER)
  const allOfficersDailyReport = useMemo(() => {
    return users.map((officer) => {
      const travel = getOfficerDailyTravelData(officer, selectedDailyDate);
      const metrics = computeOfficerTargetMetrics(officer, selectedDailyDate);
      const collections = getOfficerDailyCollections(officer, selectedDailyDate);

      const offName = (officer.fullName || officer.name || '').toLowerCase();
      const todayOrdersTotal = dealerOrders
        .filter((o) => {
          const isOfficer =
            (o.officerName && (o.officerName.toLowerCase().includes(offName) || offName.includes(o.officerName.toLowerCase()))) ||
            o.items?.some((item: any) => item.officerId === officer.id);
          return isOfficer && (isSameDate(o.createdAt, selectedDailyDate) || isSameDate(o.billDate, selectedDailyDate));
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        officer,
        travel,
        metrics,
        collections,
        todayOrdersTotal,
      };
    });
  }, [users, selectedDailyDate, targets, dealerOrders, dealerCollections, dailyActivities, travelExpenses, travelSheets]);

  // Master Summary KPIs for Selected Date
  const masterDailyKPIs = useMemo(() => {
    let totalKmToday = 0;
    let totalExpenseToday = 0;
    let totalCollectionToday = 0;
    let totalBacklogOverall = 0;
    let activeOfficersCount = 0;

    allOfficersDailyReport.forEach((item) => {
      totalKmToday += item.travel.dayKm;
      totalExpenseToday += item.travel.totalDailyExp;
      totalCollectionToday += item.collections.totalAmount;
      totalBacklogOverall += item.metrics.backlogRs;
      if (item.travel.hasRealData || item.collections.totalAmount > 0) {
        activeOfficersCount++;
      }
    });

    return {
      totalKmToday,
      totalExpenseToday,
      totalCollectionToday,
      totalBacklogOverall,
      activeOfficersCount,
      totalOfficers: allOfficersDailyReport.length,
    };
  }, [allOfficersDailyReport]);

  // Single Officer Monthly Sheet Data
  const activeOfficerTravelSheet = useMemo<MonthlyTravelSheetData>(() => {
    if (!activeOfficer) {
      return generateMonthlyTravelSheet('Officer', '', selectedMonthYear);
    }

    const possibleKeys = [
      `${activeOfficer.id}_${selectedMonthYear}`,
      `${activeOfficer.loginId}_${selectedMonthYear}`,
      `blackworm_travel_sheet_${activeOfficer.id}_${selectedMonthYear}`,
      `blackworm_travel_sheet_${activeOfficer.loginId}_${selectedMonthYear}`,
    ];

    if (travelSheets) {
      for (const key of possibleKeys) {
        if (travelSheets[key] && Array.isArray(travelSheets[key].rows)) {
          return travelSheets[key];
        }
      }
    }

    for (const key of possibleKeys) {
      const directKey = key.startsWith('blackworm_travel_sheet_') ? key : `blackworm_travel_sheet_${key}`;
      const saved = localStorage.getItem(directKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.rows)) return parsed;
        } catch (_) { /* ignore */ }
      }
    }

    const name = activeOfficer.fullName || activeOfficer.name || 'Sales Officer';
    return generateMonthlyTravelSheet(name, '', selectedMonthYear);
  }, [activeOfficer, selectedMonthYear, travelSheets]);

  // Single Officer Travel Totals
  const activeOfficerTarget = useMemo(() => {
    if (!activeOfficer) return null;
    const officerName = (activeOfficer.fullName || activeOfficer.name || '').toLowerCase();
    return targets.find(
      (t) =>
        t.executiveId === activeOfficer.id ||
        (t.executiveName && t.executiveName.toLowerCase().includes(officerName)) ||
        (officerName.includes(t.executiveName?.toLowerCase() || ''))
    );
  }, [targets, activeOfficer]);

  const activeOfficerTravelTotals = useMemo(() => {
    let totalKm = 0;
    let totalAllowance = 0;
    let totalOther = 0;

    if (activeOfficerTravelSheet && activeOfficerTravelSheet.rows) {
      activeOfficerTravelSheet.rows.forEach((r) => {
        const km = r.closingKm > r.openingKm ? r.closingKm - r.openingKm : r.km || 0;
        const otherAmt = getRowOtherExpenseAmount(r);
        totalKm += km;
        totalAllowance += Number(r.amount) || 0;
        totalOther += otherAmt;
      });
    }

    const grandTotalExpense = totalAllowance + totalOther;
    const avgCostPerKm = totalKm > 0 ? Number((grandTotalExpense / totalKm).toFixed(2)) : 0;

    return {
      totalKm,
      totalAllowance,
      totalOther,
      grandTotalExpense,
      avgCostPerKm,
    };
  }, [activeOfficerTravelSheet]);

  // Daily activities matching active officer and month
  const activeOfficerDailyActivities = useMemo(() => {
    return dailyActivities.filter((act) => {
      const isOfficer =
        act.employeeId === activeOfficer.id ||
        (act.employeeName &&
          activeOfficer.fullName &&
          act.employeeName.toLowerCase().includes(activeOfficer.fullName.toLowerCase()));
      if (!isOfficer) return false;
      if (selectedMonthYear && !act.date.startsWith(selectedMonthYear)) return false;
      return true;
    });
  }, [dailyActivities, activeOfficer, selectedMonthYear]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportViewMode === 'all_officers_daily') {
      csvContent += `Report,All Officers Daily Track Summary\nDate,${selectedDailyDate}\n\n`;
      csvContent += 'Officer Name,Designation,Daily Route,Opening KM,Closing KM,Total KM,Today Collection,Today Collection Parties,Till Date Target,Till Date Collection,Backlog\n';

      allOfficersDailyReport.forEach((item) => {
        const u = item.officer;
        const tr = item.travel;
        const m = item.metrics;
        const col = item.collections;
        const partiesStr = col.records.map((r) => `${r.dealerName}: Rs.${r.amount}`).join('; ');
        csvContent += `"${u.fullName || u.name}","${u.designation || u.role}","${tr.row.route || ''}",${tr.row.openingKm || 0},${tr.row.closingKm || 0},${tr.dayKm},${col.totalAmount},"${partiesStr}",${m.tillDateTargetRs},${m.tillDateAchievedRs},${m.backlogRs}\n`;
      });
    } else {
      csvContent += `Officer,${activeOfficer?.fullName || activeOfficer?.name}\n`;
      csvContent += `Month,${selectedMonthYear}\n\n`;
      csvContent += 'Date,Day,Route/Visited Towns,Opening KM,Closing KM,Total KM,Daily Allowance,Other/Lodging,Total Daily Expense\n';

      activeOfficerTravelSheet.rows.forEach((r) => {
        const km = r.closingKm > r.openingKm ? r.closingKm - r.openingKm : r.km || 0;
        const otherAmt = getRowOtherExpenseAmount(r);
        const totalDaily = (Number(r.amount) || 0) + otherAmt;
        csvContent += `"${r.dateStr}","${r.dayName}","${r.route || ''}",${r.openingKm || 0},${r.closingKm || 0},${km},${r.amount || 0},${otherAmt},${totalDaily}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Blackworm_Daily_Track_Report_${selectedDailyDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reporting-printable-container" className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* Printable Letterhead for PDF Export / Printing */}
      <div className="print:block hidden mb-4">
        <CompanyLetterhead showBankDetails={false} />
        <div className="text-center my-4 border-b pb-2 border-slate-300">
          <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
            {reportViewMode === 'all_officers_daily'
              ? `सर्व अधिकाऱ्यांचा दैनिक ट्रॅक, किलोमीटर, वसुली व टार्गेट अहवाल (${selectedDailyDate})`
              : `अधिकारी दैनिक मार्ग, टार्गेट अचिव्हमेंट व बॅकलॉग अहवाल (${selectedMonthYear})`}
          </h2>
          <p className="text-xs font-bold text-slate-700 mt-1">
            {reportViewMode === 'all_officers_daily'
              ? `एकूण अधिकारी: ${masterDailyKPIs.totalOfficers} | तारीख: ${selectedDailyDate}`
              : `अधिकारी: ${activeOfficer?.fullName || activeOfficer?.name} | महिना: ${selectedMonthYear}`}
          </p>
        </div>
      </div>

      {/* Control Header & Filters */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center shadow-md shadow-red-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'ऑफिसर डेली ट्रॅक व टार्गेट अहवाल' : 'Officer Daily Track & Target Report'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isAdmin
                  ? 'प्रत्येक अधिकाऱ्याचा दैनिक रोड, ओपनिंग/क्लोजिंग किलोमीटर, पार्टी-वाईज वसुली व टार्गेट शीट प्रगती'
                  : 'माझा दैनिक प्रवास मार्ग, ओपनिंग/क्लोजिंग किमी, पार्टी-वाईज वसुली व टार्गेट प्रगती'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Real-time Cloud Sync Live Indicator & Manual Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title={language === 'mr' ? 'डेटा रीलोड करा' : 'Refresh real-time data from cloud'}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing
                  ? (language === 'mr' ? 'अपडेट होत आहे...' : 'Syncing...')
                  : (language === 'mr' ? 'लाईव्ह सिंक' : 'Live Sync')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{language === 'mr' ? 'एक्सेल/CSV' : 'Export CSV'}</span>
            </button>

            <PrintActions
              elementId={reportViewMode === 'all_officers_daily' ? 'all-officers-report' : 'single-officer-report'}
              title={reportViewMode === 'all_officers_daily' ? 'All Officers Master Daily Track Report' : `Full Report - ${activeOfficer?.fullName || activeOfficer?.name}`}
              landscape={reportViewMode === 'all_officers_daily'}
            />

            {reportViewMode === 'single_officer_detailed' && activeOfficer && (
              <button
                type="button"
                onClick={() => {
                  exportElementToPDF('single-officer-report', `Full_Report_${activeOfficer.fullName || activeOfficer.name}_${selectedMonthYear}`, { 
                    orientation: 'portrait', 
                    scale: 2 
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>{language === 'mr' ? 'अहवाल डाउनलोड करा' : 'Download Full Report'}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle Bar (Visible for Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setReportViewMode('all_officers_daily')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportViewMode === 'all_officers_daily'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{language === 'mr' ? 'सर्व अधिकाऱ्यांचा डेली ट्रॅक रिपोर्ट' : 'All Officers Daily Track'}</span>
            </button>

            <button
              type="button"
              onClick={() => setReportViewMode('single_officer_detailed')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportViewMode === 'single_officer_detailed'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>{language === 'mr' ? 'वैयक्तिक अधिकारी अहवाल' : 'Single Officer Report'}</span>
            </button>
          </div>
        )}

        {/* Filters Bar depending on View Mode */}
        {reportViewMode === 'all_officers_daily' ? (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Daily Date Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {language === 'mr' ? 'रिपोर्ट तारीख निवडा (Select Date)' : 'Select Track Date'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* KPI 1: Active Field Officers */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <Compass className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {language === 'mr' ? 'एकूण अधिकारी ऑन-फील्ड' : 'Active Field Officers'}
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {masterDailyKPIs.activeOfficersCount} / {masterDailyKPIs.totalOfficers} {language === 'mr' ? 'अधिकारी' : 'Officers'}
                  </span>
                </div>
              </div>

              {/* KPI 2: Total Km Today */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <Car className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {language === 'mr' ? 'आजचे एकूण किलोमीटर' : 'Total KM Today'}
                  </span>
                  <span className="text-sm font-black text-blue-700 font-mono">
                    {masterDailyKPIs.totalKmToday} km
                  </span>
                </div>
              </div>

              {/* KPI 3: Today's Collection */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <IndianRupee className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {language === 'mr' ? 'आजचे एकूण जमा कलेक्शन' : "Today's Total Collection"}
                  </span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    ₹{masterDailyKPIs.totalCollectionToday.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            {/* Officer Selector (Only enabled for Admin) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'mr' ? 'अधिकारी निवडा (Select Officer)' : 'Select Officer'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all disabled:opacity-80"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.name} ({u.designation || u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {language === 'mr' ? 'महिना व वर्ष (Select Month)' : 'Select Month'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="month"
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= VIEW 1: ALL OFFICERS DAILY MASTER REPORT (ADMIN / ALL OFFICERS VIEW) ================= */}
      {reportViewMode === 'all_officers_daily' && (
        <div id="all-officers-report" className="space-y-6 animate-in fade-in duration-200 p-1">
          {/* ALL OFFICERS DAILY MASTER TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {language === 'mr'
                    ? `सर्व अधिकाऱ्यांचा दैनिक ट्रॅक, किलोमीटर, जमा वसुली व टार्गेट शीट रिपोर्ट (${selectedDailyDate})`
                    : `All Officers Daily Track, Route, KM, Collection & Target Sheet Report (${selectedDailyDate})`}
                </h2>
              </div>
              <span className="text-xs text-slate-300 font-bold font-mono">
                {language === 'mr' ? `एकूण अधिकारी: ${allOfficersDailyReport.length}` : `Total Officers: ${allOfficersDailyReport.length}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-12">अ.क्र.</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[170px]">{language === 'mr' ? 'अधिकाऱ्याचे नाव व हुद्दा' : 'Officer Name & Role'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[180px]">{language === 'mr' ? 'आजचा प्रवास रोड / मार्ग' : "Today's Route / Road"}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">{language === 'mr' ? 'ओपनिंग KM' : 'Opening KM'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">{language === 'mr' ? 'क्लोजिंग KM' : 'Closing KM'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24 bg-slate-200/60">{language === 'mr' ? 'टोटल KM' : 'Total KM'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[180px] bg-emerald-50/60 text-emerald-900">{language === 'mr' ? 'आजचे जमा कलेक्शन (पार्टी-वाईज)' : "Today's Collection (Party-wise)"}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[110px]">{language === 'mr' ? 'दैनिक टीए/डीए खर्च (₹)' : 'Daily Expense (₹)'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[130px]">{language === 'mr' ? 'टार्गेट सीट टार्गेट (MTD)' : 'MTD Target (Sheet)'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[130px]">{language === 'mr' ? 'एकूण जमा कलेक्शन (MTD)' : 'MTD Total Collection'}</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[130px] bg-red-100/50 text-red-900">{language === 'mr' ? 'टार्गेट शार्टफॉल / बॅकलॉग' : 'Target Backlog'}</th>
                    <th className="py-2.5 px-3 text-center min-w-[80px] print:hidden">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allOfficersDailyReport.map((item, idx) => {
                    const u = item.officer;
                    const tr = item.travel;
                    const m = item.metrics;
                    const col = item.collections;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        {/* Sr. No */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Officer Name & Designation */}
                        <td className="py-2.5 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900 text-xs">
                            {u.fullName || u.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            {u.designation || u.role || 'Officer'}
                          </div>
                        </td>

                        {/* Daily Route */}
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-800">
                          {tr.row.route ? (
                            <span className="font-bold text-slate-900">{tr.row.route}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- ऑन-फील्ड नोंद नाही -</span>
                          )}
                        </td>

                        {/* Opening KM */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                          {tr.row.openingKm > 0 ? tr.row.openingKm : '-'}
                        </td>

                        {/* Closing KM */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                          {tr.row.closingKm > 0 ? tr.row.closingKm : '-'}
                        </td>

                        {/* Total KM */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {tr.dayKm > 0 ? `${tr.dayKm} km` : '0 km'}
                        </td>

                        {/* Today's Party-wise Collection */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right bg-emerald-50/30">
                          {col.totalAmount > 0 ? (
                            <div className="space-y-1">
                              <span className="font-mono font-black text-emerald-800 text-xs block">
                                ₹{col.totalAmount.toLocaleString('en-IN')}
                              </span>
                              {/* Party-wise list breakdown */}
                              <div className="text-[10px] font-semibold text-slate-700 leading-tight space-y-0.5 text-left border-t border-emerald-200/60 pt-1">
                                {col.records.map((r, rIdx) => (
                                  <div key={`col-r-${r.id || rIdx}`} className="flex items-center justify-between gap-1 text-[10px]">
                                    <span className="truncate max-w-[110px] text-slate-800 font-medium" title={r.dealerName}>
                                      • {r.dealerName || 'Dealer'}
                                    </span>
                                    <span className="font-mono font-bold text-emerald-700 shrink-0">
                                      ₹{(r.amount || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Daily Expense */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-amber-700">
                          {tr.totalDailyExp > 0 ? `₹${tr.totalDailyExp}` : '-'}
                        </td>

                        {/* Till Date Target (Target Sheet Data) */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                          {m.hasTargetSheet && m.tillDateTargetRs > 0 ? (
                            <span className="text-slate-900">₹{m.tillDateTargetRs.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-slate-400 font-normal text-[10px]">₹0 (टार्गेट सीट नाही)</span>
                          )}
                        </td>

                        {/* Till Date Collection */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-black text-emerald-700">
                          {m.tillDateAchievedRs > 0 ? `₹${m.tillDateAchievedRs.toLocaleString('en-IN')}` : '₹0'}
                        </td>

                        {/* Till Date Backlog */}
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold bg-red-50/30">
                          {!m.hasTargetSheet ? (
                            <span className="text-slate-400 font-normal text-[10px]">-</span>
                          ) : m.isAchieved ? (
                            <span className="text-emerald-600 font-black">✓ पूर्ण (Nil)</span>
                          ) : (
                            <span className="text-red-700 font-black">₹{m.backlogRs.toLocaleString('en-IN')}</span>
                          )}
                        </td>

                        {/* View Officer Details Button */}
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOfficerId(u.id);
                              setReportViewMode('single_officer_detailed');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-700 font-bold rounded-lg transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="पहा"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>पहा</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Master Total Summary Footer */}
                <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 border-r border-slate-800 uppercase tracking-wider text-amber-400">
                      मास्टर एकूण बेरीज ({selectedDailyDate})
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-amber-300">
                      {masterDailyKPIs.totalKmToday > 0 ? `${masterDailyKPIs.totalKmToday} km` : '0 km'}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-emerald-400 text-sm">
                      ₹{masterDailyKPIs.totalCollectionToday.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-amber-400">
                      {masterDailyKPIs.totalExpenseToday > 0 ? `₹${masterDailyKPIs.totalExpenseToday.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td colSpan={2} className="py-3 px-3 border-r border-slate-800 text-right text-slate-300 uppercase text-[10px]">
                      एकूण टार्गेट बॅकलॉग (Shortfall):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-400 text-sm">
                      {masterDailyKPIs.totalBacklogOverall > 0 ? `₹${masterDailyKPIs.totalBacklogOverall.toLocaleString('en-IN')}` : '₹0'}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: SINGLE OFFICER DETAILED MONTHLY REPORT ================= */}
      {reportViewMode === 'single_officer_detailed' && (
        <div id="single-officer-report" className="space-y-6 animate-in fade-in duration-200 p-1">
          {/* Officer Info Header Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-white shadow-xs">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeOfficer?.fullName || activeOfficer?.name}
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  {activeOfficer?.designation || activeOfficer?.role || 'Sales Officer'} | {activeOfficer?.territory || activeOfficer?.village || 'Territory'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                ✓ दैनंदिन ट्रॅक व टार्गेट प्रगती अहवाल ({selectedMonthYear})
              </span>
            </div>
          </div>

          {/* SECTION 1: DAILY ROUTE, OPENING/CLOSING KM & DAILY EXPENSES TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {language === 'mr'
                    ? `अधिकारी दैनिक प्रवास मार्ग, किमी, जमा वसुली व खर्च (${selectedMonthYear})`
                    : `Daily Route, Opening/Closing KM & Expense Log (${selectedMonthYear})`}
                </h2>
              </div>
              <span className="text-xs text-slate-300 font-bold">
                अधिकारी: {activeOfficer?.fullName || activeOfficer?.name}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">दिनांक</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[180px]">प्रवास मार्ग (Daily Route)</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">ओपनिंग किमी</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">क्लोजिंग किमी</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24 bg-slate-200/60">एकूण किमी</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[160px] bg-emerald-50/60 text-emerald-900">त्या दिवशीचे जमा कलेक्शन</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px]">टीए/डीए (₹)</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[100px]">इतर/लॉजिंग (₹)</th>
                    <th className="py-2.5 px-3 text-right font-black bg-red-100/60 text-red-900 min-w-[110px]">दैनिक एकूण खर्च</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeOfficerTravelSheet.rows.map((row) => {
                    const dayKm = row.closingKm > row.openingKm ? row.closingKm - row.openingKm : row.km || 0;
                    const otherAmt = getRowOtherExpenseAmount(row);
                    const allowanceAmt = Number(row.amount) || 0;
                    const totalDailyExp = allowanceAmt + otherAmt;
                    const isSunday = row.dayName === 'sunday';

                    // Daily collections for active officer on this specific row date
                    const dailyCol = activeOfficer ? getOfficerDailyCollections(activeOfficer, row.dateStr) : { totalAmount: 0, records: [] };

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSunday ? 'bg-red-50/40 text-red-900 font-medium' : ''
                        }`}
                      >
                        {/* Date */}
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-800 font-mono">
                          {row.dateStr}
                        </td>

                        {/* Route */}
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                          {row.route || (isSunday ? 'रविवार (Sunday Off)' : '-')}
                        </td>

                        {/* Opening KM */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                          {row.openingKm > 0 ? row.openingKm : '-'}
                        </td>

                        {/* Closing KM */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-700">
                          {row.closingKm > 0 ? row.closingKm : '-'}
                        </td>

                        {/* Total KM */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {dayKm > 0 ? `${dayKm} km` : '-'}
                        </td>

                        {/* Daily Collections */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-emerald-50/30 font-mono font-bold text-emerald-800">
                          {dailyCol.totalAmount > 0 ? (
                            <div>
                              <span>₹{dailyCol.totalAmount.toLocaleString('en-IN')}</span>
                              <div className="text-[9.5px] font-semibold text-slate-600 text-left">
                                {dailyCol.records.map((r, rIdx) => (
                                  <span key={rIdx} className="block truncate max-w-[150px]">
                                    • {r.dealerName}: ₹{(r.amount || 0).toLocaleString('en-IN')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* Allowance / DA */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                          {allowanceAmt > 0 ? `₹${allowanceAmt}` : '-'}
                        </td>

                        {/* Other / Lodging */}
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-800">
                          {otherAmt > 0 ? `₹${otherAmt}` : '-'}
                        </td>

                        {/* Daily Total Expense */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-red-700 bg-red-50/30">
                          {totalDailyExp > 0 ? `₹${totalDailyExp}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer Summary */}
                <tfoot className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 border-r border-slate-800 uppercase tracking-wider text-amber-400">
                      महिना एकूण एकत्रित बेरीज (Monthly Totals)
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-amber-300">
                      {activeOfficerTravelTotals.totalKm} km
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono text-emerald-400">
                      ₹{dealerCollections
                        .filter((c) => {
                          const offName = (activeOfficer?.fullName || activeOfficer?.name || '').toLowerCase();
                          const isOfficer =
                            c.recordedBy === activeOfficer?.id ||
                            (c.officerName && (c.officerName.toLowerCase().includes(offName) || offName.includes(c.officerName.toLowerCase())));
                          return isOfficer && c.collectionDate && c.collectionDate.startsWith(selectedMonthYear);
                        })
                        .reduce((sum, c) => sum + (c.amount || 0), 0)
                        .toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono">
                      ₹{activeOfficerTravelTotals.totalAllowance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-mono">
                      ₹{activeOfficerTravelTotals.totalOther.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400 text-sm">
                      ₹{activeOfficerTravelTotals.grandTotalExpense.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SECTION: TARGET SHEET OVERVIEW */}
          {activeOfficerTarget && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mt-6 break-before-page">
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    {language === 'mr' ? 'टार्गेट शीट व जमा प्रगती अहवाल (Target Sheet Performance)' : 'Target & Performance Sheet'}
                  </h2>
                </div>
                <span className="text-xs text-slate-300 font-bold uppercase tracking-tighter">
                  FY 2026-27
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 text-center">
                    <tr>
                      <th className="border-r border-slate-300 p-2 w-12">Sr. No</th>
                      <th className="border-r border-slate-300 p-2">Month</th>
                      <th className="border-r border-slate-300 p-2 text-right">Target (Lakh)</th>
                      <th className="border-r border-slate-300 p-2 text-right">Achievement (Lakh)</th>
                      <th className="border-r border-slate-300 p-2 text-right">% Achievement</th>
                      <th className="border-r border-slate-300 p-2 text-right">Target Collection (Lakh)</th>
                      <th className="border-r border-slate-300 p-2 text-right">Actual Collection (Lakh)</th>
                      <th className="border border-slate-300 p-2 text-right">% Collection</th>
                    </tr>
                  </thead>
                  <tbody className="text-center font-medium text-slate-700">
                    {(activeOfficerTarget.monthsData || []).map((m) => (
                      <tr key={m.srNo} className="hover:bg-slate-50 border-b border-slate-200">
                        <td className="border-r border-slate-300 p-1.5 font-bold bg-slate-50/50">{m.srNo}</td>
                        <td className="border-r border-slate-300 p-1.5 font-bold text-slate-900 text-left">{m.month}</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono text-right font-bold">{m.targetLakh}</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono font-bold text-emerald-700 text-right">{m.achievementLakh}</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono text-right">{m.percentAchievement.toFixed(1)}%</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono text-right">{m.collectionLakh}</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono font-black text-blue-700 text-right">{m.actualCollectionLakh}</td>
                        <td className="border-r border-slate-300 p-1.5 font-mono text-right font-bold">{(m.percentCollection || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
