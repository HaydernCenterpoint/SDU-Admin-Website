import React, { useState, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { TeacherProfileModal } from './TeacherProfileModal';
import { exportReportToDocx, exportReportToPdf, printReportBrowser, exportReportToXlsx } from '../utils/qcExportHelper';
import { Calendar, Filter, Users, MapPin, Printer, FileDown, FileText, CheckCircle, XCircle, UsersRound, TrendingUp, BarChart3, AlertTriangle, CalendarDays } from 'lucide-react';
import CustomSelect from './CustomSelect';

const QCPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('HK2-2025');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const { plans, fetchPlans } = useAppStore();

  useEffect(() => {
    api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
    api.get('/users/active').then((res: any) => setUsers(res.data)).catch(console.error);
    fetchPlans();
  }, [fetchPlans]);

  const mockDepts = [
    { id: 'd1', name: 'Khoa Công nghệ thông tin' },
    { id: 'd2', name: 'Khoa May và Thời trang' },
    { id: 'd3', name: 'Khoa Cơ khí' },
    { id: 'd4', name: 'Khoa Điện' },
    { id: 'd5', name: 'Khoa Ô tô' }
  ];

  const actualDepts = (departments.length > 0 ? departments : mockDepts)
    .filter(dept => dept.name.toLowerCase().includes('khoa') && !dept.name.toLowerCase().includes('quản lý'));
  const reportableDeptIds = new Set(actualDepts.map(dept => dept.id.toString()));
  const reportableDeptNames = new Set(actualDepts.map(dept => dept.name));
  const reportableUsers = users.filter(user => {
    const departmentId = (user.departmentId ?? user.department_id)?.toString();
    const departmentName = user.department?.name || '';
    
    const isExcluded = user.role === 'DEPT_HEAD' || user.role === 'QC' || user.role === 'BOARD' || user.role === 'ADMIN';
    
    return !isExcluded && (
      reportableDeptIds.has(departmentId || '') || reportableDeptNames.has(departmentName)
    );
  });
  const reportableUserIds = new Set(reportableUsers.map(user => user.id?.toString()));
  const getDepartmentUsers = (dept: any) => reportableUsers.filter(
    user => user.department?.name === dept.name || (user.departmentId ?? user.department_id)?.toString() === dept.id.toString()
  );
  const displayDepartments = selectedDeptId === 'ALL'
    ? actualDepts
    : [actualDepts.find(d => d.id.toString() === selectedDeptId.toString()) || { id: 'unknown', name: 'Khoa (Không xác định)' }];

  const generateExportData = (targetMonth: number) => {
    // keeping old logic for exporting
    return displayDepartments.map(dept => {
      const deptUsers = getDepartmentUsers(dept);
      const rows = deptUsers.map(user => {
        const userPlans = plans.filter(
          p => p.teacherId?.toString() === user.id?.toString() && p.month === targetMonth && p.status !== 'DRAFT'
        );
        const kh = [0, 0, 0, 0, 0];
        const th = [0, 0, 0, 0, 0];
        userPlans.forEach(plan => {
          const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(plan.status || '');
          plan.weeks?.forEach((week: any, idx: number) => {
            if (idx < 5) {
              const planned = Number(week.plannedHours || 0);
              kh[idx] += planned;
              if (isCompleted) th[idx] += planned;
            }
          });
        });
        return {
          teacherName: user.name,
          th, kh, 
          totalKh: kh.reduce((a,b)=>a+b,0),
          totalTh: th.reduce((a,b)=>a+b,0),
          ghiChu: ''
        };
      });
      return { name: dept.name, rows: rows };
    });
  };

  // ----- Analytics Computation -----
  const validPlans = plans.filter(p => p.status !== 'DRAFT'); // Filter out drafts for QC/Board
  
  const matchSemester = (p: any, semester: string) => {
    if (semester === 'ALL') return true;
    if (semester === 'HK1-2024') {
      return (p.year === 2024 && [9, 10, 11, 12].includes(p.month)) ||
             (p.year === 2025 && p.month === 1);
    }
    if (semester === 'HK2-2024') {
      return p.year === 2025 && [2, 3, 4, 5, 6, 7].includes(p.month);
    }
    if (semester === 'HK1-2025') {
      return (p.year === 2025 && [9, 10, 11, 12].includes(p.month)) ||
             (p.year === 2026 && p.month === 1);
    }
    if (semester === 'HK2-2025') {
      return p.year === 2026 && [2, 3, 4, 5, 6, 7].includes(p.month);
    }
    return true;
  };

  // In a real app, semester would map to months. For demo, we just apply the month / dept filters.
  const filteredPlans = validPlans.filter(p => {
    const matchMonth = selectedMonth === 0 || p.month === selectedMonth;
    const matchDept = selectedDeptId === 'ALL' || p.departmentId?.toString() === selectedDeptId;
    const matchUser = reportableUserIds.has(p.teacherId?.toString());
    const matchSem = matchSemester(p, selectedSemester);
    return matchMonth && matchDept && matchUser && matchSem;
  });

  // Calculate stats for PREVIOUS month for trends
  const prevMonth = selectedMonth === 0 ? 0 : (selectedMonth === 1 ? 12 : selectedMonth - 1);
  const prevFilteredPlans = validPlans.filter(p => {
    const prevMatches = prevMonth === 0 || p.month === prevMonth;
    const deptMatches = selectedDeptId === 'ALL' || p.departmentId?.toString() === selectedDeptId;
    const userMatches = reportableUserIds.has(p.teacherId?.toString());
    const matchSem = matchSemester(p, selectedSemester);
    // Basic year handling for demo if switching Jan to Dec
    return prevMatches && deptMatches && userMatches && matchSem && (selectedMonth !== 1 || (selectedMonth === 1 && p.year === new Date().getFullYear() - 1));
  });

  const totalPlans = filteredPlans.length;
  const prevTotalPlans = prevFilteredPlans.length;
  const planDelta = totalPlans - prevTotalPlans;

  const phase1Approved = filteredPlans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status)).length;
  const prevPhase1Approved = prevFilteredPlans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status)).length;
  
  const phase2Approved = filteredPlans.filter(p => p.status === 'ACCEPTED_TO_BGH').length;
  
  const reportingPlans = filteredPlans.filter(p => p.status === 'REPORT_SUBMITTED').length;
  const prevReportingPlans = prevFilteredPlans.filter(p => p.status === 'REPORT_SUBMITTED').length;
  const reportingDelta = reportingPlans - prevReportingPlans;

  const rejectedPlans = filteredPlans.filter(p => ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(p.status)).length;
  const prevRejectedPlans = prevFilteredPlans.filter(p => ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(p.status)).length;
  const rejectedDelta = rejectedPlans - prevRejectedPlans;

  const phase1Rate = totalPlans ? Math.round((phase1Approved/totalPlans)*100) : 0;
  const prevPhase1Rate = prevTotalPlans ? Math.round((prevPhase1Approved/prevTotalPlans)*100) : 0;
  const rateDelta = phase1Rate - prevPhase1Rate;

  const phase2Rate = totalPlans ? Math.round((phase2Approved/totalPlans)*100) : 0;
  
  // For Bar Chart: department workloads
  const deptWorkloads = actualDepts.map(dept => {
      let deptKh = 0; let deptTh = 0; let deptDt = 0;
      const deptPlans = filteredPlans.filter(p => p.departmentId?.toString() === dept.id.toString());
      deptPlans.forEach(plan => {
          const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(plan.status || '');
          const isRejected = ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(plan.status || '');
          plan.weeks?.forEach((week: any) => {
              const p = Number(week.plannedHours || 0);
              deptKh += p;
              if (isCompleted) deptTh += p;
              if (!isRejected) deptDt += p;
          });
      });
      return { name: dept.name.replace('Khoa ', ''), kh: deptKh, th: deptTh, dt: deptDt };
  });

  const maxWorkload = Math.max(1, ...deptWorkloads.map(d => Math.max(d.kh, d.th, d.dt)));
  const displayMonths = selectedMonth === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [selectedMonth];

  return (
    <div className="space-y-8 animate-in pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-navy tracking-tight">Thống kê</h2>
          <p className="text-slate-500 font-medium tracking-tight">Báo cáo phân tích chi tiết hiệu suất giảng dạy và kế hoạch toàn khoa.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <CustomSelect
              value={selectedSemester}
              onChange={(val) => setSelectedSemester(String(val))}
              options={[
                { value: 'ALL', label: 'Tất cả Học kỳ' },
                { value: 'HK1-2024', label: 'Học kỳ 1 - 2024' },
                { value: 'HK2-2024', label: 'Học kỳ 2 - 2024' },
                { value: 'HK1-2025', label: 'Học kỳ 1 - 2025' },
                { value: 'HK2-2025', label: 'Học kỳ 2 - 2025' }
              ]}
              icon={<CalendarDays size={15} />}
              minWidth="130px"
            />
            
            <CustomSelect
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(Number(val))}
              options={[
                { value: 0, label: 'Tất cả tháng' },
                ...Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
              ]}
              icon={<Calendar size={15} />}
              minWidth="120px"
            />

            <CustomSelect
              value={selectedDeptId}
              onChange={(val) => setSelectedDeptId(String(val))}
              options={[
                { value: 'ALL', label: 'Tất cả khoa' },
                ...actualDepts.map((d: any) => ({ value: d.id, label: d.name }))
              ]}
              icon={<Filter size={15} />}
              minWidth="150px"
            />
        </div>
      </div>


      {/* Main Content Detail */}
      <div className="pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-black text-navy uppercase flex items-center gap-2"><Filter size={20} className="text-red-500" /> Bảng phân tích chi tiết</h3>
           <div className="flex items-center gap-3">
             {/* Nút Xuất */}
             <div className="relative group">
               <button className="flex items-center gap-2 px-3 py-1.5 bg-[#CC0000] border border-transparent text-white rounded-lg shadow-sm hover:bg-[#990000] font-bold uppercase text-xs transition-colors">
                 <FileDown size={16} /> Xuất báo cáo
               </button>
               <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  <button 
                    onClick={() => exportReportToXlsx(selectedMonth, generateExportData(selectedMonth))}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 border-b border-slate-100 transition-colors"
                  >
                    Xuất ra Excel (XLSX)
                  </button>
                  <button 
                    onClick={() => exportReportToDocx(selectedMonth, generateExportData(selectedMonth))}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 border-b border-slate-100 transition-colors"
                  >
                    Xuất ra DOCX
                  </button>
                  <button 
                    onClick={() => exportReportToPdf(selectedMonth, generateExportData(selectedMonth))}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors"
                  >
                    Xuất ra PDF
                  </button>
               </div>
             </div>
             
             {/* Nút In */}
             <button
               onClick={() => {
                 printReportBrowser(selectedMonth, generateExportData(selectedMonth));
               }}
               className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 font-bold uppercase text-xs transition-colors"
             >
               <Printer size={16} /> In báo cáo
             </button>
           </div>
        </div>

        <div className="space-y-12">
          {displayMonths.map(month => {
            // Only show tables for months that have data based on filter or if ALL is selected
            const hasDataForThisMonth = filteredPlans.some(p => p.month === month);
            if (!hasDataForThisMonth && selectedMonth === 0 && totalPlans > 0) return null;

            return (
            <div key={month} className="space-y-6">
              <h2 className="text-xl font-black text-slate-800 border-b-2 border-red-500/20 pb-2 inline-block">
                THÁNG {month}
              </h2>

              <div className="space-y-8 pl-0 sm:pl-4 sm:border-l-2 border-slate-100">
                {displayDepartments.map((dept, index) => {
                  const deptUsers = getDepartmentUsers(dept);
                  return (
                    <div key={index} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative z-0 hover:shadow-md transition-shadow">
                      <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2 tracking-tight">
                          <Users size={20} className="text-red-500" />
                          {dept.name}
                        </h3>
                      </div>
                      <div className="overflow-x-auto w-full p-6">
                        <table className="w-full text-center border-collapse text-sm text-slate-600">
                          <thead>
                            <tr className="border-b-2 border-slate-200 bg-slate-100">
                              <th className="p-3 min-w-[50px] font-black text-slate-600 outline outline-1 outline-slate-200 text-center uppercase tracking-widest bg-white">STT</th>
                              <th className="p-3 min-w-[150px] font-black text-slate-600 text-left outline outline-1 outline-slate-200 bg-white">Tuần từ:</th>
                              <th className="p-3 min-w-[60px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">01-07</th>
                              <th className="p-3 min-w-[60px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">08-14</th>
                              <th className="p-3 min-w-[60px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">15-21</th>
                              <th className="p-3 min-w-[60px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">22-28</th>
                              <th className="p-3 min-w-[60px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">29-31</th>
                              <th className="p-3 min-w-[70px] font-black text-amber-900 bg-amber-50 outline outline-1 outline-slate-200 text-center">Số giờ<br/>KH</th>
                              <th className="p-3 min-w-[70px] font-black text-blue-900 bg-blue-50 outline outline-1 outline-slate-200 text-center">Số giờ<br/>TH</th>
                              <th className="p-3 min-w-[120px] font-black text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {(() => {
                              const rows = deptUsers.map((user) => {
                                const userPlans = plans.filter(
                                  p => p.teacherId?.toString() === user.id?.toString() && p.month === month && p.status !== 'DRAFT'
                                );
                                const kh = [0, 0, 0, 0, 0];
                                const th = [0, 0, 0, 0, 0];

                                userPlans.forEach(plan => {
                                  const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(plan.status || '');
                                  plan.weeks?.forEach((week: any, idx: number) => {
                                    if (idx < 5) {
                                      const planned = Number(week.plannedHours || 0);
                                      kh[idx] += planned;
                                      if (isCompleted) th[idx] += planned;
                                    }
                                  });
                                });

                                const totalKh = kh.reduce((a, b) => a + b, 0);
                                const totalTh = th.reduce((a, b) => a + b, 0);
                                
                                let evaluation = <span className="text-slate-400 italic font-normal text-[11px]">Chưa có thông tin</span>;
                                if (totalKh > 0) {
                                  if (totalTh >= totalKh) {
                                    evaluation = <span className="text-emerald-600 font-bold text-xs uppercase tracking-tight">Đạt yêu cầu</span>;
                                  } else {
                                    evaluation = <span className="text-red-600 font-bold text-xs uppercase tracking-tight">Chưa đạt yêu cầu</span>;
                                  }
                                }

                                return { user, th, kh, totalKh, totalTh, evaluation };
                              });

                              let deptTotalThWeek = [0, 0, 0, 0, 0];
                              let deptTotalKh = 0;
                              let deptTotalTh = 0;
                              
                              rows.forEach(r => {
                                r.th.forEach((v, i) => deptTotalThWeek[i] += v);
                                deptTotalKh += r.totalKh;
                                deptTotalTh += r.totalTh;
                              });

                              return (
                                <>
                                  {rows.map((row, rIdx) => (
                                    <tr key={row.user.id} className="hover:bg-slate-50 transition-colors group">
                                      <td className="p-3 font-medium text-slate-600 text-center outline outline-1 outline-slate-200 bg-white">{rIdx + 1}</td>
                                      <td className="p-3 text-left font-medium outline outline-1 outline-slate-200 bg-white">
                                        <button
                                          onClick={() => setSelectedProfile(row.user)}
                                          className="hover:underline hover:text-red-500 transition-colors text-slate-800 truncate max-w-[150px]"
                                          title={row.user.name}
                                        >
                                          {row.user.name}
                                        </button>
                                      </td>
                                      <td className="p-3 font-medium text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">{row.th[0] > 0 ? row.th[0] : '0'}</td>
                                      <td className="p-3 font-medium text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">{row.th[1] > 0 ? row.th[1] : '0'}</td>
                                      <td className="p-3 font-medium text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">{row.th[2] > 0 ? row.th[2] : '0'}</td>
                                      <td className="p-3 font-medium text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">{row.th[3] > 0 ? row.th[3] : '0'}</td>
                                      <td className="p-3 font-medium text-slate-700 text-center outline outline-1 outline-slate-200 bg-white">{row.th[4] > 0 ? row.th[4] : '0'}</td>
                                      <td className="p-3 font-black text-amber-700 text-center outline outline-1 outline-slate-200 bg-amber-50/30">{row.totalKh}</td>
                                      <td className="p-3 font-black text-blue-700 text-center outline outline-1 outline-slate-200 bg-blue-50/30">{row.totalTh}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-white">
                                        {row.evaluation}
                                      </td>
                                    </tr>
                                  ))}
                                  {rows.length === 0 && (
                                    <tr>
                                      <td colSpan={10} className="p-8 text-slate-400 font-medium">Không có giáo viên nào.</td>
                                    </tr>
                                  )}
                                  {rows.length > 0 && (
                                    <tr className="bg-slate-50 font-bold">
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100"></td>
                                      <td className="p-3 text-left outline outline-1 outline-slate-200 bg-slate-100 uppercase text-slate-700">Tổng cộng</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100 text-slate-800">{deptTotalThWeek[0] > 0 ? deptTotalThWeek[0] : '0'}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100 text-slate-800">{deptTotalThWeek[1] > 0 ? deptTotalThWeek[1] : '0'}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100 text-slate-800">{deptTotalThWeek[2] > 0 ? deptTotalThWeek[2] : '0'}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100 text-slate-800">{deptTotalThWeek[3] > 0 ? deptTotalThWeek[3] : '0'}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100 text-slate-800">{deptTotalThWeek[4] > 0 ? deptTotalThWeek[4] : '0'}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-amber-100 text-amber-900">{deptTotalKh}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-blue-100 text-blue-900">{deptTotalTh}</td>
                                      <td className="p-3 text-center outline outline-1 outline-slate-200 bg-slate-100"></td>
                                    </tr>
                                  )}
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )})}
        </div>
      </div>

      {selectedProfile && (
        <TeacherProfileModal
          selectedProfile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSelectPlan={(p) => { }}
        />
      )}
    </div>
  );
};

export default QCPanel;
