import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { initialUsers } from '../data/initialData';
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
  CheckCircle2
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
    return (currentUser.role === 'admin' || safeName.includes('pravin') || safeName.includes('shinde')) ? 'list' : 'profile';
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
    (currentUser.fullName && (currentUser.fullName.toLowerCase().includes('shreedhar') || currentUser.fullName.toLowerCase().includes('pravin'))) ||
    (currentUser.name && (currentUser.name.toLowerCase().includes('shreedhar') || currentUser.name.toLowerCase().includes('pravin')))
  );
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  
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
      });
    }
  }, [editingUser]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-red-600" />
            {language === 'mr' ? 'युजर मॅनेजमेंट' : 'User Management'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {language === 'mr' ? 'सिस्टममधील सर्व युजर्सची यादी' : 'List of all system users'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setView('create');
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 w-full sm:w-auto"
        >
          <UserPlus className="w-5 h-5" />
          {language === 'mr' ? 'नवीन युजर' : 'Add New'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div 
            key={user.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{user.fullName || user.name}</h4>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">{user.designation || user.role}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    setEditingUser(user);
                    setView('create');
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                        ? `तुम्हाला खात्री आहे का? युजर "${uName}" डिलीट केला जाईल. ही क्रिया केवळ एडमिन अधिकाराने होत आहे.`
                        : `Are you sure? User "${uName}" will be deleted by Admin.`;
                      if (window.confirm(confirmMsg)) {
                        deleteUser(user.id);
                      }
                    }}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                    title={language === 'mr' ? 'एडमिनद्वारे युजर डिलीट करा' : 'Delete user (Admin)'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'डिलीट' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-[11px] text-slate-600 font-semibold border-t border-slate-50 pt-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {user.village || user.territory}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {user.phone}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500">ID:</span>
                    <span className="font-mono text-slate-900 font-bold">{user.loginId}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] text-slate-500">Pass:</span>
                    <span className="font-mono text-red-600 font-bold">{user.password || '123'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedUserForView(user);
                    setView('profile');
                  }}
                  className="text-red-600 hover:underline text-xs font-bold"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
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
