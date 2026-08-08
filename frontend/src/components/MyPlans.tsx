import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, api } from '../store/useAppStore';
import { Plus, Search, Filter, MoreHorizontal, Trash2, Send, Eye, Calendar, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plan } from '../types';
import { exportPlanToPdf, exportPlanToDocx, printPlanBrowser } from '../utils/planExportHelper';
import { formatThoiGian } from '../utils/formatThoiGian';
import { TeacherProfileModal } from './TeacherProfileModal';
import CustomSelect from './CustomSelect';

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    DRAFT:                 { label: 'BẢN NHÁP',        color: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
    SUBMITTED:             { label: 'CHỜ T.KHOA DUYỆT', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    DEPT_APPROVED_TO_BGH:  { label: 'CHỜ BGH DUYỆT',   color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    DEPT_REJECTED_PHASE1:  { label: 'T.KHOA TỪ CHỐI',  color: 'bg-red-50 text-red-600 border-red-100' },
    REPORT_SUBMITTED:      { label: 'CHỜ NGHIỆM THU',  color: 'bg-purple-50 text-purple-600 border-purple-100' },
    ACCEPTED_TO_BGH:       { label: 'HOÀN TẤT',        color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    DEPT_REJECTED_PHASE2:  { label: 'BGH TỪ CHỐI',     color: 'bg-red-50 text-red-600 border-red-100' },
  };
  const { label, color } = config[status] || config.DRAFT;
  return (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${color}`}>
      {label}
    </span>
  );
};

// ---- New Plan Modal ----
const NewPlanModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (plan: Plan) => void }) => {
  const { currentUser, createPlan } = useAppStore();
  const [title, setTitle] = useState('');
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentDate = new Date();
  const [planMonth, setPlanMonth] = useState(currentDate.getMonth() + 1);
  const [planYear, setPlanYear] = useState(currentDate.getFullYear());
  const endOfMonth = new Date(planYear, planMonth, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)));

  // Auto-fill title and pre-populate mock data for PDF demo
  React.useEffect(() => {
    if (importedFile) {
      let fileName = importedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileName);
    }
  }, [importedFile]);

  // Auto-update title when month/year changes (only if title follows the default pattern or is empty)
  React.useEffect(() => {
    setTitle(prev => {
      if (!prev || /^Kế hoạch công tác tháng \d+\/\d+$/.test(prev)) {
        return `Kế hoạch công tác tháng ${planMonth}/${planYear}`;
      }
      return prev;
    });
  }, [planMonth, planYear]);

  const handleCreate = async () => {
    if (!title.trim() || !currentUser) return;
    setError(null);
    
    const month = planMonth;
    const year = planYear;

    // Validation for rules: From May onwards, no past dates, create before 5th.
    // Also, execution after 5th (this will just be a UI note).
    // Cho phép lập kế hoạch trong quá khứ theo yêu cầu
    /* 
    const isMayOrLater = (year > 2024) || (year === 2024 && month >= 5) || (year === 2026 && month >= 5);
    if (month >= 5 || year > currentDate.getFullYear() || (year === 2026)) {
        const isPastPlan = (year < currentDate.getFullYear()) || (year === currentDate.getFullYear() && month < currentDate.getMonth() + 1);
        if (isPastPlan) {
            setError(`Không được lập kế hoạch cho tháng trong quá khứ.`);
            return;
        }
        if (year === currentDate.getFullYear() && month === currentDate.getMonth() + 1) {
            if (currentDate.getDate() > 5) {
                setError(`Đã quá hạn lập kế hoạch cho tháng ${month}. Kế hoạch phải được lập trước ngày 05 hàng tháng.`);
                return;
            }
        }
    }
    */

    const existingPlan = useAppStore.getState().plans.find(p => p.teacherId === currentUser.id && p.month === month && p.year === year);
    if (existingPlan) {
      setError(`Bạn đã có kế hoạch cho tháng ${month}/${year}. Mỗi giáo viên chỉ được tạo 1 kế hoạch trong 1 tháng!`);
      return;
    }

    setSubmitting(true);
    try {
      // Blank draft -> PlanEditor owns activity details + schedule UI
      let items: any[] = [];
      if (importedFile) {
        items = [
          {
            tableType: 'teacher',
            chu_de: 'Kế hoạch công việc 1 (dữ liệu mẫu từ file)',
            ket_qua: 'Hoàn thành 100%',
            giang_vien: currentUser.name,
            plannedHours: 0,
          },
        ];
      }

      const attachedFileName = importedFile ? importedFile.name : undefined;
      const created = await createPlan({
        title: title.trim(),
        month,
        year,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        departmentId: currentUser.departmentId,
        status: 'DRAFT',
        attachedFile: importedFile,
        attachedFileName,
        items,
        weeks: [],
      });
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || 'Không tạo được kế hoạch. Vui lòng thử lại.');
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-navy">Lập kế hoạch mới</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400"><X size={18} /></button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Tên kế hoạch</label>
            <input
              type="text"
              placeholder="VD: Kế hoạch công tác tháng 12/2025"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none mb-3"
            />
            
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Tháng</label>
                  <select 
                    value={planMonth} 
                    onChange={e => setPlanMonth(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                       <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Năm</label>
                  <select 
                    value={planYear} 
                    onChange={e => setPlanYear(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                       <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
               </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Thời gian lập</span>
              <div className="text-sm font-bold text-zinc-800">{currentDate.toLocaleDateString('vi-VN')}</div>
            </div>
            <div className="bg-red-50 border border-red-200/50 rounded-xl p-3">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">Hạn nộp (Cuối tháng)</span>
              <div className="flex items-center justify-between">
                 <div className="text-sm font-bold text-red-700">{endOfMonth.toLocaleDateString('vi-VN')}</div>
                 <div className="text-[10px] font-black text-white bg-red-500 px-2 flex items-center rounded h-5">Còn {daysRemaining} ngày</div>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Đính kèm tệp Báo cáo/Kế hoạch</label>
            <label className="border-2 border-dashed border-zinc-300 rounded-xl p-6 flex flex-col justify-center items-center text-center bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer relative overflow-hidden group mb-0">
               <input 
                 type="file" 
                 accept=".doc,.docx,.xls,.xlsx,.pdf" 
                 className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" 
                 onChange={(e) => setImportedFile(e.target.files?.[0] || null)} 
               />
               <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-zinc-100">
                 <FileText size={20} className="text-[#CC0000]" />
               </div>
               <span className="text-sm font-bold text-zinc-700 truncate max-w-[250px] mb-1">
                 {importedFile ? importedFile.name : 'Tải lên hoặc kéo thả file'}
               </span>
               {!importedFile && <span className="text-xs text-zinc-500 font-medium">Hỗ trợ .doc, .docx, .xls, .xlsx, .pdf</span>}
            </label>
          </div>

        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50"
          >
            Hủy
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || submitting}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {submitting ? 'Đang tạo...' : 'Tiếp tục lập chi tiết'}
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
};

// ---- Confirm Delete Modal ----
const ConfirmDeleteModal = ({ plan, onClose, onConfirm }: { plan: Plan; onClose: () => void; onConfirm: () => void }) => {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 leading-tight">Xác nhận xóa</h3>
            <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 mt-0.5">Không thể hoàn tác</p>
          </div>
        </div>
        <div className="p-5 text-sm text-slate-600 leading-relaxed">
           Bạn có chắc chắn muốn xóa kế hoạch <strong className="text-slate-900">"{plan.title}"</strong> không? Toàn bộ dữ liệu của kế hoạch này sẽ bị xóa vĩnh viễn.
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/70 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#CC0000] text-white shadow-md hover:bg-[#A30000] focus:ring-4 focus:ring-[#CC0000]/20 transition-all"
          >
            Xóa kế hoạch
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// ---- New Dept Modal ----
const NewDeptModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) {
      setError('Vui lòng nhập đầy đủ Tên khoa và Mã khoa');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/departments', { name: name.trim(), code: code.trim().toUpperCase() });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo khoa mới. Mã khoa có thể đã tồn tại.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-navy border-b-2 border-transparent">Tạo Khoa mới</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400"><X size={18} /></button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Mã khoa (Viết tắt)</label>
            <input
              type="text"
              placeholder="VD: CNTT"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Tên khoa</label>
            <input
              type="text"
              placeholder="VD: Khoa Công nghệ thông tin"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !code.trim() || submitting}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#A30000] disabled:opacity-40 transition-all font-sans"
          >
            {submitting ? 'Đang tạo...' : 'Lưu thông tin'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// ---- Main Component ----
const MyPlans = ({ onSelectPlan }: { onSelectPlan: (plan: Plan) => void }) => {
  const { currentUser, createPlan, updatePlanStatus, deletePlan, plans, tableTemplates } = useAppStore();
  
  const getPlanTemplate = (plan: any) => {
    return tableTemplates.find(t => t.id === plan.templateId) || tableTemplates[0];
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);

  const handleCreateNewPlan = async () => {
    if (!currentUser || creatingPlan) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // If teacher already has a plan for this month, open it instead of duplicating.
    const existing = plans.find(
      (p) =>
        (p.teacherId === currentUser.id || (p as any).user_id === currentUser.id) &&
        Number(p.month) === month &&
        Number(p.year) === year,
    );
    if (existing) {
      onSelectPlan(existing);
      return;
    }

    setCreatingPlan(true);
    try {
      const created = await createPlan({
        title: `Kế hoạch công tác tháng ${month}/${year}`,
        month,
        year,
        teacherId: currentUser.id,
        teacherName: currentUser.name,
        departmentId: currentUser.departmentId,
        status: 'DRAFT',
        items: [],
        weeks: [],
      });
      onSelectPlan(created);
    } catch (err: any) {
      alert(err?.message || 'Không tạo được kế hoạch mới. Vui lòng thử lại.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const fetchDepartments = () => {
    api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
  };

  useEffect(() => {
    api.get('/users/active').then((res: any) => setUsers(res.data)).catch(console.error);
    fetchDepartments();
  }, []);

  // get all unique months from user's plans
  const userPlans = currentUser?.role === 'BOARD'
    ? plans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status))
    : currentUser?.role === 'DEPT_HEAD'
      ? plans.filter(p => p.departmentId == currentUser.departmentId)
      : plans.filter(p => p.teacherId === currentUser?.id || (p as any).user_id === currentUser?.id);
  const availableMonths = Array.from(new Set(userPlans.map(p => `Tháng ${p.month}/${p.year}`)));

  const handleExportMonthPlan = (type: 'pdf' | 'docx' | 'print') => {
    let targetMonthStr = filterMonth;
    
    if (filterMonth === 'ALL') {
      if (availableMonths.length > 0) {
        targetMonthStr = availableMonths[0];
      } else {
        alert("Không có kế hoạch nào để xuất!");
        return;
      }
    }

    const match = targetMonthStr.match(/Tháng (\d+)\/(\d+)/);
    if (!match) return;
    const m = match[1];
    const y = match[2];

    const formatWeeks = (weeks: any[]) => {
      if (!weeks || weeks.length === 0) return '';
      
      return weeks.map(w => {
        if (!w.date) return null;
        const dates = w.date.split(',')
          .map((d: string) => {
            const parts = d.trim().split('-');
            return parts.length === 3 ? parseInt(parts[2], 10) : parseInt(d.trim(), 10);
          })
          .filter((d: number) => !isNaN(d))
          .sort((a: number, b: number) => a - b);
        
        if (dates.length === 0) return null;
        
        let ranges = [];
        let start = dates[0];
        let prev = dates[0];
        for (let i = 1; i <= dates.length; i++) {
          if (i < dates.length && dates[i] === prev + 1) {
            prev = dates[i];
          } else {
            if (start === prev) {
              ranges.push(`${start}`);
            } else {
              ranges.push(`${start}-${prev}`);
            }
            if (i < dates.length) {
              start = dates[i];
              prev = dates[i];
            }
          }
        }
        
        const dateStr = `Ngày ${ranges.join(', ')}/${m}`;
        const startLes = parseInt(w.startLesson?.toString() || '1', 10);
        const endLes = parseInt(w.endLesson?.toString() || startLes.toString(), 10);
        const lesStr = startLes === endLes ? `${startLes}` : `${startLes}-${endLes}`;
        
        return `${dateStr}; ${lesStr}`;
      }).filter(Boolean).join('\n');
    };

    const monthPlans = userPlans.filter(p => `Tháng ${p.month}/${p.year}` === targetMonthStr);
    const combinedItems: any[] = [];
    monthPlans.forEach(p => {
      const timeStr = formatWeeks(p.weeks);
      if (p.items) {
        p.items.forEach((item: any) => {
          combinedItems.push({
            ...item,
            thoi_gian: timeStr,
            giang_vien: item.giang_vien || p.teacherName || '',
            _planRef: p
          });
        });
      }
    });

    const combinedPlan = {
      month: m,
      year: y,
      departmentName: currentUser?.departmentName,
      items: combinedItems
    };

    if (type === 'pdf') exportPlanToPdf(combinedPlan, currentUser?.name);
    else if (type === 'docx') exportPlanToDocx(combinedPlan, currentUser?.name);
    else if (type === 'print') printPlanBrowser(combinedPlan, currentUser?.name);
  };

  // Apply search filter (for plans level)
  const filtered = userPlans.filter(p => {
    const codeMatch = p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const titleMatch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Regular status matching for TEACHER, otherwise ignore it here because BOARD/DEPT_HEAD will filter items
    const statusMatch = (currentUser?.role === 'TEACHER') 
       ? (filterStatus === 'ALL' || p.status === filterStatus)
       : true; 
       
    // department filter (only for BOARD)
    const deptMatch = (currentUser?.role === 'BOARD') 
      ? (filterDept === 'ALL' || p.departmentId?.toString() === filterDept.toString())
      : true;

    const monthStr = `Tháng ${p.month}/${p.year}`;
    const monthMatch = filterMonth === 'ALL' || monthStr === filterMonth;
    
    return (codeMatch || titleMatch) && statusMatch && deptMatch && monthMatch;
  }).sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const handleQuickSubmit = (plan: Plan) => {
    const nextStatus = currentUser?.role === 'DEPT_HEAD' ? 'DEPT_APPROVED_TO_BGH' : 'SUBMITTED';
    updatePlanStatus(plan.id, nextStatus);
  };

  // Group by month
  const groupedPlans = filtered.reduce((acc: any, plan) => {
    const key = `Tháng ${plan.month}/${plan.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {currentUser?.role === 'BOARD' ? 'Kế hoạch các Khoa' : currentUser?.role === 'DEPT_HEAD' ? 'Kế hoạch của khoa' : 'Kế hoạch của tôi'}
          </h2>
          <p className="page-subtitle">
            {currentUser?.role === 'BOARD'
               ? 'Quản lý và theo dõi toàn bộ kế hoạch từ tất cả các khoa.'
               : currentUser?.role === 'DEPT_HEAD' 
                 ? 'Quản lý và theo dõi tiến độ các kế hoạch của giáo viên trong khoa.'
                 : 'Quản lý và theo dõi tiến độ các kế hoạch giảng dạy cá nhân.'}
          </p>
        </div>
        {currentUser?.role === 'TEACHER' && (
          <button
            onClick={handleCreateNewPlan}
            disabled={creatingPlan}
            className="btn-primary disabled:opacity-60"
          >
            <Plus size={16} />
            {creatingPlan ? 'Đang mở form...' : 'Lập kế hoạch mới'}
          </button>
        )}
        {currentUser?.role === 'DEPT_HEAD' && (
          <div className="flex gap-2">
            <div className="relative group">
              <button 
                className="btn-primary bg-white text-primary border-2 border-primary hover:bg-red-50"
                title="Xuất kế hoạch"
              >
                <FileText size={16} /> Xuất kế hoạch
              </button>
              <div className="absolute top-full right-0 pt-1 w-36 z-50 hidden group-hover:block">
                <div className="bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
                  <button onClick={() => handleExportMonthPlan('docx')} className="w-full text-left px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 border-b border-zinc-100">Xuất DOCX</button>
                  <button onClick={() => handleExportMonthPlan('pdf')} className="w-full text-left px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Xuất PDF</button>
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleExportMonthPlan('print')}
              className="btn-primary bg-zinc-800 text-white hover:bg-zinc-900 border-2 border-zinc-800"
              title="In kế hoạch"
            >
              <FileText size={16} /> In kế hoạch
            </button>
          </div>
        )}
        {currentUser?.role === 'BOARD' && (
          <button
            onClick={() => setShowNewDeptModal(true)}
            className="btn-primary bg-white text-primary border-2 border-primary hover:bg-red-50"
          >
            <Plus size={16} /> Tạo khoa mới
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc mã kế hoạch..." 
            className="input pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <CustomSelect
            value={filterMonth}
            onChange={(val) => setFilterMonth(String(val))}
            options={[
              { value: 'ALL', label: 'Tất cả tháng' },
              ...availableMonths.map(m => ({ value: m, label: m }))
            ]}
            icon={<Calendar size={15} />}
            minWidth="130px"
          />

          {currentUser?.role === 'BOARD' && (
            <CustomSelect
              value={filterDept}
              onChange={(val) => setFilterDept(String(val))}
              options={[
                { value: 'ALL', label: 'Khoa: Tất cả' },
                ...departments.map((d: any) => ({ value: d.id, label: d.name }))
              ]}
              icon={<Filter size={15} />}
              minWidth="130px"
            />
          )}

          <CustomSelect
            value={filterStatus}
            onChange={(val) => setFilterStatus(String(val))}
            options={[
              { value: 'ALL', label: 'Trạng thái: Tất cả' },
              ...(['DEPT_HEAD', 'BOARD'].includes(currentUser?.role || '')
                ? [
                    { value: 'PASS', label: 'Đạt yêu cầu' },
                    { value: 'FAIL', label: 'Chưa đạt yêu cầu' },
                  ]
                : [
                    { value: 'DRAFT', label: 'Bản nháp' },
                    { value: 'SUBMITTED', label: 'Chờ T.Khoa duyệt' },
                    { value: 'DEPT_APPROVED_TO_BGH', label: 'Chờ BGH duyệt' },
                    { value: 'REPORT_SUBMITTED', label: 'Chờ nghiệm thu' },
                    { value: 'ACCEPTED_TO_BGH', label: 'Hoàn tất' },
                    { value: 'DEPT_REJECTED_PHASE1', label: 'T.Khoa từ chối' },
                    { value: 'DEPT_REJECTED_PHASE2', label: 'BGH từ chối' }
                  ])
            ]}
            icon={<Filter size={15} />}
            minWidth="160px"
          />
        </div>
      </div>

      {/* Plans Grouped By Month */}
      <div className="space-y-8">
        <AnimatePresence>
          {filtered.length > 0 ? (
            Object.keys(groupedPlans).map((monthKey) => (
              <motion.div
                key={monthKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                <div className="bg-slate-50 border-b border-slate-100 p-4">
                  <h3 className="font-black text-navy text-base">{monthKey}</h3>
                </div>
                <div className="p-4 space-y-6">
                  {['DEPT_HEAD', 'BOARD'].includes(currentUser?.role || '') ? (() => {
                    const approvedPlans = groupedPlans[monthKey].filter((p: Plan) => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status));
                    if (approvedPlans.length === 0) return <div className="text-center text-zinc-500 py-4 text-sm font-medium">Chưa có kế hoạch nào được duyệt trong tháng này.</div>;
                    
                    const byTemplate = approvedPlans.reduce((acc: any, p: Plan) => {
                      const tId = currentUser?.role === 'BOARD' ? (p.departmentId || 'D_unkn') : (p.templateId || 'tpl-1');
                      if (!acc[tId]) acc[tId] = [];
                      acc[tId].push(p);
                      return acc;
                    }, {});

                    return Object.keys(byTemplate).map((tplId) => {
                      const plansForTpl = byTemplate[tplId];
                      const template = getPlanTemplate(plansForTpl[0]);
                      const allItems = plansForTpl.flatMap((p: Plan) => (p.items || []).map((item: any) => ({ ...item, _planRef: p })));
                      
                      const groupTitle = currentUser?.role === 'BOARD' 
                        ? (departments.find(d => d.id == tplId)?.name || 'Khoa (Không xác định)') 
                        : template.name;

                      // Apply Evaluation Filter (PASS / FAIL) to items
                      const filteredItems = allItems.filter((item: any) => {
                        if (filterStatus === 'ALL') return true;
                        const p = item._planRef;
                        let totalKh = 0, totalTh = 0;
                        const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status || '');
                        p.weeks?.forEach((w: any) => {
                          const ph = Number(w.plannedHours || 0);
                          totalKh += ph;
                          if (isCompleted) totalTh += ph;
                        });

                        const hasAnySchedule = totalKh > 0;
                        const isPass = hasAnySchedule && (totalTh >= totalKh);
                        if (filterStatus === 'PASS') return isPass;
                        if (filterStatus === 'FAIL') return !isPass || !hasAnySchedule;
                        return true;
                      });

                      if (filteredItems.length === 0) return null; // Skip this block if no items match

                      return (
                        <div key={tplId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative z-0 mb-8">
                           <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                             <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                               {groupTitle}
                               <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">{filteredItems.length} mục</span>
                             </h3>
                           </div>
                           <div className="p-0 overflow-x-auto">
                              <table className="w-full text-left min-w-[1100px] border-collapse bg-white">
                                <thead>
                                  <tr className="bg-zinc-100/50 text-xs font-bold text-slate-600 uppercase tracking-widest border-b-2 border-slate-200">
                                    {template.columns.map((col: any) => (
                                      <th key={col.id} className={`border border-slate-200 px-4 py-4 ${col.width || 'min-w-[150px]'} ${col.align === 'center' ? 'text-center' : ''}`}>
                                        {col.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-300">
                                  {filteredItems.map((item: any, idx: number) => {
                                    const p = item._planRef;
                                    let totalKh = 0, totalTh = 0;
                                    const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status || '');
                                    p.weeks?.forEach((w: any) => {
                                        const ph = Number(w.plannedHours || 0);
                                        totalKh += ph;
                                        if (isCompleted) totalTh += ph;
                                      });

                                      return (
                                        <tr key={`${p.id}-${item.id || idx}`} className="hover:bg-slate-50 align-top group transition-colors">
                                          {template.columns.map((col: any) => (
                                            <td key={col.id} className={`px-4 py-4 text-xs border border-slate-200 ${col.align === 'center' ? 'text-center align-middle' : ''}`}>
                                              {col.id === 'tt' ? (
                                                <span className="font-bold text-slate-500">{idx + 1}</span>
                                              ) : col.id === 'giang_vien' ? (
                                                <button 
                                                  onClick={() => {
                                                    const foundUser = users.find(u => u.id === p.teacherId);
                                                    if (foundUser) setSelectedProfile(foundUser);
                                                  }}
                                                  className="text-slate-800 font-bold whitespace-pre-wrap hover:text-primary hover:underline transition-colors text-left"
                                                  title="Xem hồ sơ giáo viên"
                                                >
                                                  {item[col.id] || p.teacherName}
                                                </button>
                                              ) : col.id === 'thoi_gian' ? (
                                                <span className="text-slate-800 font-medium whitespace-pre-wrap">{formatThoiGian(p)}</span>
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
                                              ) : (
                                                <span className={`${col.name.toLowerCase().includes('giờ') ? 'text-sm font-bold text-[#CC0000]' : 'text-slate-700 whitespace-pre-wrap'}`}>
                                                  {item[col.id] || ''}
                                                </span>
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                           </div>
                        </div>
                      );
                    });
                  })() : groupedPlans[monthKey].map((plan: Plan) => (
                    <div key={plan.id} className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm relative group">
                      {/* Red accent strip */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#CC0000] to-[#FF6666] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                      
                      {/* Header Row */}
                      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-100 bg-zinc-50/50 gap-4">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-[#CC0000]/8 flex items-center justify-center text-[#CC0000]">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={plan.status} />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{plan.code}</span>
                            </div>
                            <h3 className="font-black text-navy text-sm leading-tight">{plan.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.updatedAt && plan.createdAt && new Date(plan.updatedAt).getTime() > new Date(plan.createdAt).getTime() + 2000 && (
                            <span className="text-[10px] text-zinc-400 font-medium italic mr-2">
                              Chỉnh sửa lần cuối: {new Date(plan.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                          <button
                            onClick={() => onSelectPlan(plan)}
                            className="px-4 py-2 bg-navy text-white font-bold text-xs rounded-xl hover:bg-[#CC0000] transition-all flex items-center gap-1.5"
                          >
                            <Eye size={14} /> Chỉnh sửa / Chi tiết
                          </button>
                          {(plan.status === 'DRAFT' || plan.status === 'DEPT_REJECTED_PHASE1') && (
                            <button
                              onClick={() => handleQuickSubmit(plan)}
                              className="px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <Send size={14} /> Gửi duyệt
                            </button>
                          )}
                          {(plan.status === 'DRAFT' || plan.status === 'DEPT_REJECTED_PHASE1' || plan.status === 'DEPT_REJECTED_PHASE2') && (
                            <button
                              onClick={() => setPlanToDelete(plan)}
                              className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Xóa kế hoạch"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Items Table */}
                      <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left min-w-[1100px] border-collapse bg-white">
                          <thead>
                            <tr className="bg-zinc-100 text-xs font-bold text-black uppercase tracking-widest border-b border-zinc-300">
                              {getPlanTemplate(plan).columns.map(col => (
                                <th key={col.id} className={`border border-zinc-300 px-2 py-3 ${col.width || 'min-w-[150px]'} ${col.align === 'center' ? 'text-center' : ''}`}>
                                  {col.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-300">
                            {(!plan.items || plan.items.length === 0) ? (
                              <tr><td colSpan={getPlanTemplate(plan).columns.length} className="py-4 text-center text-sm text-zinc-500">Chưa có chi tiết</td></tr>
                            ) : (
                              plan.items.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-blue-50/20 align-top group">
                                  {getPlanTemplate(plan).columns.map((col, cIdx) => (
                                    <td key={col.id} className={`border border-zinc-300 px-2 py-3 text-xs ${col.align === 'center' ? 'text-center align-middle' : ''}`}>
                                      {col.id === 'tt' ? (
                                        <span className="font-bold text-zinc-600">{idx + 1}</span>
                                      ) : col.id === 'giang_vien' ? (
                                        <span className="text-zinc-900 font-medium whitespace-pre-wrap">{item[col.id] || plan.teacherName}</span>
                                      ) : col.id === 'thoi_gian' ? (
                                        <span className="text-zinc-900 whitespace-pre-wrap">{formatThoiGian(plan)}</span>
                                      ) : col.id === 'ghi_chu' ? (
                                        <span className="text-emerald-600 font-bold whitespace-pre-wrap">Đạt yêu cầu</span>
                                      ) : (
                                        <span className={`${col.name.toLowerCase().includes('giờ') ? 'text-sm font-bold text-[#CC0000]' : 'text-zinc-900 whitespace-pre-wrap'}`}>
                                          {item[col.id] || ''}
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center card">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <FileText size={40} />
              </div>
              <h3 className="text-lg font-bold text-navy">
                {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có kế hoạch nào'}
              </h3>
              <p className="text-zinc-500 text-sm">
                {searchTerm ? `Không có kế hoạch nào khớp với "${searchTerm}".` : 'Hãy bắt đầu bằng cách tạo kế hoạch đầu tiên của bạn.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNewModal && (
          <NewPlanModal
            onClose={() => setShowNewModal(false)}
            onCreated={(newPlan) => {
              setShowNewModal(false);
              if (newPlan) onSelectPlan(newPlan);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {planToDelete && (
          <ConfirmDeleteModal
            plan={planToDelete}
            onClose={() => setPlanToDelete(null)}
            onConfirm={() => {
              useAppStore.getState().deletePlan(planToDelete.id);
              setPlanToDelete(null);
            }}
          />
        )}
        
        {showNewDeptModal && (
          <NewDeptModal
            onClose={() => setShowNewDeptModal(false)}
            onSuccess={() => {
              setShowNewDeptModal(false);
              fetchDepartments();
            }}
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

export default MyPlans;
