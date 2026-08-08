import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Send,
  Plus,
  Trash2,
  ChevronLeft,
  Calendar,
  CalendarClock,
  CheckCircle2,
  FileText,
  History,
  CheckCheck,
  XCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Eye,
  Info,
  Paperclip,
} from 'lucide-react';
import { exportPlanToPdf, exportPlanToDocx } from '../utils/planExportHelper';
import { Plan, useAppStore } from '../store/useAppStore';
import AuditTimeline from './AuditTimeline';
import FilePreview, { getFileType, fileTypeLabel, FileIcon } from './FilePreview';
import { TemplateManagerModal } from './TemplateManagerModal';

interface PlanEditorProps {
  plan: Plan;
  onClose: () => void;
}

// Label tiếng Việt cho action log
const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Gửi Trưởng khoa (Chờ duyệt)',
  DEPT_APPROVED_TO_BGH: 'Gửi Ban Giám Hiệu (Chờ duyệt)',
  DEPT_REJECTED_PHASE1: 'Trưởng khoa từ chối',
  ACCEPTED_TO_BGH: 'Ban Giám Hiệu đã phê duyệt',
  DEPT_REJECTED_PHASE2: 'Ban Giám Hiệu từ chối',
};

const CustomDatePicker = ({ value, onChange, disabled }: { value: string, onChange: (date: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDates = value ? value.split(',').map(d => d.trim()).filter(Boolean) : [];

  // Parse dates as local time to avoid timezone shift
  const parseLocalDate = (dateStr: string): Date => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const [currentDate, setCurrentDate] = useState(() => {
    if (selectedDates.length > 0) {
      return parseLocalDate(selectedDates[0]);
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const dateToStr = (y: number, m: number, d: number) =>
    `${y}-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleSelect = (day: number) => {
    if (!day) return;
    const dateStr = dateToStr(year, month, day);
    if (selectedDates.includes(dateStr)) {
      onChange(selectedDates.filter(d => d !== dateStr).join(', '));
    } else {
      onChange([...selectedDates, dateStr].sort().join(', '));
    }
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  // Use local time for "today" comparison
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  let displayValue = 'Chọn ngày...';
  if (selectedDates.length === 1) {
    const d = parseLocalDate(selectedDates[0]);
    displayValue = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } else if (selectedDates.length > 1) {
    displayValue = `${selectedDates.length} ngày đã chọn`;
  }

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-sm font-bold px-3 py-[9px] rounded-lg border ${isOpen ? 'border-primary ring-2 ring-primary/20 bg-red-50/10' : 'border-zinc-300'} bg-white flex justify-between items-center transition-colors ${disabled ? 'opacity-90 bg-zinc-50 cursor-pointer' : 'cursor-pointer hover:bg-zinc-50'}`}
      >
        <span className="truncate">{displayValue}</span>
        <Calendar size={16} className="text-zinc-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 p-4 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-zinc-100 z-[100] w-[320px]">
          <div className="flex justify-between items-center mb-4">
              <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"><ChevronLeft size={18} /></button>
              <div className="font-bold text-navy">Tháng {month + 1} năm {year}</div>
              <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"><ChevronLeft size={18} className="rotate-180" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <div key={d} className="text-[11px] font-black text-zinc-400 select-none">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                if (!d) return <div key={i} className="h-8 select-none" />;
                const dateStr = dateToStr(year, month, d);
                const isSelected = selectedDates.includes(dateStr);
                const isToday = todayYear === year && todayMonth === month && todayDate === d;

                let isRestricted = false;
                // Determine if current displayed month is "current or future" vs "past"
                const cellDate = new Date(year, month, d);
                const todayStart = new Date(todayYear, todayMonth, todayDate);

                // Past months: restrict all dates (not selectable at all)
                const isPastMonth = (year < todayYear) || (year === todayYear && month < todayMonth);
                // Current month: restrict dates < today (already passed)
                const isPastDateInCurrentMonth = (year === todayYear && month === todayMonth && d < todayDate);
                // Current month: restrict days 1-5
                const isFirstFiveDays = (year === todayYear && month === todayMonth && d <= 5);

                if (isPastMonth) {
                  isRestricted = true; // Past months not selectable
                } else if (year === todayYear && month === todayMonth) {
                  // Current month: only restrict past dates and days 1-5
                  if (isPastDateInCurrentMonth) isRestricted = true;
                  if (isFirstFiveDays) isRestricted = true;
                }
                // Future months: all dates selectable (no restriction)
                const isDisabled = disabled || isRestricted;

                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => { if (!isDisabled) handleSelect(d); }}
                    className={`h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-all focus:outline-none
                      ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105' :
                        isToday ? `bg-red-50 text-primary border border-red-200 ${!isDisabled ? 'hover:bg-red-100' : ''}` :
                        isRestricted ? 'text-zinc-300 bg-zinc-50 line-through' : `text-zinc-700 ${!isDisabled ? 'hover:bg-zinc-100' : ''}`}
                      ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    title={isRestricted ? (isPastMonth ? "Không thể chọn tháng trong quá khứ" : "Ngày đã qua hoặc trước ngày 05 của tháng hiện tại") : ""}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setCurrentDate(new Date(todayYear, todayMonth, todayDate));
                  const todayStr = dateToStr(todayYear, todayMonth, todayDate);
                  // Check if today is restricted (past date or within first 5 days)
                  const todayRestricted = (todayDate <= 5) || selectedDates.includes(todayStr);
                  if (!disabled && !todayRestricted) {
                    if (!selectedDates.includes(todayStr)) {
                      onChange([...selectedDates, todayStr].sort().join(', '));
                    }
                  }
                }}
                className={`text-xs font-bold transition-colors ${disabled ? 'text-zinc-400 cursor-default' : 'text-primary hover:underline'}`}
              >
                Hôm nay
              </button>
            </div>
          </div>
      )}
    </div>
  );
};

const PlanEditor: React.FC<PlanEditorProps> = ({ plan, onClose }) => {
  const { currentUser, updatePlanStatus, tableTemplates, updateTableTemplate } = useAppStore();
  const [title, setTitle] = useState(plan.title);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [activeTable, setActiveTable] = useState<'teacher' | 'student'>('teacher');
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(plan.templateId || 'tpl-1');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [busyNoteTarget, setBusyNoteTarget] = useState<string | null>(null);
  const [busyNoteText, setBusyNoteText] = useState('');

  const teacherTemplate = {
    id: 'tpl-teacher',
    name: 'Kế hoạch Giảng viên',
    columns: [
      { id: 'tt', name: 'TT', width: 'w-12', align: 'center' },
      { id: 'chu_de', name: 'Tên chủ đề/nội dung nghiên cứu', width: 'min-w-[200px]' },
      { id: 'dia_diem', name: 'Địa điểm', width: 'min-w-[120px]' },
      { id: 'ten_thiet_bi', name: 'Tên thiết bị', width: 'min-w-[150px]' },
      { id: 'nam_su_dung', name: 'Năm đưa vào sử dụng', width: 'w-[100px]', align: 'center' },
      { id: 'giang_vien', name: 'Giảng viên thực hiện', width: 'min-w-[150px]' },
      { id: 'ket_qua', name: 'Dự kiến kết quả đạt được', width: 'min-w-[200px]' }
    ]
  };

  const studentTemplate = {
    id: 'tpl-student',
    name: 'Kế hoạch Sinh viên',
    columns: [
      { id: 'tt', name: 'TT', width: 'w-12', align: 'center' },
      { id: 'chu_de', name: 'Tên chủ đề/nội dung nghiên cứu', width: 'min-w-[200px]' },
      { id: 'dia_diem', name: 'Địa điểm', width: 'min-w-[120px]' },
      { id: 'ten_thiet_bi', name: 'Tên thiết bị', width: 'min-w-[150px]' },
      { id: 'nam_su_dung', name: 'Năm đưa vào sử dụng', width: 'w-[100px]', align: 'center' },
      { id: 'sinh_vien', name: 'Sinh viên thực hiện', width: 'min-w-[150px]' },
      { id: 'giang_vien', name: 'Giảng viên hướng dẫn', width: 'min-w-[150px]' },
      { id: 'ket_qua', name: 'Dự kiến kết quả đạt được', width: 'min-w-[200px]' }
    ]
  };

  const [teacherItems, setTeacherItems] = useState<any[]>(() => {
    let list = [];
    if (plan.items && plan.items.length > 0) {
      list = plan.items.filter((i: any) => i.tableType !== 'student');
      if (list.length > 0) return list;
    }
    const newItem: any = { id: 'i' + Math.random().toString(36).substr(2, 6), tableType: 'teacher' };
    const defaultTeacherName = plan.teacherName || useAppStore.getState().currentUser?.name || '';
    teacherTemplate.columns.forEach((col: any) => { 
      if (col.id === 'giang_vien') {
        newItem[col.id] = defaultTeacherName;
      } else {
        newItem[col.id] = ''; 
      }
    });
    return [newItem];
  });

  const [studentItems, setStudentItems] = useState<any[]>(() => {
    let list = [];
    if (plan.items && plan.items.length > 0) {
      list = plan.items.filter((i: any) => i.tableType === 'student');
      if (list.length > 0) return list;
    }
    const newItem: any = { id: 'i' + Math.random().toString(36).substr(2, 6), tableType: 'student' };
    studentTemplate.columns.forEach((col: any) => {
      newItem[col.id] = '';
    });
    return [newItem];
  });

  const [weeks, setWeeks] = useState<any[]>(() => {
    if (plan.weeks && plan.weeks.length > 0) return plan.weeks;
    return [{ id: 'w' + Math.random().toString(36).substr(2, 6), date: '', startLesson: 1, endLesson: 3, plannedHours: 3, weekLabel: '' }];
  });

  const role = currentUser?.role;
  const isDeptHead = role === 'DEPT_HEAD';
  const isBoardAdmin = role === 'BOARD' || role === 'ADMIN';

  const isOwner = currentUser?.id === plan.teacherId || currentUser?.id === (plan as any).user_id;
  
  // Trạng thái cho phép chỉnh sửa:
  const isEditableStatus = ['DRAFT', 'SUBMITTED', 'DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(plan.status);

  // Chỉ giáo viên (chủ kế hoạch) và Trưởng khoa mới được quyền sửa (và chỉ sửa khi ở trạng thái cho phép)
  const isEditable = isEditableStatus && (isOwner || isDeptHead);
  const isReporting = false;
  
  const canApproveDeptHead = isDeptHead && plan.status === 'SUBMITTED';
  const canApproveBoard = isBoardAdmin && plan.status === 'DEPT_APPROVED_TO_BGH';

  const totalPlanned = weeks.reduce((acc: number, w: any) => acc + (Number(w.plannedHours) || 0), 0);
  const totalActual = weeks.reduce((acc: number, w: any) => acc + (Number(w.actualHours) || 0), 0);

  const updateTeacherItem = (id: string, field: string, value: string | number) => {
    setTeacherItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  
  const updateStudentItem = (id: string, field: string, value: string | number) => {
    setStudentItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateWeek = (id: string, field: string, value: string | number) => {
    setWeeks(prev => prev.map(week => week.id === id ? { ...week, [field]: value } : week));
  };

  const [keptAttachments, setKeptAttachments] = useState<{name: string, url?: string, path: string}[]>(() => {
    let atts = [...(plan.attachments || [])];
    if (plan.attachedFilePath && !atts.some(a => a.path === plan.attachedFilePath)) {
      atts.push({
        name: plan.attachedFileName || 'Tài liệu',
        path: plan.attachedFilePath,
        url: plan.attachedFileUrl
      });
    }
    return atts;
  });
  const [newAttachments, setNewAttachments] = useState<File[]>([]);



  const handleSaveDraft = async () => {
    const validItems = [...teacherItems, ...studentItems].filter(item => {
      const isBlank = !item.chu_de && !item.ten_thiet_bi && !item.ket_qua && !item.sinh_vien;
      return !isBlank;
    });
    
    await useAppStore.getState().updatePlan(plan.id, {
      title,
      items: validItems, 
      weeks,
      keptAttachments,
      newAttachments
    });
    onClose();
  };

  // Gửi duyệt
  const handleSubmit = async () => {
    const validItems = [...teacherItems, ...studentItems].filter(item => {
      const isBlank = !item.chu_de && !item.ten_thiet_bi && !item.ket_qua && !item.sinh_vien;
      return !isBlank;
    });

    await useAppStore.getState().updatePlan(plan.id, {
      title,
      items: validItems, 
      weeks,
      keptAttachments,
      newAttachments
    });
    await useAppStore.getState().updatePlanStatus(plan.id, 'SUBMITTED');
    onClose();
  };

  // Nộp báo cáo không còn sử dụng trong workflow mới nhưng giữ nguyên stub nếu cần
  const handleSubmitReport = () => {};

  // Group approve logic
  const handleApprove = () => {
    let nextStatus: any = 'ACCEPTED_TO_BGH';
    if (canApproveDeptHead) nextStatus = 'DEPT_APPROVED_TO_BGH';
    
    updatePlanStatus(plan.id, nextStatus, 'Đã xem xét và phê duyệt.');
    onClose();
  };

  // Group reject logic
  const handleReject = () => {
    if (!rejectComment.trim()) return;
    let nextStatus: any = 'DEPT_REJECTED_PHASE2'; // BGH Reject default
    if (canApproveDeptHead) nextStatus = 'DEPT_REJECTED_PHASE1';
    
    updatePlanStatus(plan.id, nextStatus, rejectComment);
    onClose();
  };

  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <FileText size={20} className="text-[#CC0000]" />
          </div>
          <div>
            {isEditable ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-bold text-navy tracking-tight bg-transparent border-b border-dashed border-zinc-400 focus:border-primary outline-none px-1 -mx-1 w-full min-w-[300px]"
                placeholder="Tên kế hoạch..."
              />
            ) : (
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">{title}</h2>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{plan.code}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{plan.status}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isEditable && (
            <>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-all"
              >
                <Save size={14} /> Lưu nháp
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-all"
              >
                <Send size={14} /> Gửi duyệt
              </button>
            </>
          )}
          {(canApproveDeptHead || canApproveBoard) && (
            <>
              <button
                onClick={() => setShowRejectBox(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
              >
                <CheckCheck size={14} /> {canApproveDeptHead ? 'Trưởng khoa Duyệt' : 'BGH Phê duyệt'}
              </button>
            </>
          )}
          

          <div className="w-px h-6 bg-zinc-200 mx-1 self-center" />
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-500 self-center">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Reject comment box */}
      {showRejectBox && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-3 shrink-0">
          <input
            type="text"
            placeholder="Nhập lý do từ chối..."
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            className="flex-1 text-xs px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <button
            onClick={handleReject}
            disabled={!rejectComment.trim()}
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-40 transition-all"
          >
            Xác nhận từ chối
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="px-6 pt-4 border-b border-zinc-100 flex gap-6 shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <FileText size={12} className="inline mr-1.5" />Chi tiết
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          <History size={12} className="inline mr-1.5" />Lịch sử ({plan.auditLog?.length || 0})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        {activeTab === 'details' ? (
          <div className="space-y-8">
            {/* THÔNG TIN CHUNG & TÀI LIỆU ĐÍNH KÈM */}
            <section className="grid grid-cols-1 gap-6">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Thông tin chung</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Giáo viên lập kế hoạch</span>
                     <span className="text-sm font-bold text-zinc-900">{plan.teacherName || currentUser?.name || 'Giảng viên'}</span>
                  </div>
                  <div className="flex flex-col p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Tên kế hoạch</span>
                     {isEditable ? (
                       <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="text-sm font-bold text-zinc-900 outline-none w-full bg-transparent border-b border-dashed border-zinc-300 focus:border-primary"
                          placeholder="Nhập tên kế hoạch"
                       />
                     ) : (
                       <span className="text-sm font-bold text-zinc-900 truncate" title={title || `Kế hoạch tháng ${plan.month}/${plan.year}`}>{title || `Kế hoạch tháng ${plan.month}/${plan.year}`}</span>
                     )}
                  </div>
                  <div className="flex flex-col p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Thời gian lập</span>
                     <span className="text-sm font-bold text-zinc-900">{new Date(plan.createdAt || Date.now()).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="flex flex-col p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Hạn nộp</span>
                     <span className="text-sm font-bold text-[#CC0000]">{(() => { const d = new Date(plan.createdAt || Date.now()); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("vi-VN"); })()}</span>
                  </div>
                </div>
              </div>

              </section>

            {/* Activities table */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Chi tiết hoạt động</h3>
                  </div>
                  
                  <div className="flex items-center bg-zinc-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTable('teacher')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTable === 'teacher' ? 'bg-white text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Giảng viên
                    </button>
                    <button
                      onClick={() => setActiveTable('student')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTable === 'student' ? 'bg-white text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Sinh viên
                    </button>
                  </div>
                </div>
              </div>

              {activeTable === 'teacher' ? (
                <div className="overflow-x-auto rounded-lg border border-zinc-300">
                  <table className="w-full text-left min-w-[1100px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-zinc-100 text-xs font-bold text-black uppercase tracking-widest border-b border-zinc-300">
                        {teacherTemplate.columns.map((col: any) => (
                          <th key={col.id} className={`border-r border-zinc-300 px-2 py-2 align-middle ${col.width || 'min-w-[150px]'} ${col.align === 'center' ? 'text-center' : ''}`}>
                            <div className="w-full text-center">{col.name || '—'}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-300">
                      {teacherItems.length === 0 ? (
                        <tr>
                          <td colSpan={teacherTemplate.columns.length + (isEditable ? 1 : 0)} className="px-4 py-8 text-center text-zinc-400">
                            <p className="font-bold text-sm">Chưa có kế hoạch chi tiết cho giảng viên</p>
                          </td>
                        </tr>
                      ) : (
                        teacherItems.map((item: any, idx: number) => (
                          <tr key={item.id} className="hover:bg-blue-50/20 align-top group">
                            {teacherTemplate.columns.map(col => (
                              <td key={col.id} className={`border-r border-zinc-300 p-0 hover:bg-blue-50/50 transition-colors ${col.align === 'center' ? 'text-center align-middle' : ''}`}>
                                {col.id === 'tt' ? (
                                  <div className="p-2 text-xs font-bold text-center text-zinc-600 w-full h-full flex items-center justify-center">
                                    {idx + 1}
                                  </div>
                                ) : col.name.toLowerCase().includes('năm') ? (
                                  <input
                                    type="text"
                                    readOnly={!isEditable}
                                    value={item[col.id] || ''}
                                    onChange={e => {
                                        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        updateTeacherItem(item.id, col.id, val);
                                    }}
                                    className="w-full text-center text-xs focus:outline-none focus:bg-blue-50/80 transition-all bg-transparent py-3 text-zinc-900"
                                  />
                                ) : col.id === 'giang_vien' ? (
                                  <div className="p-2 text-xs font-bold text-center text-primary w-full h-full min-h-[60px] flex items-center justify-center">
                                    {item[col.id] || plan.teacherName || currentUser?.name || ''}
                                  </div>
                                ) : (
                                  <textarea
                                    ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                                    readOnly={!isEditable}
                                    value={item[col.id] || ''}
                                    placeholder="Nhập..."
                                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
                                    onChange={e => updateTeacherItem(item.id, col.id, e.target.value)}
                                    className="w-full h-full min-h-[60px] text-xs resize-none overflow-hidden focus:outline-none focus:bg-blue-50/80 transition-all bg-transparent p-2 text-zinc-900 leading-relaxed block"
                                    rows={1}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-300">
                  <table className="w-full text-left min-w-[1100px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-zinc-100 text-xs font-bold text-black uppercase tracking-widest border-b border-zinc-300">
                        {studentTemplate.columns.map((col: any) => (
                          <th key={col.id} className={`border-r border-zinc-300 px-2 py-2 align-middle ${col.width || 'min-w-[150px]'} ${col.align === 'center' ? 'text-center' : ''}`}>
                            <div className="w-full text-center">{col.name || '—'}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-300">
                      {studentItems.length === 0 ? (
                        <tr>
                          <td colSpan={studentTemplate.columns.length + (isEditable ? 1 : 0)} className="px-4 py-8 text-center text-zinc-400">
                            <p className="font-bold text-sm">Chưa có kế hoạch chi tiết cho sinh viên</p>
                          </td>
                        </tr>
                      ) : (
                        studentItems.map((item: any, idx: number) => (
                          <tr key={item.id} className="hover:bg-blue-50/20 align-top group">
                            {studentTemplate.columns.map(col => (
                              <td key={col.id} className={`border-r border-zinc-300 p-0 hover:bg-blue-50/50 transition-colors ${col.align === 'center' ? 'text-center align-middle' : ''}`}>
                                {col.id === 'tt' ? (
                                  <div className="p-2 text-xs font-bold text-center text-zinc-600 w-full h-full flex items-center justify-center">
                                    {idx + 1}
                                  </div>
                                ) : col.name.toLowerCase().includes('năm') ? (
                                  <input
                                    type="text"
                                    readOnly={!isEditable}
                                    value={item[col.id] || ''}
                                    onChange={e => {
                                        let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        updateStudentItem(item.id, col.id, val);
                                    }}
                                    className="w-full text-center text-xs focus:outline-none focus:bg-blue-50/80 transition-all bg-transparent py-3 text-zinc-900"
                                  />
                                ) : col.id === 'giang_vien' ? (
                                  <div className="p-2 text-xs font-bold text-center text-primary w-full h-full min-h-[60px] flex items-center justify-center">
                                    {item[col.id] || plan.teacherName || currentUser?.name || ''}
                                  </div>
                                ) : (
                                  <textarea
                                    ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                                    readOnly={!isEditable}
                                    value={item[col.id] || ''}
                                    placeholder="Nhập..."
                                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
                                    onChange={e => updateStudentItem(item.id, col.id, e.target.value)}
                                    className="w-full h-full min-h-[60px] text-xs resize-none overflow-hidden focus:outline-none focus:bg-blue-50/80 transition-all bg-transparent p-2 text-zinc-900 leading-relaxed block"
                                    rows={1}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Time allocation */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Phân bổ thời gian</h3>
                </div>
                {isEditable && (
                  <button 
                    onClick={() => setWeeks(prev => [...prev, { id: 'w' + Math.random().toString(36).substr(2, 6), date: '', startLesson: 1, endLesson: 1, plannedHours: 1, weekLabel: '' }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                  >
                    <Plus size={13} /> Thêm thời gian
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {weeks.length === 0 ? (
                  <div className="col-span-full border border-dashed border-zinc-300 p-8 rounded-xl bg-zinc-50 flex flex-col items-center justify-center text-zinc-400">
                    <Calendar className="w-8 h-8 mb-2 opacity-30" />
                    <p className="font-bold text-sm">Chưa có phân bổ thời gian</p>
                  </div>
                ) : (
                  weeks.map((week: any) => (
                    <div key={week.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 border border-zinc-200 p-3 rounded-lg bg-zinc-50 hover:border-zinc-300 transition-colors">
                      <div className="flex-1 min-w-[150px]">
                        <span className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Ngày thực hiện</span>
                        <CustomDatePicker
                          disabled={!isEditable}
                          value={week.date || ''}
                          onChange={dateStr => updateWeek(week.id, 'date', dateStr)}
                        />
                      </div>
                      <div className="w-[120px]">
                        <span className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Từ tiết</span>
                        <select
                          disabled={!isEditable}
                          value={week.startLesson || 1}
                          onChange={e => {
                            const newStart = parseInt(e.target.value, 10);
                            let newEnd = week.endLesson ? parseInt(week.endLesson, 10) : newStart;
                            if (newStart > newEnd) newEnd = newStart;
                            setWeeks(prev => prev.map(w => w.id === week.id ? { ...w, startLesson: newStart, endLesson: newEnd, plannedHours: newEnd - newStart + 1 } : w));
                          }}
                          className="w-full text-sm font-bold px-2 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-primary/20 bg-white disabled:opacity-70 disabled:bg-zinc-100"
                        >
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Tiết {n}</option>)}
                        </select>
                      </div>
                      <div className="w-[120px]">
                        <span className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Đến tiết</span>
                        <select
                          disabled={!isEditable}
                          value={week.endLesson || (week.startLesson || 1)}
                          onChange={e => {
                            const newEnd = parseInt(e.target.value, 10);
                            let newStart = week.startLesson ? parseInt(week.startLesson, 10) : 1;
                            if (newStart > newEnd) newStart = newEnd;
                            setWeeks(prev => prev.map(w => w.id === week.id ? { ...w, startLesson: newStart, endLesson: newEnd, plannedHours: newEnd - newStart + 1 } : w));
                          }}
                          className="w-full text-sm font-bold px-2 py-2 rounded-lg border border-zinc-300 outline-none focus:ring-2 focus:ring-primary/20 bg-white disabled:opacity-70 disabled:bg-zinc-100"
                        >
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Tiết {n}</option>)}
                        </select>
                      </div>
                      <div className="w-[80px] text-center">
                        <span className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Tổng số</span>
                        <div className="text-sm py-1.5 font-black text-primary bg-primary/10 rounded-md h-[38px] flex items-center justify-center">
                          {(() => {
                            const selectedDatesArray = week.date ? week.date.split(',').filter((d: string) => d.trim()) : [];
                            const multipliers = selectedDatesArray.length > 0 ? selectedDatesArray.length : 1;
                            return ((week.endLesson || week.startLesson || 1) - (week.startLesson || 1) + 1) * multipliers;
                          })()}
                        </div>
                      </div>
                      <div className="w-[100px]">
                        <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">Thực hiện</span>
                        <input
                          type="number"
                          readOnly={!isEditable}
                          value={week.actualHours ?? 0}
                          onChange={e => updateWeek(week.id, 'actualHours', Number(e.target.value))}
                          className="w-full text-sm font-black text-center py-2 rounded border border-emerald-500/30 bg-emerald-50 text-emerald-600 outline-none focus:ring-1 focus:ring-emerald-400 h-[38px]"
                        />
                      </div>

                      {isEditable && (
                        <button
                          onClick={() => {
                            setBusyNoteTarget(week.id);
                            setBusyNoteText(week.busyNote || week.busy_note || '');
                          }}
                          className={`w-[38px] h-[38px] flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                            week.busyNote || week.busy_note
                              ? 'text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100'
                              : 'text-zinc-400 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200'
                          }`}
                          title={week.busyNote || week.busy_note ? 'Đổi lịch (có ghi chú)' : 'Đổi lịch'}
                        >
                          <CalendarClock size={16} />
                        </button>
                      )}

                      {isEditable && (
                        <button
                          onClick={() => setWeeks(prev => prev.filter(w => w.id !== week.id))}
                          className="w-[38px] h-[38px] flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors shrink-0"
                          title="Xóa thời gian này"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Busy note indicator row */}
                      {(week.busyNote || week.busy_note) && (
                        <div className="w-full border-t border-dashed border-orange-200 pt-2 mt-1">
                          <div className="flex items-start gap-2 text-orange-600 bg-orange-50 rounded-lg p-2">
                            <CalendarClock size={14} className="shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-black uppercase">Ghi chú đổi lịch: </span>
                              <span className="text-xs font-semibold">{week.busyNote || week.busy_note}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {weeks.length > 0 && (
                  <div className="mt-2 bg-red-50 rounded-xl border border-red-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-primary">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy">Tổng kết thời gian</div>
                        <div className="text-xs text-zinc-500 font-medium">Toàn bộ các phân bổ của kế hoạch này</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 px-4">
                      <div className="text-center">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Tổng Số Ngày</div>
                        <div className="text-xl font-black text-primary">
                          {new Set(
                            weeks.flatMap((week: any) => 
                              week.date ? week.date.split(',').map((d: string) => d.trim()).filter(Boolean) : []
                            )
                          ).size}
                        </div>
                      </div>
                      <div className="w-[1px] h-10 bg-red-200"></div>
                      <div className="text-center">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Tổng Số Tiết</div>
                        <div className="text-xl font-black text-primary">
                          {weeks.reduce((acc: number, week: any) => {
                            const selectedDatesArray = week.date ? week.date.split(',').filter((d: string) => d.trim()) : [];
                            const multipliers = selectedDatesArray.length > 0 ? selectedDatesArray.length : 1;
                            return acc + (((week.endLesson || week.startLesson || 1) - (week.startLesson || 1) + 1) * multipliers);
                          }, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="mt-8">
{/* Attachments Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-primary" />
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Tài liệu đính kèm ({keptAttachments.length + newAttachments.length})</h3>
                  </div>
                  {isEditable && (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all cursor-pointer">
                      <Plus size={13} /> Thêm tài liệu
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files) {
                            setNewAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  {(keptAttachments.length > 0 || newAttachments.length > 0) ? (
                    <div className="space-y-3">
                      {keptAttachments.map((att, i) => (
                        <div key={'k' + i} className="flex items-center justify-between p-2.5 border border-zinc-200 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                            <FileIcon type={getFileType(att.name, att.path)} />
                            <div className="truncate">
                              <p className="text-xs font-bold text-zinc-800 truncate">{att.name}</p>
                              <p className="text-[10px] text-zinc-400">Đã lưu trữ</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-1 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                              title="Xem trước"
                            >
                              <Eye size={14} />
                            </a>
                            <a 
                              href={att.url} 
                              download={att.name}
                              className="p-1 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                              title="Tải về"
                            >
                              <Download size={14} />
                            </a>
                            {isEditable && (
                              <button 
                                onClick={() => setKeptAttachments(prev => prev.filter(a => a.path !== att.path))}
                                className="p-1 text-red-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {newAttachments.map((file, i) => (
                        <div key={'n' + i} className="flex items-center justify-between p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                          <div className="flex items-center gap-2 truncate pl-2">
                            <FileIcon type={getFileType(file.name, file.name)} />
                            <div className="truncate">
                              <p className="text-xs font-bold text-zinc-800 truncate">{file.name}</p>
                              <p className="text-[10px] text-emerald-600 font-bold">Mới thêm</p>
                            </div>
                          </div>
                          {isEditable && (
                            <button 
                              onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full min-h-[100px] border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center p-6 bg-white">
                      <div className="text-center text-zinc-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-[11px] font-bold">Chưa có tài liệu đính kèm</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            
</div>

            {/* Document Viewers */}
            {(keptAttachments.length > 0) && (
              <section className="pt-4 pb-8 space-y-6 mt-6">
                {keptAttachments.map((att, i) => (
                  <div key={`view-${i}`} className="h-[700px] border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white relative">
                    <div className="absolute top-0 left-0 w-full bg-zinc-800/80 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between z-10">
                        <span className="text-xs font-bold truncate">{att.name}</span>
                    </div>
                    <div className="pt-10 h-full">
                      <FilePreview filePath={att.path} fileName={att.name} fileUrl={att.url} />
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        ) : (
          /* History tab */
          <div className="max-w-2xl">
            {(plan.auditLog?.length || 0) > 0 ? (
              <AuditTimeline logs={plan.auditLog || []} />
            ) : (
              <div className="py-16 text-center text-zinc-400">
                <History size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Chưa có lịch sử thao tác</p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Busy Note Popover */}
      {busyNoteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-orange-500" />
                <h3 className="text-base font-black text-navy">Ghi chú đổi lịch</h3>
              </div>
              <button onClick={() => setBusyNoteTarget(null)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Ghi chú này sẽ hiển thị trên lịch để Phòng QLCL biết ngày kiểm tra thực tế. Không cần chuyển ngày trên lịch.
            </p>
            <textarea
              autoFocus
              rows={3}
              placeholder="VD: GV bận, chuyển kiểm tra sang ngày Y..."
              value={busyNoteText}
              onChange={e => setBusyNoteText(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-300 outline-none"
            />
            <div className="flex gap-3 mt-4">
              {busyNoteText.trim() && (
                <button
                  onClick={() => {
                    setWeeks(prev => prev.map(w => w.id === busyNoteTarget ? { ...w, busyNote: busyNoteText.trim() } : w));
                    setBusyNoteTarget(null);
                  }}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
                >
                  Lưu ghi chú
                </button>
              )}
              {!busyNoteText.trim() && (
                <button
                  onClick={() => {
                    setWeeks(prev => prev.map(w => w.id === busyNoteTarget ? { ...w, busyNote: null, busy_note: null } : w));
                    setBusyNoteTarget(null);
                  }}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Xóa ghi chú
                </button>
              )}
              <button
                onClick={() => setBusyNoteTarget(null)}
                className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateManager && (
        <TemplateManagerModal
          onClose={() => setShowTemplateManager(false)}
          onSelect={(id) => {
            setSelectedTemplateId(id);
            setShowTemplateManager(false);
          }}
        />
      )}
    </div>
  );
};

export default PlanEditor;
