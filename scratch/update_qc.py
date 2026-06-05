import os

CODE = """import React, { useState, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { TeacherProfileModal } from './TeacherProfileModal';
import { exportReportToDocx, exportReportToPdf, printReportBrowser } from '../utils/qcExportHelper';
import { Calendar, Filter, Users, MapPin, Printer, FileDown, FileText, CheckCircle, XCircle, UsersRound, TrendingUp, BarChart3, AlertTriangle, CalendarDays } from 'lucide-react';

const QCPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('HK1-2025');
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

  const actualDepts = departments.length > 0 ? departments : mockDepts;
  const displayDepartments = selectedDeptId === 'ALL'
    ? actualDepts
    : [actualDepts.find(d => d.id.toString() === selectedDeptId.toString()) || { id: 'unknown', name: 'Khoa (Không xác định)' }];

  const generateExportData = (targetMonth: number) => {
    // keeping old logic for exporting
    return displayDepartments.map(dept => {
      const deptUsers = users.filter(u => u.department?.name === dept.name || u.departmentId?.toString() === dept.id.toString());
      const rows = deptUsers.map(user => {
        const userPlans = plans.filter(p => p.teacherId === user.id && p.month === targetMonth && p.status !== 'DRAFT');
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
      return { deptName: dept.name, users: rows };
    });
  };

  // ----- Analytics Computation -----
  const validPlans = plans.filter(p => p.status !== 'DRAFT'); // Filter out drafts for QC/Board
  // In a real app, semester would map to months. For demo, we just apply the month / dept filters.
  const filteredPlans = validPlans.filter(p => {
    const matchMonth = selectedMonth === 0 || p.month === selectedMonth;
    const matchDept = selectedDeptId === 'ALL' || p.departmentId?.toString() === selectedDeptId;
    return matchMonth && matchDept;
  });

  const totalPlans = filteredPlans.length;
  const phase1Approved = filteredPlans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status)).length;
  const phase2Approved = filteredPlans.filter(p => p.status === 'ACCEPTED_TO_BGH').length;
  const reportingPlans = filteredPlans.filter(p => p.status === 'REPORT_SUBMITTED').length;
  const rejectedPlans = filteredPlans.filter(p => ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(p.status)).length;

  const phase1Rate = totalPlans ? Math.round((phase1Approved/totalPlans)*100) : 0;
  const phase2Rate = totalPlans ? Math.round((phase2Approved/totalPlans)*100) : 0;
  
  // For Bar Chart: department workloads
  const deptWorkloads = actualDepts.map(dept => {
      let deptKh = 0; let deptTh = 0;
      const deptPlans = filteredPlans.filter(p => p.departmentId?.toString() === dept.id.toString());
      deptPlans.forEach(plan => {
          const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(plan.status || '');
          plan.weeks?.forEach((week: any) => {
              const p = Number(week.plannedHours || 0);
              deptKh += p;
              if (isCompleted) deptTh += p;
          });
      });
      return { name: dept.name.replace('Khoa ', ''), kh: deptKh, th: deptTh };
  });

  const maxWorkload = Math.max(1, ...deptWorkloads.map(d => Math.max(d.kh, d.th)));
  const displayMonths = selectedMonth === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [selectedMonth];

  return (
    <div className="space-y-8 animate-in pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-navy tracking-tight">Hệ thống Giám sát</h2>
          <p className="text-slate-500 font-medium tracking-tight">Theo dõi hiệu suất giảng dạy và tiến độ phê duyệt toàn trường.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-white hover:bg-slate-50 transition-colors h-[38px] flex">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} />
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  className="appearance-none pl-9 pr-8 bg-transparent text-slate-700 font-medium outline-none text-sm cursor-pointer min-w-[130px] h-full"
                  style={{ backgroundImage: \`url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")\`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                >
                  <option value="ALL">Tất cả Học kỳ</option>
                  <option value="HK1-2024">Học kỳ 1 - 2024</option>
                  <option value="HK2-2024">Học kỳ 2 - 2024</option>
                  <option value="HK1-2025">Học kỳ 1 - 2025</option>
                </select>
            </div>
            
            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-white hover:bg-slate-50 transition-colors h-[38px] flex">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none pl-9 pr-8 bg-transparent text-slate-700 font-medium outline-none text-sm cursor-pointer min-w-[120px] h-full"
                  style={{ backgroundImage: \`url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")\`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                >
                  <option value={0}>Tất cả tháng</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                  ))}
                </select>
            </div>

            <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-white hover:bg-slate-50 transition-colors h-[38px] flex">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} />
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="appearance-none pl-9 pr-8 bg-transparent text-slate-700 font-medium outline-none text-sm cursor-pointer min-w-[150px] h-full"
                  style={{ backgroundImage: \`url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")\`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                >
                  <option value="ALL">Tất cả khoa</option>
                  {actualDepts.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-start hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="flex justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-400 mb-4">
                    <UsersRound size={24} />
                </div>
                <div className="flex items-center text-emerald-500 font-bold text-sm h-fit">
                    <TrendingUp size={16} className="mr-1" /> {totalPlans > 0 ? "100%" : "0%"}
                </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng kế hoạch</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{totalPlans}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-start hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="flex justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400 mb-4">
                    <TrendingUp size={24} />
                </div>
                <div className="flex items-center text-emerald-500 font-bold text-sm h-fit">
                    <TrendingUp size={16} className="mr-1" /> {phase1Rate}%
                </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kế hoạch đã duyệt</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{phase1Rate}%</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-start hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="flex justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-400 mb-4">
                    <BarChart3 size={24} />
                </div>
                <div className="flex items-center text-red-500 font-bold text-sm h-fit">
                    <TrendingUp size={16} className="mr-1 rotate-180" /> -0%
                </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Đang nộp báo cáo</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{reportingPlans}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-start hover:-translate-y-1 hover:shadow-md transition-all">
            <div className="flex justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                    <AlertTriangle size={24} />
                </div>
                <div className="flex items-center text-emerald-500 font-bold text-sm h-fit">
                    <TrendingUp size={16} className="mr-1" /> 0%
                </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bị từ chối</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{rejectedPlans}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Chart */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-12">So sánh khối lượng giảng dạy giữa các khoa</h3>
            
            <div className="h-64 flex items-end justify-between px-2 sm:px-6 relative gap-4">
                {/* Y-axis grid */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-xs font-bold text-slate-400">
                    <div className="w-full flex items-center gap-4 border-b border-slate-100 border-dashed pb-1"><span>{maxWorkload > 1 ? maxWorkload : 60}</span></div>
                    <div className="w-full flex items-center gap-4 border-b border-slate-100 border-dashed pb-1"><span>{Math.round((maxWorkload > 1 ? maxWorkload : 60) * 0.75)}</span></div>
                    <div className="w-full flex items-center gap-4 border-b border-slate-100 border-dashed pb-1"><span>{Math.round((maxWorkload > 1 ? maxWorkload : 60) * 0.5)}</span></div>
                    <div className="w-full flex items-center gap-4 border-b border-slate-100 border-dashed pb-1"><span>{Math.round((maxWorkload > 1 ? maxWorkload : 60) * 0.25)}</span></div>
                    <div className="w-full flex items-center gap-4 border-b border-slate-100 border-dashed pb-1"><span>0</span></div>
                </div>

                {/* Bars */}
                {deptWorkloads.map((dept, i) => {
                    const maxH = maxWorkload > 1 ? maxWorkload : 60;
                    const h1 = Math.max((dept.kh / maxH) * 100, 4); // minimum height for visibility
                    const h2 = Math.max((dept.th / maxH) * 100, 4);
                    
                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center flex-1 h-full pb-8 justify-end group">
                            <div className="flex items-end gap-1.5 sm:gap-2.5 w-full justify-center h-full">
                                <div 
                                    className="w-1/3 sm:w-5 bg-slate-200 rounded-t-md transition-all group-hover:bg-slate-300"
                                    style={{ height: \`\${h1}%\` }}
                                    title={\`Kế hoạch: \${dept.kh} giờ\`}
                                />
                                <div 
                                    className="w-1/3 sm:w-5 bg-red-600 rounded-t-md transition-all group-hover:bg-red-700"
                                    style={{ height: \`\${h2}%\` }}
                                    title={\`Thực hiện: \${dept.th} giờ\`}
                                />
                            </div>
                            <span className="absolute bottom-[-10px] text-xs font-bold text-slate-500 truncate w-full text-center">{i + 1}</span>
                        </div>
                    );
                })}
            </div>
            
            <div className="flex justify-center gap-8 mt-10">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div><span className="text-xs font-bold text-slate-500">Kế hoạch</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div><span className="text-xs font-bold text-slate-500">Hoàn thành</span></div>
            </div>
        </div>

        {/* Status Approval Card */}
        <div className="bg-navy rounded-[2rem] p-8 shadow-md text-white flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-10 z-10">Trạng thái phê duyệt</h3>
            
            <div className="space-y-10 z-10">
                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="font-bold text-sm text-white">Kế hoạch Giai đoạn 1</span>
                        <span className="text-2xl font-black">{phase1Rate}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div className="bg-emerald-400 h-2 rounded-full transition-all duration-1000" style={{ width: \`\${phase1Rate}%\` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-3">
                        <span className="font-bold text-sm text-white">Báo cáo Giai đoạn 2</span>
                        <span className="text-2xl font-black">{phase2Rate}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{ width: \`\${phase2Rate}%\` }}></div>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-10 z-10">
                <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng quan</h4>
                    <p className="text-sm font-medium text-slate-200 leading-relaxed">
                        <span className="text-white font-bold">{totalPlans}</span> kế hoạch — <span className="text-emerald-400 font-bold">{phase1Approved}</span> đã duyệt, <span className="text-blue-400 font-bold">{reportingPlans}</span> đang báo cáo, <span className="text-rose-400 font-bold">{rejectedPlans}</span> bị từ chối.
                    </p>
                </div>
            </div>
            
            <div className="absolute -bottom-[20%] -right-[10%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* Main Content Detail */}
      <div className="pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-black text-navy uppercase flex items-center gap-2"><Filter size={20} className="text-red-500" /> Bảng phân tích chi tiết</h3>
           <div className="flex items-center gap-3">
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
                  const deptUsers = users.filter(u => u.department?.name === dept.name || u.departmentId?.toString() === dept.id.toString());
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
                            <tr className="border-b-2 border-slate-100">
                              <th className="p-3 min-w-[50px] font-black text-slate-500 uppercase text-xs">STT</th>
                              <th className="p-3 min-w-[180px] font-black text-slate-500 text-left uppercase text-xs">Giáo viên</th>
                              <th className="p-3 min-w-[70px] font-bold text-slate-400 uppercase text-xs">Tuần 1</th>
                              <th className="p-3 min-w-[70px] font-bold text-slate-400 uppercase text-xs">Tuần 2</th>
                              <th className="p-3 min-w-[70px] font-bold text-slate-400 uppercase text-xs">Tuần 3</th>
                              <th className="p-3 min-w-[70px] font-bold text-slate-400 uppercase text-xs">Tuần 4</th>
                              <th className="p-3 min-w-[70px] font-bold text-slate-400 uppercase text-xs">Tuần 5</th>
                              <th className="p-3 min-w-[90px] font-black text-slate-700 bg-slate-50 uppercase text-xs">Kế hoạch</th>
                              <th className="p-3 min-w-[90px] font-black text-red-600 bg-red-50 uppercase text-xs">Thực hiện</th>
                              <th className="p-3 min-w-[200px] font-black text-slate-500 text-left uppercase text-xs">Đánh giá chung</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {deptUsers.map((user, rIdx) => {
                              const userPlans = plans.filter(p => p.teacherId === user.id && p.month === month && p.status !== 'DRAFT');
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

                              return (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="p-3 font-medium text-slate-400">{rIdx + 1}</td>
                                  <td className="p-3 text-left font-bold">
                                    <button
                                      onClick={() => setSelectedProfile(user)}
                                      className="hover:underline hover:text-red-500 transition-colors text-slate-700"
                                      title="Xem hồ sơ giáo viên"
                                    >
                                      {user.name}
                                    </button>
                                  </td>
                                  <td className="p-3 font-medium text-slate-600">{th[0]}</td>
                                  <td className="p-3 font-medium text-slate-600">{th[1]}</td>
                                  <td className="p-3 font-medium text-slate-600">{th[2]}</td>
                                  <td className="p-3 font-medium text-slate-600">{th[3]}</td>
                                  <td className="p-3 font-medium text-slate-600">{th[4]}</td>
                                  <td className="p-3 font-black text-slate-800 bg-slate-50">{totalKh}</td>
                                  <td className="p-3 font-black text-red-600 bg-red-50">{totalTh}</td>
                                  <td className="p-3 text-left text-xs text-slate-500">
                                    {totalKh === 0 && totalTh === 0 ? (
                                      <span className="text-slate-300 italic">Chưa có dữ liệu</span>
                                    ) : totalTh >= totalKh ? (
                                      <span className="font-bold text-emerald-500 whitespace-pre-wrap flex items-center gap-1.5"><CheckCircle size={14}/> Đạt yêu cầu</span>
                                    ) : (
                                      <span className="font-bold text-red-500 whitespace-pre-wrap flex items-center gap-1.5"><XCircle size={14}/> Chưa đạt yêu cầu</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {deptUsers.length === 0 && (
                              <tr>
                                <td colSpan={10} className="p-8 text-slate-400 font-medium">Không có giáo viên nào.</td>
                              </tr>
                            )}
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
"""
with open("c:\\Users\\datmk\\OneDrive\\Desktop\\Workspace\\Project LM Antigravity\\src\\components\\QCPanel.tsx", "w", encoding="utf-8") as f:
    f.write(CODE)
print("QCPanel script written and executing automatically.")
