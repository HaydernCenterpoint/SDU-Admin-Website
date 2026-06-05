import React, { useEffect, useState } from 'react';
import { api, useAppStore, Plan } from '../store/useAppStore';
import { Check, X, User as UserIcon, Mail, Phone, BookOpen, Clock, Briefcase, ChevronRight, Eye, CalendarDays, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Shield, Building2 } from 'lucide-react'; // Added icons for the new layout
import { TeacherProfileModal } from './TeacherProfileModal';
import CustomSelect from './CustomSelect';

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

// --- Pending Users Modal (Old UI) ---
const PendingUsersModal = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/users/pending');
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleReject = async (id: string | number) => {
    if (!confirm('Bạn có chắc chắn muốn từ chối tài khoản này?')) return;
    try {
      await api.put(`/users/${id}/reject`);
    } catch (e) {} finally {
      setUsers(users.filter(u => u.id !== id));
      if (selectedUser?.id === id) setSelectedUser(null);
    }
  };

  const handleApprove = async (id: string | number) => {
    try {
      await api.put(`/users/${id}/approve`);
    } catch (e) {} finally {
      setUsers(users.filter(u => u.id !== id));
      if (selectedUser?.id === id) setSelectedUser(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden"
      >
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Duyệt Tài Khoản</h3>
            <p className="text-xs text-slate-500">Danh sách giảng viên đăng ký cần phê duyệt.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center text-slate-500 py-12">Đang tải danh sách chờ...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-slate-500 py-12">Không có tài khoản nào đang chờ duyệt.</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Tên người dùng</th>
                    <th className="px-6 py-4">Mã giáo viên</th>
                    <th className="px-6 py-4">Ngày đăng ký</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{user.name}</td>
                      <td className="px-6 py-4 text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors border border-emerald-200"
                        >
                          Duyệt ngay
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200"
                        >
                          Từ chối
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// --- Pending Profiles Modal ---
const PendingProfilesModal = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingProfiles = async () => {
    try {
      const res = await api.get('/users/pending-profiles');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProfiles();
  }, []);

  const handleApprove = async (id: string | number) => {
    try {
      await api.put(`/users/${id}/approve-profile`);
      setUsers(users.filter(u => u.id !== id));
    } catch (e) {
      alert('Lỗi phê duyệt');
    }
  };

  const handleReject = async (id: string | number) => {
    if (!confirm('Từ chối thay đổi này?')) return;
    try {
      await api.put(`/users/${id}/reject-profile`);
      setUsers(users.filter(u => u.id !== id));
    } catch (e) {
      alert('Lỗi từ chối');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden"
      >
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Duyệt thay đổi hồ sơ</h3>
            <p className="text-xs text-slate-500">Giảng viên xin đổi thông tin cá nhân.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center text-slate-500 py-12">Đang tải...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-slate-500 py-12">Không có yêu cầu thay đổi hồ sơ nào.</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Tài khoản</th>
                    <th className="px-6 py-4">Thông tin thay đổi</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const changes = user.pending_profile || {};
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 align-top">
                          {user.name} <br/>
                          <span className="text-xs text-slate-500 font-normal">{user.email}</span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <ul className="text-xs space-y-1 text-slate-700">
                            {changes.name && changes.name !== user.name && <li><b>Tên mới:</b> {changes.name}</li>}
                            {changes.email && changes.email !== user.email && <li><b>Mã GV mới:</b> {changes.email}</li>}
                            {changes.contact_email && changes.contact_email !== user.contact_email && <li><b>Email:</b> {changes.contact_email}</li>}
                            {changes.dob && changes.dob !== user.dob && <li><b>Ngày sinh:</b> {changes.dob}</li>}
                            {changes.gender && changes.gender !== user.gender && <li><b>Giới tính:</b> {changes.gender}</li>}
                            {changes.department_id && changes.department_id !== user.department_id && <li><b>Khoa:</b> {changes.department_id}</li>}
                            {changes.password && <li><b>(Có đổi mật khẩu)</b></li>}
                          </ul>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 align-top w-[220px]">
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors border border-emerald-200"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200"
                          >
                            Từ chối
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};


// --- Main Teacher Info Component ---
const TeacherInfo = ({ onSelectPlan }: { onSelectPlan: (plan: Plan) => void }) => {
  const { currentUser, fetchPlans } = useAppStore();
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [showPendingProfiles, setShowPendingProfiles] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const fetchActiveUsers = async () => {
    try {
      const res = await api.get('/users/active');
      setActiveUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
    fetchDepartments();
  }, [showPending]); // Re-fetch when modal closes (in case someone was approved)

  const isBoard = currentUser?.role === 'BOARD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'QC';

  const filteredUsers = activeUsers.filter(u => {
    if (selectedDept !== 'ALL') {
      return u.department_id === Number(selectedDept) || u.department_id === selectedDept;
    }
    return true;
  });

  const deptHeads = filteredUsers.filter(u => u.role === 'DEPT_HEAD');
  const qcUsers = filteredUsers.filter(u => u.role === 'QC');
  const teachers = filteredUsers.filter(u => u.role === 'TEACHER');

  const getAvatarUrl = (avatar: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `/storage/${avatar}`;
  };

  const handleProfileDeleted = async (deletedUserId: string | number) => {
    setActiveUsers(current => current.filter(user => user.id !== deletedUserId));
    setSelectedProfile((current: any) => current?.id === deletedUserId ? null : current);

    try {
      await fetchPlans();
    } catch (e) {
      console.error(e);
    }
  };

  const renderUserCards = (users: any[], title: string) => {
    if (users.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-800 mb-3 px-1 tracking-wider uppercase">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map(u => (
            <div 
              key={u.id}
              onClick={() => setSelectedProfile(u)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center text-center group"
            >
              <div className="relative mb-3">
                {getAvatarUrl(u.avatar) ? (
                  <img src={getAvatarUrl(u.avatar)!} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#CC0000] font-bold text-xl uppercase shadow-sm">
                    {u.name.charAt(0)}
                  </div>
                )}
              </div>
              <h4 className="font-bold text-slate-800 group-hover:text-navy transition-colors line-clamp-1">{u.name}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{u.email}</p>
              <p className="text-xs font-semibold text-slate-600 mt-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {u.department?.name || '---'}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Thông tin giáo viên</h1>
          <p className="text-slate-500 mt-1">Quản lý và xem lịch sử kế hoạch của đội ngũ giảng viên.</p>
        </div>
        {currentUser?.role !== 'QC' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPendingProfiles(true)}
              className="px-4 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl shadow-md hover:bg-amber-600 transition-all flex items-center gap-2"
            >
              <FileText size={16} /> Duyệt hồ sơ ({activeUsers.filter(u => u.pending_profile).length})
            </button>
            <button
              onClick={() => setShowPending(true)}
              className="px-4 py-2.5 bg-[#CC0000] text-white font-bold text-sm rounded-xl shadow-md hover:bg-[#B80010] transition-all flex items-center gap-2"
            >
              <UserIcon size={16} /> Duyệt tài khoản
            </button>
          </div>
        )}
      </div>

      {isBoard && (
        <div className="flex gap-2 items-center mb-6">
          <label className="text-sm font-semibold text-slate-700 mr-2">Lọc theo khoa:</label>
          <CustomSelect
            value={selectedDept}
            onChange={(val) => setSelectedDept(String(val))}
            options={[
              { value: 'ALL', label: 'Tất cả các khoa' },
              ...departments.map((d: any) => ({ value: d.id, label: d.name }))
            ]}
            minWidth="200px"
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Đang tải thông tin...</div>
      ) : (
        <div className="relative z-0">
          {isBoard ? (
            <>
              {renderUserCards(deptHeads, 'DANH SÁCH TRƯỞNG KHOA')}
              {renderUserCards(qcUsers, 'DANH SÁCH QUẢN LÝ CHẤT LƯỢNG')}
              {renderUserCards(teachers, 'DANH SÁCH GIÁO VIÊN')}
            </>
          ) : (
            // For Dept Head
            renderUserCards(teachers, 'GIÁO VIÊN HOẠT ĐỘNG')
          )}

          {!isLoading && deptHeads.length === 0 && qcUsers.length === 0 && teachers.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              Không có dữ liệu giáo viên phù hợp.
            </div>
          )}
        </div>
      )}

      {/* --- Pending Modal --- */}
      <AnimatePresence>
        {showPending && (
          <PendingUsersModal onClose={() => { setShowPending(false); fetchActiveUsers(); }} />
        )}
        {showPendingProfiles && (
          <PendingProfilesModal onClose={() => { setShowPendingProfiles(false); fetchActiveUsers(); }} />
        )}
      </AnimatePresence>

      {/* --- Profile View Modal --- */}
      <TeacherProfileModal 
        selectedProfile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onSelectPlan={onSelectPlan}
        onDeleteSuccess={handleProfileDeleted}
      />
    </div>
  );
};

export default TeacherInfo;
