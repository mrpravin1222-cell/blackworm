import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BLACKWORM_LOGO_BASE64, BLACKWORM_USER_UPLOADED_LOGO_BASE64 } from '../assets/logoBase64';
import {
  Building2,
  Landmark,
  Save,
  Upload,
  User as UserIcon,
  Edit2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    language,
    currentUser,
    updateUser,
    companyDetails,
    updateCompanyDetails,
    showNotification,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin' || currentUser?.loginId === 'admin' || currentUser?.id === 'USR-001';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyForm, setCompanyForm] = useState({ ...companyDetails });
  const [bankForm, setBankForm] = useState({ ...companyDetails.bankDetails });

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

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (currentUser) {
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
    }

    if (isAdmin) {
      updateCompanyDetails({
        ...companyForm,
        bankDetails: bankForm,
      });
    }

    setIsEditing(false);
    showNotification(language === 'mr' ? 'सर्व माहिती यशस्वीरित्या सेव्ह झाली!' : 'All information saved successfully!', 'success');
  };

  const [isEditing, setIsEditing] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCompanyForm(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Unified Header with Edit Button */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              {language === 'mr' ? 'कंपनी व वैयक्तिक माहिती' : 'Company & Personal Information'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={() => handleSaveAll()}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {language === 'mr' ? 'सर्व माहिती सेव्ह करा' : 'Save All Information'}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                {language === 'mr' ? 'माहिती एडिट करा' : 'Edit Information'}
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="p-8 space-y-10">
            {/* ADMIN ONLY: COMPANY & BANK EDIT SECTION */}
            {isAdmin && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{language === 'mr' ? 'कंपनीची माहिती' : 'Company Details'}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'कंपनीचे नाव' : 'Company Name'}</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'टॅगलाईन' : 'Tagline'}</label>
                    <input
                      type="text"
                      value={companyForm.tagline}
                      onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">CIN Number</label>
                    <input
                      type="text"
                      value={companyForm.cin}
                      onChange={(e) => setCompanyForm({ ...companyForm, cin: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GST Number</label>
                    <input
                      type="text"
                      value={companyForm.gstNo}
                      onChange={(e) => setCompanyForm({ ...companyForm, gstNo: e.target.value.toUpperCase() })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm uppercase focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'नोंदणीकृत पत्ता' : 'Registered Address'}</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Phone</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 cursor-pointer transition-all w-fit"
                    >
                      <Upload className="w-4 h-4" />
                      {language === 'mr' ? 'कंपनी लोगो अपलोड करा' : 'Upload Company Logo'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mt-10">
                  <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{language === 'mr' ? 'बँक तपशील' : 'Bank Details'}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'कंपनीचे नाव (खातेधारक)' : 'Company Name (A/C Holder)'}</label>
                    <input
                      type="text"
                      value={bankForm.accountHolder}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'बँकेचे नाव' : 'Bank Name'}</label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'खाते क्रमांक' : 'Account Number'}</label>
                    <input
                      type="text"
                      value={bankForm.accountNo}
                      onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">IFSC Code</label>
                    <input
                      type="text"
                      value={bankForm.ifsc}
                      onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold uppercase text-sm focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PERSONAL PROFILE EDIT SECTION */}
            <div className="space-y-8 mt-10">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{language === 'mr' ? 'वैयक्तिक माहिती' : 'Personal Details'}</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'पूर्ण नाव' : 'Full Name'}</label>
                  <input
                    type="text"
                    value={userProfileForm.fullName}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, fullName: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}</label>
                  <input
                    type="tel"
                    value={userProfileForm.phone}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, phone: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email</label>
                  <input
                    type="email"
                    value={userProfileForm.email}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, email: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'गाव / शहर' : 'Village / Town'}</label>
                  <input
                    type="text"
                    value={userProfileForm.village}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, village: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'ब्लड ग्रुप' : 'Blood Group'}</label>
                  <input
                    type="text"
                    value={userProfileForm.bloodGroup}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, bloodGroup: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-red-600 text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'पासवर्ड' : 'Password'}</label>
                  <input
                    type="text"
                    value={userProfileForm.password}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, password: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:border-red-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'रहिवासी पत्ता' : 'Address'}</label>
                  <input
                    type="text"
                    value={userProfileForm.address}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, address: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'कार्यक्षेत्र' : 'Territory'}</label>
                  <input
                    type="text"
                    value={userProfileForm.territory}
                    onChange={(e) => setUserProfileForm({ ...userProfileForm, territory: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-0">
            {/* COMPANY INFO ROW: LOGO FLUSH ON LEFT */}
            <div className="flex flex-col lg:flex-row border-b border-slate-100">
              <div className="flex items-center gap-6 lg:w-1/2">
                {/* Logo container with no padding on left, flush with border */}
                <div className="w-32 h-32 bg-white flex items-center justify-center shrink-0 border-r border-slate-100">
                  <img
                    src={companyDetails.logoUrl || BLACKWORM_USER_UPLOADED_LOGO_BASE64 || BLACKWORM_LOGO_BASE64}
                    alt="Logo"
                    className="max-h-[85%] max-w-[85%] object-contain mix-blend-multiply"
                  />
                </div>
                <div className="min-w-0 pr-4">
                  <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {companyDetails.name}
                  </h4>
                  <p className="text-sm font-bold text-red-600 italic mt-0.5 tracking-wide">
                    Agriculture with new perspective
                  </p>
                </div>
              </div>

              {/* Company contact/reg info */}
              <div className="p-8 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CIN Number</p>
                  <p className="text-sm font-bold text-slate-700 font-mono">{companyDetails.cin}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN Number</p>
                  <p className="text-sm font-bold text-slate-700 font-mono uppercase">{companyDetails.gstNo}</p>
                </div>
                <div className="sm:col-span-2 space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'mr' ? 'नोंदणीकृत पत्ता' : 'Address'}</p>
                  <p className="text-sm font-semibold text-slate-600 leading-tight">{companyDetails.address}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone & Email</p>
                  <p className="text-sm font-bold text-slate-700 whitespace-nowrap">{companyDetails.phone} | {companyDetails.email}</p>
                </div>
              </div>
            </div>

            {/* BANK DETAILS ROW */}
            <div className="p-8 bg-emerald-50/30 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <h4 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">{language === 'mr' ? 'बँक तपशील माहिती' : 'Official Bank Details'}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1.5 space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Company Name (A/C Holder)</p>
                  <p className="text-sm font-black text-slate-900">{companyDetails.bankDetails?.accountHolder || companyDetails.name}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Bank Name</p>
                  <p className="text-sm font-bold text-slate-700">{companyDetails.bankDetails?.bankName}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">A/C Number</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{companyDetails.bankDetails?.accountNo}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">IFSC Code</p>
                  <p className="text-sm font-black text-slate-800 font-mono uppercase">{companyDetails.bankDetails?.ifsc}</p>
                </div>
              </div>
            </div>

            {/* PERSONAL INFORMATION ROW */}
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-4 h-4 text-red-600" />
                <h4 className="text-[11px] font-black text-red-800 uppercase tracking-widest">{language === 'mr' ? 'वैयक्तिक माहिती' : 'Personal Information'}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Officer Name</p>
                  <p className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>{currentUser?.fullName || currentUser?.name}</span>
                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 uppercase">
                      ({currentUser?.designation || currentUser?.role})
                    </span>
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Address</p>
                  <p className="text-sm font-semibold text-slate-600 truncate" title={currentUser?.address}>{currentUser?.address || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Email ID</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{currentUser?.email || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Mobile Number</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{currentUser?.phone}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Blood Group</p>
                  <p className="text-sm font-black text-red-700">{currentUser?.bloodGroup || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Designation</p>
                  <p className="text-sm font-bold text-red-600 uppercase tracking-tight">{currentUser?.designation || currentUser?.role}</p>
                </div>
                <div className="lg:col-span-2 space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Working Territory</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{currentUser?.territory || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />
    </div>
  );
};
