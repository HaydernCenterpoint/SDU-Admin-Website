import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  ShieldCheck, 
  Activity, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Users,
  ClipboardCheck,
  User,
  ChevronDown,
  Menu,
  X,
  Star,
  MonitorPlay,
  CalendarDays,
} from 'lucide-react';
import { useAppStore, Role, api } from '../store/useAppStore';
import { MOCK_USERS } from '../data/mockData';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'user' | 'plan';
}

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Giảng viên',
  DEPT_HEAD: 'Trưởng khoa',
  BOARD: 'Ban Giám hiệu',
  QC: 'Quản lý chất lượng',
  ADMIN: 'Quản trị',
};

const ROLE_COLORS: Record<string, string> = {
  TEACHER:   'bg-sky-500',
  DEPT_HEAD: 'bg-amber-500',
  BOARD:     'bg-emerald-600',
  QC:        'bg-violet-500',
  ADMIN:     'bg-primary',
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = days[time.getDay()];
  
  const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = `${time.getDate().toString().padStart(2, '0')}/${(time.getMonth() + 1).toString().padStart(2, '0')}/${time.getFullYear()}`;

  return (
    <div className="hidden md:flex flex-col justify-center items-center bg-white px-5 py-2 rounded-xl border border-slate-200 shadow-sm">
      <span className="text-lg font-black text-slate-800 tracking-widest">
        {timeStr}
      </span>
      <span className="text-xs font-bold uppercase text-slate-400 mt-0.5">
        {dayName}, {dateStr}
      </span>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser) {
        setNotifications([]);
        return;
      }
      
      const newNotifs: NotificationItem[] = [];
      let notifId = 1;

      if (['BOARD', 'ADMIN', 'DEPT_HEAD'].includes(currentUser.role)) {
        try {
          // Fetch pending users
          const usersRes = await api.get('/users/pending');
          const pendingUsers = usersRes.data || [];
          pendingUsers.forEach((u: any) => {
            newNotifs.push({
              id: `u-${u.id}`,
              title: `${u.role === 'DEPT_HEAD' ? 'Trưởng khoa' : 'Giảng viên'} mới đăng ký`,
              message: `${u.name} vừa tạo tài khoản và chờ phê duyệt.`,
              time: 'Mới đây',
              read: false,
              type: 'user'
            });
          });

          // Fetch pending plans
          const plansRes = await api.get('/plans');
          const plans = plansRes.data || [];
          const pendingPlans = plans.filter((p: any) => 
               (currentUser.role === 'DEPT_HEAD' && p.status === 'SUBMITTED') ||
               (['BOARD', 'ADMIN'].includes(currentUser.role) && p.status === 'DEPT_APPROVED_TO_BGH')
          );
          
          pendingPlans.forEach((p: any) => {
             newNotifs.push({
                id: `p-${p.id}`,
                title: 'Kế hoạch cần phê duyệt',
                message: `Bản ${p.title} đang chờ bạn phê duyệt.`,
                time: 'Mới đây',
                read: false,
                type: 'plan'
             });
          });

          // Also allow DEPT_HEAD to see notifications for their own plans that got approved/rejected
          const myOwnPlans = plans.filter((p:any) => p.user_id === currentUser.id || p.teacherId === currentUser.id);
          myOwnPlans.forEach((p:any) => {
             if (p.status === 'ACCEPTED_TO_BGH') {
                 newNotifs.push({
                    id: `p-app-${p.id}`,
                    title: 'Kế hoạch đã được BGH duyệt',
                    message: `Kế hoạch "${p.title}" của bạn đã hoàn tất.`,
                    time: 'Gần đây',
                    read: false,
                    type: 'plan'
                 });
             } else if (p.status === 'DEPT_REJECTED_PHASE2') {
                 newNotifs.push({
                    id: `p-rej-${p.id}`,
                    title: 'Kế hoạch bị BGH từ chối',
                    message: `Kế hoạch "${p.title}" đã bị BGH yêu cầu làm lại.`,
                    time: 'Gần đây',
                    read: false,
                    type: 'plan'
                 });
             }
          });

        } catch (e) {
          console.error("Failed to fetch notifications");
        }
      } 
      
      if (currentUser.role === 'TEACHER') {
        try {
          const plansRes = await api.get('/plans');
          const plans = plansRes.data || [];
          const myOwnPlans = plans.filter((p:any) => p.user_id === currentUser.id || p.teacherId === currentUser.id);
          myOwnPlans.forEach((p:any) => {
             if (p.status === 'DEPT_APPROVED_TO_BGH') {
                 newNotifs.push({
                    id: `p-app1-${p.id}`,
                    title: 'Kế hoạch đã qua T.Khoa',
                    message: `Kế hoạch "${p.title}" đã được Trưởng khoa duyệt và đang chờ BGH.`,
                    time: 'Gần đây',
                    read: false,
                    type: 'plan'
                 });
             } else if (p.status === 'ACCEPTED_TO_BGH') {
                 newNotifs.push({
                    id: `p-app2-${p.id}`,
                    title: 'Kế hoạch hoàn tất duyệt',
                    message: `Kế hoạch "${p.title}" của bạn đã được BGH phê duyệt!`,
                    time: 'Gần đây',
                    read: false,
                    type: 'plan'
                 });
             } else if (p.status === 'DEPT_REJECTED_PHASE1' || p.status === 'DEPT_REJECTED_PHASE2') {
                 newNotifs.push({
                    id: `p-rej-${p.id}`,
                    title: 'Kế hoạch bị từ chối',
                    message: `Kế hoạch "${p.title}" của bạn đã bị từ chối, vui lòng xem lại.`,
                    time: 'Gần đây',
                    read: false,
                    type: 'plan'
                 });
             }
          });
        } catch(e) {}
      }

      // Process read and toasted states using localStorage
      const toastedSet = new Set(JSON.parse(localStorage.getItem('toastedNotifs') || '[]'));
      const readSet = new Set(JSON.parse(localStorage.getItem('readNotifs') || '[]'));

      newNotifs.forEach(n => {
        if (readSet.has(n.id)) {
          n.read = true;
        }
      });

      // Filter out only ones we consider urgent to show a toast
      const newUrgent = newNotifs.filter(n => !n.read && !toastedSet.has(n.id));
      if (newUrgent.length > 0) {
        const latest = newUrgent[0];
        setActiveToast(latest);
        newUrgent.forEach(u => toastedSet.add(u.id));
        localStorage.setItem('toastedNotifs', JSON.stringify(Array.from(toastedSet)));
        setTimeout(() => setActiveToast(null), 6000);
      }
      
      setNotifications(newNotifs);
    };

    fetchNotifications();
    // Re-fetch periodically or when currentUser changes
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const readSet = new Set(JSON.parse(localStorage.getItem('readNotifs') || '[]'));
    readSet.add(id);
    localStorage.setItem('readNotifs', JSON.stringify(Array.from(readSet)));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const readSet = new Set(JSON.parse(localStorage.getItem('readNotifs') || '[]'));
    notifications.forEach(n => readSet.add(n.id));
    localStorage.setItem('readNotifs', JSON.stringify(Array.from(readSet)));
  };

  const handleRoleSwitch = (role: Role) => {
    const user = MOCK_USERS.find(u => u.role === role);
    if (user) { setCurrentUser(user); setRoleMenuOpen(false); }
  };

  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Tổng quan',           roles: ['TEACHER', 'DEPT_HEAD', 'BOARD', 'QC', 'ADMIN'] },
    { id: 'MY_PLANS',  icon: FileText,         label: currentUser?.role === 'DEPT_HEAD' ? 'Kế hoạch của khoa' : currentUser?.role === 'BOARD' ? 'Kế hoạch các Khoa' : 'Kế hoạch của tôi',   roles: ['TEACHER', 'DEPT_HEAD', 'BOARD'] },
    { id: 'PLAN_SCHEDULE', icon: CalendarDays, label: 'Lịch thực hiện kế hoạch', roles: ['TEACHER', 'DEPT_HEAD', 'BOARD', 'QC', 'ADMIN'] },
    { id: 'APPROVALS', icon: CheckSquare,       label: 'Phê duyệt',          roles: ['DEPT_HEAD', 'BOARD', 'ADMIN'] },
    { id: 'MONITOR',   icon: ShieldCheck,       label: 'Giám sát',           roles: ['BOARD', 'QC'] },
    { id: 'QC',        icon: Activity,          label: 'Thống kê',           roles: ['QC', 'BOARD'] },
    { id: 'SUMMARY',   icon: ClipboardCheck,    label: 'Tổng hợp',           roles: ['BOARD', 'ADMIN'] },
    { id: 'USERS',     icon: Users,             label: 'Thông tin giáo viên',roles: ['DEPT_HEAD', 'BOARD', 'ADMIN', 'QC'] },
  ];

  const filteredNav = navItems.filter(item =>
    !currentUser || item.roles.includes(currentUser.role)
  );

  const avatarLetter = currentUser?.name?.split(' ').pop()?.charAt(0) ?? '?';
  const roleLabel = ROLE_LABELS[currentUser?.role ?? ''] ?? currentUser?.role;

  const Sidebar = () => (
    <aside className="w-[17rem] flex flex-col h-screen bg-gradient-to-b from-[#B80010] via-[#CC0000] to-[#990000] shadow-2xl relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute top-32 -left-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute bottom-40 -right-6 w-20 h-20 rounded-full bg-yellow-400/10 pointer-events-none" />

      {/* Logo area */}
      <div className="relative z-10 pt-8 pb-6 px-6 border-b border-white/10 flex flex-col items-center">
        <div className="relative mb-4">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-yellow-300/30 blur-md scale-110" />
          <div className="relative w-[88px] h-[88px] rounded-full bg-white shadow-lg shadow-black/30 flex items-center justify-center p-1.5">
            <img
              src="https://cdn.haitrieu.com/wp-content/uploads/2022/11/Logo-Dai-hoc-Sao-Do-956x1024.png"
              alt="Logo Đại học Sao Đỏ"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
        <div className="text-center">
          <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight uppercase drop-shadow">
            Đại học Sao Đỏ
          </h1>
          <p className="text-yellow-300/90 text-[9px] uppercase tracking-[0.2em] font-bold mt-1.5">
            Saodo University
          </p>
          <div className="mt-2 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
          <p className="text-white/60 text-[9px] uppercase tracking-widest font-semibold mt-2">
            Hệ thống Quản lý KH
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-3 py-5 space-y-1 overflow-y-auto scrollbar-none">
        {filteredNav.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold group ${
                isActive
                  ? 'bg-white text-[#CC0000] shadow-lg shadow-black/20'
                  : 'text-white/75 hover:bg-white/15 hover:text-white'
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? 'text-[#CC0000]' : 'text-white/60 group-hover:text-white transition-colors'}
              />
              <span>{item.label}</span>
              {isActive && (
                <Star size={10} className="ml-auto text-yellow-500 fill-yellow-400" />
              )}
            </button>
          );
        })}
      </nav>


    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F6FA] font-sans text-slate-800">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center px-6 gap-4 shadow-sm">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <LiveClock />

          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000]/60 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifPanel(v => !v)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="Thông báo"
              >
                <Bell size={18} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#CC0000]" />
                )}
              </button>

              {/* Notification Panel */}
              <AnimatePresence>
                {showNotifPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 z-50 overflow-hidden flex flex-col"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-sm font-bold text-slate-800">Thông báo</h3>
                      <button onClick={markAllAsRead} className="text-[10px] uppercase tracking-wider font-bold text-[#CC0000] hover:underline">
                        Đánh dấu đã đọc
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif.id} onClick={() => markAsRead(notif.id)} className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors ${!notif.read ? 'bg-blue-50' : 'bg-white'}`}>
                          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {notif.type === 'user' ? <User size={14} /> : <FileText size={14} />}
                          </div>
                          <div>
                            <p className={`text-sm leading-tight ${!notif.read ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{notif.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5">{notif.time}</p>
                          </div>
                          {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000] mt-1.5 shrink-0" />}
                        </div>
                      )) : (
                        <div className="py-8 text-center text-slate-400">
                          <Bell size={24} className="mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-medium">Bạn không có thông báo nào.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(v => !v)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar.startsWith('http') ? currentUser.avatar : `/storage/${currentUser.avatar}`} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm bg-white" 
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-sm ${ROLE_COLORS[currentUser?.role ?? ''] ?? 'bg-slate-400'}`}>
                    {avatarLetter}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{currentUser?.name}</p>
                  <p className="text-[10px] font-semibold text-[#CC0000]/80 uppercase tracking-wider">{roleLabel}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400 hidden md:block" />
              </button>
              <AnimatePresence>
                {roleMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 z-50 overflow-hidden py-2"
                  >
                    <div className="px-4 pb-3 pt-2 border-b border-slate-100 mb-1">
                      <p className="text-sm text-slate-800 font-bold">{currentUser?.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{currentUser?.email || 'user@saodo.edu.vn'}</p>
                    </div>
                    <button
                      onClick={() => { onTabChange('PROFILE'); setRoleMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <User size={16} />
                      Thông tin tài khoản
                    </button>
                    <button
                      onClick={() => { onTabChange('SETTINGS'); setRoleMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <Settings size={16} />
                      Cài đặt
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                      onClick={() => { useAppStore.getState().logout(); setRoleMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-8 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (currentUser?.role ?? '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-6 z-[200] max-w-sm w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-slate-900/10 flex gap-4 items-start"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeToast.type === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
               {activeToast.type === 'user' ? <User size={18} /> : <FileText size={18} />}
            </div>
            <div className="flex-1 mt-0.5">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{activeToast.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{activeToast.message}</p>
            </div>
            <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 p-1">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
