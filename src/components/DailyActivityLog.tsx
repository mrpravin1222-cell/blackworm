import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DailyActivity, ActivityType } from '../types';
import * as XLSX from 'xlsx';
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Share2,
  Download,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Clock3,
  User,
  ShoppingBag,
  IndianRupee,
  Building2,
  Sprout,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { labelMr: string; labelEn: string; color: string; bg: string; border: string }
> = {
  dealer_visit: {
    labelMr: 'डीलर भेट (Dealer Visit)',
    labelEn: 'Dealer Visit',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  farmer_meeting: {
    labelMr: 'शेतकरी सभा (Farmer Meeting)',
    labelEn: 'Farmer Meeting',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  site_demo: {
    labelMr: 'शेतावर प्रात्यक्षिक (Site Demo)',
    labelEn: 'Site Demo',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  collection_followup: {
    labelMr: 'वसुली भेट (Collection Follow-up)',
    labelEn: 'Collection Follow-up',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  new_dealer_prospect: {
    labelMr: 'नवीन डीलर शोध (New Prospect)',
    labelEn: 'New Dealer Prospect',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  crop_inspection: {
    labelMr: 'पीक पाहणी (Crop Inspection)',
    labelEn: 'Crop Inspection',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  recovery_visit: {
    labelMr: 'थकबाकी वसुली (Recovery Visit)',
    labelEn: 'Recovery Visit',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  office_work: {
    labelMr: 'ऑफिस काम (Office Work)',
    labelEn: 'Office Work',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  other: {
    labelMr: 'इतर कामकाज (Other)',
    labelEn: 'Other Activity',
    color: 'text-zinc-700',
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
  },
};

const COMMON_CROPS = [
  'द्राक्ष (Grapes)',
  'ऊस (Sugarcane)',
  'डाळिंब (Pomegranate)',
  'हळद (Turmeric)',
  'केळी (Banana)',
  'सोयाबीन (Soyabean)',
  'मका (Maize)',
  'भाजीपाला (Vegetables)',
];

const COMMON_PRODUCTS = [
  'ब्लॅकवर्म प्रीमियम गांडूळखत ५०kg',
  'ब्लॅकवर्म प्रीमियम गांडूळखत ४०kg',
  'व्हर्मी-वॉश टॉनिक',
  'ऑर्गॅनिक पोटॅश',
  'सॉईल कंडिशनर',
];

const getTodayDateStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DailyActivityLog: React.FC = () => {
  const {
    language,
    currentUser,
    users,
    dealerApplications,
    dailyActivities,
    addDailyActivity,
    updateDailyActivity,
    deleteDailyActivity,
    isOnline,
    lastSyncTimestamp,
    showNotification,
  } = useApp();

  const isAdmin = currentUser
    ? currentUser.role === 'admin' ||
      currentUser.loginId === 'admin' ||
      currentUser.loginId === 'pravin' ||
      currentUser.id === 'USR-001' ||
      currentUser.id === 'USR-PRAVIN'
    : false;

  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'week' | 'all' | 'custom'>('today');
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    return isAdmin ? 'ALL' : currentUser?.id || 'USR-PRAVIN';
  });
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null);

  // Form states
  const [formDate, setFormDate] = useState<string>(getTodayDateStr());
  const [formTime, setFormTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formOfficerId, setFormOfficerId] = useState<string>(currentUser?.id || 'USR-PRAVIN');
  const [formType, setFormType] = useState<ActivityType>('dealer_visit');
  const [formDealerId, setFormDealerId] = useState<string>('');
  const [formDealerName, setFormDealerName] = useState<string>('');
  const [formFarmerOrPerson, setFormFarmerOrPerson] = useState<string>('');
  const [formContactNumber, setFormContactNumber] = useState<string>('');
  const [formVillage, setFormVillage] = useState<string>('');
  const [formTaluka, setFormTaluka] = useState<string>('');
  const [formDistrict, setFormDistrict] = useState<string>('सांगली');
  const [formCrop, setFormCrop] = useState<string>('');
  const [formProducts, setFormProducts] = useState<string[]>([]);
  const [formPurpose, setFormPurpose] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formOrderBooked, setFormOrderBooked] = useState<boolean>(false);
  const [formOrderValue, setFormOrderValue] = useState<string>('');
  const [formPaymentCollected, setFormPaymentCollected] = useState<boolean>(false);
  const [formPaymentAmount, setFormPaymentAmount] = useState<string>('');
  const [formCollectionMode, setFormCollectionMode] = useState<'cash' | 'cheque' | 'online_upi'>('online_upi');
  const [formFollowUpDate, setFormFollowUpDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'completed' | 'in_progress' | 'scheduled'>('completed');
  const [formRemarks, setFormRemarks] = useState<string>('');

  // Registered dealers list
  const activeDealers = useMemo(() => {
    return dealerApplications.filter((d) => d.status !== 'cancelled');
  }, [dealerApplications]);

  // Open modal for new activity
  const handleOpenNewModal = () => {
    setEditingActivity(null);
    setFormDate(getTodayDateStr());
    const now = new Date();
    setFormTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormOfficerId(currentUser?.id || 'USR-PRAVIN');
    setFormType('dealer_visit');
    setFormDealerId('');
    setFormDealerName('');
    setFormFarmerOrPerson('');
    setFormContactNumber('');
    setFormVillage('');
    setFormTaluka('');
    setFormDistrict('सांगली');
    setFormCrop('');
    setFormProducts([]);
    setFormPurpose('');
    setFormSummary('');
    setFormOrderBooked(false);
    setFormOrderValue('');
    setFormPaymentCollected(false);
    setFormPaymentAmount('');
    setFormCollectionMode('online_upi');
    setFormFollowUpDate('');
    setFormStatus('completed');
    setFormRemarks('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEditActivity = (act: DailyActivity) => {
    setEditingActivity(act);
    setFormDate(act.date);
    setFormTime(act.time || '10:00');
    setFormOfficerId(act.employeeId);
    setFormType(act.activityType);
    setFormDealerId(act.dealerId || '');
    setFormDealerName(act.dealerName || '');
    setFormFarmerOrPerson(act.farmerOrPersonName || '');
    setFormContactNumber(act.contactNumber || '');
    setFormVillage(act.village || '');
    setFormTaluka(act.taluka || '');
    setFormDistrict(act.district || 'सांगली');
    setFormCrop(act.cropName || '');
    setFormProducts(act.productsDiscussed || []);
    setFormPurpose(act.purpose || '');
    setFormSummary(act.discussionSummary || '');
    setFormOrderBooked(act.orderBooked);
    setFormOrderValue(act.orderValueRs ? String(act.orderValueRs) : '');
    setFormPaymentCollected(act.paymentCollected);
    setFormPaymentAmount(act.paymentAmountRs ? String(act.paymentAmountRs) : '');
    setFormCollectionMode(act.collectionMode || 'online_upi');
    setFormFollowUpDate(act.nextFollowUpDate || '');
    setFormStatus(act.status || 'completed');
    setFormRemarks(act.remarks || '');
    setIsModalOpen(true);
  };

  // Save handler
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVillage.trim() && !formDealerName.trim() && !formFarmerOrPerson.trim()) {
      showNotification(
        language === 'mr' ? 'कृपया गाव किंवा डीलर/व्यक्तीचे नाव टाका.' : 'Please enter village or contact name.',
        'info'
      );
      return;
    }

    const assignedOfficer = users.find((u) => u.id === formOfficerId) || currentUser;

    const payload: Omit<DailyActivity, 'id' | 'createdAt'> = {
      date: formDate,
      time: formTime,
      employeeId: assignedOfficer?.id || formOfficerId,
      employeeName: assignedOfficer?.fullName || assignedOfficer?.name || 'Officer',
      employeeRole: assignedOfficer?.designation || assignedOfficer?.role || 'Sales Officer',
      activityType: formType,
      dealerId: formDealerId || undefined,
      dealerName: formDealerName || undefined,
      farmerOrPersonName: formFarmerOrPerson,
      contactNumber: formContactNumber,
      village: formVillage,
      taluka: formTaluka,
      district: formDistrict,
      purpose: formPurpose,
      discussionSummary: formSummary,
      cropName: formCrop || undefined,
      productsDiscussed: formProducts,
      orderBooked: formOrderBooked,
      orderValueRs: formOrderBooked && formOrderValue ? Number(formOrderValue) : undefined,
      paymentCollected: formPaymentCollected,
      paymentAmountRs: formPaymentCollected && formPaymentAmount ? Number(formPaymentAmount) : undefined,
      collectionMode: formPaymentCollected ? formCollectionMode : undefined,
      nextFollowUpDate: formFollowUpDate || undefined,
      status: formStatus,
      remarks: formRemarks || undefined,
    };

    if (editingActivity) {
      updateDailyActivity(editingActivity.id, payload);
    } else {
      addDailyActivity(payload);
    }

    setIsModalOpen(false);
  };

  // Toggle product chip
  const toggleProduct = (prod: string) => {
    setFormProducts((prev) =>
      prev.includes(prod) ? prev.filter((p) => p !== prod) : [...prev, prod]
    );
  };

  // Dealer change handler
  const handleDealerChange = (dealerId: string) => {
    setFormDealerId(dealerId);
    if (!dealerId) {
      setFormDealerName('');
      return;
    }
    const found = activeDealers.find((d) => d.id === dealerId);
    if (found) {
      setFormDealerName(found.firmName);
      if (!formContactNumber && found.mobile) setFormContactNumber(found.mobile);
      if (!formFarmerOrPerson && found.proprietorName) setFormFarmerOrPerson(found.proprietorName);
      if (!formVillage && found.village) setFormVillage(found.village);
      if (!formTaluka && found.taluka) setFormTaluka(found.taluka);
      if (!formDistrict && found.district) setFormDistrict(found.district);
    }
  };

  // Filtering daily activities
  const filteredActivities = useMemo(() => {
    const today = getTodayDateStr();
    return dailyActivities
      .filter((act) => {
        // Date filter
        if (dateFilterMode === 'today') {
          if (act.date !== today) return false;
        } else if (dateFilterMode === 'week') {
          const actDate = new Date(act.date);
          const diffDays = (new Date().getTime() - actDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (dateFilterMode === 'custom' && selectedDate) {
          if (act.date !== selectedDate) return false;
        }

        // Officer filter
        if (selectedOfficerId !== 'ALL') {
          if (act.employeeId !== selectedOfficerId) return false;
        }

        // Activity type filter
        if (selectedType !== 'ALL') {
          if (act.activityType !== selectedType) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            (act.employeeName && act.employeeName.toLowerCase().includes(q)) ||
            (act.farmerOrPersonName && act.farmerOrPersonName.toLowerCase().includes(q)) ||
            (act.dealerName && act.dealerName.toLowerCase().includes(q)) ||
            (act.village && act.village.toLowerCase().includes(q)) ||
            (act.taluka && act.taluka.toLowerCase().includes(q)) ||
            (act.district && act.district.toLowerCase().includes(q)) ||
            (act.cropName && act.cropName.toLowerCase().includes(q)) ||
            (act.purpose && act.purpose.toLowerCase().includes(q)) ||
            (act.discussionSummary && act.discussionSummary.toLowerCase().includes(q)) ||
            (act.remarks && act.remarks.toLowerCase().includes(q));
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest date & time first
        const dtA = `${a.date}T${a.time || '00:00'}`;
        const dtB = `${b.date}T${b.time || '00:00'}`;
        return dtB.localeCompare(dtA);
      });
  }, [dailyActivities, dateFilterMode, selectedDate, selectedOfficerId, selectedType, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalVisits = filteredActivities.length;
    let ordersCount = 0;
    let ordersTotalRs = 0;
    let collectionsCount = 0;
    let collectionsTotalRs = 0;
    let followUpsCount = 0;

    filteredActivities.forEach((act) => {
      if (act.orderBooked) {
        ordersCount++;
        ordersTotalRs += Number(act.orderValueRs) || 0;
      }
      if (act.paymentCollected) {
        collectionsCount++;
        collectionsTotalRs += Number(act.paymentAmountRs) || 0;
      }
      if (act.nextFollowUpDate) {
        followUpsCount++;
      }
    });

    return {
      totalVisits,
      ordersCount,
      ordersTotalRs,
      collectionsCount,
      collectionsTotalRs,
      followUpsCount,
    };
  }, [filteredActivities]);

  // Export to WhatsApp format
  const generateWhatsAppMessage = () => {
    const today = getTodayDateStr();
    const officerName =
      selectedOfficerId !== 'ALL'
        ? users.find((u) => u.id === selectedOfficerId)?.fullName ||
          users.find((u) => u.id === selectedOfficerId)?.name ||
          currentUser?.name
        : currentUser?.name || 'Blackworm Officer';

    let msg = `🌿 *ब्लॅकवर्म ॲग्रिटेक प्रा. लि.* 🌿\n`;
    msg += `📋 *दैनिक कामकाज अहवाल (Daily Activity Report)*\n`;
    msg += `👤 *अधिकारी:* ${officerName}\n`;
    msg += `📅 *दिनांक:* ${dateFilterMode === 'today' ? today : selectedDate || 'सर्व'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📍 *एकूण भेटी/कामकाज:* ${stats.totalVisits}\n`;
    msg += `📦 *ऑर्डर्स:* ${stats.ordersCount} (₹${stats.ordersTotalRs.toLocaleString('en-IN')})\n`;
    msg += `💰 *वसुली:* ${stats.collectionsCount} (₹${stats.collectionsTotalRs.toLocaleString('en-IN')})\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (filteredActivities.length === 0) {
      msg += `(नोंदवलेले कामकाज उपलब्ध नाही)\n`;
    } else {
      filteredActivities.forEach((act, idx) => {
        const typeCfg = ACTIVITY_TYPE_CONFIG[act.activityType] || ACTIVITY_TYPE_CONFIG.other;
        msg += `${idx + 1}️⃣ *${typeCfg.labelMr}*\n`;
        if (act.dealerName) msg += `   🏢 डीलर: ${act.dealerName}\n`;
        if (act.farmerOrPersonName) msg += `   👤 व्यक्ती/शेतकरी: ${act.farmerOrPersonName} (${act.contactNumber || 'मोबाईल नाही'})\n`;
        msg += `   📍 ठिकाण: ${act.village || ''}, ${act.taluka || ''} (${act.district || ''})\n`;
        if (act.cropName) msg += `   🌱 पीक: ${act.cropName}\n`;
        if (act.purpose) msg += `   🎯 उद्देश: ${act.purpose}\n`;
        if (act.discussionSummary) msg += `   💬 चर्चा: ${act.discussionSummary}\n`;
        if (act.orderBooked) msg += `   📦 ऑर्डर: ₹${(Number(act.orderValueRs) || 0).toLocaleString('en-IN')}\n`;
        if (act.paymentCollected) msg += `   💵 वसुली: ₹${(Number(act.paymentAmountRs) || 0).toLocaleString('en-IN')} (${act.collectionMode || 'रोख'})\n`;
        if (act.nextFollowUpDate) msg += `   ⏰ पुढील पाठपुरावा: ${act.nextFollowUpDate}\n`;
        msg += `\n`;
      });
    }

    msg += `_Blackworm Agritech Mobile Portal द्वारे थेट पाठवले._`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredActivities.length === 0) {
      showNotification(language === 'mr' ? 'डाउनलोड करण्यासाठी डेटा उपलब्ध नाही.' : 'No data to export.', 'info');
      return;
    }

    const rows = filteredActivities.map((act, index) => ({
      'अ.क्र.': index + 1,
      'तारीख': act.date,
      'वेळ': act.time || '-',
      'अधिकारी नाव': act.employeeName,
      'पद': act.employeeRole,
      'कामकाज प्रकार': ACTIVITY_TYPE_CONFIG[act.activityType]?.labelMr || act.activityType,
      'डीलरचे नाव': act.dealerName || '-',
      'शेतकरी / व्यक्ती नाव': act.farmerOrPersonName || '-',
      'संपर्क मोबाईल': act.contactNumber || '-',
      'गाव': act.village,
      'तालुका': act.taluka,
      'जिल्हा': act.district,
      'पीक': act.cropName || '-',
      'उत्पादने चर्चा': (act.productsDiscussed || []).join(', ') || '-',
      'भेटीचा उद्देश': act.purpose || '-',
      'चर्चा / निष्पन्न मुद्दे': act.discussionSummary || '-',
      'ऑर्डर झाली का': act.orderBooked ? 'होय' : 'नाही',
      'ऑर्डर रक्कम (रु.)': act.orderValueRs || 0,
      'वसुली झाली का': act.paymentCollected ? 'होय' : 'नाही',
      'वसुली रक्कम (रु.)': act.paymentAmountRs || 0,
      'वसुली पद्धत': act.collectionMode || '-',
      'पुढील पाठपुरावा दिनांक': act.nextFollowUpDate || '-',
      'स्थिती': act.status,
      'शेरा / टिप्पणी': act.remarks || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily_Activities');
    const fileName = `Blackworm_Daily_Activity_${getTodayDateStr()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showNotification(language === 'mr' ? 'Excel फाइल डाउनलोड झाली!' : 'Excel exported successfully!');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0">
              <CalendarCheck2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {language === 'mr' ? 'दैनिक कामकाज नोंद' : 'Daily Activity Log'}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700">
                  {language === 'mr' ? 'थेट मोबाईलवर' : 'Mobile First'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {language === 'mr'
                  ? 'कर्मचारी व अधिकाऱ्यांच्या दैनंदिन साईट व्हिजिट्स, शेतकरी सभा व डीलर भेटींची नोंदणी व थेट व्हॉट्सॲप रिपोर्टिंग.'
                  : 'Log employee daily site visits, farmer meetings, and dealer interactions with 1-click WhatsApp reporting.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenNewModal}
              id="log-new-activity-btn"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{language === 'mr' ? 'नवीन कामकाज नोंदवा' : 'Log New Activity'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              id="share-whatsapp-btn"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer active:scale-95"
              title="WhatsApp वर आजचा अहवाल पाठवा"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden min-[420px]:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              id="export-excel-btn"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer active:scale-95"
              title="Excel (.xlsx) डाउनलोड करा"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live sync pill */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-semibold text-slate-700">
              {isOnline
                ? language === 'mr'
                  ? 'सर्व मोबाईलवर थेट लाईव्ह सिंक सुरू आहे (डेटा कधीही डिलीट होणार नाही)'
                  : 'Live real-time sync active across all mobiles'
                : 'Offline Cache Active'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {language === 'mr' ? 'शेवटचा सिंक:' : 'Last Sync:'}{' '}
            {lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString() : 'Just now'}
          </span>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Visits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'mr' ? 'एकूण भेटी / कामकाज' : 'Total Visits'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.totalVisits}</span>
            <span className="text-xs font-semibold text-slate-400">{language === 'mr' ? 'नोंदी' : 'logs'}</span>
          </div>
        </div>

        {/* Orders Generated */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'mr' ? 'नोंदवलेल्या ऑर्डर्स' : 'Orders Booked'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              ₹{stats.ordersTotalRs.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {stats.ordersCount} {language === 'mr' ? 'ऑर्डर्स नोंद' : 'orders'}
          </span>
        </div>

        {/* Payments Collected */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'mr' ? 'वसूल झालेली रक्कम' : 'Collections Made'}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">
              ₹{stats.collectionsTotalRs.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {stats.collectionsCount} {language === 'mr' ? 'कलेक्शन्स नोंद' : 'collections'}
          </span>
        </div>

        {/* Follow ups */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'mr' ? 'पुढील पाठपुरावा' : 'Follow-ups'}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Clock3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600">{stats.followUpsCount}</span>
            <span className="text-xs font-semibold text-slate-400">{language === 'mr' ? 'नियोजित' : 'due'}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        {/* Date Filter Quick Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'mr' ? 'आजचे कामकाज (Today)' : 'Today'}
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'week'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'mr' ? 'या आठवड्यातील' : 'This Week'}
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'mr' ? 'सर्व नोंदी (All)' : 'All Time'}
            </button>

            <button
              type="button"
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'custom'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'mr' ? 'तारीख निवडा' : 'Custom Date'}
            </button>
          </div>

          {dateFilterMode === 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          )}
        </div>

        {/* Search, Officer & Activity Type Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'mr' ? 'गाव, डीलर, शेतकरी किंवा पीक शोधा...' : 'Search village, dealer, crop...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Officer Selector (for Admin, dropdown; for officer, displays name) */}
          <div>
            {isAdmin ? (
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">👤 {language === 'mr' ? 'सर्व अधिकारी (All Officers)' : 'All Officers'}</option>
                {users.map((u) => (
                  <option key={`officer-filter-${u.id}`} value={u.id}>
                    {u.fullName || u.name} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 truncate">
                👤 {currentUser?.fullName || currentUser?.name}
              </div>
            )}
          </div>

          {/* Activity Type Selector */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">🏷️ {language === 'mr' ? 'सर्व कामकाज प्रकार (All Types)' : 'All Types'}</option>
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => (
                <option key={`type-filter-${typeKey}`} value={typeKey}>
                  {language === 'mr' ? cfg.labelMr : cfg.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-700">
                {language === 'mr' ? 'कोणतीही कामकाज नोंद सापडली नाही' : 'No activities logged for selected filters'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'mr'
                  ? 'नवीन डीलर भेट, शेतावरील प्रात्यक्षिक किंवा शेतकरी सभा नोंदवण्यासाठी खालील बटणावर क्लिक करा.'
                  : 'Click the button below to log your daily site visits and farmer interactions.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'mr' ? 'पहिली भेट नोंदवा' : 'Log First Visit'}</span>
            </button>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const typeCfg = ACTIVITY_TYPE_CONFIG[act.activityType] || ACTIVITY_TYPE_CONFIG.other;

            return (
              <div
                key={`daily-act-${act.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header row: Badge, Date & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}
                    >
                      {language === 'mr' ? typeCfg.labelMr : typeCfg.labelEn}
                    </span>

                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {act.date}
                    </span>

                    {act.time && (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {act.time}
                      </span>
                    )}

                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      👤 {act.employeeName}
                    </span>
                  </div>

                  {/* Edit & Delete Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditActivity(act)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="संपादित करा (Edit)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            language === 'mr'
                              ? 'ही कामकाज नोंद डिलीट करायची आहे का?'
                              : 'Are you sure you want to delete this activity?'
                          )
                        ) {
                          deleteDailyActivity(act.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="डिलीट करा (Delete)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main visit content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Left Column: Contact & Location */}
                  <div className="space-y-2">
                    {/* Dealer / Firm Name */}
                    {act.dealerName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-sm font-black text-slate-900">{act.dealerName}</span>
                      </div>
                    )}

                    {/* Contact Person */}
                    {act.farmerOrPersonName && (
                      <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                        <div className="min-w-0">
                          <span className="text-xs text-slate-400 block font-medium">
                            {language === 'mr' ? 'संपर्क व्यक्ती / शेतकरी:' : 'Contact Person:'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                            {act.farmerOrPersonName}
                          </span>
                        </div>

                        {/* Call & WhatsApp direct buttons */}
                        {act.contactNumber && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`tel:${act.contactNumber}`}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="थेट कॉल करा"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <a
                              href={`https://wa.me/91${act.contactNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="WhatsApp वर मेसेज पाठवा"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="font-semibold">
                        {act.village}
                        {act.taluka ? `, तालु: ${act.taluka}` : ''}
                        {act.district ? `, जि: ${act.district}` : ''}
                      </span>
                    </div>

                    {/* Crop */}
                    {act.cropName && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                        <Sprout className="w-3.5 h-3.5 shrink-0" />
                        <span>{act.cropName}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Purpose & Summary */}
                  <div className="space-y-2 bg-slate-50/60 rounded-xl p-3 border border-slate-100 text-xs">
                    {act.purpose && (
                      <div>
                        <span className="font-bold text-slate-400 uppercase text-[10px] block">
                          {language === 'mr' ? 'भेटीचा उद्देश' : 'Purpose'}
                        </span>
                        <p className="text-slate-800 font-medium mt-0.5">{act.purpose}</p>
                      </div>
                    )}

                    {act.discussionSummary && (
                      <div>
                        <span className="font-bold text-slate-400 uppercase text-[10px] block">
                          {language === 'mr' ? 'चर्चा व निष्पन्न मुद्दे' : 'Discussion & Outcome'}
                        </span>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{act.discussionSummary}</p>
                      </div>
                    )}

                    {act.productsDiscussed && act.productsDiscussed.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {act.productsDiscussed.map((prod, pIdx) => (
                          <span
                            key={`prod-${act.id}-${pIdx}`}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200"
                          >
                            {prod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Outcome Badges (Order / Collection / Followup) */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {act.orderBooked && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>
                          ऑर्डर: ₹{(Number(act.orderValueRs) || 0).toLocaleString('en-IN')}
                        </span>
                      </span>
                    )}

                    {act.paymentCollected && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>
                          वसुली: ₹{(Number(act.paymentAmountRs) || 0).toLocaleString('en-IN')}
                          {act.collectionMode ? ` (${act.collectionMode.toUpperCase()})` : ''}
                        </span>
                      </span>
                    )}

                    {act.nextFollowUpDate && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold flex items-center gap-1 border border-purple-200">
                        <Clock className="w-3 h-3" />
                        <span>पुढील पाठपुरावा: {act.nextFollowUpDate}</span>
                      </span>
                    )}
                  </div>

                  {/* Share single activity to WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      let text = `📍 *ब्लॅकवर्म दैनिक कामकाज नोंद*\n`;
                      text += `👤 *अधिकारी:* ${act.employeeName}\n`;
                      text += `📅 *दिनांक:* ${act.date} (${act.time || ''})\n`;
                      text += `🏷️ *प्रकार:* ${typeCfg.labelMr}\n`;
                      if (act.dealerName) text += `🏢 *डीलर:* ${act.dealerName}\n`;
                      if (act.farmerOrPersonName) text += `👤 *संपर्क:* ${act.farmerOrPersonName} (${act.contactNumber || ''})\n`;
                      text += `📍 *गाव/ठिकाण:* ${act.village}, ${act.taluka} (${act.district})\n`;
                      if (act.cropName) text += `🌱 *पीक:* ${act.cropName}\n`;
                      if (act.purpose) text += `🎯 *उद्देश:* ${act.purpose}\n`;
                      if (act.discussionSummary) text += `💬 *चर्चा:* ${act.discussionSummary}\n`;
                      if (act.orderBooked) text += `📦 *ऑर्डर:* ₹${(Number(act.orderValueRs) || 0).toLocaleString('en-IN')}\n`;
                      if (act.paymentCollected) text += `💰 *वसुली:* ₹${(Number(act.paymentAmountRs) || 0).toLocaleString('en-IN')}\n`;
                      if (act.nextFollowUpDate) text += `⏰ *पुढील पाठपुरावा:* ${act.nextFollowUpDate}\n`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'WhatsApp पाठवा' : 'Share'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log / Edit Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    {editingActivity
                      ? language === 'mr'
                        ? 'कामकाज नोंद संपादित करा'
                        : 'Edit Activity Log'
                      : language === 'mr'
                      ? 'नवीन दैनिक कामकाज नोंदवा'
                      : 'Log Daily Activity'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'mr'
                      ? 'डीलर भेट, शेतावर प्रात्यक्षिक किंवा शेतकरी सभेची माहिती भरा'
                      : 'Record site visits, meetings and customer interactions'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveActivity} className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Row 1: Date, Time & Officer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'तारीख (Date)*' : 'Date*'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'वेळ (Time)' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'अधिकारी (Officer)*' : 'Officer*'}
                  </label>
                  {isAdmin ? (
                    <select
                      value={formOfficerId}
                      onChange={(e) => setFormOfficerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    >
                      {users.map((u) => (
                        <option key={`modal-officer-${u.id}`} value={u.id}>
                          {u.fullName || u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={currentUser?.fullName || currentUser?.name || 'Officer'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-600"
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Activity Type */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  {language === 'mr' ? 'कामकाज प्रकार (Activity Type)*' : 'Activity Type*'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => {
                    const isSelected = formType === typeKey;
                    return (
                      <button
                        key={`form-type-${typeKey}`}
                        type="button"
                        onClick={() => setFormType(typeKey as ActivityType)}
                        className={`px-3 py-2 rounded-xl text-left font-bold transition-all border text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {language === 'mr' ? cfg.labelMr.split('(')[0] : cfg.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Registered Dealer (Optional selector) */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <label className="block text-blue-900 font-bold">
                  {language === 'mr'
                    ? 'नोंदणीकृत डीलर निवडा (Registered Dealer - असल्यास)'
                    : 'Select Registered Dealer (If applicable)'}
                </label>
                <select
                  value={formDealerId}
                  onChange={(e) => handleDealerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {language === 'mr' ? '-- थेट शेतकरी / नवीन डीलर / इतर --' : '-- Direct Farmer / New Prospect --'}
                  </option>
                  {activeDealers.map((d) => (
                    <option key={`dealer-select-${d.id}`} value={d.id}>
                      {d.firmName} ({d.dealerCode || 'कोड नाही'}) - {d.taluka}, {d.district}
                    </option>
                  ))}
                </select>

                {!formDealerId && (
                  <input
                    type="text"
                    placeholder={language === 'mr' ? 'किंवा डीलरचे नाव थेट टाका...' : 'Or enter dealer/firm name directly...'}
                    value={formDealerName}
                    onChange={(e) => setFormDealerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white font-medium text-slate-800 placeholder-slate-400"
                  />
                )}
              </div>

              {/* Row 4: Contact Person & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'शेतकरी / संपर्क व्यक्ती नाव*' : 'Farmer / Person Name*'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. सचिन पाटील / राजू माने"
                    value={formFarmerOrPerson}
                    onChange={(e) => setFormFarmerOrPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="10 अंकी मोबाईल क्रमांक"
                    value={formContactNumber}
                    onChange={(e) => setFormContactNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Row 5: Location Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'गाव (Village)*' : 'Village*'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. तासगाव / भिलवडी"
                    value={formVillage}
                    onChange={(e) => setFormVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'तालुका (Taluka)' : 'Taluka'}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. तासगाव, मिरज, पलूस"
                    value={formTaluka}
                    onChange={(e) => setFormTaluka(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'जिल्हा (District)' : 'District'}
                  </label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Row 6: Crop & Products */}
              <div className="space-y-2">
                <label className="block text-slate-600 font-bold">
                  {language === 'mr' ? 'पीक (Crop) व उत्पादने चर्चा' : 'Crop & Products Discussed'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CROPS.map((crop) => (
                    <button
                      key={`crop-chip-${crop}`}
                      type="button"
                      onClick={() => setFormCrop(crop === formCrop ? '' : crop)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        formCrop === crop
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {crop}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_PRODUCTS.map((prod) => {
                    const isSelected = formProducts.includes(prod);
                    return (
                      <button
                        key={`prod-chip-${prod}`}
                        type="button"
                        onClick={() => toggleProduct(prod)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {prod}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 7: Purpose of Visit */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {language === 'mr' ? 'भेटीचा उद्देश (Purpose)' : 'Purpose of Visit'}
                </label>
                <input
                  type="text"
                  placeholder="उदा. खत साठा पाहणी / उसावर डेमो / नवीन डीलर चर्चा"
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Row 8: Discussion Summary */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {language === 'mr' ? 'चर्चा व निष्पन्न मुद्दे (Discussion & Outcomes)' : 'Discussion Summary'}
                </label>
                <textarea
                  rows={3}
                  placeholder="डीलर किंवा शेतकऱ्यांशी काय चर्चा झाली, काय अभिप्राय आला ते थोडक्यात लिहा..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              {/* Row 9: Orders & Payments Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Order Booked Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formOrderBooked}
                      onChange={(e) => setFormOrderBooked(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <span className="font-bold text-slate-800">
                      {language === 'mr' ? '📦 या भेटीत नवीन ऑर्डर मिळाली?' : 'Order Booked?'}
                    </span>
                  </label>

                  {formOrderBooked && (
                    <input
                      type="number"
                      placeholder="ऑर्डर रक्कम (रु.)"
                      value={formOrderValue}
                      onChange={(e) => setFormOrderValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-700"
                    />
                  )}
                </div>

                {/* Payment Collected Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPaymentCollected}
                      onChange={(e) => setFormPaymentCollected(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800">
                      {language === 'mr' ? '💰 वसुली / पेमेंट मिळाले?' : 'Payment Collected?'}
                    </span>
                  </label>

                  {formPaymentCollected && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="रक्कम (रु.)"
                        value={formPaymentAmount}
                        onChange={(e) => setFormPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-amber-700"
                      />
                      <select
                        value={formCollectionMode}
                        onChange={(e) => setFormCollectionMode(e.target.value as any)}
                        className="px-2 py-2 rounded-xl border border-amber-300 bg-white font-bold text-xs"
                      >
                        <option value="online_upi">UPI / Online</option>
                        <option value="cash">रोख (Cash)</option>
                        <option value="cheque">धनादेश (Cheque)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 10: Next Follow-Up Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'पुढील पाठपुरावा दिनांक (Follow-up Date)' : 'Follow-up Date'}
                  </label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={(e) => setFormFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    {language === 'mr' ? 'कामकाज स्थिती (Status)' : 'Status'}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  >
                    <option value="completed">पूर्ण झाले (Completed)</option>
                    <option value="in_progress">चालू आहे (In Progress)</option>
                    <option value="scheduled">नियोजित (Scheduled)</option>
                  </select>
                </div>
              </div>

              {/* Row 11: Remarks */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  {language === 'mr' ? 'शेरा / विशेष सूचना (Remarks)' : 'Remarks'}
                </label>
                <input
                  type="text"
                  placeholder="इतर काही विशेष नोंद असल्यास टाका..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  {language === 'mr' ? 'रद्द करा' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  {editingActivity
                    ? language === 'mr'
                      ? 'अद्ययावत करा (Update)'
                      : 'Update Activity'
                    : language === 'mr'
                    ? 'जतन करा (Save Activity)'
                    : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
