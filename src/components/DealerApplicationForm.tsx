import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  PlusCircle,
  Printer,
  Download,
  Save,
  Check,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Edit3,
  Trash2,
  FileText,
  ShieldAlert,
  Camera,
  RefreshCw,
  Upload,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { syncAllDOMFormValues, exportElementToPrintOrPDF, exportElementToPDF } from '../utils/printHelpers';
import { DealerApplication } from '../types';
import { BLACKWORM_LOGO_BASE64 } from '../assets/logoBase64';

export const DealerApplicationForm: React.FC = () => {
  const {
    language,
    companyDetails,
    dealerApplications,
    addDealerApplication,
    updateDealerApplication,
    deleteDealerApplication,
    cancelDealerApplication,
    currentUser,
    showNotification,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'cancelled'>('all');
  const [isFormOpen, setIsFormOpenInternal] = useState(false);
  
  const setIsFormOpen = (open: boolean) => {
    setIsFormOpenInternal(open);
    if (open) {
      window.history.pushState({ tab: 'dealer', isFormOpen: true }, '', '');
    } else {
      window.history.pushState({ tab: 'dealer', isFormOpen: false }, '', '');
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab === 'dealer') {
        setIsFormOpenInternal(!!event.state.isFormOpen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<DealerApplication['status'] | null>(null);
  const [cancelledDate, setCancelledDate] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Camera Live Photo States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal State
  const [dealerToDelete, setDealerToDelete] = useState<DealerApplication | null>(null);

  // Cancel Confirmation Modal State
  const [dealerToCancel, setDealerToCancel] = useState<DealerApplication | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const formPrintRef = useRef<HTMLDivElement>(null);

  // Helper to extract clean English name from currentUser.name
  const getEnglishUserName = (rawName: string) => {
    if (!rawName) return 'Pravin Mane';
    const match = rawName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return rawName.trim();
  };

  // Exact Form State
  const [formData, setFormData] = useState({
    center: '',
    shopOpeningDate: '',
    code: '',
    addressStamp: '',
    firmName: '',
    proprietorName: '',
    contactNumber: '',
    state: 'Maharashtra',
    email: '',
    aadhaarNo: '',
    district: '',
    panNo: '',
    dateOfBirth: '',
    gstNo: '',
    pinCode: '',
    // Bank Details
    bankName: '',
    bankAddress: '',
    accountNo: '',
    ifscCode: '',
    // Security Cheque
    chequeNo: '',
    // Declaration
    place: '',
    date: new Date().toISOString().split('T')[0],
    // Office Use
    remarks: '',
    // Officer Name
    officerName: getEnglishUserName(currentUser?.name || 'Pravin Mane'),
    // Applicant Photo
    applicantPhotoUrl: '',
    village: '',
    securityDeposit: '',
  });

  // Handle mobile device hardware / browser back button navigation
  useEffect(() => {
    if (isFormOpen) {
      window.history.pushState({ modal: 'dealer-form' }, '');
      const handlePopState = () => {
        setIsFormOpen(false);
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
          setCameraStream(null);
        }
        setIsCameraModalOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isFormOpen, cameraStream]);

  // Camera Management
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        language === 'mr'
          ? 'कॅमेरा सुरू करता आला नाही. कृपया कॅमेरा परवानगी द्या किंवा थेट फाईल अपलोड करा.'
          : 'Could not access device camera. Please check permissions or upload a photo file.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const startX = ((video.videoWidth || size) - size) / 2;
      const startY = ((video.videoHeight || size) - size) / 2;
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoPreview(dataUrl);
      stopCamera();
    }
  };

  const handleFilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPhotoPreview(dataUrl);
          stopCamera();
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPhoto = () => {
    if (photoPreview) {
      setFormData((prev) => ({ ...prev, applicantPhotoUrl: photoPreview }));
      setIsCameraModalOpen(false);
      setPhotoPreview(null);
      stopCamera();
    }
  };

  const handleRetakePhoto = () => {
    setPhotoPreview(null);
    startCamera(facingMode);
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setPhotoPreview(null);
    setIsCameraModalOpen(false);
  };

  const handleOpenLiveCameraModal = () => {
    setPhotoPreview(null);
    setIsCameraModalOpen(true);
    startCamera(facingMode);
  };

  useEffect(() => {
    if (currentUser?.name && !currentAppId) {
      setFormData((prev) => ({
        ...prev,
        officerName: getEnglishUserName(currentUser.name),
      }));
    }
  }, [currentUser, currentAppId]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    let finalValue = value;

    // Apply length constraints and formatting logic
    if (field === 'contactNumber') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'aadhaarNo') {
      finalValue = value.replace(/\D/g, '').slice(0, 12);
    } else if (field === 'panNo') {
      finalValue = value.slice(0, 10).toUpperCase();
    } else if (field === 'gstNo') {
      finalValue = value.slice(0, 15).toUpperCase();
    } else if (field === 'pinCode') {
      finalValue = value.replace(/\D/g, '').slice(0, 6);
    } else if (field === 'chequeNo') {
      // Auto-formatting for cheque numbers: "ChequeNo1 - ChequeNo2"
      const prevVal = formData.chequeNo;
      if (prevVal && prevVal.length > value.length) {
        // Allow backspacing smoothly
        finalValue = value;
      } else if (/^\d{3,10}\s$/.test(value)) {
        // User typed space after first cheque number -> "123456 - "
        finalValue = value.trim() + ' - ';
      } else if (/^\d{3,10}-$/.test(value)) {
        // User typed dash after first cheque number -> "123456 - "
        finalValue = value.slice(0, -1) + ' - ';
      } else {
        // Format dual cheque numbers separated by space, dash, or comma: "123456 654321" -> "123456 - 654321"
        const multiMatch = value.match(/^(\d{3,10})\s*[,-\s]\s*(\d{1,10})$/);
        if (multiMatch) {
          finalValue = `${multiMatch[1]} - ${multiMatch[2]}`;
        } else {
          finalValue = value;
        }
      }
    } else if (
      typeof value === 'string' &&
      field !== 'email' &&
      field !== 'dateOfBirth' &&
      field !== 'shopOpeningDate' &&
      field !== 'date'
    ) {
      // Bold and Capital format for all other text fields except email and dates
      finalValue = value.toUpperCase();
    }

    setFormData((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handleOpenNewForm = () => {
    setCurrentAppId(null);
    setCurrentStatus(null);
    setCancelledDate(null);
    setIsEditMode(false);
    setFormData({
      center: '',
      shopOpeningDate: '',
      code: '',
      addressStamp: '',
      firmName: '',
      proprietorName: '',
      contactNumber: '',
      state: 'Maharashtra',
      email: '',
      aadhaarNo: '',
      district: '',
      panNo: '',
      dateOfBirth: '',
      gstNo: '',
      pinCode: '',
      bankName: '',
      bankAddress: '',
      accountNo: '',
      ifscCode: '',
      chequeNo: '',
      place: '',
      date: new Date().toISOString().split('T')[0],
      remarks: '',
      officerName: getEnglishUserName(currentUser?.name || 'Pravin Mane'),
      applicantPhotoUrl: '',
      village: '',
      securityDeposit: '',
    });
    setIsFormOpen(true);
  };

  const handleEditForm = (d: DealerApplication) => {
    setCurrentAppId(d.id);
    setCurrentStatus(d.status);
    setCancelledDate(d.cancelledDate || null);
    setIsEditMode(true);
    setFormData({
      center: d.center || '',
      firmName: d.firmName || '',
      shopOpeningDate: d.shopOpeningDate || d.applicationDate || '',
      code: d.dealerCode || '',
      addressStamp: d.addressStamp || d.shopAddress || '',
      proprietorName: d.proprietorName || '',
      contactNumber: d.mobile || '',
      state: d.state || 'Maharashtra',
      email: d.email || '',
      aadhaarNo: d.aadhaarNo || '',
      district: d.district || '',
      panNo: d.panNumber || '',
      dateOfBirth: d.dateOfBirth || '',
      gstNo: d.gstNumber || '',
      pinCode: d.pincode || '',
      bankName: d.bankName || '',
      bankAddress: d.bankAddress || '',
      accountNo: d.accountNo || '',
      ifscCode: d.ifscCode || '',
      chequeNo: d.chequeNo || '',
      place: d.place || d.district || '',
      date: d.date || d.applicationDate || new Date().toISOString().split('T')[0],
      remarks: d.remarks || d.reviewRemarks || '',
      officerName: d.assignedOfficer || getEnglishUserName(currentUser?.name || 'Pravin Mane'),
      applicantPhotoUrl: d.applicantPhotoUrl || d.shopPhotoUrl || '',
      village: d.village || '',
      securityDeposit: d.securityDeposit || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenExistingForm = (d: DealerApplication) => {
    handleEditForm(d);
  };

  const handleSaveToApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (currentAppId) {
      // Update existing record
      updateDealerApplication(currentAppId, {
        center: formData.center,
        shopOpeningDate: formData.shopOpeningDate,
        addressStamp: formData.addressStamp,
        firmName: formData.firmName || formData.center || 'Dealership Firm',
        proprietorName: formData.proprietorName || 'N/A',
        mobile: formData.contactNumber || 'N/A',
        email: formData.email,
        aadhaarNo: formData.aadhaarNo,
        dateOfBirth: formData.dateOfBirth,
        shopAddress: formData.addressStamp,
        district: formData.district,
        state: formData.state,
        pincode: formData.pinCode,
        gstNumber: formData.gstNo,
        panNumber: formData.panNo,
        bankName: formData.bankName,
        bankAddress: formData.bankAddress,
        accountNo: formData.accountNo,
        ifscCode: formData.ifscCode,
        chequeNo: formData.chequeNo,
        place: formData.place,
        date: formData.date,
        remarks: formData.remarks,
        assignedOfficer: formData.officerName,
        applicantPhotoUrl: formData.applicantPhotoUrl,
        village: formData.village,
        securityDeposit: formData.securityDeposit,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      // Create new application with automatic lowest available code sequence
      const created = addDealerApplication({
        center: formData.center,
        shopOpeningDate: formData.shopOpeningDate,
        addressStamp: formData.addressStamp,
        firmName: formData.firmName || formData.center || 'Dealership Firm',
        proprietorName: formData.proprietorName || 'N/A',
        mobile: formData.contactNumber || 'N/A',
        email: formData.email,
        aadhaarNo: formData.aadhaarNo,
        dateOfBirth: formData.dateOfBirth,
        shopAddress: formData.addressStamp,
        taluka: '',
        district: formData.district,
        state: formData.state,
        pincode: formData.pinCode,
        gstNumber: formData.gstNo,
        panNumber: formData.panNo,
        fertilizerLicense: '',
        expectedMonthlyTurnover: 0,
        bankName: formData.bankName,
        bankAddress: formData.bankAddress,
        accountNo: formData.accountNo,
        ifscCode: formData.ifscCode,
        chequeNo: formData.chequeNo,
        place: formData.place,
        date: formData.date,
        remarks: formData.remarks,
        assignedOfficer: formData.officerName,
        applicantPhotoUrl: formData.applicantPhotoUrl,
        village: formData.village,
        securityDeposit: formData.securityDeposit,
      });

      setCurrentAppId(created.id);
      setCurrentStatus(created.status);
      setIsEditMode(true);
      setFormData((prev) => ({ ...prev, code: created.dealerCode || '' }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleConfirmDelete = () => {
    if (!dealerToDelete) return;
    deleteDealerApplication(dealerToDelete.id);
    if (currentAppId === dealerToDelete.id) {
      setIsFormOpen(false);
      setCurrentAppId(null);
    }
    setDealerToDelete(null);
  };

  const handleConfirmCancel = () => {
    if (!dealerToCancel) return;
    cancelDealerApplication(dealerToCancel.id, cancelReason || undefined);
    if (currentAppId === dealerToCancel.id) {
      setCurrentStatus('cancelled');
      setCancelledDate(new Date().toISOString().split('T')[0]);
    }
    setDealerToCancel(null);
    setCancelReason('');
  };

  const handlePrint = async () => {
    // 1. Force save current form values into application database state
    handleSaveToApp();

    const element = formPrintRef.current || document.getElementById('dealer-print-form');
    if (element) {
      syncAllDOMFormValues(element);
    }

    setIsPrinting(true);
    showNotification(
      language === 'mr' ? 'प्रिंट तयार होत आहे...' : 'Preparing Print...',
      'info'
    );

    try {
      const firmClean = (formData.firmName || formData.center || 'Dealer_Application')
        .replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
      await exportElementToPrintOrPDF('dealer-print-form', `Blackworm_Dealer_${firmClean}`, {
        landscape: false,
        onComplete: () => {
          setIsPrinting(false);
        },
      });
    } catch (err) {
      console.error('Dedicated print failed, falling back to window.print():', err);
      try {
        window.print();
      } catch (printErr) {
        console.error('Fallback window.print() also failed:', printErr);
      }
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    // 1. Force save current form values into application database state
    handleSaveToApp();

    const firmClean = (formData.firmName || formData.center || 'Dealer_Application')
      .replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_')
      .substring(0, 30);
    const codeClean = (formData.code || 'FORM').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Blackworm_Dealer_${codeClean}_${firmClean}`;

    try {
      await exportElementToPDF('dealer-print-form', fileName, {
        scale: 3,
        onComplete: () => setIsDownloading(false),
        onError: () => setIsDownloading(false),
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      setIsDownloading(false);
    }
  };

  const isAdmin = currentUser ? (
    currentUser.role === 'admin' || 
    currentUser.name.toLowerCase().includes('pravin') || 
    currentUser.name.toLowerCase().includes('shinde') || 
    currentUser.id === 'USR-001'
  ) : false;

  const visibleDealers = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return dealerApplications;
    const currentName = (currentUser.fullName || currentUser.name || '').toLowerCase();
    return dealerApplications.filter((dealer: DealerApplication) => {
      const assigned = (dealer.assignedOfficer || '').toLowerCase();
      return !assigned || assigned.includes(currentName) || currentName.includes(assigned) || dealer.assignedOfficer === currentUser.id;
    });
  }, [isAdmin, dealerApplications, currentUser]);

  const filteredDealers = visibleDealers.filter((dealer: DealerApplication) => {
    // Filter by tab
    if (filterTab === 'active' && dealer.status === 'cancelled') return false;
    if (filterTab === 'cancelled' && dealer.status !== 'cancelled') return false;

    // Filter by search
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (dealer.dealerCode && dealer.dealerCode.toLowerCase().includes(term)) ||
      dealer.firmName.toLowerCase().includes(term) ||
      dealer.proprietorName.toLowerCase().includes(term) ||
      dealer.mobile.includes(term) ||
      dealer.district.toLowerCase().includes(term)
    );
  });

  const activeCount = visibleDealers.filter((d: DealerApplication) => d.status !== 'cancelled').length;
  const cancelledCount = visibleDealers.filter((d: DealerApplication) => d.status === 'cancelled').length;

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-6 px-1 sm:px-4 animate-in fade-in duration-150">
      {/* TOP CONTROLS: Search Option & 'Dealer Form' Button */}
      <div className="print:hidden bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Search Option */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="dealer-search-input"
            type="text"
            placeholder={
              language === 'mr'
                ? 'डीलर कोड, फर्म, नाव किंवा मोबाईलने सर्च करा...'
                : 'Search by Dealer Code, firm, proprietor, phone...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors bg-slate-50/50"
          />
        </div>

        {/* 'डीलर फॉर्म' / 'Dealer Form' Button */}
        <button
          id="dealer-form-open-btn"
          onClick={handleOpenNewForm}
          className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>{language === 'mr' ? 'नवीन डीलर फॉर्म' : 'New Dealer Form'}</span>
        </button>
      </div>

      {/* DEALERSHIP APPLICATION FORM VIEW */}
      {isFormOpen && (
        <div className="mt-3 sm:mt-4 space-y-3">
          {/* HEADER ACTION BAR: LIVE CAMERA, SAVE/UPDATE, PRINT, DOWNLOAD PDF, DELETE */}
          <div className="print:hidden bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            {/* Left: Mode Indicator Badge & Live Camera Trigger */}
            <div className="flex items-center gap-2">
              {currentAppId && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {language === 'mr'
                      ? `संपादन: ${formData.code || 'डीलर अर्ज'}`
                      : `Editing: ${formData.code || 'Dealer App'}`}
                  </span>
                </div>
              )}

              {/* LIVE CAMERA BUTTON */}
              <button
                type="button"
                id="dealer-btn-camera"
                onClick={handleOpenLiveCameraModal}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
                title={language === 'mr' ? 'कॅमेऱ्याने थेट फोटो काढा' : 'Live Camera Photo'}
              >
                <Camera className="w-4 h-4 text-amber-600" />
                <span>
                  {formData.applicantPhotoUrl
                    ? language === 'mr'
                      ? 'फोटो बदला'
                      : 'Change Photo'
                    : language === 'mr'
                    ? 'कॅमेरा फोटो'
                    : 'Live Photo'}
                </span>
              </button>

              {formData.applicantPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, applicantPhotoUrl: '' }))}
                  className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                  title={language === 'mr' ? 'फोटो काढून टाका' : 'Remove Photo'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              {/* BUTTON 1: SAVE / UPDATE */}
              <button
                id="dealer-btn-save"
                onClick={handleSaveToApp}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
              >
                {saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {saveSuccess
                    ? language === 'mr'
                      ? 'सेव्ह झाले!'
                      : 'Saved!'
                    : currentAppId
                    ? language === 'mr'
                      ? 'अपडेट करा'
                      : 'Update'
                    : language === 'mr'
                    ? 'सेव्ह करा'
                    : 'Save'}
                </span>
              </button>

              {/* BUTTON 2: PRINT */}
              <button
                type="button"
                id="dealer-btn-print"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isPrinting
                    ? language === 'mr'
                      ? 'प्रिंट सुरू...'
                      : 'Printing...'
                    : language === 'mr'
                    ? 'प्रिंट'
                    : 'Print'}
                </span>
              </button>

              {/* BUTTON 3: DOWNLOAD PDF */}
              <button
                type="button"
                id="dealer-btn-download-pdf"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloading
                    ? language === 'mr'
                      ? 'डाउनलोड होत आहे...'
                      : 'Downloading...'
                    : 'PDF'}
                </span>
              </button>

              {/* DELETE BUTTON (IF EXISTING FORM) */}
              {currentAppId && (
                <button
                  type="button"
                  onClick={() => {
                    const found = dealerApplications.find((d) => d.id === currentAppId);
                    if (found) setDealerToDelete(found);
                  }}
                  className="flex items-center gap-1 text-xs sm:text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
                  title="हा फॉर्म डिलीट करा"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span className="hidden sm:inline">{language === 'mr' ? 'डिलीट' : 'Delete'}</span>
                </button>
              )}
            </div>
          </div>

          {/* CANCELLED NOTIFICATION WATERMARK / BANNER (IF RECORD WAS CANCELLED) */}
          {currentStatus === 'cancelled' && (
            <div className="bg-red-50 border-2 border-red-300 p-3 rounded-2xl flex items-center justify-between text-xs text-red-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded text-[10px] mr-2">
                    Cancelled Dealership
                  </span>
                  <span>
                    हा डीलर अर्ज रद्द केलेला आहे {cancelledDate ? `(दिनांक: ${cancelledDate})` : ''}.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* HORIZONTAL PAN/SCROLL CONTAINER */}
          <div className="w-full overflow-x-auto pb-4 pt-1 rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="mx-auto">
              <div
                id="dealer-print-form"
                ref={formPrintRef}
                className="bg-white text-black mx-auto p-4 sm:p-5 border-[2px] border-red-700 shadow-md w-[780px] min-w-[780px] flex flex-col justify-between select-text"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxSizing: 'border-box',
                }}
              >
                {/* 1. TOP HEADER: INTEGRATED LOGO ON LEFT, COMPANY DETAILS CENTERED, & CIRCULAR APPLICANT PHOTO ON RIGHT */}
                <div className="pb-2 border-b border-red-200 flex items-center justify-between bg-transparent">
                  {/* LEFT: OFFICIAL BLACKWORM LOGO (CLEAN BLEND, NO ARTIFACT BOX) */}
                  <div className="w-32 shrink-0 flex items-center justify-center p-1 bg-transparent">
                    <img
                      src={companyDetails?.logoUrl || BLACKWORM_LOGO_BASE64}
                      alt="Blackworm Agritech Logo"
                      className="h-20 w-auto max-w-[125px] object-contain select-none bg-transparent mix-blend-multiply"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* CENTER: COMPANY LEGAL DETAILS (PERFECTLY CENTERED, CLEAN & SHARP) */}
                  <div className="flex-1 text-center px-1">
                    <h1 className="text-xl font-black text-red-700 tracking-tight leading-tight uppercase font-sans">
                      BLACKWORM AGRITECH PVT LTD
                    </h1>
                    <p className="text-[10px] font-bold text-emerald-800 tracking-wide uppercase">
                      {companyDetails?.tagline || 'Agriculture with new perspective'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 leading-tight">
                      CIN : U01409PN2022PTC217246, GST No. 27AALCB3069J1ZC
                    </p>
                    <p className="text-[10.5px] text-slate-800 font-semibold leading-tight mt-0.5">
                      Address - Gat No. 17 Vijaynagar (Mhaisal), Tal - Miraj, Dist - Sangli. 416409.
                    </p>
                    <p className="text-[10.5px] text-slate-900 font-semibold leading-tight mt-0.5 flex items-center justify-center gap-3">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-red-600" /> +91 7798716201</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-red-600" /> <span className="underline font-bold text-red-700">blackwormagritechpvtltd@gmail.com</span></span>
                    </p>
                  </div>

                  {/* RIGHT: CIRCULAR APPLICANT PHOTO (WITH PROFESSIONAL BORDER) */}
                  <div className="w-28 shrink-0 flex flex-col items-center justify-center">
                    {formData.applicantPhotoUrl ? (
                      <div
                        onClick={handleOpenLiveCameraModal}
                        className="relative cursor-pointer group"
                        title={language === 'mr' ? 'क्लिक करून फोटो बदला' : 'Click to change photo'}
                      >
                        <div className="w-20 h-20 rounded-full border-2 border-red-700 overflow-hidden bg-slate-100 flex items-center justify-center shadow-xs">
                          <img
                            src={formData.applicantPhotoUrl}
                            alt="Applicant"
                            className="w-full h-full object-cover select-none"
                          />
                        </div>
                        <div className="print:hidden absolute bottom-0 right-0 bg-red-600 text-white p-1 rounded-full shadow-xs hover:bg-red-700 transition-colors">
                          <Camera className="w-3 h-3" />
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={handleOpenLiveCameraModal}
                        className="print:border-slate-800 w-20 h-20 rounded-full border-2 border-dashed border-slate-400 bg-slate-50 hover:bg-red-50 hover:border-red-500 transition-all flex flex-col items-center justify-center cursor-pointer group shadow-2xs"
                        title={language === 'mr' ? 'कॅमेऱ्याने थेट फोटो काढा' : 'Capture Live Photo'}
                      >
                        <Camera className="w-5 h-5 text-slate-500 group-hover:text-red-600 transition-colors print:hidden" />
                        <span className="text-[8px] font-bold text-slate-600 group-hover:text-red-600 text-center leading-tight mt-0.5 print:hidden">
                          {language === 'mr' ? 'कॅमेरा फोटो' : 'Live Photo'}
                        </span>
                        <span className="hidden print:inline text-[8px] font-bold text-slate-400 uppercase text-center">
                          PHOTO
                        </span>
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-900 uppercase mt-1 tracking-tight text-center">
                      {language === 'mr' ? 'अर्जदार फोटो' : 'Applicant Photo'}
                    </span>
                  </div>
                </div>

                {/* BRAND ACCENT DIVIDER */}
                <div className="h-0.5 w-full bg-gradient-to-r from-red-600 via-emerald-600 to-red-600 my-0.5" />

                {/* 2. APPLICATION FOR DEALERSHIP BANNER */}
                <div className="text-center py-1 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white border-y border-red-800">
                  <h2 className="text-xs font-black tracking-widest uppercase text-white drop-shadow-2xs">
                    APPLICATION FOR DEALERSHIP
                  </h2>
                </div>

                {/* 3. DEALER DATA HEADER */}
                <div className="text-center py-0.5 bg-emerald-800 text-white border-b border-emerald-900">
                  <h3 className="text-[11px] font-black tracking-wider uppercase text-white">
                    DEALER DATA
                  </h3>
                </div>

                {/* 4. DEALER DATA TABLE */}
                <table className="w-full border-collapse border-b border-slate-400 text-xs table-fixed">
                  <tbody>
                    {/* Row 1: Center & Shop Opening Date */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold w-[18%] align-middle text-slate-900">
                        Center -
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1 w-[32%] align-middle">
                        <input
                          type="text"
                          value={formData.center}
                          onChange={(e) => handleInputChange('center', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold w-[25%] align-middle text-slate-900">
                        Shop Opening Date -
                      </td>
                      <td className="px-2 py-1 w-[25%] align-middle">
                        <input
                          type="date"
                          value={formData.shopOpeningDate}
                          onChange={(e) => handleInputChange('shopOpeningDate', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                        />
                      </td>
                    </tr>

                    {/* Row 2: Name & Full Address (Left 4 Rows) vs Code & 3 Blank Rows (Right) */}
                    <tr className="border-b border-slate-400">
                      <td colSpan={2} rowSpan={4} className="border-r border-slate-400 px-2 py-1.5 align-middle text-center relative overflow-hidden group">
                        {/* Stamp Placeholder Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-dashed border-red-200 flex items-center justify-center rotate-12 pointer-events-none opacity-40">
                          <span className="text-[8px] font-bold text-red-400 text-center uppercase leading-tight">
                            Dealer Shop<br />Stamp & Seal<br />Required
                          </span>
                        </div>

                        {!formData.addressStamp && (
                          <div className="absolute inset-0 p-2 pointer-events-none flex flex-col items-center justify-center text-center z-0">
                            <span className="text-[10px] text-slate-400 italic font-medium text-center">
                              (Name & Full Address of Dealership)
                            </span>
                            <span className="text-[9px] text-slate-300 italic font-medium mt-1 text-center">
                              (Address Stamp Area)
                            </span>
                          </div>
                        )}
                        
                        <textarea
                          rows={4}
                          value={formData.addressStamp}
                          onChange={(e) => handleInputChange('addressStamp', e.target.value)}
                          className="w-full h-full p-0 bg-transparent border-none outline-none resize-none font-bold text-black text-xs leading-snug relative z-10 text-center flex items-center justify-center"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold align-middle text-slate-900">
                        Code
                      </td>
                      <td className="px-2 py-1 align-middle bg-slate-50/40">
                        {formData.code ? (
                          <span className="font-mono font-black text-xs text-red-700 tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-300 inline-block shadow-2xs">
                            {formData.code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic font-medium select-none">
                            (Auto-generated on Save)
                          </span>
                        )}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold text-slate-900">
                        Village
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={formData.village}
                          onChange={(e) => handleInputChange('village', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold text-slate-900">
                        Security Deposit
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={formData.securityDeposit}
                          onChange={(e) => handleInputChange('securityDeposit', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400 h-6">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                    </tr>

                    {/* Row 3: Firm Name */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Firm Name -
                      </td>
                      <td colSpan={3} className="px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.firmName}
                          onChange={(e) => handleInputChange('firmName', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    {/* Row 4: Proprietor Name */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Proprietor Name -
                      </td>
                      <td colSpan={3} className="px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.proprietorName}
                          onChange={(e) => handleInputChange('proprietorName', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    {/* Row 5: Contact Number & State */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold align-middle whitespace-nowrap text-slate-900 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-red-600" />
                        Contact Number -
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1.5 align-middle">
                        <input
                          type="tel"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono text-xs p-0"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        State
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                        />
                      </td>
                    </tr>

                    {/* Row 6: E-mail ID */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-red-600" />
                        E-mail ID -
                      </td>
                      <td colSpan={3} className="px-2 py-1.5 align-middle">
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    {/* Row 7: Aadhaar No & District */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Aadhaar No -
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.aadhaarNo}
                          onChange={(e) => handleInputChange('aadhaarNo', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono text-xs p-0"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        District
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.district}
                          onChange={(e) => handleInputChange('district', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    {/* Row 8: Pan No & Date of Birth */}
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Pan No -
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.panNo}
                          onChange={(e) => handleInputChange('panNo', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono uppercase text-xs p-0"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Date of Birth
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                        />
                      </td>
                    </tr>

                    {/* Row 9: GST No & Pin Code */}
                    <tr>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        GST No -
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.gstNo}
                          onChange={(e) => handleInputChange('gstNo', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono uppercase text-xs p-0"
                          placeholder=""
                        />
                      </td>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1.5 font-bold align-middle whitespace-nowrap text-slate-900">
                        Pin Code
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="text"
                          value={formData.pinCode}
                          onChange={(e) => handleInputChange('pinCode', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 5. BANK DETAILS HEADER */}
                <div className="text-center py-0.5 bg-emerald-800 text-white border-y border-emerald-900">
                  <h3 className="text-[11px] font-black tracking-wider uppercase text-white">
                    BANK DETAILS
                  </h3>
                </div>

                {/* 6. BANK DETAILS TABLE */}
                <table className="w-full border-collapse border-b border-slate-400 text-xs table-fixed">
                  <tbody>
                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold w-[25%] align-middle whitespace-nowrap text-slate-900">
                        Bank Name -
                      </td>
                      <td className="px-2 py-1 w-[75%] align-middle">
                        <input
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => handleInputChange('bankName', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold align-middle whitespace-nowrap text-slate-900">
                        Bank Address -
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <input
                          type="text"
                          value={formData.bankAddress}
                          onChange={(e) => handleInputChange('bankAddress', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    <tr className="border-b border-slate-400">
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold align-middle whitespace-nowrap text-slate-900">
                        Account No -
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <input
                          type="text"
                          value={formData.accountNo}
                          onChange={(e) => handleInputChange('accountNo', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>

                    <tr>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold align-middle whitespace-nowrap text-slate-900">
                        IFSC Code -
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <input
                          type="text"
                          value={formData.ifscCode}
                          onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                          className="w-full bg-transparent border-none outline-none font-medium text-black font-mono uppercase text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 7. SECURITY CHEQUE BANNER */}
                <div className="border-b border-amber-300 text-center py-1 px-2 bg-amber-50">
                  <p className="text-[10px] font-bold text-amber-900 leading-tight">
                    Security Cheque Details (Blank Cheque crossed on 'BLACKWORM AGRITECH PVT LTD'. Issue Nationalised bank cheque only.)
                  </p>
                </div>

                {/* 8. CHEQUE NO ROW */}
                <table className="w-full border-collapse border-b border-slate-400 text-xs table-fixed">
                  <tbody>
                    <tr>
                      <td className="border-r border-slate-400 bg-slate-50 px-2 py-1 font-bold w-[25%] align-middle whitespace-nowrap text-slate-900">
                        Cheque no -
                      </td>
                      <td className="px-2 py-1 w-[75%] align-middle">
                        <input
                          type="text"
                          value={formData.chequeNo}
                          onChange={(e) => handleInputChange('chequeNo', e.target.value)}
                          className="w-full bg-transparent border-none outline-none font-bold text-black font-mono text-xs p-0"
                          placeholder=""
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 9. DECLARATION HEADER */}
                <div className="border-b border-slate-400 text-center py-0.5 bg-slate-100">
                  <h3 className="text-[11px] font-black tracking-wider uppercase text-slate-800">
                    DECLARATION
                  </h3>
                </div>

                {/* 10. DECLARATION TEXT */}
                <div className="border-b border-slate-400 p-2 text-[9.5px] text-slate-800 leading-normal text-justify bg-slate-50/30">
                  I / we certify that the foregoing information is correct and complete to the best of my/our knowledge and belief and nothing has been concealed. I shall abide to policies & procedure laid by company from time to time. If at any time, I / we have concealed any material / information or given any false details, our appointment shall be liable to summary termination without notice or compensation.
                </div>

                {/* 11. PLACE, DATE & PROPRIETOR SIGN */}
                <div className="p-2.5 flex items-end justify-between text-xs bg-transparent">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Place -</span>
                      <input
                        type="text"
                        value={formData.place}
                        onChange={(e) => handleInputChange('place', e.target.value)}
                        className="border-b border-dashed border-slate-700 px-1 py-0 outline-none w-36 bg-transparent text-xs text-black font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Date -</span>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="border-b border-dashed border-slate-700 px-1 py-0 outline-none w-40 bg-transparent text-xs text-black font-medium"
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="h-8 w-44" />
                    <p className="font-bold text-slate-900 text-xs">Proprietor Sign</p>
                  </div>
                </div>

                {/* 12. REMARKS (OFFICE USE ONLY) & OFFICER SIGNATURE */}
                <div className="border-t-2 border-slate-700 pt-2 mt-2 space-y-3 bg-slate-50/50 p-2 rounded-xs border border-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[11px] text-slate-900 whitespace-nowrap">Remarks :- (Office Use Only)</span>
                    <div className="flex-1 border-b border-slate-400 h-3" />
                  </div>
                  <div className="border-b border-slate-400 h-3 w-full" />

                  <div className="flex justify-end pt-2 pb-1 pr-1">
                    <div className="text-center w-60 max-w-full">
                      <input
                        type="text"
                        value={formData.officerName}
                        onChange={(e) => handleInputChange('officerName', e.target.value)}
                        className="w-full text-xs font-black uppercase text-slate-900 tracking-wider pb-0 border-none outline-none text-center bg-transparent leading-none"
                        placeholder="OFFICER NAME"
                      />
                      <div className="border-b-2 border-slate-800 w-full" />
                      <p className="font-bold text-slate-900 text-[10.5px] mt-0.5 leading-none">
                        Officer Name & Signature
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEALERS SEARCH LIST & MANAGEMENT (When Form is Closed) */}
      {!isFormOpen && (
        <div className="mt-4 space-y-3">
          {/* HEADER BAR FOR LIST */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {language === 'mr' ? 'सर्व अर्ज' : 'All Applications'} ({dealerApplications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'active'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {language === 'mr' ? 'सक्रिय' : 'Active'} ({activeCount})
              </button>
              {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('cancelled')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    filterTab === 'cancelled'
                      ? 'bg-red-700 text-white shadow-2xs'
                      : 'bg-red-50 text-red-800 hover:bg-red-100'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>{language === 'mr' ? 'रद्द' : 'Cancelled'} ({cancelledCount})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {language === 'mr'
                ? 'तुम्ही भरलेले अर्ज येथे दिसतील. तुम्ही ते एडिट किंवा डिलीट करू शकता.'
                : 'Applications you fill appear here with Edit & Delete options.'}
            </div>
          </div>

          {filteredDealers.length > 0 ? (
            <div className="space-y-2">
              {filteredDealers.map((d: DealerApplication) => {
                const isCancelled = d.status === 'cancelled';
                return (
                  <div
                    key={d.id}
                    className={`bg-white p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCancelled
                        ? 'border-red-200/80 bg-red-50/20'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Dealer Code Tag */}
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wider">
                          {d.dealerCode || 'DEALER-???'}
                        </span>

                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {d.firmName}
                        </span>

                        {d.proprietorName && (
                          <span className="text-slate-500 text-xs font-medium">
                            • {d.proprietorName}
                          </span>
                        )}

                        {/* Status Badge */}
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3" />
                            {language === 'mr' ? 'रद्द' : 'Cancelled'}
                          </span>
                        ) : d.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {language === 'mr' ? 'मंजूर' : 'Approved'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            {language === 'mr' ? 'प्रलंबित / नोंदणीकृत' : 'Registered'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        {d.shopAddress && <span className="truncate max-w-sm">{d.shopAddress}</span>}
                        {d.district && <span>• {d.district}</span>}
                        {d.applicationDate && <span>• दिनांक: {d.applicationDate}</span>}
                        {d.mobile && <span className="font-mono font-medium">📱 {d.mobile}</span>}
                      </div>
                    </div>

                    {/* ACTION BUTTONS: EDIT & DELETE AS EXPLICITLY REQUESTED */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* EDIT OPTION */}
                      <button
                        type="button"
                        onClick={() => handleEditForm(d)}
                        className="px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                        title="माहिती एडिट करा (Edit Application)"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>{language === 'mr' ? 'एडिट' : 'Edit'}</span>
                      </button>

                      {/* DELETE OPTION */}
                      <button
                        type="button"
                        onClick={() => setDealerToDelete(d)}
                        className="px-2.5 py-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                        title="अर्ज डिलीट करा (Delete Application)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>{language === 'mr' ? 'डिलीट' : 'Delete'}</span>
                      </button>

                      {/* VIEW / PRINT FORM */}
                      <button
                        type="button"
                        onClick={() => handleOpenExistingForm(d)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                        title="फॉर्म पहा व प्रिंट करा"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>{language === 'mr' ? 'प्रिंट' : 'Print'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {language === 'mr' ? 'कोणताही डीलर अर्ज सेव्ह केलेला नाही.' : 'No dealer applications saved yet.'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {language === 'mr'
                    ? 'तुम्ही भरलेला फॉर्म येथे जमा होईल. नवीन फॉर्म भरण्यासाठी वरील \'नवीन डीलर फॉर्म\' वर क्लिक करा.'
                    : 'Applications you fill and save will appear here. Click \'New Dealer Form\' above to add.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{language === 'mr' ? 'आताच नवीन फॉर्म भरा' : 'Fill New Dealer Form'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {dealerToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {language === 'mr' ? 'डीलर अर्ज डिलीट करायचा आहे का?' : 'Delete Dealer Application?'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'mr' ? (
                    <>
                      <strong>{dealerToDelete.firmName}</strong> (कोड:{' '}
                      <span className="font-mono font-bold text-red-600">
                        {dealerToDelete.dealerCode}
                      </span>
                      ) चा अर्ज पूर्णपणे डिलीट केला जाईल.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete application for{' '}
                      <strong>{dealerToDelete.firmName}</strong> (Code:{' '}
                      <span className="font-mono font-bold text-red-600">
                        {dealerToDelete.dealerCode}
                      </span>
                      )?
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 space-y-1">
              <div className="font-bold flex items-center gap-1 text-slate-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'mr' ? 'कोड व्यवस्थापन खात्री:' : 'Code Management Note:'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {language === 'mr'
                  ? `हा अर्ज डिलीट केल्यास त्याचा कोड (${dealerToDelete.dealerCode}) मोकळा होईल आणि पुढील नवीन अर्जासाठी पुन्हा उपलब्ध होईल.`
                  : `Deleting this application frees up code (${dealerToDelete.dealerCode}) for the next new application.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDealerToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'mr' ? 'रद्द करा (बाहेर पडा)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'होय, डिलीट करा' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {dealerToCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {language === 'mr' ? 'डीलरशिप रद्द करायची आहे का?' : 'Confirm Dealership Cancellation'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>{dealerToCancel.firmName}</strong> (कोड: {dealerToCancel.dealerCode})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDealerToCancel(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'mr' ? 'मागे जा' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>{language === 'mr' ? 'रद्द करा' : 'Confirm Cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE DEVICE CAMERA CAPTURE MODAL WITH CIRCULAR CROP */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {language === 'mr' ? 'अर्जदाराचा लाइव्ह फोटो (Device Camera)' : 'Applicant Live Camera Photo'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'mr' ? 'वर्तुळाकार फ्रेममध्ये थेट फोटो काढा' : 'Direct capture with circular crop'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main View Area */}
            <div className="p-4 sm:p-6 flex flex-col items-center bg-slate-950 text-white relative">
              {photoPreview ? (
                /* Snapshot Preview Mode with Circular Frame */
                <div className="flex flex-col items-center py-2 space-y-3 w-full">
                  <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl bg-black flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Captured Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-amber-300 font-semibold text-center">
                    {language === 'mr' ? 'असा फोटो डीलर फॉर्मवर दिसेल' : 'Preview with circular crop on dealer form'}
                  </p>
                </div>
              ) : (
                /* Live Camera Stream with Circular Viewfinder Guide */
                <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[300px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Circular Viewfinder Mask Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full border-2 border-white/90 border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    </div>
                  </div>

                  {/* Switch Camera Button (Front/Back) */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 hover:bg-black text-white backdrop-blur-xs transition-colors cursor-pointer"
                    title={language === 'mr' ? 'कॅमेरा बदला (Front/Back)' : 'Switch Camera'}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="mt-3 p-3 bg-red-950/90 border border-red-800 rounded-xl text-xs text-red-200 text-center w-full">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Controls Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2.5">
              {photoPreview ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'पुन्हा काढा (Retake)' : 'Retake'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPhoto}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{language === 'mr' ? 'फोटो वापरा (Apply)' : 'Apply Photo'}</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Upload File Fallback */}
                  <label className="py-2.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'गॅलरी / फाईल' : 'Upload File'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFilePhotoSelect}
                      className="hidden"
                    />
                  </label>

                  {/* Snap Shutter Button */}
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{language === 'mr' ? 'फोटो काढा (Capture)' : 'Capture Photo'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
