import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import FilePreview from './FilePreview';
import { Calendar, Filter, ChevronLeft, ChevronRight, X, Download, CheckCircle2, FileText, Check, CalendarClock, ArrowRightLeft } from 'lucide-react';
import CustomSelect from './CustomSelect';

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

const PlanSchedule = () => {
  const { plans, currentUser } = useAppStore();
  const [departments, setDepartments] = useState<any[]>([]);
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => today.getFullYear());
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const monthWeeks = useMemo(() => getCalendarWeeks(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    const weeks = getCalendarWeeks(today.getFullYear(), today.getMonth() + 1);
    const now = new Date();
    now.setHours(0,0,0,0);
    const idx = weeks.findIndex(w => w.days.some(d => d.getTime() === now.getTime()));
    return idx !== -1 ? idx : 0;
  });

  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<any>(null);
  const [previewingFile, setPreviewingFile] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reschedule form state
  const [rescheduleTarget, setRescheduleTarget] = useState<{ plan: any, weekId: string } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleRoom, setRescheduleRoom] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  // Filter plans based on the selected criteria
  // For the schedule, we probably want to see all actively planned things, but let's just get everything that is matched.
  const isRestrictedDept = Boolean(currentUser && ['TEACHER', 'DEPT_HEAD'].includes(currentUser.role));

  useEffect(() => {
    if (isRestrictedDept && currentUser?.departmentId) {
      setSelectedDeptId(currentUser.departmentId.toString());
    }
  }, [isRestrictedDept, currentUser]);

  const relevantPlans = useMemo(() => {
    return plans.filter(p => {
      // Hard Role-based check
      if (isRestrictedDept) {
        if (p.departmentId?.toString() !== currentUser?.departmentId?.toString()) {
          return false;
        }
      }

      // Must match department filter
      if (selectedDeptId !== 'all' && p.departmentId?.toString() !== selectedDeptId?.toString()) return false;
      return true;
    });
  }, [plans, selectedDeptId, currentUser, isRestrictedDept]);

  // Build a map of activities by date and session (morning/afternoon)
  // map['YYYY-MM-DD']['morning' | 'afternoon'] = [activities]
  const scheduleMap = useMemo(() => {
    const map: Record<string, { morning: any[], afternoon: any[] }> = {};
    
    currentWeekDays.forEach(d => {
      map[d.dateStr] = { morning: [], afternoon: [] };
    });

    relevantPlans.forEach(plan => {
      if (!plan.weeks) return;
      
      plan.weeks.forEach(week => {
        if (!week.date) return;
        const dates = week.date.split(',').map((d: string) => d.trim());
        
        dates.forEach((dateStr: string) => {
          if (map[dateStr]) {
            const startLesson = week.startLesson || 1;
            const endLesson = week.endLesson || 1; 
            
            const chuDeList = Array.from(new Set((plan.items || []).filter((i: any) => i.chu_de).map((i: any) => i.chu_de)));
            const displayTitle = chuDeList.length > 0 ? chuDeList.join(', ') : (plan.title || `Kế hoạch ${plan.code}`);
            
            const activity = {
              planId: plan.id,
              weekId: week.id,
              weekStatus: week.weekStatus || 'PENDING',
              planTitle: displayTitle,
              teacherName: plan.teacherName,
              departmentName: plan.departmentName,
              startLesson,
              endLesson,
              fullPlan: plan,
              busyNote: week.busyNote || week.busy_note || null,
            };

            // Assuming lessons 1-5 are morning, 6-15 are afternoon
            if (startLesson <= 5) {
              map[dateStr].morning.push(activity);
            }
            if (startLesson > 5 || endLesson > 5) {
              if (startLesson > 5 || (endLesson > 5 && startLesson <= 5)) {
                 if (startLesson <= 5) {
                     map[dateStr].afternoon.push({...activity, startLesson: 6});
                 } else {
                     map[dateStr].afternoon.push(activity);
                 }
              }
            }
          }
        });
      });
    });

    return map;
  }, [relevantPlans, currentWeekDays]);

  useEffect(() => {
    // Fetch departments from API
    api.get('/departments').then(res => {
        setDepartments(res.data);
    }).catch(console.error);
  }, []);

  /**
   * Confirm a single schedule entry (week) instead of the entire plan.
   * When called with weekId, only that specific week is marked COMPLETED.
   * The backend auto-completes the plan if ALL weeks are done.
   */
  const handleMarkWeekCompleted = async (plan: any, weekId: string, result?: 'DAT' | 'CHUA_DAT') => {
    try {
      const comment = result === 'DAT' ? 'Đạt yêu cầu' : result === 'CHUA_DAT' ? 'Chưa đạt yêu cầu' : 'Xác nhận hoàn thành';

      // Confirm only THIS specific week/schedule entry
      const res = await api.put(`/plans/${plan.id}/weeks/${weekId}/status`, { status: 'COMPLETED', comment });

      // Update local state with the response from server
      const updatedPlanFromServer = res.data;
      const { plans: currentPlans } = useAppStore.getState();

      // Re-map the plan from server response
      const updatedPlans = currentPlans.map(p => {
        if (p.id === plan.id) {
          return {
            ...p,
            status: updatedPlanFromServer.status || p.status,
            weeks: (p.weeks || []).map((w: any) =>
              w.id === weekId
                ? { ...w, weekStatus: 'COMPLETED', status: 'COMPLETED' }
                : w
            ),
            auditLogs: [...((p as any).auditLogs || []), { comment }],
          };
        }
        return p;
      });

      useAppStore.setState({ plans: updatedPlans });

      // Update the detail modal if open
      if (selectedPlanForDetail?.id === plan.id) {
        setSelectedPlanForDetail({
          ...selectedPlanForDetail,
          status: updatedPlanFromServer.status || selectedPlanForDetail.status,
          weeks: (selectedPlanForDetail.weeks || []).map((w: any) =>
            w.id === weekId
              ? { ...w, weekStatus: 'COMPLETED', status: 'COMPLETED' }
              : w
          ),
          auditLogs: [...(selectedPlanForDetail.auditLogs || []), { comment }],
        });
      }

      setToastMessage('✅ Đã xác nhận hoàn thành lịch của ' + (plan.teacherName || 'GV'));
    } catch (err) {
      console.error('Failed to update week status', err);
      setToastMessage('❌ Có lỗi xảy ra khi xác nhận. Vui lòng thử lại.');
    }
  };

  /**
   * Reschedule a week entry — marks it as RESCHEDULED (counts as done/đạt)
   * and saves the new date, room, and note.
   */
  const handleRescheduleWeek = async () => {
    if (!rescheduleTarget) return;
    const { plan, weekId } = rescheduleTarget;

    if (!rescheduleDate) {
      setToastMessage('❌ Vui lòng chọn ngày chuyển sang.');
      return;
    }

    try {
      const res = await api.put(`/plans/${plan.id}/weeks/${weekId}/status`, {
        status: 'RESCHEDULED',
        reschedule_date: rescheduleDate,
        reschedule_room: rescheduleRoom,
        reschedule_note: rescheduleNote,
        comment: `Chuyển lịch sang ${rescheduleDate}${rescheduleRoom ? ' - Phòng: ' + rescheduleRoom : ''}`,
      });

      const updatedPlanFromServer = res.data;
      const { plans: currentPlans } = useAppStore.getState();

      const updatedPlans = currentPlans.map(p => {
        if (p.id === plan.id) {
          return {
            ...p,
            status: updatedPlanFromServer.status || p.status,
            weeks: (p.weeks || []).map((w: any) =>
              w.id === weekId
                ? { ...w, weekStatus: 'RESCHEDULED', status: 'RESCHEDULED', rescheduleDate, rescheduleRoom, rescheduleNote }
                : w
            ),
          };
        }
        return p;
      });

      useAppStore.setState({ plans: updatedPlans });

      if (selectedPlanForDetail?.id === plan.id) {
        setSelectedPlanForDetail({
          ...selectedPlanForDetail,
          status: updatedPlanFromServer.status || selectedPlanForDetail.status,
          weeks: (selectedPlanForDetail.weeks || []).map((w: any) =>
            w.id === weekId
              ? { ...w, weekStatus: 'RESCHEDULED', status: 'RESCHEDULED', rescheduleDate, rescheduleRoom, rescheduleNote }
              : w
          ),
        });
      }

      // Reset form
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleRoom('');
      setRescheduleNote('');
      setToastMessage('📅 Đã chuyển lịch thành công!');
    } catch (err) {
      console.error('Failed to reschedule', err);
      setToastMessage('❌ Có lỗi xảy ra khi chuyển lịch.');
    }
  };

  /**
   * Legacy: Confirm the entire plan at once (used for evaluation by DEPT_HEAD).
   */
  const handleMarkCompleted = async (plan: any, result?: 'DAT' | 'CHUA_DAT') => {
    try {
      const comment = result === 'DAT' ? 'Đạt yêu cầu' : result === 'CHUA_DAT' ? 'Chưa đạt yêu cầu' : 'Xác nhận hoàn thành';

      await api.put(`/plans/${plan.id}/status`, { status: 'COMPLETED', comment });

      const updatedPlans = plans.map(p => p.id === plan.id ? {
        ...p,
        status: 'COMPLETED' as any,
        evaluation: result || (p as any).evaluation,
        weeks: (p.weeks || []).map((w: any) => ({ ...w, weekStatus: 'COMPLETED', status: 'COMPLETED' })),
        auditLogs: [...((p as any).auditLogs || []), { comment }],
      } : p);

      useAppStore.setState({ plans: updatedPlans });
      setSelectedPlanForDetail({
        ...plan,
        status: 'COMPLETED',
        evaluation: result || plan.evaluation,
        weeks: (plan.weeks || []).map((w: any) => ({ ...w, weekStatus: 'COMPLETED', status: 'COMPLETED' })),
        auditLogs: [...(plan.auditLogs || []), { comment }],
      });
      setToastMessage('✅ Đã xác nhận hoàn thành kế hoạch của ' + (plan.teacherName || 'GV'));
    } catch (err) {
      console.error('Failed to update status', err);
      setToastMessage('❌ Có lỗi xảy ra khi xác nhận. Vui lòng thử lại.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative rounded-tl-3xl z-10 overflow-hidden">
      {/* Header section */}
      <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shrink-0 flex flex-col gap-4">
        <div className="flex flex-wrap lg:items-center justify-start gap-4 lg:gap-8">
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 whitespace-nowrap">
            <Calendar className="text-primary" size={24} />
            Lịch thực hiện kế hoạch
          </h1>

          <div className="flex flex-wrap items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bộ lọc:</span>
            </div>

            <div className="flex items-center gap-2">
              <CustomSelect
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(Number(val))}
                options={Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))}
                minWidth="100px"
              />
              <CustomSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                options={[2024, 2025, 2026, 2027].map(y => ({ value: y, label: `Năm ${y}` }))}
                minWidth="100px"
              />
            </div>

            <div className="w-px h-5 bg-slate-300 hidden sm:block"></div>

            <div className={isRestrictedDept ? 'opacity-80 pointer-events-none' : ''}>
              <CustomSelect
                value={selectedDeptId}
                onChange={(val) => setSelectedDeptId(String(val))}
                options={isRestrictedDept ? [
                  { value: currentUser?.departmentId?.toString() || 'all', label: currentUser?.departmentName || 'Khoa' }
                ] : [
                  { value: 'all', label: 'Tất cả khoa' },
                  ...departments.map((dept: any) => ({ value: dept.id.toString(), label: dept.name }))
                ]}
                minWidth="180px"
                className={isRestrictedDept ? 'bg-slate-50' : 'bg-transparent border-none'}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 items-center bg-slate-50/80 border border-slate-200 p-1.5 rounded-xl overflow-x-auto w-max max-w-full shadow-sm">
          {monthWeeks.map((w, idx) => (
            <button
              key={w.id}
              onClick={() => setSelectedWeekIndex(idx)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all min-w-max ${
                selectedWeekIndex === idx 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-slate-100/50 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-slate-200/50'
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="flex-1 p-2 sm:p-4 flex flex-col overflow-hidden">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-auto">
          <div className="min-w-[850px] flex flex-col flex-1 min-h-full">
            
            {/* Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 items-stretch shrink-0">
            {/* Corner Empty cell */}
            <div className="w-24 shrink-0 border-r border-slate-200 flex items-center justify-center p-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Buổi \ Ngày</span>
            </div>
            
            {/* Days row */}
            {currentWeekDays.map(d => {
              const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
              const isOtherMonth = d.month !== selectedMonth;
              
              return (
              <div key={d.dateStr} className={`relative flex-1 w-0 min-w-[110px] border-r border-slate-200 last:border-r-0 p-3 lg:p-4 flex flex-col items-center justify-center ${isToday ? 'bg-red-500' : isOtherMonth ? 'bg-slate-100/50' : 'bg-white'}`}>
                {isToday && <div className="absolute inset-0 border-x-2 border-t-2 border-red-500 pointer-events-none z-20" style={{ marginBottom: '-1px' }}></div>}
                <div className={`text-sm font-extrabold text-center flex flex-col items-center gap-0.5 ${isToday ? 'text-white' : 'text-slate-800'}`}>
                  <span className={isToday ? 'text-red-100' : isOtherMonth ? 'text-slate-400' : 'text-slate-500'}>{getDayName(d.dayOfWeek)}</span>
                  <span className={isOtherMonth && !isToday ? 'text-slate-400' : ''}>{d.dayNumber}/{d.month}</span>
                </div>
              </div>
            )})}
          </div>

            {/* Morning Row */}
            <div className="flex border-b border-slate-200 flex-1 min-h-[250px]">
              <div className="w-24 shrink-0 border-r border-slate-200 bg-amber-50/50 flex flex-col items-center justify-center p-3 gap-2">
               <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-black">
                 SÁNG
               </span>
               <span className="text-[10px] text-amber-600/70 font-bold uppercase tracking-widest text-center">Tiết 1 - 5</span>
            </div>
            {currentWeekDays.map(d => {
              const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
              const isPast = d.dateStr < todayStr;
              const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
              const isOtherMonth = d.month !== selectedMonth;
              return (
              <div key={`morning-${d.dateStr}`} className={`relative flex-1 w-0 min-w-[110px] border-r border-slate-200 last:border-r-0 p-2 lg:p-3 hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-red-50/80' : isOtherMonth ? 'bg-slate-50/30' : 'bg-white'}`}>
                {isToday && <div className="absolute inset-0 border-x-2 border-red-500 pointer-events-none z-20" style={{ marginTop: '-1px', marginBottom: '-1px' }}></div>}
                <div className="flex flex-col gap-2 content-start items-stretch h-full w-full">
                  {scheduleMap[d.dateStr]?.morning.map((act, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedPlanForDetail(act.fullPlan)}
                      className={`p-2 lg:p-2.5 rounded-lg border shadow-sm flex flex-col gap-1 hover:-translate-y-0.5 transition-transform cursor-pointer w-full ${
                        act.weekStatus === 'COMPLETED' 
                          ? 'border-green-300 bg-green-100' 
                          : act.weekStatus === 'RESCHEDULED'
                            ? 'border-orange-300 bg-orange-50'
                            : isPast
                              ? 'border-red-300 bg-red-100'
                              : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <p className={`text-[13px] font-bold leading-tight break-words ${
                        act.weekStatus === 'COMPLETED' ? 'text-green-900' : act.weekStatus === 'RESCHEDULED' ? 'text-orange-900' : isPast ? 'text-red-900' : 'text-blue-900'
                      }`} title={act.planTitle}>{act.planTitle}</p>
                      
                      <div className={`text-xs font-semibold mt-1 flex flex-col gap-0.5 ${
                        act.weekStatus === 'COMPLETED' ? 'text-green-800' : act.weekStatus === 'RESCHEDULED' ? 'text-orange-800' : isPast ? 'text-red-800' : 'text-blue-800'
                      }`}>
                        <span>🕒 Tiết: {act.startLesson} - {Math.min(5, act.endLesson)}</span>
                        
                        {(() => {
                          const locs = Array.from(new Set((act.fullPlan.items || []).filter((x: any) => x.dia_diem).map((x: any) => x.dia_diem))).join(', ');
                          return locs ? (
                            <span className="truncate" title={locs}>📍 Phòng: {locs}</span>
                          ) : null;
                        })()}
                        
                        <span className="truncate">👨‍🏫 GV: {act.teacherName || 'Trống'}</span>
                        
                        {selectedDeptId === 'all' && (
                          <span className="truncate">🏢 Khoa: {act.departmentName}</span>
                        )}
                        {act.busyNote && (
                          <span className="text-orange-600 truncate flex items-center gap-1" title={act.busyNote}>
                            <span>⚠️</span> {act.busyNote.length > 25 ? act.busyNote.slice(0, 25) + '...' : act.busyNote}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {scheduleMap[d.dateStr]?.morning.length === 0 && (
                     <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Trống</span>
                     </div>
                  )}
                </div>
              </div>
            )})}
          </div>

            {/* Afternoon Row */}
            <div className="flex flex-1 min-h-[250px]">
              <div className="w-24 shrink-0 border-r border-slate-200 bg-blue-50/50 flex flex-col items-center justify-center p-3 gap-2">
               <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                 CHIỀU
               </span>
               <span className="text-[10px] text-blue-600/70 font-bold uppercase tracking-widest text-center">Tiết 6 - 15</span>
            </div>
            {currentWeekDays.map(d => {
              const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
              const isPast = d.dateStr < todayStr;
              const isToday = d.dayNumber === today.getDate() && d.month === (today.getMonth() + 1) && d.year === today.getFullYear();
              const isOtherMonth = d.month !== selectedMonth;
              return (
              <div key={`afternoon-${d.dateStr}`} className={`relative flex-1 w-0 min-w-[110px] border-r border-slate-200 last:border-r-0 p-2 lg:p-3 hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-red-50/80' : isOtherMonth ? 'bg-slate-50/30' : 'bg-white'}`}>
                {isToday && <div className="absolute inset-0 border-x-2 border-b-2 border-red-500 pointer-events-none rounded-b-md z-20" style={{ marginTop: '-1px' }}></div>}
                <div className="flex flex-col gap-2 content-start items-stretch h-full w-full">
                  {scheduleMap[d.dateStr]?.afternoon.map((act, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedPlanForDetail(act.fullPlan)}
                      className={`p-2 lg:p-2.5 rounded-lg border shadow-sm flex flex-col gap-1 hover:-translate-y-0.5 transition-transform cursor-pointer w-full ${
                        act.weekStatus === 'COMPLETED' 
                          ? 'border-green-300 bg-green-100' 
                          : act.weekStatus === 'RESCHEDULED'
                            ? 'border-orange-300 bg-orange-50'
                            : isPast
                              ? 'border-red-300 bg-red-100'
                              : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <p className={`text-[13px] font-bold leading-tight break-words ${
                        act.weekStatus === 'COMPLETED' ? 'text-green-900' : act.weekStatus === 'RESCHEDULED' ? 'text-orange-900' : isPast ? 'text-red-900' : 'text-blue-900'
                      }`} title={act.planTitle}>{act.planTitle}</p>
                      
                      <div className={`text-xs font-semibold mt-1 flex flex-col gap-0.5 ${
                        act.weekStatus === 'COMPLETED' ? 'text-green-800' : act.weekStatus === 'RESCHEDULED' ? 'text-orange-800' : isPast ? 'text-red-800' : 'text-blue-800'
                      }`}>
                        <span>🕒 Tiết: {Math.max(6, act.startLesson)} - {act.endLesson}</span>
                        
                        {(() => {
                          const locs = Array.from(new Set((act.fullPlan.items || []).filter((x: any) => x.dia_diem).map((x: any) => x.dia_diem))).join(', ');
                          return locs ? (
                            <span className="truncate" title={locs}>📍 Phòng: {locs}</span>
                          ) : null;
                        })()}
                        
                        <span className="truncate">👨‍🏫 GV: {act.teacherName || 'Trống'}</span>
                        
                        {selectedDeptId === 'all' && (
                          <span className="truncate">🏢 Khoa: {act.departmentName}</span>
                        )}
                        {act.busyNote && (
                          <span className="text-orange-600 truncate flex items-center gap-1" title={act.busyNote}>
                            <span>⚠️</span> {act.busyNote.length > 25 ? act.busyNote.slice(0, 25) + '...' : act.busyNote}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {scheduleMap[d.dateStr]?.afternoon.length === 0 && (
                     <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Trống</span>
                     </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 bg-slate-50/80 shrink-0 flex items-center justify-start gap-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-red-100 border border-red-300 shadow-sm"></span>
            <span className="text-xs font-bold text-slate-600">Chưa hoàn thành</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-50 border border-blue-200 shadow-sm"></span>
            <span className="text-xs font-bold text-slate-600">Đang tiến hành</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-green-100 border border-green-300 shadow-sm"></span>
            <span className="text-xs font-bold text-slate-600">Đã hoàn thành</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-orange-50 border border-orange-300 shadow-sm"></span>
            <span className="text-xs font-bold text-slate-600">Đã chuyển lịch</span>
          </div>
        </div>

      </div>
    </div>

      {/* Plan Detail Modal */}
      {selectedPlanForDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200 border border-slate-200/50">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedPlanForDetail.code}</span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedPlanForDetail.title || 'Chi tiết kế hoạch'}</h2>
              </div>
              <button 
                onClick={() => setSelectedPlanForDetail(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-white">
              {/* Info grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Giáo viên thực hiện</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.teacherName || 'Trống'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Khoa</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.departmentName || 'Trống'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Địa điểm</span>
                  <span className="text-sm font-bold text-slate-800">
                    {Array.from(new Set((selectedPlanForDetail.items || [])
                      .filter((i: any) => i.dia_diem)
                      .map((i: any) => i.dia_diem)
                    )).join(', ') || 'Chưa xác định'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Chi tiết hoạt động
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-primary uppercase w-12 text-center border-r border-slate-200">TT</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase min-w-[250px] w-1/3 border-r border-slate-200">Tên chủ đề/nội dung nghiên cứu</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-r border-slate-200">Tên thiết bị</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase w-24 border-r border-slate-200">Năm sử dụng</th>
                        {selectedPlanForDetail.items?.some((i: any) => !!i.sinh_vien || i.type === 'STUDENT') && (
                          <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-r border-slate-200">Sinh viên thực hiện</th>
                        )}
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase min-w-[200px] w-1/3">Kết quả đạt được</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(() => {
                        const validItems = (selectedPlanForDetail.items || []).filter((item: any) => {
                          const isBlank = !item.chu_de && !item.topic && !item.ket_qua && !item.expectedResult && !item.sinh_vien;
                          const ketQuaStr = String(item.ket_qua || item.expectedResult || item.expected_result || '');
                          const isGarbageStr = ketQuaStr.includes('{"tableType":"student"') || ketQuaStr.includes('{"tableType":"teacher"');
                          return !isBlank && !isGarbageStr;
                        });

                        if (validItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
                                Không có nội dung chi tiết
                              </td>
                            </tr>
                          );
                        }

                        return validItems.map((item: any, i: number) => {
                          let ketQua = item.ket_qua || item.expectedResult || item.expected_result;
                          if (typeof ketQua === 'string' && ketQua.startsWith('{') && ketQua.endsWith('}')) ketQua = '-';

                          return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors align-top border-b border-slate-100">
                              <td className="px-4 py-3 text-sm font-bold text-slate-400 text-center border-r border-slate-200">{i + 1}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-800 break-words border-r border-slate-200">{item.chu_de || item.topic || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-600 border-r border-slate-200">{item.ten_thiet_bi || '-'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-600 text-center border-r border-slate-200">{item.nam_su_dung || '-'}</td>
                              {selectedPlanForDetail.items?.some((x: any) => !!x.sinh_vien || x.type === 'STUDENT') && (
                                <td className="px-4 py-3 text-sm font-semibold text-slate-600 border-r border-slate-200">{item.sinh_vien || '-'}</td>
                              )}
                              <td className="px-4 py-3 text-sm font-semibold text-slate-600 whitespace-pre-wrap break-words">{ketQua || '-'}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attachments */}
              {selectedPlanForDetail.attachments && selectedPlanForDetail.attachments.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tài liệu đính kèm</h3>
                  <div className="flex flex-col gap-2">
                    {selectedPlanForDetail.attachments.map((file: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => setPreviewingFile(file)}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <FileText size={18} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{file.original_name || file.name}</span>
                        </div>
                        <Download size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-Week Schedule Confirmation */}
              {selectedPlanForDetail.weeks && selectedPlanForDetail.weeks.length > 0 && (
                <div className="flex flex-col gap-3 py-2 border-t border-slate-100 mt-2 pt-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" />
                    Xác nhận từng lịch
                  </h3>
                  <div className="flex flex-col gap-2">
                    {selectedPlanForDetail.weeks.map((week: any, idx: number) => {
                      const wStatus = week.weekStatus || week.status || 'PENDING';
                      const isWeekDone = wStatus === 'COMPLETED' || wStatus === 'RESCHEDULED';
                      const isRescheduled = wStatus === 'RESCHEDULED';
                      const weekDate = week.date || '';
                      const weekLabel = week.weekLabel || week.week_label || '';
                      let parsedLabel: any = {};
                      if (typeof weekLabel === 'string' && weekLabel.startsWith('{')) {
                        try { parsedLabel = JSON.parse(weekLabel); } catch (e) {}
                      }
                      const displayDate = parsedLabel.date || weekDate || `Tuần ${idx + 1}`;
                      const displayTime = parsedLabel.startLesson 
                        ? `Tiết ${parsedLabel.startLesson}-${parsedLabel.endLesson}` 
                        : (week.startLesson ? `Tiết ${week.startLesson}-${week.endLesson}` : '');

                      return (
                        <div key={week.id || idx} className={`p-3 rounded-xl border ${
                          wStatus === 'COMPLETED' ? 'border-green-200 bg-green-50' 
                          : isRescheduled ? 'border-orange-200 bg-orange-50' 
                          : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                wStatus === 'COMPLETED' ? 'bg-green-100 text-green-600' 
                                : isRescheduled ? 'bg-orange-100 text-orange-600'
                                : 'bg-slate-100 text-slate-400'
                              }`}>
                                {wStatus === 'COMPLETED' ? <Check size={16} strokeWidth={3} /> 
                                : isRescheduled ? <ArrowRightLeft size={14} strokeWidth={2.5} />
                                : <span className="text-xs font-bold">{idx + 1}</span>}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{displayDate}</span>
                                {displayTime && <span className="text-xs text-slate-500">{displayTime}</span>}
                              </div>
                            </div>
                            {wStatus === 'COMPLETED' ? (
                              <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">✅ Đã hoàn thành</span>
                            ) : isRescheduled ? (
                              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg">📅 Đã chuyển lịch</span>
                            ) : (
                              currentUser?.role === 'TEACHER' && currentUser?.id === selectedPlanForDetail.teacherId ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleMarkWeekCompleted(selectedPlanForDetail, week.id)}
                                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-green-500 hover:bg-green-600 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 size={13} />
                                    Xác nhận
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRescheduleTarget({ plan: selectedPlanForDetail, weekId: week.id });
                                      setRescheduleDate('');
                                      setRescheduleRoom('');
                                      setRescheduleNote('');
                                    }}
                                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all flex items-center gap-1.5"
                                  >
                                    <ArrowRightLeft size={13} />
                                    Chuyển lịch
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">Chưa hoàn thành</span>
                              )
                            )}
                          </div>
                          {/* Show reschedule info */}
                          {isRescheduled && (
                            <div className="mt-2 pl-11 flex flex-col gap-0.5 text-xs text-orange-700">
                              {(week.rescheduleDate || week.reschedule_date) && (
                                <span>📅 Chuyển sang: <strong>{week.rescheduleDate || week.reschedule_date}</strong></span>
                              )}
                              {(week.rescheduleRoom || week.reschedule_room) && (
                                <span>🏠 Phòng: <strong>{week.rescheduleRoom || week.reschedule_room}</strong></span>
                              )}
                              {(week.rescheduleNote || week.reschedule_note) && (
                                <span>📝 Ghi chú: {week.rescheduleNote || week.reschedule_note}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evaluation Result Area */}
              {selectedPlanForDetail.status === 'COMPLETED' && (
                <div className="flex flex-col gap-3 py-2 border-t border-slate-100 mt-2 pt-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kết quả đánh giá</h3>
                  
                  {/* Evaluated State */}
                  {(selectedPlanForDetail.evaluation || (selectedPlanForDetail.auditLogs && selectedPlanForDetail.auditLogs.some((l: any) => l.comment === 'Đạt yêu cầu' || l.comment === 'Chưa đạt yêu cầu'))) ? (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                      {selectedPlanForDetail.evaluation === 'DAT' || (selectedPlanForDetail.auditLogs && selectedPlanForDetail.auditLogs.some((l: any) => l.comment === 'Đạt yêu cầu')) ? (
                         <><div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={16} strokeWidth={3} /></div><span className="text-sm font-bold text-green-700">Đạt yêu cầu</span></>
                      ) : (
                         <><div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><X size={16} strokeWidth={3} /></div><span className="text-sm font-bold text-red-700">Chưa đạt yêu cầu</span></>
                      )}
                    </div>
                  ) : (
                    /* Not Evaluated State */
                    (currentUser?.role === 'DEPT_HEAD' && currentUser?.departmentId === selectedPlanForDetail.departmentId) ? (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 flex flex-col gap-3">
                        <span className="text-sm font-bold text-amber-800">Trưởng khoa cần tạo đánh giá cho kế hoạch này:</span>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleMarkCompleted(selectedPlanForDetail, 'DAT')}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Check size={18} strokeWidth={3} /> Đạt yêu cầu
                          </button>
                          <button
                            onClick={() => handleMarkCompleted(selectedPlanForDetail, 'CHUA_DAT')}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <X size={18} strokeWidth={3} /> Không đạt yêu cầu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center"><FileText size={16} /></div>
                        <span className="text-sm font-bold text-slate-600">Trưởng khoa chưa đánh giá</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

          {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3 rounded-b-3xl shrink-0">
              <button
                onClick={() => setSelectedPlanForDetail(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors mr-auto"
              >
                Đóng
              </button>
              
              {(() => {
                const totalWeeks = (selectedPlanForDetail.weeks || []).length;
                const doneWeeks = (selectedPlanForDetail.weeks || []).filter((w: any) => {
                  const s = w.weekStatus || w.status || 'PENDING';
                  return s === 'COMPLETED' || s === 'RESCHEDULED';
                }).length;
                const allDone = totalWeeks > 0 && doneWeeks === totalWeeks;
                
                if (selectedPlanForDetail.status === 'COMPLETED' || allDone) {
                  return (
                    <div className="px-6 py-2.5 rounded-xl font-bold bg-green-100 text-green-700 flex items-center gap-2 border border-green-200">
                      <Check size={18} />
                      Kế hoạch đã hoàn thành ({doneWeeks}/{totalWeeks} lịch)
                    </div>
                  );
                } else if (totalWeeks > 0) {
                  return (
                    <div className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Đã xử lý {doneWeeks}/{totalWeeks} lịch
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Form Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <ArrowRightLeft size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-black text-navy">Chuyển lịch</h3>
              </div>
              <button 
                onClick={() => setRescheduleTarget(null)} 
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  📅 Ngày chuyển sang <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  🏠 Phòng thực hiện
                </label>
                <input
                  type="text"
                  placeholder="VD: A201, B305..."
                  value={rescheduleRoom}
                  onChange={e => setRescheduleRoom(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  📝 Ghi chú / Lý do chuyển
                </label>
                <textarea
                  rows={3}
                  placeholder="Lý do bận, ghi chú thêm..."
                  value={rescheduleNote}
                  onChange={e => setRescheduleNote(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-orange-300 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setRescheduleTarget(null)} 
                className="flex-1 py-3 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRescheduleWeek}
                disabled={!rescheduleDate}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-40 shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CalendarClock size={16} />
                Xác nhận chuyển lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen File Preview Overlay */}
      {previewingFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-full flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-navy truncate flex-1">{previewingFile.original_name || previewingFile.name}</h3>
              <button 
                onClick={() => setPreviewingFile(null)} 
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-100 transition-colors text-zinc-500 shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full bg-zinc-200 min-h-0 overflow-hidden relative"> 
              <FilePreview filePath={previewingFile.path} fileName={previewingFile.original_name || previewingFile.name} />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-24 right-10 z-[200] border shadow-2xl px-6 py-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-300 ${
          toastMessage.startsWith('✅') || toastMessage.startsWith('📅')
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${
            toastMessage.startsWith('✅') || toastMessage.startsWith('📅') ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {toastMessage.startsWith('✅') ? '✅' : toastMessage.startsWith('📅') ? '📅' : <X size={20} className="text-red-500" />}
          </div>
          <span className={`font-bold text-sm ${toastMessage.startsWith('✅') || toastMessage.startsWith('📅') ? 'text-green-700' : 'text-red-700'}`}>
            {toastMessage.replace(/^[✅❌📅]\s*/, '')}
          </span>
        </div>
      )}
    </div>
  );
};

export default PlanSchedule;
