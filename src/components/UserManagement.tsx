import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, NavTab } from '../types';
import { ALL_NAV_MODULES } from '../utils/permissionHelpers';
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
    const safeName = (currentUser.fullName || currentUser.name || '').toLowerCase();
    const isUsrAdmin = currentUser.role === 'admin' || currentUser.loginId === 'admin' || currentUser.id === 'USR-001' || safeName.includes('pravin') || safeName.includes('shreedhar') || safeName.includes('shridhar') || safeName.includes('shinde');
    return isUsrAdmin ? 'list' : 'profile';
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
  
  const isAdmin = currentUser && (
    currentUser.loginId === 'admin' || 
    currentUser.loginId === 'pravin' ||
    currentUser.id === 'USR-001' ||
    currentUser.id === 'USR-PRAVIN' ||
    (currentUser.fullName && (currentUser.fullName.toLowerCase().includes('shreedhar') || currentUser.fullName.toLowerCase().includes('shridhar') || currentUser.fullName.toLowerCase().includes('shinde') || currentUser.fullName.toLowerCase().includes('pravin'))) ||
    (currentUser.name && (currentUser.name.toLowerCase().includes('shreedhar') || currentUser.name.toLowerCase().includes('shridhar') || currentUser.name.toLowerCase().includes('shinde') || currentUser.name.toLowerCase().includes('pravin')))
  );
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null);
  const [tempAllowedTabs, setTempAllowedTabs] = useState<NavTab[]>([]);

  const openPermissionModal = (u: User) => {
    setPermissionModalUser(u);
    setTempAllowedTabs(u.allowedTabs && u.allowedTabs.length > 0 ? u.allowedTabs : ALL_NAV_MODULES.map(m => m.id));
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
  
  const defaultTabs: NavTab[] = ALL_NAV_MODULES.map(m => m.id);

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
    setFormData(prev => ({ ...prev, allowedTabs: ALL_NAV_MODULES.map(m => m.id) }));
  };

  const handleClearAllTabs = () => {
    setFormData(prev => ({ ...prev, allowedTabs: ['dashboard'] }));
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
      // Strict check against users registered in management only
      const user = users.find(u => {
        const uLogin = (u.loginId || '').trim().toLowerCase();
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPhone = (u.phone || '').trim().toLowerCase();
        const uPass = (u.password || '').trim();

        const matchId = (uLogin === cleanId) || 
                        (uEmail === cleanId) || 
                        (uPhone && cleanId.includes(uPhone));

        const matchPass = (uPass === cleanPass);

        return matchId && matchPass;
      });

      setIsLoggingIn(false);

      if (user) {
        setCurrentUser(user);
        setLoginId('');
        setPassword('');
        setActiveTab('dashboard');
        setView(user.role === 'admin' || user.id === 'USR-001' ? 'list' : 'profile');
        showNotification(
          language === 'mr' ? `${user.name} म्हणून यशस्वीरित्या लॉगिन झाले.` : `Login Successful as ${user.name}!`,
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
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Lock className="w-8 h-8 text-red-600" />
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

  const renderProfile = (user: User) => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-100">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-200">
            <UserIcon className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
            <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">
              {user.designation || user.role.toUpperCase()}
            </p>
            {isAdmin && (
              <button 
                onClick={() => setView('list')}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-all active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                {language === 'mr' ? 'युजर लिस्ट पहा' : 'View User List'}
              </button>
            )}
          </div>
        </div>
        <button 
          onClick={() => {
            setCurrentUser(null);
            setView('login');
            showNotification(
              language === 'mr' ? 'यशस्वीरित्या लॉग आऊट झाले!' : 'Logged out successfully!',
              'info'
            );
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors border border-red-200 cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          {language === 'mr' ? 'लॉग आऊट' : 'Logout'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Briefcase className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'डेसिग्नेशन' : 'Designation'}</p>
              <p className="text-sm font-bold text-slate-800">{user.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <MapPin className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'गाव व पत्ता' : 'Village & Address'}</p>
              <p className="text-sm font-bold text-slate-800">{user.village}, {user.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}</p>
              <p className="text-sm font-bold text-slate-800">{user.phone}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Mail className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'ईमेल आयडी' : 'Email ID'}</p>
              <p className="text-sm font-bold text-slate-800">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Droplet className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'ब्लड ग्रुप' : 'Blood Group'}</p>
              <p className="text-sm font-bold text-red-600">{user.bloodGroup}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Shield className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'लॉगिन आयडी' : 'Login ID'}</p>
              <p className="text-sm font-bold text-slate-800">{user.loginId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Lock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">{language === 'mr' ? 'पासवर्ड' : 'Password'}</p>
              <p className="text-sm font-bold text-slate-800">{user.password}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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

        {/* MODULE / FEATURE ACCESS PERMISSIONS SECTION */}
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
        {users.map((user) => (
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
                    <h4 className="text-sm font-bold text-slate-900 truncate">{user.fullName || user.name}</h4>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">{user.designation || user.role}</p>
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
                  {isAdmin && user.id !== 'USR-001' && user.loginId !== 'admin' && user.loginId !== 'pravin' && user.id !== 'USR-PRAVIN' && (
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
              
              <div className="space-y-2 text-[11px] text-slate-600 font-semibold border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.village || user.territory || 'Headquarters'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              </div>
            </div>

            {/* Option Access Bar with Config Icon */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700">
                  {language === 'mr' ? 'ऑप्शन ॲक्सेस:' : 'Option Access:'}
                </span>
                <span className="text-[10.5px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {user.role === 'admin' || user.id === 'USR-001'
                    ? (language === 'mr' ? 'सर्व (Full)' : 'All')
                    : `${user.allowedTabs ? user.allowedTabs.length : ALL_NAV_MODULES.length}/${ALL_NAV_MODULES.length}`}
                </span>
              </div>

              {/* Option Access Config Icon Button Only */}
              <button
                type="button"
                onClick={() => openPermissionModal(user)}
                title={language === 'mr' ? 'ऑप्शन ॲक्सेस सेट करा' : 'Configure Option Access'}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all cursor-pointer border border-emerald-200 shadow-2xs active:scale-95 flex items-center justify-center"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>
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
