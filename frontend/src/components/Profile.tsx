import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { User, Mail, Shield, Building2, Key, Save, Camera, Calendar, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

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
  ADMIN:     'bg-[#CC0000]',
};

const Profile = () => {
  const { currentUser, setCurrentUser } = useAppStore();
  const [departments, setDepartments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_email: '',
    dob: '',
    gender: 'Nam',
    department_id: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        contact_email: currentUser.contact_email || '',
        dob: currentUser.dob || '',
        gender: currentUser.gender || 'Nam',
        department_id: currentUser.departmentId || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
    if (currentUser) {
      api.get(`/users/${currentUser.id}/activities`)
        .then(res => setActivities(res.data))
        .catch(console.error);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const roleLabel = ROLE_LABELS[currentUser.role] || currentUser.role;
  const avatarLetter = currentUser.name?.split(' ').pop()?.charAt(0) ?? '?';
  const roleColor = ROLE_COLORS[currentUser.role] || 'bg-slate-400';
  const isPending = !!currentUser.pending_profile;
  const isBoardAdmin = ["ADMIN", "QC", "BOARD"].includes(currentUser.role);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Mật khẩu mới không khớp!');
      return;
    }

    try {
      const res = await api.post('/users/profile-request', {
        ...formData,
        current_password: passwordData.currentPassword || undefined,
        password: passwordData.newPassword || undefined
      });
      alert(res.data.message || 'Yêu cầu cập nhật hồ sơ đã được gửi. Vui lòng chờ phê duyệt!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (res.data.user) {
        setCurrentUser(res.data.user);
      } else {
        setCurrentUser({ ...currentUser, pending_profile: formData });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật hồ sơ.');
    }
  };

  const getAvatarUrl = () => {
    if (currentUser?.avatar) {
      if (currentUser.avatar.startsWith('http')) return currentUser.avatar;
      return `/storage/${currentUser.avatar}`;
    }
    return null;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const payload = new FormData();
        payload.append('avatar', file);
        const res = await api.post('/users/avatar', payload);
        if (res.data?.avatar) {
          setCurrentUser({ ...currentUser, avatar: res.data.avatar });
          alert('Cập nhật ảnh đại diện thành công!');
        }
      } catch (err) {
        console.error('Failed to upload avatar', err);
        alert('Lỗi cập nhật ảnh đại diện.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h2 className="page-title">Thông tin tài khoản</h2>
          <p className="page-subtitle">Quản lý hồ sơ cá nhân và bảo mật tài khoản.</p>
        </div>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <Shield size={20} className="text-amber-500" />
          <span className="text-sm font-medium">Bạn đang có yêu cầu thay đổi thông tin chờ cấp trên phê duyệt. Bạn không thể sửa thông tin lúc này.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1 space-y-6"
        >
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="relative group mb-4">
              {getAvatarUrl() ? (
                <img src={getAvatarUrl()!} alt="Avatar" className={`w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl ${roleColor}`} />
              ) : (
                <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-xl ${roleColor}`}>
                  {avatarLetter}
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-white border border-slate-200 rounded-full text-slate-600 shadow-md hover:text-[#CC0000] transition-colors cursor-pointer"
              >
                <Camera size={16} />
              </button>
            </div>
            <h3 className="text-xl font-black text-navy">{currentUser.name}</h3>
            <p className="text-sm text-slate-500">{currentUser.email}</p>
            <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm ${roleColor}`}>
              Vai trò: {roleLabel}
            </div>
          </div>
          
          <div className="card p-6">
            <h4 className="text-sm font-bold text-navy uppercase tracking-widest mb-4">Mã định danh</h4>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Shield size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-800">{String(currentUser.email || currentUser.id).split('-')[0].toUpperCase()}</span>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="text-sm font-bold text-navy uppercase tracking-widest mb-4">Hoạt động gần đây</h4>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-sm text-slate-400 italic">Chưa có hoạt động nào</div>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${act.type.includes('login') ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{act.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(act.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Detailed Info & Password Change */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 space-y-6"
        >
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="card p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-navy uppercase tracking-widest">Chi tiết hồ sơ</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Họ và tên</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" required disabled={isPending}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Mã giáo viên</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" required disabled={isPending}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none"
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" disabled={isPending} placeholder="email@saodo.edu.vn"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none"
                      value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Khoa / Đơn vị</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    {currentUser.role === 'BOARD' ? (
                      <input 
                        type="text" disabled 
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-bold outline-none"
                        value="Ban Giám Hiệu"
                      />
                    ) : (
                      <select 
                        required disabled={isPending || isBoardAdmin}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none appearance-none"
                        value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})}
                      >
                        <option value="">-- Chọn khoa --</option>
                        {departments.map((dept: any) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Ngày sinh</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                    <input 
                      type="date" disabled={isPending}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none cursor-pointer appearance-none bg-transparent relative [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0"
                      value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Giới tính</label>
                  <div className="relative">
                    <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                      disabled={isPending}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-[#CC0000]/20 focus:border-[#CC0000] outline-none appearance-none cursor-pointer"
                      value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h4 className="text-sm font-bold text-navy uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Đổi mật khẩu (Tuỳ chọn)</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      disabled={isPending}
                      value={passwordData.currentPassword}
                      onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-[#CC0000]/20 outline-none transition-all"
                      placeholder="Mật khẩu hiện tại..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Mật khẩu mới</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        disabled={isPending}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-[#CC0000]/20 outline-none transition-all"
                        placeholder="Để trống nếu không đổi..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        disabled={isPending}
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-[#CC0000]/20 outline-none transition-all"
                        placeholder="Xác nhận mật khẩu mới..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isPending && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#CC0000] text-white font-bold rounded-xl shadow-md hover:bg-[#990000] transition-colors"
                >
                  <Save size={16} />
                  {["BOARD", "ADMIN"].includes(currentUser.role) ? 'Lưu thông tin' : 'Gửi yêu cầu phê duyệt'}
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
