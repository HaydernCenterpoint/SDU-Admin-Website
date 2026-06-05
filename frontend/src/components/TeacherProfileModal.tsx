import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User as UserIcon, X, Mail, Building2, Shield, CalendarDays, Eye, Calendar, UserRound, Trash2, AlertTriangle } from 'lucide-react';
import { useAppStore, api } from '../store/useAppStore';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-[#1a237e]',
  DEPT_HEAD: 'bg-emerald-600',
  TEACHER: 'bg-[#CC0000]',
  QC: 'bg-amber-600'
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DEPT_HEAD: 'Trưởng khoa',
  TEACHER: 'Giáo viên',
  QC: 'Người giám sát'
};

interface TeacherProfileModalProps {
  selectedProfile: any;
  onClose: () => void;
  onSelectPlan: (plan: any) => void;
  onDeleteSuccess?: (userId: string | number) => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({ selectedProfile, onClose, onSelectPlan, onDeleteSuccess }) => {
  const { plans, currentUser } = useAppStore();
  const [activities, setActivities] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProfile?.id) {
      api.get(`/users/${selectedProfile.id}/activities`)
        .then(res => setActivities(res.data))
        .catch(console.error);
    }
  }, [selectedProfile]);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    setDeleteError(null);
  }, [selectedProfile?.id]);

  const getAvatarUrl = (avatar: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `/storage/${avatar}`;
  };

  const canDeleteProfile = currentUser?.role === 'BOARD'
    && !!selectedProfile
    && selectedProfile.id !== currentUser?.id
    && ['TEACHER', 'DEPT_HEAD', 'QC'].includes(selectedProfile.role);

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/users/${selectedProfile.id}`);
      onDeleteSuccess?.(selectedProfile.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || '';

      if (status === 401) {
        setDeleteError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
      } else if (status === 403) {
        setDeleteError(message || 'Bạn không có quyền xóa hồ sơ này.');
      } else if (status === 404 || /route .* could not be found/i.test(message)) {
        setDeleteError('Máy chủ hiện tại chưa cập nhật chức năng xóa giáo viên.');
      } else {
        setDeleteError(message || 'Không thể xóa giáo viên này.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative z-10 bg-zinc-50 rounded-3xl shadow-2xl w-[95vw] max-w-[1400px] max-h-[90vh] flex flex-col overflow-hidden"
          >
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <UserIcon size={18} className="text-[#CC0000]" /> 
              Hồ sơ giáo viên
            </h3>
            <div className="flex items-center gap-2">
              {canDeleteProfile && (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 bg-red-50 hover:bg-red-100 rounded-full text-red-500 transition-colors border border-red-100"
                  title="Xóa giáo viên"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Avatar & Basic Info & Activity */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    {getAvatarUrl(selectedProfile.avatar) ? (
                      <img src={getAvatarUrl(selectedProfile.avatar)!} alt="Avatar" className={`w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl ${ROLE_COLORS[selectedProfile.role] || 'bg-slate-400'}`} />
                    ) : (
                      <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-extrabold shadow-xl ${ROLE_COLORS[selectedProfile.role] || 'bg-slate-400'}`}>
                        {selectedProfile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-navy">{selectedProfile.name}</h3>
                  <p className="text-sm text-slate-500">{selectedProfile.email}</p>
                  <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm ${ROLE_COLORS[selectedProfile.role] || 'bg-slate-400'}`}>
                    Vai trò: {ROLE_LABELS[selectedProfile.role] || selectedProfile.role}
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
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
              </div>

              {/* Right Column: Detailed Info & Plans */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h4 className="text-sm font-bold text-navy uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Chi tiết hồ sơ</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Họ và tên</label>
                        <div className="relative flex items-center">
                          <UserIcon size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.name || ''} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Mã giáo viên</label>
                        <div className="relative flex items-center">
                          <Shield size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.email || String(selectedProfile.id).split('-')[0].toUpperCase()} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Email</label>
                        <div className="relative flex items-center">
                          <Mail size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.contact_email || '---'} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Khoa / Đơn vị</label>
                        <div className="relative flex items-center">
                          <Building2 size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.department?.name || selectedProfile.department_id || '---'} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Ngày sinh</label>
                        <div className="relative flex items-center">
                          <Calendar size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.dob || '---'} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Giới tính</label>
                        <div className="relative flex items-center">
                          <UserRound size={16} className="absolute left-3 text-slate-400" />
                          <input 
                            type="text" disabled 
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium outline-none"
                            value={selectedProfile.gender || '---'} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h4 className="text-sm font-bold text-navy uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Các kế hoạch của giáo viên</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="px-6 py-4">Mã phiếu</th>
                          <th className="px-6 py-4">Tên kế hoạch</th>
                          <th className="px-6 py-4 text-center">Thời gian</th>
                          <th className="px-6 py-4 text-center">Tạo lúc</th>
                          <th className="px-6 py-4 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {plans.filter(p => p.teacherId === selectedProfile.id || (p as any).user_id === selectedProfile.id).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium italic bg-slate-50/50">
                              Chưa có kế hoạch nào.
                            </td>
                          </tr>
                        ) : (
                          plans.filter(p => p.teacherId === selectedProfile.id || (p as any).user_id === selectedProfile.id).sort((a,b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map(plan => (
                            <tr key={plan.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => { onClose(); onSelectPlan(plan); }}>
                              <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">{plan.code}</td>
                              <td className="px-6 py-4 font-bold text-slate-800 max-w-[500px] truncate" title={plan.title}>{plan.title}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md">
                                  <CalendarDays size={12} className="text-slate-500" />
                                  Tháng {plan.month}/{plan.year}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-xs text-center font-medium">
                                {plan.createdAt ? new Date(plan.createdAt).toLocaleString('vi-VN') : '---'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onClose(); onSelectPlan(plan); }}
                                  className="px-3 py-1.5 bg-slate-100 text-navy text-xs font-bold rounded-lg hover:bg-navy hover:text-white transition-colors inline-flex items-center gap-1.5 border border-slate-200 hover:border-navy"
                                >
                                  <Eye size={12} /> Xem
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4"
                onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4">
                    <AlertTriangle size={22} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Xác nhận xóa giáo viên</h4>
                  <p className="mt-2 text-sm text-slate-500 leading-6">
                    Bạn có chắc chắn muốn xóa hồ sơ của <span className="font-bold text-slate-700">{selectedProfile?.name}</span> không?
                    Dữ liệu kế hoạch và hoạt động liên quan cũng sẽ bị xóa.
                  </p>

                  {deleteError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {deleteError}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                      Không xác nhận
                    </button>
                    <button
                      onClick={handleDeleteProfile}
                      disabled={isDeleting}
                      className="px-4 py-2 rounded-xl bg-[#CC0000] text-white font-semibold hover:bg-[#B80010] transition-colors disabled:opacity-60"
                    >
                      {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
