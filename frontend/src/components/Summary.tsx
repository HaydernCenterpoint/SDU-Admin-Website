import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CheckCircle, XCircle, FileText, CheckCheck, MapPin, AlignLeft, Paperclip, CalendarDays, X, User, Building2, Calendar as CalendarIcon, Clock, Link as LinkIcon, Download, Filter, Trash2 } from 'lucide-react';
import { Plan } from '../types';
import CustomSelect from './CustomSelect';
import { createPortal } from 'react-dom';

const getCalendarWeeks = (year: number, month: number) => {
  const weeks: Array<{id: number, name: string, days: Date[]}> = [];
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  
  let current = new Date(firstDayOfMonth);
  const firstDow = current.getDay() === 0 ? 6 : current.getDay() - 1; // 0 for Monday, 6 for Sunday
  current.setDate(current.getDate() - firstDow); 
  
  let weekId = 1;
  while (current <= lastDayOfMonth) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push({
      id: weekId,
      name: `Tuần ${weekId} (${days[0].getDate()}/${days[0].getMonth()+1} - ${days[6].getDate()}/${days[6].getMonth()+1})`,
      days: days
    });
    weekId++;
  }
  return weeks;
};

const isDat = (p: any) => p.evaluation === 'DAT' || p.auditLogs?.some((l: any) => l.comment === 'Đạt yêu cầu');
const isChuaDat = (p: any) => p.evaluation === 'CHUA_DAT' || p.auditLogs?.some((l: any) => l.comment === 'Chưa đạt yêu cầu');

interface SummaryProps {
  onSelectPlan: (plan: Plan) => void;
}

const SummaryModal = ({ plan, onClose, onApprove, getDeptName, onSelectPlan }: { plan: Plan, onClose: () => void, onApprove: () => void, getDeptName: (id: string) => string, onSelectPlan: (plan: Plan) => void }) => {
  const { deletePlan } = useAppStore();
  const today = new Date();
  const monthWeeks = useMemo(() => getCalendarWeeks(plan.year, plan.month), [plan.year, plan.month]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    const weeks = getCalendarWeeks(today.getFullYear(), today.getMonth() + 1);
    const now = new Date();
    now.setHours(0,0,0,0);
    const idx = weeks.findIndex(w => w.days.some(d => d.getTime() === now.getTime()));
    return idx !== -1 ? idx : 0;
  });
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (selectedWeekIndex >= monthWeeks.length) {
      setSelectedWeekIndex(0);
    }
  }, [monthWeeks, selectedWeekIndex]);

  const currentWeekDays = useMemo(() => {
    const currentWeek = monthWeeks[selectedWeekIndex] || monthWeeks[0];
    return currentWeek.days.map(d => {
      return {
        dayNumber: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        dayOfWeek: d.getDay()
      };
    });
  }, [monthWeeks, selectedWeekIndex]);

  const getDayName = (dow: number) => {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dow];
  };

  const scheduleMap = useMemo(() => {
    const map: Record<string, { morning: any[], afternoon: any[] }> = {};
    currentWeekDays.forEach(d => { map[d.dateStr] = { morning: [], afternoon: [] }; });

    if (plan.weeks) {
      plan.weeks.forEach(week => {
        if (!week.date) return;
        const dates = week.date.split(',').map((d: string) => d.trim());
        dates.forEach((dateStr: string) => {
          if (map[dateStr]) {
            const startLesson = week.startLesson || 1;
            const endLesson = week.endLesson || 1;
            
            // For demonstration, since items don't have individual completion statuses,
            // we determine it conceptually based on the overall plan status or a mock.
            // If the plan is "COMPLETED", we treat the activities as completed.
            const isCompleted = plan.status === 'COMPLETED';
            
            // Apply filtering
            if (filterMode === 'completed' && !isCompleted) return;
            if (filterMode === 'pending' && isCompleted) return;

            const chuDeList = Array.from(new Set((plan.items || []).filter((i: any) => i.chu_de).map((i: any) => i.chu_de)));
            const displayTitle = chuDeList.length > 0 ? chuDeList.join(', ') : (plan.title || `Kế hoạch ${plan.code}`);

            const activity = { startLesson, endLesson, isCompleted, planTitle: displayTitle, teacherName: plan.teacherName };
            
            if (startLesson <= 5) {
              map[dateStr].morning.push(activity);
            }
            if (startLesson > 5 || endLesson > 5) {
               if (startLesson > 5 || (endLesson > 5 && startLesson <= 5)) {
                 if (startLesson <= 5) map[dateStr].afternoon.push({...activity, startLesson: 6});
                 else map[dateStr].afternoon.push(activity);
               }
            }
          }
        });
      });
    }
    return map;
  }, [plan, currentWeekDays, filterMode]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-[1200px] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200 border border-slate-200/50">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng quan kế hoạch</span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight max-w-[800px] truncate">{plan.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50/30">
          
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Giáo viên thực hiện</span>
              <span className="text-sm font-black text-slate-800 break-words">{plan.teacherName}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Khoa</span>
              <span className="text-sm font-black text-slate-800 break-words">{getDeptName(plan.departmentId)}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Địa điểm</span>
              <span className="text-sm font-black text-slate-800 break-words line-clamp-2">
                 {Array.from(new Set((plan.items || []).filter((i: any) => i.dia_diem).map((i: any) => i.dia_diem))).join(', ') || 'Chưa xác định'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái</span>
              <span className="text-sm font-black break-words">
                  {isDat(plan) ? <span className="text-green-600">Đã đạt yêu cầu</span> :
                   isChuaDat(plan) ? <span className="text-red-500">Chưa đạt yêu cầu</span> :
                   <span className="text-blue-500">Đang tiến hành</span>}
              </span>
            </div>
          </div>

          {/* Mini Calendar Schedule */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
             {/* Calendar Header with Navigation and Filters */}
             <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-1.5 items-center bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-[800px]">
                  {monthWeeks.map((w, idx) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWeekIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-max ${
                        selectedWeekIndex === idx 
                          ? 'bg-primary text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <span className="pl-3 pr-2 py-1 text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><Filter size={14}/> Lọc:</span>
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                  >Tất cả</button>
                  <button
                    onClick={() => setFilterMode('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'completed' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >Đã hoàn thành</button>
                  <button
                    onClick={() => setFilterMode('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'pending' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >Chưa hoàn thành</button>
                </div>
             </div>

             {/* Grid layout similar to PlanSchedule */}
             <div className="flex flex-col flex-1 pb-4 px-4 overflow-x-auto">
               <div className="min-w-[800px] w-full">
                  <div className="flex border-b border-slate-200 border-x mt-4 rounded-t-xl bg-slate-50 overflow-hidden">
                    <div className="w-24 shrink-0 border-r border-slate-200 p-2 flex items-center justify-center">
                      <span className="text-[10px] font-black uppercase text-slate-400">Buổi \ Ngày</span>
                    </div>
                    {currentWeekDays.map(d => {
                      const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
                      const isOtherMonth = d.month !== plan.month;
                      
                      return(
                      <div key={d.dateStr} className={`relative flex-1 w-0 min-w-[100px] border-r border-slate-200 last:border-r-0 p-2 flex flex-col items-center justify-center ${isToday ? 'bg-red-500' : isOtherMonth ? 'bg-slate-100/50' : 'bg-transparent'}`}>
                        {isToday && <div className="absolute inset-0 border-x-2 border-t-2 border-red-500 pointer-events-none z-20" style={{ marginBottom: '-1px' }}></div>}
                        <div className={`text-sm font-extrabold text-center flex flex-col items-center gap-0.5 ${isToday ? 'text-white' : 'text-slate-800'}`}>
                          <span className={isToday ? 'text-red-100' : isOtherMonth ? 'text-slate-400' : 'text-slate-500'}>{getDayName(d.dayOfWeek)}</span>
                          <span className={isOtherMonth && !isToday ? 'text-slate-400' : ''}>{d.dayNumber}/{d.month}</span>
                        </div>
                      </div>
                    )})}
                  </div>

                  {/* Morning */}
                  <div className="flex border-b border-slate-200 border-x min-h-[150px]">
                    <div className="w-24 shrink-0 border-r border-slate-200 bg-amber-50/30 flex flex-col items-center justify-center p-2">
                       <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 font-black flex items-center justify-center text-xs">SÁNG</span>
                    </div>
                    {currentWeekDays.map(d => {
                      const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
                      const isOtherMonth = d.month !== plan.month;
                      
                      return (
                      <div key={`m-${d.dateStr}`} className={`relative flex-1 w-0 min-w-[100px] border-r border-slate-200 last:border-r-0 p-2 ${isOtherMonth && !isToday ? 'bg-slate-50/30' : ''}`}>
                        {isToday && <div className="absolute inset-0 border-x-2 border-red-500 pointer-events-none z-20" style={{ marginTop: '-1px', marginBottom: '-1px' }}></div>}
                        <div className="flex flex-col gap-2 content-start items-stretch h-full w-full">
                          {scheduleMap[d.dateStr]?.morning.map((act, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                onSelectPlan(plan);
                              }}
                              className={`p-2 lg:p-2.5 rounded-lg border shadow-sm flex flex-col gap-1 cursor-pointer hover:-translate-y-0.5 transition-transform w-full ${act.isCompleted ? 'bg-green-100 border-green-300' : 'bg-blue-50 border-blue-200'}`}
                            >
                              <p className={`text-[13px] font-bold leading-tight break-words ${
                                act.isCompleted ? 'text-green-900' : 'text-blue-900'
                              }`} title={act.planTitle}>{act.planTitle}</p>
                              
                              <div className={`text-xs font-semibold mt-1 flex flex-col gap-0.5 ${
                                act.isCompleted ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                <span>🕒 Tiết: {act.startLesson} - {Math.min(5, act.endLesson)}</span>
                                
                                {(() => {
                                  const locs = Array.from(new Set((plan.items || []).filter((x: any) => x.dia_diem).map((x: any) => x.dia_diem))).join(', ');
                                  return locs ? (
                                    <span className="truncate" title={locs}>📍 Phòng: {locs}</span>
                                  ) : null;
                                })()}
                                
                                <span className="truncate">👨‍🏫 GV: {act.teacherName || 'Trống'}</span>
                                <span className="truncate">🏢 Khoa: {getDeptName(plan.departmentId)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>

                  {/* Afternoon */}
                  <div className="flex border-b border-slate-200 border-x rounded-b-xl min-h-[150px]">
                    <div className="w-24 shrink-0 border-r border-slate-200 bg-indigo-50/30 flex flex-col items-center justify-center p-2">
                       <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-black flex items-center justify-center text-xs">CHIỀU</span>
                    </div>
                    {currentWeekDays.map(d => {
                      const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
                      const isOtherMonth = d.month !== plan.month;
                      
                      return (
                      <div key={`a-${d.dateStr}`} className={`relative flex-1 w-0 min-w-[100px] border-r border-slate-200 last:border-r-0 p-2 ${isOtherMonth && !isToday ? 'bg-slate-50/30' : ''}`}>
                        {isToday && <div className="absolute inset-0 border-x-2 border-b-2 border-red-500 pointer-events-none rounded-b-xl z-20" style={{ marginTop: '-1px' }}></div>}
                        <div className="flex flex-col gap-2 content-start items-stretch h-full w-full">
                          {scheduleMap[d.dateStr]?.afternoon.map((act, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                onSelectPlan(plan);
                              }}
                              className={`p-2 lg:p-2.5 rounded-lg border shadow-sm flex flex-col gap-1 cursor-pointer hover:-translate-y-0.5 transition-transform w-full ${act.isCompleted ? 'bg-green-100 border-green-300' : 'bg-blue-50 border-blue-200'}`}
                            >
                              <p className={`text-[13px] font-bold leading-tight break-words ${
                                act.isCompleted ? 'text-green-900' : 'text-blue-900'
                              }`} title={act.planTitle}>{act.planTitle}</p>
                              
                              <div className={`text-xs font-semibold mt-1 flex flex-col gap-0.5 ${
                                act.isCompleted ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                <span>🕒 Tiết: {Math.max(6, act.startLesson)} - {act.endLesson}</span>
                                
                                {(() => {
                                  const locs = Array.from(new Set((plan.items || []).filter((x: any) => x.dia_diem).map((x: any) => x.dia_diem))).join(', ');
                                  return locs ? (
                                    <span className="truncate" title={locs}>📍 Phòng: {locs}</span>
                                  ) : null;
                                })()}
                                
                                <span className="truncate">👨‍🏫 GV: {act.teacherName || 'Trống'}</span>
                                <span className="truncate">🏢 Khoa: {getDeptName(plan.departmentId)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
               </div>
             </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button 
            onClick={() => {
              if (window.confirm("Bạn có chắc chắn muốn xóa kế hoạch này?")) {
                deletePlan(plan.id);
                onClose();
              }
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors text-sm flex items-center gap-2 mr-auto"
          >
            <Trash2 size={16} />
            Xóa
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
          >
            Đóng
          </button>
          {(plan as any).evaluation === 'DAT' && !(plan as any).auditLogs?.some((l: any) => l.comment === 'BGH đã nghiệm thu kết quả') && !(plan as any).auditLogs?.some((l: any) => l.comment === 'BGH đã nghiệm thu kết quả tháng') && (
            <button
              onClick={() => {
                onApprove();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 text-sm"
            >
              <CheckCheck size={18} />
              Nghiệm thu
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


const Summary: React.FC<SummaryProps> = ({ onSelectPlan }) => {
  const { plans, updatePlanStatus, api } = useAppStore();
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Compute available months from plans
  const availableMonthOptions = useMemo(() => {
    const months = Array.from(new Set(
      plans.filter(p => p.month && p.year).map(p => `${p.month}/${p.year}`)
    )).sort((a, b) => {
      const [ma, ya] = a.split('/').map(Number);
      const [mb, yb] = b.split('/').map(Number);
      return (yb * 12 + mb) - (ya * 12 + ma);
    });
    return months;
  }, [plans]);

  // Default to current month
  const _now = new Date();
  const _defaultMonthStr = `${_now.getMonth() + 1}/${_now.getFullYear()}`;
  const [filterMonthStr, setFilterMonthStr] = useState<string>(
    availableMonthOptions.length > 0 ? availableMonthOptions[0] : _defaultMonthStr
  );
  const [filterDept, setFilterDept] = useState<string>('ALL');
  
  const [selectedPlanModal, setSelectedPlanModal] = useState<Plan | null>(null);

  const [filterMonth, filterYear] = useMemo(() => {
    const parts = filterMonthStr.split('/');
    return [parseInt(parts[0]), parseInt(parts[1])];
  }, [filterMonthStr]);

  useEffect(() => {
    api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
    api.get('/users/active').then((res: any) => setUsers(res.data)).catch(console.error);
  }, []);

  // Include ALL plans except DRAFT, so we can show "Đang tiến hành"
  const summaryPlans = plans.filter(p => !['DRAFT', 'DEPT_REJECTED_PHASE1'].includes(p.status));

  const filteredPlans = summaryPlans.filter(p => {
    // Filter by selected month and year
    if (filterMonth && filterYear) {
      if (p.month !== filterMonth || p.year !== filterYear) return false;
    }
    if (filterDept !== 'ALL' && p.departmentId.toString() !== filterDept) return false;
    return true;
  });

  const datPlans = filteredPlans.filter(isDat);

  const handleApproveAllDat = () => {
    datPlans.forEach(plan => {
      updatePlanStatus(plan.id, 'ACCEPTED_TO_BGH', 'BGH đã nghiệm thu kết quả tháng');
    });
  };

  const handleApproveSingle = (plan: Plan) => {
    updatePlanStatus(plan.id, 'ACCEPTED_TO_BGH', 'BGH đã nghiệm thu kết quả');
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="page-title">Tổng hợp Nghiệm thu</h2>
          <p className="page-subtitle">Xem và nghiệm thu kết quả thực hành của các kế hoạch sau khi Trưởng khoa đánh giá.</p>
        </div>
        
        <div className="flex gap-3 items-center flex-wrap">
          {/* Month selector */}
          <CustomSelect
            value={filterMonthStr}
            onChange={(val) => setFilterMonthStr(String(val))}
            options={[
              ...availableMonthOptions.map(m => ({ value: m, label: `Tháng ${m}` })),
              // If current month not in list yet, add it
              ...(_defaultMonthStr && !availableMonthOptions.includes(_defaultMonthStr)
                ? [{ value: _defaultMonthStr, label: `Tháng ${_defaultMonthStr}` }]
                : []
              )
            ]}
            minWidth="160px"
          />
          <CustomSelect
            value={filterDept}
            onChange={(val) => setFilterDept(String(val))}
            options={[
              { value: 'ALL', label: 'Tất cả Khoa' },
              ...departments.map((d: any) => ({ value: d.id, label: d.name }))
            ]}
            minWidth="160px"
          />
          
          <button 
            onClick={handleApproveAllDat}
            disabled={datPlans.length === 0}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all ml-2 ${datPlans.length > 0 ? 'bg-green-600 text-white hover:opacity-90' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <CheckCheck size={16} /> Duyệt tất cả "Đạt" ({datPlans.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
           <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
             <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
               <FileText size={24} />
             </div>
             <h3 className="text-lg font-black text-navy mb-2">Chưa có dữ liệu tổng hợp</h3>
             <p className="text-slate-500 max-w-md mx-auto font-medium">Hiện tại không có kế hoạch nào khớp với bộ lọc hiện tại.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlans.map(plan => {
              const dat = isDat(plan);
              const chuaDat = isChuaDat(plan);
              const inProgress = !dat && !chuaDat;

              const teacher = users.find(u => u.id === plan.teacherId);
              const teacherRole = teacher?.role === 'DEPT_HEAD' ? 'Trưởng khoa' : 'Giảng viên';
              const avatarUrl = teacher?.avatar ? (teacher.avatar.startsWith('http') ? teacher.avatar : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/storage/${teacher.avatar}`) : null;

              const chuDeList = Array.from(new Set((plan.items || []).filter((i: any) => i.chu_de).map((i: any) => i.chu_de)));
              const displayTopic = chuDeList.length > 0 ? chuDeList.join(', ') : 'Chưa có chủ đề';
              
              const totalKh = (plan.weeks || []).reduce((sum: number, w: any) => sum + Number(w.plannedHours || 0), 0);
              const totalTh = (plan.weeks || []).reduce((sum: number, w: any) => sum + Number(w.actualHours || 0), 0);

              return (
                <div 
                  key={plan.id} 
                  onClick={() => setSelectedPlanModal(plan)}
                  className={`bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-row gap-4 justify-start items-stretch min-h-[140px]
                     ${dat ? 'border-green-200 hover:border-green-300' : chuaDat ? 'border-red-200 hover:border-red-300' : 'border-blue-200 hover:border-blue-300'}`}
                >
                  {/* Left Side: Avatar and Name */}
                  <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-4 min-w-[130px] w-[130px] shrink-0 gap-2">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 shrink-0 shadow-sm relative overflow-hidden">
                      {avatarUrl ? (
                         <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                         <User size={26} />
                      )}
                    </div>
                    <p className="text-[14px] font-bold text-slate-700 text-center leading-tight line-clamp-2 mt-1">
                      {plan.teacherName}
                    </p>
                    <p className="text-[12px] font-medium text-slate-500 text-center uppercase tracking-wide">
                      {teacherRole}
                    </p>
                  </div>

                  {/* Right Side: Title and Status */}
                  <div className="flex flex-col flex-1 py-1 flex-grow overflow-hidden">
                    <h3 className="font-extrabold text-slate-800 text-[16px] leading-snug line-clamp-2 mb-1">
                      {plan.title.trim() || `Kế hoạch công tác tháng ${plan.month}/${plan.year}`}
                    </h3>
                    
                    <p className="text-[13px] text-slate-600 font-medium line-clamp-1 mb-2">
                      <span className="text-slate-400 mr-1">Nội dung:</span> {displayTopic}
                    </p>
                    
                    <div className="flex flex-col gap-0.5 mt-auto mb-3">
                      <p className="text-[13px] font-semibold text-slate-700">
                         Số giờ đã thực hiện: <span className="text-indigo-600 ml-1">{totalTh}</span>
                      </p>
                      <p className="text-[13px] font-semibold text-slate-700">
                         Số giờ kế hoạch: <span className="text-emerald-600 ml-1">{totalKh}</span>
                      </p>
                    </div>

                    <div className="mt-auto">
                      {dat && <span className="inline-block px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[13px] font-bold border border-green-200 w-full md:w-max text-center">Đã đạt yêu cầu</span>}
                      {chuaDat && <span className="inline-block px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-[13px] font-bold border border-red-200 w-full md:w-max text-center">Chưa đạt yêu cầu</span>}
                      {inProgress && <span className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[13px] font-bold border border-blue-200 w-full md:w-max text-center">Đang tiến hành</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedPlanModal && (
        <SummaryModal 
          plan={selectedPlanModal} 
          onClose={() => setSelectedPlanModal(null)} 
          onApprove={() => handleApproveSingle(selectedPlanModal)}
          getDeptName={(id) => departments.find(d => d.id == id)?.name || `Khoa ${id}`}
          onSelectPlan={onSelectPlan}
        />
      )}
    </div>
  );
};

export default Summary;
