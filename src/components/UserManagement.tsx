import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BlackwormLogo } from './BlackwormLogo';
import { BLACKWORM_LOGO_BASE64, BLACKWORM_USER_UPLOADED_LOGO_BASE64 } from '../assets/logoBase64';
import { User, UserRole, NavTab } from '../types';
import { 
  ALL_NAV_MODULES, 
  STANDARD_USER_ALLOWED_TABS, 
  isShreedharUser, 
  isSuperAdmin,
  isAdmin as isAnyAdmin,
  sortUsersByRank 
} from '../utils/permissionHelpers';
import { initialUsers } from '../data/initialData';
import { generateShareMessage, getCleanAppLink, shareViaWhatsApp } from '../utils/shareHelpers';
import { 
  UserPlus, 
  Users, 
  User as UserIcon, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Droplet, 
  Lock, 
  Key,
  Shield,
  Trash2,
  Edit2,
  Save,
  LogOut,
  ChevronRight,
  Target,
  Eye,
  EyeOff,
  CheckCircle2,
  Share2,
  Send,
  Copy,
  ExternalLink,
  Check,
  Building,
  Building2,
  Landmark,
  Fingerprint,
  LockKeyhole,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { 
    language, 
    users, 
    currentUser, 
    setCurrentUser, 
    addUser, 
    updateUser, 
    deleteUser,
    showNotification,
    setActiveTab,
  } = useApp();

  const [view, setViewInternal] = useState<'login' | 'list' | 'create' | 'profile'>(() => {
    if (!currentUser || currentUser.id === 'GUEST' || !currentUser.loginId) {
      return 'login';
    }
    const isUsrAdmin = isShreedharUser(currentUser) || isSuperAdmin(currentUser);
    return isUsrAdmin ? 'list' : 'profile';
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    village: '',
    address: '',
    bloodGroup: '',
    password: '',
    territory: '',
    companyName: '',
    tagline: '',
    cin: '',
    gstNo: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    accountHolder: '',
  });

  const {
    companyDetails,
    updateCompanyDetails,
  } = useApp();

  React.useEffect(() => {
    const user = selectedUserForView || currentUser;
    if (user) {
      setProfileForm({
        fullName: user.fullName || user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        village: user.village || '',
        address: user.address || '',
        bloodGroup: user.bloodGroup || '',
        password: user.password || '',
        territory: user.territory || '',
        companyName: companyDetails.name || '',
        tagline: companyDetails.tagline || '',
        cin: companyDetails.cin || '',
        gstNo: companyDetails.gstNo || '',
        companyAddress: companyDetails.address || '',
        companyPhone: companyDetails.phone || '',
        companyEmail: companyDetails.email || '',
        bankName: companyDetails.bankDetails?.bankName || '',
        accountNo: companyDetails.bankDetails?.accountNo || '',
        ifsc: companyDetails.bankDetails?.ifsc || '',
        accountHolder: companyDetails.bankDetails?.accountHolder || '',
      });
    }
  }, [currentUser, selectedUserForView, companyDetails]);

  React.useEffect(() => {
    if (!currentUser || currentUser.id === 'GUEST' || !currentUser.loginId) {
      setViewInternal('login');
    }
  }, [currentUser]);

  const setView = (newView: 'login' | 'list' | 'create' | 'profile') => {
    if (newView !== 'create') setEditingUser(null);
    if (newView !== 'profile') setSelectedUserForView(null);
    setViewInternal(newView);
    window.history.pushState({ tab: 'user', subView: newView }, '', '');
  };

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab === 'user' && event.state.subView) {
        setViewInternal(event.state.subView);
        if (event.state.subView !== 'create') setEditingUser(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const isAdmin = isAnyAdmin(currentUser);
  const isSuperMaster = isSuperAdmin(currentUser);
  const isShreedhar = isShreedharUser(currentUser);
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null);
  const [tempAllowedTabs, setTempAllowedTabs] = useState<NavTab[]>([]);

  const openPermissionModal = (u: User) => {
    setPermissionModalUser(u);
    setTempAllowedTabs(u.allowedTabs && Array.isArray(u.allowedTabs) ? u.allowedTabs : (u.id === 'USR-001' || u.loginId === 'admin' ? ALL_NAV_MODULES.map(m => m.id) : STANDARD_USER_ALLOWED_TABS));
  };

  const handleSavePermissions = () => {
    if (!permissionModalUser) return;
    updateUser(permissionModalUser.id, { allowedTabs: tempAllowedTabs });
    setPermissionModalUser(null);
    showNotification(
      language === 'mr' ? 'ऑप्शन ॲक्सेस परवानग्या यशस्वीरित्या अपडेट झाल्या!' : 'Option access permissions updated successfully!',
      'success'
    );
  };

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qLogin = params.get('loginId') || params.get('id') || params.get('user');
      const qPass = params.get('pass') || params.get('password');
      if (qLogin) setLoginId(qLogin);
      if (qPass) setPassword(qPass);
    } catch {
      // Ignore URL parse errors
    }
  }, []);
  
  const defaultTabs: NavTab[] = STANDARD_USER_ALLOWED_TABS;

  const [formData, setFormData] = useState<Omit<User, 'id'>>({
    fullName: '',
    name: '',
    designation: 'Field Officer',
    village: '',
    address: '',
    phone: '',
    email: '',
    bloodGroup: 'A+',
    loginId: '',
    password: '',
    role: 'field-officer',
    territory: '',
    allowedTabs: defaultTabs,
  });

  React.useEffect(() => {
    if (editingUser) {
      setFormData({
        fullName: editingUser.fullName || editingUser.name,
        name: editingUser.name,
        designation: editingUser.designation || '',
        village: editingUser.village || '',
        address: editingUser.address || '',
        phone: editingUser.phone || '',
        email: editingUser.email || '',
        bloodGroup: editingUser.bloodGroup || 'A+',
        loginId: editingUser.loginId,
        password: editingUser.password,
        role: editingUser.role,
        territory: editingUser.territory || '',
        allowedTabs: editingUser.allowedTabs && editingUser.allowedTabs.length > 0 ? editingUser.allowedTabs : defaultTabs,
      });
    } else {
      setFormData({
        fullName: '',
        name: '',
        designation: 'Field Officer',
        village: '',
        address: '',
        phone: '',
        email: '',
        bloodGroup: 'A+',
        loginId: '',
        password: '',
        role: 'field-officer',
        territory: '',
        allowedTabs: defaultTabs,
      });
    }
  }, [editingUser]);

  const handleToggleTab = (tabId: NavTab) => {
    setFormData(prev => {
      const currentAllowed = prev.allowedTabs || [];
      const exists = currentAllowed.includes(tabId);
      const updatedTabs = exists
        ? currentAllowed.filter(t => t !== tabId)
        : [...currentAllowed, tabId];
      return { ...prev, allowedTabs: updatedTabs };
    });
  };

  const handleSelectAllTabs = () => {
    setFormData(prev => ({ ...prev, allowedTabs: STANDARD_USER_ALLOWED_TABS }));
  };

  const handleClearAllTabs = () => {
    setFormData(prev => ({ ...prev, allowedTabs: ['target-sheet'] }));
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
  const roles: { id: UserRole; label: string }[] = [
    { id: 'admin', label: 'Admin / MD' },
    { id: 'asm', label: 'ASM' },
    { id: 'field-officer', label: 'Field Officer' },
    { id: 'sales-officer', label: 'Sales Officer' },
    { id: 'sr', label: 'SR' },
    { id: 'sales-executive', label: 'Sales Executive' },
    { id: 'dealer', label: 'Dealer' },
  ];

  const handleInputChange = (field: keyof Omit<User, 'id'>, value: string) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      
      // Auto-populate 'name' with 'fullName'
      if (field === 'fullName') {
        newState.name = value;
      }
      
      // If role changes, update designation too since they are consolidated
      if (field === 'role') {
        const roleObj = roles.find(r => r.id === value);
        if (roleObj) {
          newState.designation = roleObj.label;
        }
      }
      
      return newState;
    });
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginId.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      showNotification(
        language === 'mr' ? 'कृपया युजर आयडी टाका!' : 'Please enter Login ID!',
        'info'
      );
      return;
    }

    if (!cleanPass) {
      showNotification(
        language === 'mr' ? 'कृपया पासवर्ड टाका!' : 'Please enter Password!',
        'info'
      );
      return;
    }

    setIsLoggingIn(true);
    
    // Simulate brief delay for better UX feedback
    setTimeout(() => {
        // 1. Permanent Secret Super Admin Master Authentication
        if (cleanId === 'super admin' && cleanPass === 'Blackworm') {
          const superAdminUser: User = {
            id: 'USR-MASTER-SUPERADMIN',
            fullName: 'Super Admin',
            name: 'Super Admin',
            designation: 'Owner',
            village: 'Corporate',
            address: 'Corporate',
            phone: '',
            email: '',
            bloodGroup: '',
            loginId: 'super admin',
            password: 'Blackworm',
            role: 'SUPER_ADMIN',
            territory: 'Corporate',
            allowedTabs: ALL_NAV_MODULES.map((m) => m.id),
            isActive: true
          };
          setIsLoggingIn(false);
          setCurrentUser(superAdminUser);
          setLoginId('');
          setPassword('');
          setActiveTab('dashboard');
          setView('list');
          showNotification(
            language === 'mr' ? 'सुपर ॲडमिन म्हणून यशस्वीरित्या लॉगिन झाले.' : 'Logged in successfully as Super Admin!',
            'success'
          );
          return;
        }

        // Master admin alternative login
        const isMasterAdminLogin = (
          (cleanId === 'admin') &&
          (cleanPass === 'Blackworm' || cleanPass === '123')
        );

        // Strict exact check against registered users & master admin credentials
        let user = users.find(u => {
          const uLogin = (u.loginId || '').trim().toLowerCase();
          const uEmail = (u.email || '').trim().toLowerCase();
          const uPhone = (u.phone || '').trim().toLowerCase();
          const uPass = (u.password || '').trim();

          const matchId = (uLogin === cleanId) || 
                          (uEmail === cleanId) || 
                          (uPhone === cleanId);

          return matchId && (uPass === cleanPass);
        });

        // Master admin login fallback
        if (!user && isMasterAdminLogin) {
          user = {
            id: 'USR-001',
            fullName: 'Shreedhar Balkrushna Shinde',
            name: 'Shreedhar Balkrushna Shinde',
            designation: 'Owner',
            village: 'Vijaynagar (Mhaisal)',
            address: 'Sangli',
            phone: '+91 7798716201',
            email: 'blackwormagritechpvtltd@gmail.com',
            bloodGroup: 'O+',
            loginId: 'admin',
            password: '123',
            role: 'ADMIN',
            territory: 'Head Office (Sangli)',
            allowedTabs: ALL_NAV_MODULES.map(m => m.id),
            isActive: true
          };
        }

        setIsLoggingIn(false);

        if (user) {
          setCurrentUser(user);
          setLoginId('');
          setPassword('');
          
          const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.id === 'USR-001';
          setActiveTab(isAdminUser ? 'dashboard' : 'target-sheet');
          setView(isAdminUser ? 'list' : 'profile');

        showNotification(
          language === 'mr'
            ? `${user.fullName || user.name} (${user.designation || user.role}) म्हणून यशस्वीरित्या लॉगिन झाले.`
            : `Login Successful as ${user.fullName || user.name} (${user.designation || user.role})!`,
          'success'
        );
      } else {
        showNotification(
          language === 'mr' 
            ? 'चुकीचा युजर आयडी किंवा पासवर्ड! कृपया युजर मॅनेजमेंटमधील नोंदणीकृत माहिती वापरा.' 
            : 'Invalid Login ID or Password! Please use credentials registered in User Management.',
          'info'
        );
      }
    }, 400);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData);
    }
    setEditingUser(null);
    setView('list');
  };

  // --- Render Functions ---

  const renderLogin = () => (
    <div className="max-w-md mx-auto mt-6 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="text-center mb-6">
        <div className="flex justify-center mx-auto mb-3">
          <BlackwormLogo size="lg" variant="horizontal" className="mx-auto" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {language === 'mr' ? 'युजर लॉगिन' : 'User Login'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'mr' ? 'ब्लॅकवर्म ॲग्रिटेक ॲपमध्ये साइन-इन करा' : 'Sign in to Blackworm Agritech App'}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            {language === 'mr' ? 'लॉगिन आयडी' : 'Login ID'}
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
              placeholder={language === 'mr' ? 'युजर आयडी प्रविष्ट करा...' : 'Enter Login ID...'}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            {language === 'mr' ? 'पासवर्ड' : 'Password'}
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className={`w-full py-3 ${isLoggingIn ? 'bg-slate-400' : 'bg-red-600 hover:bg-red-700'} text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed`}
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {language === 'mr' ? 'लॉगिन करा' : 'Login Now'}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const handleSaveProfile = () => {
    const user = selectedUserForView || currentUser;
    if (!user) return;

    // Save Personal Info
    updateUser(user.id, {
      fullName: profileForm.fullName,
      name: profileForm.fullName,
      phone: profileForm.phone,
      email: profileForm.email,
      village: profileForm.village,
      address: profileForm.address,
      bloodGroup: profileForm.bloodGroup,
      password: profileForm.password,
      territory: profileForm.territory,
    });

    // Save Company & Bank Info (Only if Admin)
    const isAdminUser = isShreedharUser(currentUser) || isSuperAdmin(currentUser);
    if (isAdminUser) {
      updateCompanyDetails({
        name: profileForm.companyName,
        tagline: profileForm.tagline,
        cin: profileForm.cin,
        gstNo: profileForm.gstNo,
        address: profileForm.companyAddress,
        phone: profileForm.companyPhone,
        email: profileForm.companyEmail,
        bankDetails: {
          bankName: profileForm.bankName,
          accountNo: profileForm.accountNo,
          ifsc: profileForm.ifsc,
          accountHolder: profileForm.accountHolder,
          branch: companyDetails.bankDetails?.branch || '',
        },
      });
    }

    setIsEditingProfile(false);
    showNotification(
      language === 'mr' ? 'माहिती यशस्वीरित्या सेव्ह झाली!' : 'Information saved successfully!',
      'success'
    );
  };

  const renderProfile = (user: User) => {
    const isAdminUser = isShreedharUser(currentUser) || isSuperAdmin(currentUser);
    const isOwnProfile = currentUser?.id === user.id;
    const canEdit = isAdminUser || isOwnProfile;
    
    return (
      <div className="max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Unified Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                {language === 'mr' ? 'कंपनी व वैयक्तिक माहिती' : 'Company & Profile Information'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => {
                    if (isEditingProfile) {
                      handleSaveProfile();
                    } else {
                      setIsEditingProfile(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
                    isEditingProfile 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10'
                  }`}
                >
                  {isEditingProfile ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  {isEditingProfile ? (language === 'mr' ? 'सर्व माहिती सेव्ह करा' : 'Save All') : (language === 'mr' ? 'माहिती एडिट करा' : 'Edit Information')}
                </button>
              )}
            </div>
          </div>

          {isEditingProfile ? (
            <div className="p-8 space-y-10">
              {/* COMPANY & BANK EDIT (ADMIN ONLY) */}
              {isAdminUser && (
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
                        value={profileForm.companyName}
                        onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'टॅगलाईन' : 'Tagline'}</label>
                      <input
                        type="text"
                        value={profileForm.tagline}
                        onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">CIN Number</label>
                      <input
                        type="text"
                        value={profileForm.cin}
                        onChange={(e) => setProfileForm({ ...profileForm, cin: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GST Number</label>
                      <input
                        type="text"
                        value={profileForm.gstNo}
                        onChange={(e) => setProfileForm({ ...profileForm, gstNo: e.target.value.toUpperCase() })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'नोंदणीकृत पत्ता' : 'Registered Address'}</label>
                      <input
                        type="text"
                        value={profileForm.companyAddress}
                        onChange={(e) => setProfileForm({ ...profileForm, companyAddress: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mt-10">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{language === 'mr' ? 'बँक तपशील' : 'Bank Details'}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'कंपनीचे नाव (खातेधारक)' : 'Company Name'}</label>
                      <input
                        type="text"
                        value={profileForm.accountHolder}
                        onChange={(e) => setProfileForm({ ...profileForm, accountHolder: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'बँकेचे नाव' : 'Bank Name'}</label>
                      <input
                        type="text"
                        value={profileForm.bankName}
                        onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'खाते क्रमांक' : 'Account Number'}</label>
                      <input
                        type="text"
                        value={profileForm.accountNo}
                        onChange={(e) => setProfileForm({ ...profileForm, accountNo: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-sm focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">IFSC Code</label>
                      <input
                        type="text"
                        value={profileForm.ifsc}
                        onChange={(e) => setProfileForm({ ...profileForm, ifsc: e.target.value.toUpperCase() })}
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
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'गाव / शहर' : 'Village / Town'}</label>
                    <input
                      type="text"
                      value={profileForm.village}
                      onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'ब्लड ग्रुप' : 'Blood Group'}</label>
                    <input
                      type="text"
                      value={profileForm.bloodGroup}
                      onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-red-600 text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'पासवर्ड' : 'Password'}</label>
                    <input
                      type="text"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'रहिवासी पत्ता' : 'Address'}</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{language === 'mr' ? 'कार्यक्षेत्र' : 'Territory'}</label>
                    <input
                      type="text"
                      value={profileForm.territory}
                      onChange={(e) => setProfileForm({ ...profileForm, territory: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-0">
              {/* COMPANY INFO ROW */}
              <div className="flex flex-col lg:flex-row border-b border-slate-100">
                <div className="flex items-center gap-6 lg:w-1/2">
                  <div className="w-32 h-32 bg-white flex items-center justify-center shrink-0 border-r border-slate-100">
                    <img
                      src={companyDetails.logoUrl || BLACKWORM_USER_UPLOADED_LOGO_BASE64 || BLACKWORM_LOGO_BASE64}
                      alt="Logo"
                      className="max-h-[85%] max-w-[85%] object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="min-w-0 pr-4">
                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight truncate">
                      {companyDetails.name}
                    </h4>
                    <p className="text-sm font-bold text-red-600 italic mt-0.5 tracking-wide">
                      Agriculture with new perspective
                    </p>
                  </div>
                </div>

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
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Company Name (Account Holder)</p>
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
                      <span>{user.fullName || user.name}</span>
                      <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 uppercase">
                        ({user.designation || user.role})
                      </span>
                    </p>
                  </div>
                  <div className="lg:col-span-2 space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Address</p>
                    <p className="text-sm font-semibold text-slate-600 truncate" title={user.address}>{user.address || '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Email ID</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{user.email || '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Mobile Number</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{user.phone}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Blood Group</p>
                    <p className="text-sm font-black text-red-700">{user.bloodGroup || '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Designation</p>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-tight">{user.designation || user.role}</p>
                  </div>
                  <div className="lg:col-span-2 space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Working Territory</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{user.territory || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unified Logout Button at the bottom center if it's the own profile view */}
        {isOwnProfile && !selectedUserForView && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => {
                setCurrentUser(null);
                setView('login');
                showNotification(
                  language === 'mr' ? 'यशस्वीरित्या लॉग आऊट झाले!' : 'Logged out successfully!',
                  'info'
                );
              }}
              className="px-10 py-4 bg-slate-900 text-white font-black text-sm rounded-2xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer flex items-center gap-3 shadow-xl"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              {language === 'mr' ? 'सिस्टममधून बाहेर पडा (Logout)' : 'Logout from System'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCreateUser = () => (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-bold flex items-center gap-2">
          {editingUser ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          {language === 'mr' 
            ? (editingUser ? 'युजर माहिती बदला' : 'नवीन युजर तयार करा') 
            : (editingUser ? 'Edit User Details' : 'Create New User')}
        </h2>
        <button 
          onClick={() => setView('list')}
          className="text-slate-400 hover:text-white text-sm font-bold"
        >
          {language === 'mr' ? 'यादी पहा' : 'View List'}
        </button>
      </div>

      <form onSubmit={handleAddUser} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'पूर्ण नाव' : 'Full Name'}</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'भूमिका / डेसिग्नेशन' : 'Role / Designation'}</label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'गाव' : 'Village'}</label>
            <input
              type="text"
              required
              value={formData.village}
              onChange={(e) => handleInputChange('village', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'ऍड्रेस' : 'Address'}</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'मेल आयडी' : 'Email ID'}</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'ब्लड ग्रुप' : 'Blood Group'}</label>
            <select
              required
              value={formData.bloodGroup}
              onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500"
            >
              {bloodGroups.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'लॉगिन आयडी (Username)' : 'Login ID (Username)'}</label>
            <input
              type="text"
              required
              value={formData.loginId}
              onChange={(e) => handleInputChange('loginId', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">{language === 'mr' ? 'पासवर्ड' : 'Password'}</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-mono"
            />
          </div>
        </div>

        {/* MODULE / FEATURE ACCESS PERMISSIONS SECTION - ACCESSIBLE TO ADMIN AND SUPER ADMIN */}
        {isAdmin && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-600" />
                  {language === 'mr' ? 'मॉड्यूल / ऑप्शन ॲक्सेस परवानग्या (Module Access Permissions)' : 'Module Access Permissions'}
                </label>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {language === 'mr' ? 'या युजरला ॲपमध्ये कोणकोणते ऑपशन्स दिसतील आणि वापरता येतील ते निवडा:' : 'Select which options/modules this user is allowed to view and use in the app:'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllTabs}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  {language === 'mr' ? 'सर्व निवडा (Select All)' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTabs}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  {language === 'mr' ? 'सर्व काढा (Clear)' : 'Clear All'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              {ALL_NAV_MODULES.map((mod) => {
                const isChecked = (formData.allowedTabs || []).includes(mod.id);
                return (
                  <label
                    key={`permission-${mod.id}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-white border-emerald-500 shadow-2xs text-slate-900 font-bold'
                        : 'bg-white/60 border-slate-200 text-slate-400 font-medium'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTab(mod.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>{language === 'mr' ? mod.labelMr : mod.labelEn}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      {isChecked ? (language === 'mr' ? 'ॲलोव्ड' : 'Allowed') : (language === 'mr' ? 'ब्लॉक' : 'Blocked')}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
          <Target className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {language === 'mr'
              ? '✨ युजर तयार झाल्यावर त्यांची अधिकृत "टार्गेट सीट (Target Sheet)" आणि "ट्रॅव्हल एक्सप्रेस सीट (Travel Expense Sheet)" आपोआप सेव्ह आणि लिंक केली जाईल.'
              : '✨ Creating this user will automatically generate and link their Sales Target Sheet and Travel Expense Sheet.'}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => setView('list')}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
          >
            {language === 'mr' ? 'रद्द करा' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all"
          >
            {language === 'mr' ? (editingUser ? 'अपडेट करा' : 'युजर सेव्ह करा') : (editingUser ? 'Update User' : 'Save User')}
          </button>
        </div>
      </form>
    </div>
  );

  const filteredAndSortedUsers = useMemo(() => {
    let list = [...users];
    
    // STRICT FILTERING: Hide Super Admin completely from the user list
    list = list.filter(u => 
      u.role !== 'SUPER_ADMIN' && 
      u.id !== 'USR-MASTER-SUPERADMIN' && 
      (u.loginId || '').toLowerCase().trim() !== 'super admin'
    );

    const getRank = (u: User) => {
      const d = (u.designation || '').toLowerCase();
      const r = (u.role || '').toLowerCase();
      if (d.includes('owner')) return 1;
      if (r === 'admin' || r === 'ADMIN' || r === 'SUPER_ADMIN') return 2;
      if (d.includes('director')) return 3;
      if (d.includes('manager')) return 4;
      if (d.includes('asm') || r === 'asm') return 5;
      if (d.includes('sales officer') || r === 'sales-officer') return 6;
      if (d.includes('field officer') || r === 'field-officer') return 7;
      return 10;
    };
    
    return list.sort((a, b) => {
      const rA = getRank(a);
      const rB = getRank(b);
      if (rA !== rB) return rA - rB;
      return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '');
    });
  }, [users, isSuperMaster, isShreedhar]);

  const renderUserList = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-red-600" />
            {language === 'mr' ? 'युजर मॅनेजमेंट' : 'User Management'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {language === 'mr' ? 'सिस्टममधील सर्व युजर्सची यादी' : 'List of all system users'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setView('create');
          }}
          title={language === 'mr' ? 'नवीन युजर ॲड करा' : 'Add New User'}
          className="w-11 h-11 bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedUsers.map((user: User) => (
          <div 
            key={user.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {user.fullName || user.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{user.designation || user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Pencil Edit Icon Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingUser(user);
                      setView('create');
                    }}
                    title={language === 'mr' ? 'माहिती एडिट करा' : 'Edit Details'}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isAdmin && user.id !== 'USR-001' && user.loginId !== 'admin' && user.id !== 'USR-MASTER-SUPERADMIN' && user.loginId !== 'super admin' && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const uName = user.fullName || user.name;
                        const confirmMsg = language === 'mr'
                          ? `तुम्हाला खात्री आहे का? युजर "${uName}" डिलीट केला जाईल.`
                          : `Are you sure? User "${uName}" will be deleted.`;
                        if (window.confirm(confirmMsg)) {
                          deleteUser(user.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title={language === 'mr' ? 'युजर डिलीट करा' : 'Delete user'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-semibold border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{user.village || 'HQ'}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{user.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 bg-slate-50 p-1 rounded">
                  <Fingerprint className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="truncate font-bold text-slate-800">{user.loginId}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 bg-slate-50 p-1 rounded">
                  <LockKeyhole className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate font-bold text-slate-800">
                    {user.password}
                  </span>
                </div>
              </div>
            </div>

            {/* Option Access Bar with Config Icon - ACCESSIBLE TO ADMIN AND SUPER ADMIN */}
            {isAdmin && (
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {user.id === 'USR-001' || user.loginId === 'admin'
                      ? (language === 'mr' ? 'Full' : 'Full')
                      : `${user.allowedTabs ? user.allowedTabs.length : STANDARD_USER_ALLOWED_TABS.length}`}
                  </span>
                </div>

                {/* Option Access Config Icon Button Only */}
                <button
                  type="button"
                  onClick={() => openPermissionModal(user)}
                  title={language === 'mr' ? 'परवानग्या' : 'Permissions'}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OPTION ACCESS PERMISSION MODAL */}
      {permissionModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {language === 'mr' ? 'ऑप्शन ॲक्सेस परवानग्या' : 'Option Access Permissions'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {permissionModalUser.fullName || permissionModalUser.name}
                </p>
              </div>
              <button
                onClick={() => setPermissionModalUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTempAllowedTabs(ALL_NAV_MODULES.map(m => m.id))}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'mr' ? 'सर्व निवडा' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={() => setTempAllowedTabs([])}
                className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'mr' ? 'सर्व काढा' : 'Clear All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {ALL_NAV_MODULES.map((mod) => {
                const isChecked = tempAllowedTabs.includes(mod.id);
                return (
                  <label
                    key={`modal-mod-${mod.id}`}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isChecked ? 'bg-white border-emerald-500 text-slate-900 font-bold' : 'bg-white/60 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setTempAllowedTabs(tempAllowedTabs.filter(id => id !== mod.id));
                          } else {
                            setTempAllowedTabs([...tempAllowedTabs, mod.id]);
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                      />
                      <span>{language === 'mr' ? mod.labelMr : mod.labelEn}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPermissionModalUser(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === 'mr' ? 'रद्द करा' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 cursor-pointer"
              >
                {language === 'mr' ? 'परवानग्या सेव्ह करा' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {view === 'login' && renderLogin()}
      {view === 'profile' && (selectedUserForView || currentUser) && renderProfile(selectedUserForView || currentUser!)}
      {view === 'list' && renderUserList()}
      {view === 'create' && renderCreateUser()}
    </div>
  );
};
