import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BLACKWORM_LOGO_BASE64, BLACKWORM_USER_UPLOADED_LOGO_BASE64 } from '../assets/logoBase64';
import { NavTab } from '../types';
import {
  Building2,
  Landmark,
  Save,
  Phone,
  Mail,
  MapPin,
  Upload,
  RotateCcw,
  User as UserIcon,
  ShieldCheck,
  Lock,
  Heart,
  Briefcase,
  Key,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  CreditCard,
  Download,
  Database,
  Globe,
  Users,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    language,
    setLanguage,
    currentUser,
    users,
    updateUser,
    companyDetails,
    updateCompanyDetails,
    exportDataJSON,
    importDataJSON,
    showNotification,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  // Admin company forms
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyForm, setCompanyForm] = useState({ ...companyDetails });
  const [bankForm, setBankForm] = useState({ ...companyDetails.bankDetails });
  const [importText, setImportText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  // User personal profile form
  const [userProfileForm, setUserProfileForm] = useState({
    fullName: currentUser?.fullName || currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    village: currentUser?.village || '',
    address: currentUser?.address || '',
    bloodGroup: currentUser?.bloodGroup || '',
    password: currentUser?.password || '',
    territory: currentUser?.territory || '',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setCompanyForm({ ...companyDetails });
    setBankForm({ ...companyDetails.bankDetails });
  }, [companyDetails]);

  useEffect(() => {
    if (currentUser) {
      setUserProfileForm({
        fullName: currentUser.fullName || currentUser.name || '',
        phone: currentUser.phone || '',
        email: currentUser.email || '',
        village: currentUser.village || '',
        address: currentUser.address || '',
        bloodGroup: currentUser.bloodGroup || '',
        password: currentUser.password || '',
        territory: currentUser.territory || '',
      });
    }
  }, [currentUser]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showNotification(language === 'mr' ? 'क्लिपबोर्डवर कॉपी झाले!' : 'Copied to clipboard!', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Single-click consolidated bank details copy: Company Name -> Bank Name -> Account No -> IFSC Code
  const handleCopyFullBankDetails = () => {
    const companyName = companyDetails.bankDetails?.accountHolder || companyDetails.name || 'Blackworm Agritech Pvt Ltd';
    const bankName = companyDetails.bankDetails?.bankName || 'Rajarambapu Sahakari Bank Limited, Miraj';
    const accountNo = companyDetails.bankDetails?.accountNo || '035330268109560';
    const ifsc = companyDetails.bankDetails?.ifsc || 'RRBP0000035';

    const fullBankText = `कंपनीचे नाव: ${companyName}\nबँकेचे नाव: ${bankName}\nखाते क्रमांक: ${accountNo}\nIFSC Code: ${ifsc}`;
    handleCopy(fullBankText, 'full_bank');
  };

  // Handle direct auto-save for company profile fields
  const handleCompanyFieldChange = (field: keyof typeof companyForm, value: any) => {
    const updated = { ...companyForm, [field]: value };
    setCompanyForm(updated);
    updateCompanyDetails({
      ...updated,
      bankDetails: bankForm,
    });
  };

  // Handle direct auto-save for bank detail fields
  const handleBankFieldChange = (field: keyof typeof bankForm, value: any) => {
    const updatedBank = { ...bankForm, [field]: value };
    setBankForm(updatedBank);
    updateCompanyDetails({
      ...companyForm,
      bankDetails: updatedBank,
    });
  };

  // Admin Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'mr' ? 'कृपया वैध इमेज फाईल (PNG, JPG, SVG) निवडा.' : 'Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = { ...companyForm, logoUrl: base64 };
      setCompanyForm(updated);
      updateCompanyDetails({
        ...updated,
        bankDetails: bankForm,
      }, true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUserProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    updateUser(currentUser.id, {
      fullName: userProfileForm.fullName,
      name: userProfileForm.fullName,
      phone: userProfileForm.phone,
      email: userProfileForm.email,
      village: userProfileForm.village,
      address: userProfileForm.address,
      bloodGroup: userProfileForm.bloodGroup,
      password: userProfileForm.password,
      territory: userProfileForm.territory,
    });
  };

  const handleDownloadBackup = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackworm_agritech_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const ok = importDataJSON(importText);
    if (ok) {
      setImportText('');
      setShowImportBox(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* SCENARIO 1: REGULAR USER LOGGED IN (Sales Officer / ASM / Field Officer) */}
      {/* ========================================================================= */}
      {!isAdmin && (
        <div className="space-y-6">
          {/* User Personal Profile Edit Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {language === 'mr' ? 'माझी वैयक्तिक माहिती (Personal Profile)' : 'My Personal Profile'}
                  </h2>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {currentUser?.designation || currentUser?.role || 'User'}
              </span>
            </div>

            <form onSubmit={handleSaveUserProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    {language === 'mr' ? 'पूर्ण नाव (Full Name) *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={userProfileForm.fullName}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, fullName: e.target.value })}
                    placeholder={language === 'mr' ? 'तुमचे पूर्ण नाव' : 'Your Full Name'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-bold bg-slate-50"
                  />
                </div>

                {/* Mobile / Phone */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-red-600" />
                    {language === 'mr' ? 'मोबाईल नंबर (Mobile Number) *' : 'Mobile Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={userProfileForm.phone}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, phone: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-bold bg-slate-50"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-red-600" />
                    {language === 'mr' ? 'ईमेल पत्ता (Email Address)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={userProfileForm.email}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, email: e.target.value })}
                    placeholder="you@company.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50"
                  />
                </div>

                {/* Village / Town */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {language === 'mr' ? 'गाव / शहर (Village / Town)' : 'Village / Town'}
                  </label>
                  <input
                    type="text"
                    value={userProfileForm.village}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, village: e.target.value })}
                    placeholder={language === 'mr' ? 'गाव / तालुका' : 'Village / Town'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50"
                  />
                </div>

                {/* Blood Group */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500" />
                    {language === 'mr' ? 'रक्तगट (Blood Group)' : 'Blood Group'}
                  </label>
                  <input
                    type="text"
                    value={userProfileForm.bloodGroup}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, bloodGroup: e.target.value })}
                    placeholder="O+, A+, B+, AB+..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-bold uppercase bg-slate-50"
                  />
                </div>

                {/* Login Password */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-600" />
                    {language === 'mr' ? 'लॉगिन पासवर्ड (Password)' : 'Login Password'}
                  </label>
                  <input
                    type="text"
                    value={userProfileForm.password}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, password: e.target.value })}
                    placeholder="Password"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono bg-slate-50"
                  />
                </div>

                {/* Residential Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">
                    {language === 'mr' ? 'घरचा पत्ता (Residential Address)' : 'Residential Address'}
                  </label>
                  <input
                    type="text"
                    value={userProfileForm.address}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, address: e.target.value })}
                    placeholder={language === 'mr' ? 'पूर्ण पत्ता' : 'Complete Residential Address'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50"
                  />
                </div>

                {/* Territory / Area */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-600" />
                    {language === 'mr' ? 'कार्यक्षेत्र (Territory)' : 'Working Territory'}
                  </label>
                  <input
                    type="text"
                    value={userProfileForm.territory}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, territory: e.target.value })}
                    placeholder={language === 'mr' ? 'तालुके / जिल्हे' : 'Assigned Territory'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{language === 'mr' ? 'माझी प्रोफाइल सेव्ह करा' : 'Save My Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* SINGLE CONSOLIDATED BOX FOR COMPANY DETAILS (READ-ONLY FOR USER) */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            {/* Box Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <img
                    src={companyDetails.logoUrl || BLACKWORM_USER_UPLOADED_LOGO_BASE64 || BLACKWORM_LOGO_BASE64}
                    alt="Blackworm Logo"
                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                  />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-white uppercase">
                    {companyDetails.name}
                  </h3>
                  <p className="text-[11px] font-bold text-emerald-400 tracking-wide">
                    {companyDetails.tagline || 'Agriculture with new perspective'}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-center">
                {language === 'mr' ? 'अधिकृत कंपनी माहिती (Read-Only)' : 'Official Company Credentials'}
              </span>
            </div>

            {/* Consolidated Box Content (All in one unified card) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-xs">
              {/* Left Column: Legal & Contact Details */}
              <div className="space-y-4 pr-0 md:pr-4">
                <h4 className="text-xs font-black uppercase text-red-700 tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>{language === 'mr' ? 'नोंदणी व संपर्क तपशील' : 'Registration & Contact'}</span>
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600">CIN No:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-900">{companyDetails.cin}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(companyDetails.cin, 'cin')}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Copy CIN"
                      >
                        {copiedKey === 'cin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600">GSTIN No:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-900 uppercase">{companyDetails.gstNo}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(companyDetails.gstNo, 'gst')}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Copy GST"
                      >
                        {copiedKey === 'gst' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-red-600" />
                        {language === 'mr' ? 'नोंदणीकृत पत्ता:' : 'Registered Address:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(companyDetails.address, 'address')}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:border-red-500 hover:text-red-600 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                        title={language === 'mr' ? 'संपूर्ण पत्ता कॉपी करा' : 'Copy Full Address'}
                      >
                        {copiedKey === 'address' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">{language === 'mr' ? 'पत्ता कॉपी झाला' : 'Address Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{language === 'mr' ? 'पत्ता कॉपी करा' : 'Copy Address'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900 pl-5 leading-relaxed text-xs">
                      {companyDetails.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="font-mono font-bold text-slate-900 truncate">{companyDetails.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(companyDetails.phone, 'phone')}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Copy Phone"
                      >
                        {copiedKey === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="font-semibold text-slate-900 text-[11px] truncate">{companyDetails.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(companyDetails.email, 'email')}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Copy Email"
                      >
                        {copiedKey === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Official Bank Account Details */}
              <div className="space-y-4 pt-4 md:pt-0 pl-0 md:pl-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2 flex-wrap">
                  <h4 className="text-xs font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'mr' ? 'अधिकृत बँक खाते तपशील' : 'Official Bank Details'}</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleCopyFullBankDetails}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                    title={language === 'mr' ? 'सर्व बँक तपशील एका क्लिकमध्ये कॉपी करा' : 'Copy All Bank Details in 1-Click'}
                  >
                    {copiedKey === 'full_bank' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>{language === 'mr' ? 'सर्व बँक तपशील कॉपी झाले!' : 'Bank Details Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{language === 'mr' ? 'बँक डिटेल्स कॉपी करा' : 'Copy Bank Details'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* 1. Company / Account Holder Name */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{language === 'mr' ? '१. कंपनीचे नाव (खातेधारक)' : '1. Company Name (Account Holder)'}</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {companyDetails.bankDetails?.accountHolder || companyDetails.name || 'Blackworm Agritech Pvt Ltd'}
                      </span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>

                  {/* 2. Bank Name */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{language === 'mr' ? '२. बँकेचे नाव' : '2. Bank Name'}</span>
                    <p className="font-black text-slate-900 text-xs">
                      {companyDetails.bankDetails?.bankName || 'Rajarambapu Sahakari Bank Limited, Miraj'}
                    </p>
                  </div>

                  {/* 3. Account Number */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{language === 'mr' ? '३. खाते क्रमांक (A/C No)' : '3. Account Number'}</span>
                    <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                      {companyDetails.bankDetails?.accountNo || '035330268109560'}
                    </span>
                  </div>

                  {/* 4. IFSC Code */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{language === 'mr' ? '४. IFSC Code' : '4. IFSC Code'}</span>
                    <span className="font-mono font-black text-slate-900 text-xs uppercase tracking-wider">
                      {companyDetails.bankDetails?.ifsc || 'RRBP0000035'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 2: ADMIN LOGGED IN (Full Management & Auto-Saved Editable Forms)  */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Section 1: Legal Company Profile with Small Side Logo Upload */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {language === 'mr' ? 'कंपनी प्रोफाइल व पत्ता (Company Profile)' : 'Company Profile & Registration'}
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'mr' ? 'माहिती भरताच आपोआप सेव्ह होते (Auto-saved)' : 'Changes save automatically'}</span>
                  </p>
                </div>
              </div>

              {/* Compact Logo Upload Box on the Side */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  title={language === 'mr' ? 'कंपनी लोगो बदलण्यासाठी येथे क्लिक करा' : 'Click here to upload/change logo'}
                  className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl border-2 border-dashed border-red-300 hover:border-red-500 bg-slate-50 hover:bg-red-50/40 p-1 flex items-center justify-center shrink-0 cursor-pointer group transition-all shadow-2xs overflow-hidden"
                >
                  <img
                    src={companyForm.logoUrl || BLACKWORM_USER_UPLOADED_LOGO_BASE64 || BLACKWORM_LOGO_BASE64}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform select-none"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity text-white">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'कंपनीचे नाव (Company Name)' : 'Company Name'}</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => handleCompanyFieldChange('name', e.target.value)}
                  placeholder="Blackworm Agritech Pvt Ltd"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-bold bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'टॅगलाईन (Tagline)' : 'Tagline'}</label>
                <input
                  type="text"
                  value={companyForm.tagline}
                  onChange={(e) => handleCompanyFieldChange('tagline', e.target.value)}
                  placeholder="Agriculture with new perspective"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden italic bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">CIN Number</label>
                <input
                  type="text"
                  value={companyForm.cin}
                  onChange={(e) => handleCompanyFieldChange('cin', e.target.value)}
                  placeholder="U01409PN2022PTC217246"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-semibold bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">GST Number</label>
                <input
                  type="text"
                  value={companyForm.gstNo}
                  onChange={(e) => handleCompanyFieldChange('gstNo', e.target.value.toUpperCase())}
                  placeholder="27AALCB3069J1ZC"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-semibold uppercase bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'नोंदणीकृत पत्ता (Registered Address)' : 'Registered Address'}</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => handleCompanyFieldChange('address', e.target.value)}
                  placeholder="Gat No. 17 Vijaynagar (Mhaisal), Tal - Miraj, Dist - Sangli. 416409."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'संपर्क फोन (Phone)' : 'Phone Number'}</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => handleCompanyFieldChange('phone', e.target.value)}
                  placeholder="+91 7798716201"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'ईमेल (Email Address)' : 'Email Address'}</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => handleCompanyFieldChange('email', e.target.value)}
                  placeholder="blackwormagritechpvtltd@gmail.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-red-500 focus:bg-white focus:outline-hidden bg-slate-50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Official Bank Account Details (Auto-Saved) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {language === 'mr' ? 'अधिकृत बँक खाते माहिती (Bank Details)' : 'Official Bank Account Details'}
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'mr' ? 'माहिती भरताच आपोआप सेव्ह होते (Auto-saved)' : 'Changes save automatically'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'बँकेचे नाव (Bank Name)' : 'Bank Name'}</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                  placeholder="Rajarambapu Sahakari Bank Limited, Miraj"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden font-bold bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'खाते क्रमांक (Account Number)' : 'Account Number'}</label>
                <input
                  type="text"
                  value={bankForm.accountNo}
                  onChange={(e) => handleBankFieldChange('accountNo', e.target.value)}
                  placeholder="035330268109560"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden font-mono font-bold tracking-wider bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">IFSC Code</label>
                <input
                  type="text"
                  value={bankForm.ifsc}
                  onChange={(e) => handleBankFieldChange('ifsc', e.target.value.toUpperCase())}
                  placeholder="RRBP0000035"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden font-mono font-bold uppercase tracking-wider bg-slate-50 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">{language === 'mr' ? 'खातेधारक नाव (Account Holder Name)' : 'Account Holder Name'}</label>
                <input
                  type="text"
                  value={bankForm.accountHolder}
                  onChange={(e) => handleBankFieldChange('accountHolder', e.target.value)}
                  placeholder="Blackworm Agritech Pvt Ltd"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white focus:outline-hidden font-semibold bg-slate-50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
