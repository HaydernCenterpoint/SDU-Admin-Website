import React, { useState, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  CheckCheck,
  Clock,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plan } from '../types';
import { formatThoiGian } from '../utils/formatThoiGian';
import { TeacherProfileModal } from './TeacherProfileModal';
import CustomSelect from './CustomSelect';

// Quick inline reject prompt
const RejectPopover = ({ onConfirm, onCancel }: { onConfirm: (comment: string) => void; onCancel: () => void }) => {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-black text-navy">Lý do từ chối</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400"><X size={16} /></button>
        </div>
        <textarea
          autoFocus
          rows={3}
          placeholder="Nhập lý do từ chối..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-300 outline-none"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50">Hủy</button>
          <button
            onClick={() => onConfirm(comment)}
            disabled={!comment.trim()}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40"
          >
            Xác nhận từ chối
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Approvals = ({ onSelectPlan }: { onSelectPlan: (plan: Plan) => void }) => {
  const { currentUser, plans, updatePlanStatus, tableTemplates, deletePlan } = useAppStore();
  const [rejectTarget, setRejectTarget] = useState<Plan | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Default to current month so user sees latest plans immediately
  const _now = new Date();
  const _defaultMonth = `Tháng ${_now.getMonth() + 1}/${_now.getFullYear()}`;
  const [filterMonth, setFilterMonth] = useState(_defaultMonth);
  const [filterDept, setFilterDept] = useState('ALL');

  useEffect(() => {
    api.get('/users/active').then((res: any) => setUsers(res.data)).catch(console.error);
    api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
  }, []);

  const getPlanTemplate = (plan: any) => {
    return tableTemplates.find(t => t.id === plan.templateId) || tableTemplates[0];
  };

  const isDeptHead = currentUser?.role === 'DEPT_HEAD';
  const isBoardAdmin = currentUser?.role === 'BOARD' || currentUser?.role === 'ADMIN';

  const isPending = (p: Plan) => {
    if (isDeptHead && (p.status === 'SUBMITTED' || p.status === 'REPORT_SUBMITTED')) return true;
    if (isBoardAdmin && (p.status === 'DEPT_APPROVED_TO_BGH' || p.status === 'REPORT_SUBMITTED')) return true;
    return false;
  };

  // Filter plans based on role and active filters
  const viewablePlans = plans.filter(p => {
    if (p.status === 'DRAFT') return false;

    // Check Role access
    let hasAccess = false;
    if (isDeptHead && p.departmentId == currentUser?.departmentId) hasAccess = true;
    if (isBoardAdmin && p.status !== 'SUBMITTED' && p.status !== 'DEPT_REJECTED_PHASE1') hasAccess = true;
    
    if (!hasAccess) return false;

    // Apply Filter Month
    const monthStr = `Tháng ${p.month}/${p.year}`;
    if (filterMonth !== 'ALL' && monthStr !== filterMonth) return false;

    // Apply Filter Dept
    if (filterDept !== 'ALL' && p.departmentId?.toString() !== filterDept.toString()) return false;

    return true;
  }).sort((a, b) => {
    const pA = isPending(a);
    const pB = isPending(b);
    if (pA && !pB) return -1;
    if (!pA && pB) return 1;
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const pendingCount = viewablePlans.filter(isPending).length;

  const handleApprove = (plan: Plan) => {
    let nextStatus = plan.status;
    if (plan.status === 'SUBMITTED') nextStatus = 'DEPT_APPROVED_TO_BGH';
    else if (plan.status === 'DEPT_APPROVED_TO_BGH') nextStatus = 'ACCEPTED_TO_BGH';
    else if (plan.status === 'REPORT_SUBMITTED') nextStatus = 'COMPLETED';

    updatePlanStatus(plan.id, nextStatus, 'Đã xem xét và phê duyệt.');
  };

  const handleRejectConfirm = (comment: string) => {
    if (!rejectTarget) return;
    const nextStatus = rejectTarget.status === 'SUBMITTED' ? 'DEPT_REJECTED_PHASE1' : 'DEPT_REJECTED_PHASE2';
    updatePlanStatus(rejectTarget.id, nextStatus, comment);
    setRejectTarget(null);
  };

  const handleApproveAll = () => {
    viewablePlans.filter(isPending).forEach(plan => {
      let nextStatus = plan.status;
      if (plan.status === 'SUBMITTED') nextStatus = 'DEPT_APPROVED_TO_BGH';
      else if (plan.status === 'DEPT_APPROVED_TO_BGH') nextStatus = 'ACCEPTED_TO_BGH';
      else if (plan.status === 'REPORT_SUBMITTED') nextStatus = 'COMPLETED';
      
      updatePlanStatus(plan.id, nextStatus, 'Đã phê duyệt hàng loạt.');
    });
  };

  // Group plans by month/year, sorted newest first
  const groupedPlans = viewablePlans.reduce((acc: any, plan) => {
    const key = `Tháng ${plan.month}/${plan.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  // Sort group keys newest first
  const sortedGroupKeys = Object.keys(groupedPlans).sort((a, b) => {
    const parse = (str: string) => { const [m, y] = str.replace('Tháng ', '').split('/'); return parseInt(y) * 12 + parseInt(m); };
    return parse(b) - parse(a);
  });

  // Build available months from ALL plans (including tháng 4) so dropdown always has it
  const availableMonths = Array.from(new Set(plans
    .filter(p => p.month && p.year)
    .map(p => `Tháng ${p.month}/${p.year}`)
  )).sort((a, b) => {
    const parse = (str: string) => { const [m, y] = str.replace('Tháng ', '').split('/'); return parseInt(y) * 12 + parseInt(m); };
    return parse(b) - parse(a);
  });

  return (
    <div className="space-y-6 animate-in">
      <div className="page-header flex justify-between items-start">
        <div>
          <h2 className="page-title">Phê duyệt Kế hoạch</h2>
          <p className="page-subtitle">Xử lý các yêu cầu phê duyệt và nghiệm thu từ giảng viên trong khoa.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold border border-amber-200">
              <Clock size={14} /> {pendingCount} phiếu chờ xử lý
            </div>
            <button 
              onClick={handleApproveAll}
              disabled={pendingCount === 0}
              className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all ${pendingCount > 0 ? 'bg-[#CC0000] text-white hover:opacity-90' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
            >
              <CheckCheck size={16} /> Duyệt tất cả {pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <CustomSelect
              value={filterMonth}
              onChange={(val) => setFilterMonth(String(val))}
              options={[
                { value: 'ALL', label: 'Tất cả tháng' },
                ...availableMonths.map(m => ({ value: m, label: m }))
              ]}
              minWidth="130px"
            />
            {isBoardAdmin && (
              <CustomSelect
                value={filterDept}
                onChange={(val) => setFilterDept(String(val))}
                options={[
                  { value: 'ALL', label: 'Khoa: Tất cả' },
                  ...departments.map((d: any) => ({ value: d.id, label: d.name }))
                ]}
                minWidth="150px"
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {sortedGroupKeys.length > 0 ? (
          sortedGroupKeys.map((monthKey) => (
            <div key={monthKey} className="card overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 p-4">
                <h3 className="font-black text-navy text-base">{monthKey}</h3>
              </div>
              <div className="p-4 space-y-6">
                {groupedPlans[monthKey].map((plan: Plan) => {
                  const pending = isPending(plan);
                  return (
                  <div key={plan.id} className={`border ${pending ? 'border-amber-200 shadow-md' : 'border-zinc-200 opacity-70'} rounded-xl overflow-hidden bg-white`}>
                    {/* Header Row */}
                    <div className={`p-4 flex items-center justify-between border-b ${pending ? 'bg-amber-50/30' : 'bg-zinc-50/50'}  border-zinc-100`}>
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-full ${pending ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'} flex items-center justify-center font-bold text-sm`}>
                          {plan.teacherName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-navy text-sm leading-tight">{plan.teacherName} - {plan.title}</p>
                          <p className="text-xs text-zinc-500 font-medium">Khoa: {currentUser?.departmentName} | Trạng thái: <span className={pending ? 'text-amber-600 font-bold' : ''}>{plan.status}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pending ? (
                          <>
                            <button
                              onClick={() => handleApprove(plan)}
                              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 font-bold text-xs rounded-xl hover:bg-green-100 transition-all flex items-center gap-2"
                            >
                              <CheckCircle size={14} /> Phê duyệt
                            </button>
                            <button
                              onClick={() => setRejectTarget(plan)}
                              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-xl hover:bg-red-100 transition-all flex items-center gap-2"
                            >
                              <XCircle size={14} /> Từ chối
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-zinc-400">Đã xử lý</span>
                        )}
                        <button
                          onClick={() => onSelectPlan(plan)}
                          className="px-4 py-2 bg-zinc-100 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-1.5 ml-2"
                        >
                          <Eye size={14} /> Xem chi tiết
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Bạn có chắc chắn muốn xóa kế hoạch này?")) {
                              deletePlan(plan.id);
                            }
                          }}
                          className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 font-bold text-xs rounded-xl hover:bg-red-100 transition-all flex items-center gap-1.5 ml-2"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </div>
                    {/* Inline Items Table */}
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left min-w-[1100px] border-collapse bg-white">
                        <thead>
                          <tr className="bg-zinc-100/50 text-xs font-bold text-slate-600 uppercase tracking-widest border-b-2 border-slate-200">
                            {getPlanTemplate(plan).columns.map(col => (
                              <th key={col.id} className={`px-4 py-4 ${col.width || 'min-w-[150px]'} ${col.align === 'center' ? 'text-center' : ''}`}>
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-300">
                          {plan.items.length === 0 ? (
                            <tr><td colSpan={getPlanTemplate(plan).columns.length} className="py-4 text-center text-sm text-zinc-500">Chưa có chi tiết</td></tr>
                          ) : (
                            (() => {
                              let totalKh = 0, totalTh = 0;
                              const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(plan.status || '');
                              plan.weeks?.forEach((w: any) => {
                                const ph = Number(w.plannedHours || 0);
                                totalKh += ph;
                                if (isCompleted) totalTh += ph;
                              });

                              return plan.items.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-slate-50 align-top group transition-colors">
                                  {getPlanTemplate(plan).columns.map((col, cIdx) => (
                                    <td key={col.id} className={`px-4 py-4 text-xs border-b border-slate-100 ${col.align === 'center' ? 'text-center align-middle' : ''}`}>
                                      {col.id === 'tt' ? (
                                        <span className="font-bold text-slate-500">{idx + 1}</span>
                                      ) : col.id === 'thoi_gian' ? (
                                        <span className="text-slate-800 font-medium whitespace-pre-wrap">{formatThoiGian(plan)}</span>
                                      ) : col.id === 'ghi_chu' ? (
                                        <span className="whitespace-pre-wrap font-bold">
                                          {totalKh === 0 && totalTh === 0 ? (
                                            <span className="text-slate-300 italic font-medium">Chưa có thông tin</span>
                                          ) : totalTh >= totalKh ? (
                                            <span className="text-emerald-600">Đạt yêu cầu</span>
                                          ) : (
                                            <span className="text-red-600">Chưa đạt yêu cầu</span>
                                          )}
                                        </span>
                                      ) : col.id === 'giang_vien' ? (
                                        <button
                                          onClick={() => {
                                            const foundUser = users.find(u => u.id === plan.teacherId);
                                            if (foundUser) setSelectedProfile(foundUser);
                                          }}
                                          className="text-slate-800 font-bold whitespace-pre-wrap hover:text-primary hover:underline transition-colors text-left"
                                          title="Xem hồ sơ giáo viên"
                                        >
                                          {item[col.id] || plan.teacherName}
                                        </button>
                                      ) : (
                                        <span className={`${col.name.toLowerCase().includes('giờ') ? 'text-sm font-bold text-[#CC0000]' : 'text-slate-700 whitespace-pre-wrap'}`}>
                                          {item[col.id] || ''}
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ));
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="card py-20 text-center">
            <div className="flex flex-col items-center opacity-30">
              <CheckCheck size={48} className="mb-4" />
              <p className="font-bold text-sm">Không có yêu cầu phê duyệt nào</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {rejectTarget && (
          <RejectPopover
            onConfirm={handleRejectConfirm}
            onCancel={() => setRejectTarget(null)}
          />
        )}
      </AnimatePresence>

      {selectedProfile && (
        <TeacherProfileModal
          selectedProfile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSelectPlan={onSelectPlan}
        />
      )}
    </div>
  );
};

export default Approvals;
