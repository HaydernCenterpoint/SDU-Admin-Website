import React, { useState, useEffect } from 'react';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CalendarDays
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useAppStore, api } from '../store/useAppStore';

// Map color names to actual Tailwind-safe classes
const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
  'primary':     { bg: 'bg-red-100',    text: 'text-primary',     glow: 'bg-red-100' },
  'emerald-500': { bg: 'bg-emerald-100', text: 'text-emerald-600', glow: 'bg-emerald-100' },
  'secondary':   { bg: 'bg-sky-100',    text: 'text-sky-500',     glow: 'bg-sky-100' },
  'amber-500':   { bg: 'bg-amber-100',  text: 'text-amber-500',   glow: 'bg-amber-100' },
};

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color }: any) => {
  const c = colorMap[color] ?? colorMap['primary'];
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-200 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 ${c.glow} opacity-30 rounded-full blur-3xl transition-all`} />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${c.bg} ${c.text}`}>
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-navy mt-1">{value}</h3>
      </div>
    </div>
  );
};

const ManagementDashboard = () => {
  const { plans } = useAppStore();
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('HK2-2025');

  useEffect(() => {
    api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
    api.get('/users/active').then((res: any) => setUsers(res.data)).catch(console.error);
  }, []);

  const deptHeadIds = new Set(users.filter(u => u.role === 'DEPT_HEAD').map(u => u.id?.toString()));

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

  const validPlans = plans.filter(p => 
    p.status !== 'DRAFT' && 
    p.status !== 'CANCELLED' && 
    !deptHeadIds.has(p.teacherId?.toString()) &&
    matchSemester(p, selectedSemester)
  );

  // Compute real metrics
  const totalPlans   = validPlans.length;
  const approved     = validPlans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status)).length;
  const approvalRate = totalPlans > 0 ? ((approved / totalPlans) * 100).toFixed(1) + '%' : '0%';
  const reporting    = validPlans.filter(p => p.status === 'REPORT_SUBMITTED').length;
  const rejected     = validPlans.filter(p => p.status === 'DEPT_REJECTED_PHASE1' || p.status === 'DEPT_REJECTED_PHASE2').length;

  // Real deltas (mocking prior period safely for dashboard)
  const prevMonthPlans = validPlans.filter(p => p.month === (new Date().getMonth() === 0 ? 12 : new Date().getMonth()));
  const planDelta = totalPlans - prevMonthPlans.length;
  
  const prevApproved = prevMonthPlans.filter(p => ['DEPT_APPROVED_TO_BGH', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status)).length;
  const prevApproveRate = prevMonthPlans.length > 0 ? (prevApproved / prevMonthPlans.length * 100) : 0;
  const currentApproveRate = totalPlans > 0 ? (approved / totalPlans * 100) : 0;
  const rateDelta = Math.round(currentApproveRate - prevApproveRate);
  
  const prevReporting = prevMonthPlans.filter(p => p.status === 'REPORT_SUBMITTED').length;
  const reportingDelta = reporting - prevReporting;
  
  const prevRejected = prevMonthPlans.filter(p => ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(p.status)).length;
  const rejectedDelta = rejected - prevRejected;

  // Phase progress
  const p1Done = approved;
  const p1Pct  = totalPlans > 0 ? Math.round((p1Done / totalPlans) * 100) : 0;
  const p2Done = validPlans.filter(p => p.status === 'ACCEPTED_TO_BGH').length;
  const p2Pct  = totalPlans > 0 ? Math.round((p2Done / totalPlans) * 100) : 0;

  // Chart data per department
  const mockDepts = [
    { id: '1', name: 'Khoa CNTT' },
    { id: '2', name: 'Khoa Cơ khí' },
    { id: '3', name: 'Khoa Điện' },
    { id: '4', name: 'Khoa May' },
    { id: '5', name: 'Khoa Ô tô' }
  ];
  const actualDepts = (departments.length > 0 ? departments : mockDepts)
    .filter(dept => dept.name.toLowerCase().includes('khoa') && !dept.name.toLowerCase().includes('quản lý'));
  
  const deptMap: Record<string, { kh: number; th: number; dt: number, teachers: Set<string>, planCount: number }> = {};
  
  // Ensure all valid departments have a structure
  actualDepts.forEach(d => {
      deptMap[d.id.toString()] = { kh: 0, th: 0, dt: 0, teachers: new Set(), planCount: 0 };
  });

  validPlans.forEach(p => {
    const deptId = p.departmentId?.toString() || 'unknown';
    if (!deptMap[deptId]) deptMap[deptId] = { kh: 0, th: 0, dt: 0, teachers: new Set(), planCount: 0 };
    
    deptMap[deptId].planCount += 1;
    if (p.teacherId) deptMap[deptId].teachers.add(p.teacherId);

    const isCompleted = ['COMPLETED', 'REPORT_SUBMITTED', 'ACCEPTED_TO_BGH'].includes(p.status || '');
    const isRejected = ['DEPT_REJECTED_PHASE1', 'DEPT_REJECTED_PHASE2'].includes(p.status || '');
    
    p.weeks?.forEach((w: any) => {
      const hrs = Number(w.plannedHours || 0);
      deptMap[deptId].kh += hrs;
      if (isCompleted) deptMap[deptId].th += hrs;
      if (!isRejected) deptMap[deptId].dt += hrs;
    });
  });

  const deptChartData = Object.entries(deptMap).map(([id, v]) => {
    const matchedDept = actualDepts.find(d => d.id.toString() === id);
    return {
      name: matchedDept ? matchedDept.name.replace('Khoa ', '') : id,
      kh: v.kh,
      th: v.th,
      dt: v.dt,
      teachers: v.teachers.size,
      planCount: v.planCount,
    };
  });

  // Calculate Totals For Table
  const totalGv = deptChartData.reduce((acc, d) => acc + d.teachers, 0);
  const totalKhCount = deptChartData.reduce((acc, d) => acc + d.planCount, 0);
  const totalKhHrs = deptChartData.reduce((acc, d) => acc + d.kh, 0);
  const totalDtHrs = deptChartData.reduce((acc, d) => acc + d.dt, 0);
  const totalThHrs = deptChartData.reduce((acc, d) => acc + d.th, 0);
  
  const avgDtRate = totalKhHrs > 0 ? Math.round((totalDtHrs / totalKhHrs) * 100) : 0;
  const avgThRate = totalDtHrs > 0 ? Math.round((totalThHrs / totalDtHrs) * 100) : 0;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-navy tracking-tight">Hệ thống Giám sát</h2>
          <p className="text-zinc-500 text-sm font-medium">Theo dõi hiệu suất giảng dạy và tiến độ phê duyệt toàn trường.</p>
        </div>
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
          minWidth="150px"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng kế hoạch"      value={totalPlans}    trend={planDelta >= 0 ? "up" : "down"}   trendValue={`${planDelta > 0 ? '+' : ''}${planDelta}`}  icon={Users}         color="primary" />
        <StatCard title="Kế hoạch đã duyệt"  value={approvalRate}  trend={rateDelta >= 0 ? "up" : "down"}   trendValue={`${rateDelta > 0 ? '+' : ''}${rateDelta}%`} icon={TrendingUp}    color="emerald-500" />
        <StatCard title="Đang nộp báo cáo"   value={reporting}     trend={reportingDelta > 0 ? "up" : "down"} trendValue={`${reportingDelta > 0 ? '+' : ''}${reportingDelta}`}  icon={BarChartIcon}  color="secondary" />
        <StatCard title="Bị từ chối"         value={rejected}      trend={rejectedDelta > 0 ? "down" : "up"}  trendValue={`${rejectedDelta > 0 ? '+' : ''}${rejectedDelta}`}   icon={AlertTriangle} color="amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-black text-navy uppercase tracking-widest mb-8">So sánh khối lượng giảng dạy giữa các khoa</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 700}} 
                />
                <Bar dataKey="kh" name="Kế hoạch" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={15} />
                <Bar dataKey="dt" name="Dự tính" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={15} />
                <Bar dataKey="th" name="Thực hiện" fill="#ED1C24" radius={[6, 6, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-navy p-8 rounded-[3rem] text-white shadow-xl shadow-navy/20 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-6">Trạng thái phê duyệt</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold">Kế hoạch Giai đoạn 1</span>
                <span className="text-2xl font-black">{p1Pct}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all" style={{ width: `${p1Pct}%` }} />
              </div>
              
              <div className="flex justify-between items-end mt-8">
                <span className="text-xs font-bold">Báo cáo Giai đoạn 2</span>
                <span className="text-2xl font-black">{p2Pct}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${p2Pct}%` }} />
              </div>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-white/5 rounded-[2rem] border border-white/10">
            <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-2">Tổng quan</p>
            <p className="text-xs font-bold leading-relaxed">
              {totalPlans} kế hoạch — {approved} đã duyệt, {reporting} đang báo cáo, {rejected} bị từ chối.
            </p>
          </div>
        </div>
      </div>

      {/* Tabled Statistics */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 mt-6">
        <h3 className="text-sm font-black text-navy uppercase tracking-widest mb-6">Trạng thái Khối lượng các Khoa (Tổng hợp)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="p-4 font-bold text-left border-r border-white">Khoa</th>
                <th className="p-4 font-bold text-center border-r border-white">Tổng nhân sự</th>
                <th className="p-4 font-bold text-center border-r border-white">Số lượng KH</th>
                <th className="p-4 font-bold text-center text-slate-700 bg-slate-200 border-r border-white">Kế hoạch (giờ)</th>
                <th className="p-4 font-bold text-center text-amber-700 bg-amber-100 border-r border-white">Dự tính (giờ)</th>
                <th className="p-4 font-bold text-center text-red-700 bg-red-100 border-r border-white">Thực hiện (TH)</th>
                <th className="p-4 font-bold text-center text-blue-700 bg-blue-100 border-r border-white">Tỷ lệ DT/KH</th>
                <th className="p-4 font-bold text-center text-emerald-700 bg-emerald-100 rounded-tr-xl">Tỷ lệ TH/DT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {deptChartData.map(d => {
                  const dtRate = d.kh > 0 ? Math.round((d.dt / d.kh) * 100) : 0;
                  const thRate = d.dt > 0 ? Math.round((d.th / d.dt) * 100) : 0;
                  return (
                    <tr key={d.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-700 border-r border-slate-50">{d.name}</td>
                      <td className="p-4 text-center border-r border-slate-50">{d.teachers}</td>
                      <td className="p-4 text-center border-r border-slate-50">{d.planCount}</td>
                      <td className="p-4 font-black text-center bg-slate-50 border-r border-white">{d.kh}</td>
                      <td className="p-4 font-black text-center text-amber-600 bg-amber-50/50 border-r border-white">{d.dt}</td>
                      <td className="p-4 font-black text-center text-red-600 bg-red-50/50 border-r border-white">{d.th}</td>
                      <td className="p-4 font-bold text-center border-r border-white">
                        <span className={`px-2 py-1 rounded-md text-xs ${dtRate >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{dtRate}%</span>
                      </td>
                      <td className="p-4 font-bold text-center">
                         <span className={`px-2 py-1 rounded-md text-xs ${thRate >= 100 ? 'bg-blue-100 text-blue-700' : (thRate > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}`}>{thRate}%</span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-100 font-black">
              <tr>
                <td className="p-4 text-left text-slate-800 border-r border-white">TỔNG CỘNG</td>
                <td className="p-4 text-center text-slate-800 border-r border-white">{totalGv}</td>
                <td className="p-4 text-center text-slate-800 border-r border-white">{totalKhCount}</td>
                <td className="p-4 text-center text-slate-800 border-r border-white">{totalKhHrs}</td>
                <td className="p-4 text-center text-amber-700 bg-amber-200/50 border-r border-white">{totalDtHrs}</td>
                <td className="p-4 text-center text-red-700 bg-red-200/50 border-r border-white">{totalThHrs}</td>
                <td className="p-4 text-center border-r border-white">
                  <span className={`px-2 py-1 rounded-md text-xs ${avgDtRate >= 100 ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-300 text-slate-700'}`}>{avgDtRate}%</span>
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs ${avgThRate >= 100 ? 'bg-blue-200 text-blue-800' : (avgThRate > 0 ? 'bg-amber-200 text-amber-800' : 'bg-rose-200 text-rose-800')}`}>{avgThRate}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagementDashboard;
