import React, { useState } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Filter,
  Download,
  Eye,
  ArrowUpRight,
  CalendarDays,
  Building,
} from 'lucide-react';

import { Plan } from '../types';
import CustomSelect from './CustomSelect';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:                 { label: 'Bản nháp',          cls: 'badge-draft'    },
  SUBMITTED:             { label: 'Chờ T.Khoa duyệt',  cls: 'badge-pending'  },
  DEPT_APPROVED_TO_BGH:  { label: 'Chờ BGH duyệt',     cls: 'badge-pending' },
  DEPT_REJECTED_PHASE1:  { label: 'T.Khoa từ chối',    cls: 'badge-rejected' },
  REPORT_SUBMITTED:      { label: 'Chờ nghiệm thu',    cls: 'badge-warning'  },
  ACCEPTED_TO_BGH:       { label: 'Hoàn tất',          cls: 'badge-approved' },
  DEPT_REJECTED_PHASE2:  { label: 'BGH từ chối',       cls: 'badge-rejected' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return <span className={cfg.cls}>{cfg.label}</span>;
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accentColor?: string;
  bgColor?: string;
}

const StatCard = ({ title, value, icon: Icon, sub, accentColor = '#CC0000', bgColor = '#FFF0F0' }: StatCardProps) => (
  <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200">
    {/* Top accent stripe */}
    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />
    
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium mt-2">{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bgColor }}>
        <Icon size={20} style={{ color: accentColor }} />
      </div>
    </div>

    {/* Corner arrow */}
    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <ArrowUpRight size={14} className="text-slate-400" />
    </div>
  </div>
);

const PlanList = ({ title, plans, onSelectPlan }: { title: string; plans: Plan[]; onSelectPlan: (p: Plan) => void }) => (
  <div className="card overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 rounded-full bg-[#CC0000]" />
        <h3 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h3>
      </div>
      <button className="text-[#CC0000] text-xs font-bold hover:underline flex items-center gap-1">
        Xem tất cả <ArrowUpRight size={12} />
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            <th className="table-header px-6 py-3">Mã phiếu</th>
            <th className="table-header px-6 py-3">Kế hoạch</th>
            <th className="table-header px-6 py-3">Giảng viên</th>
            <th className="table-header px-6 py-3">Tạo lúc</th>
            <th className="table-header px-6 py-3">Thời gian</th>
            <th className="table-header px-6 py-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="table-row cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => onSelectPlan(plan)}>
              <td className="px-6 py-3.5 text-xs font-mono font-bold text-slate-400">{plan.code}</td>
              <td className="px-6 py-3.5">
                <p className="text-sm font-bold text-slate-800 leading-tight">{plan.title}</p>
              </td>
              <td className="px-6 py-3.5 text-sm text-slate-600 font-medium">{plan.teacherName}</td>
              <td className="px-6 py-3.5 text-xs font-bold text-navy">
                {(plan as any).created_at ? new Date((plan as any).created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không xác định'}
              </td>
              <td className="px-6 py-3.5">
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <CalendarDays size={12} className="text-slate-400" />
                  T{plan.month}/{plan.year}
                </span>
              </td>
              <td className="px-6 py-3.5">
                <StatusBadge status={plan.status} />
              </td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                Chưa có kế hoạch nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const DEPT_LABELS: Record<string, string> = { d1: 'CNTT', d2: 'Cơ khí', d3: 'Điện', d4: 'May', d5: 'Ô tô' };

const Dashboard = ({ onSelectPlan }: { onSelectPlan: (plan: Plan) => void }) => {
  const { currentUser, plans } = useAppStore();
  const isManagement = currentUser?.role === 'BOARD' || currentUser?.role === 'QC' || currentUser?.role === 'DEPT_HEAD';

  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [departments, setDepartments] = useState<any[]>([]);

  React.useEffect(() => {
    if (currentUser?.role === 'BOARD' || currentUser?.role === 'QC') {
      api.get('/departments').then((res: any) => setDepartments(res.data)).catch(console.error);
    }
  }, [currentUser?.role]);

  const availableMonths = Array.from(new Set(plans.map(p => `Tháng ${p.month}/${p.year}`)));

  const filteredPlans = plans.filter(p => {
    const statusMatch = filterStatus === 'ALL' || p.status === filterStatus;
    const monthStr = `Tháng ${p.month}/${p.year}`;
    const monthMatch = filterMonth === 'ALL' || monthStr === filterMonth;
    const deptMatch = filterDept === 'ALL' || p.departmentId?.toString() === filterDept.toString();
    return statusMatch && monthMatch && deptMatch;
  });

  const myPlans = currentUser?.role === 'DEPT_HEAD'
    ? filteredPlans.filter(p => p.departmentId == currentUser.departmentId)
    : filteredPlans.filter(p => p.teacherId === currentUser?.id || (p as any).user_id === currentUser?.id);
  
  let otherPlans: Plan[] = [];
  if (currentUser?.role === 'TEACHER') {
    otherPlans = filteredPlans.filter(p => p.departmentId === currentUser.departmentId && p.teacherId !== currentUser.id && (p as any).user_id !== currentUser.id);
  } else if (currentUser?.role === 'BOARD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'QC') {
    otherPlans = filteredPlans.filter(p => p.teacherId !== currentUser?.id && (p as any).user_id !== currentUser?.id);
  }

  const totalPlans  = filteredPlans.length;
  const pending     = filteredPlans.filter(p => p.status === 'SUBMITTED' || p.status === 'REPORT_SUBMITTED').length;
  const completed   = filteredPlans.filter(p => p.status === 'ACCEPTED_TO_BGH').length;
  const efficiency  = totalPlans > 0 ? ((completed / totalPlans) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="space-y-6 animate-in">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {isManagement ? 'Báo cáo Giám sát' : `Xin chào, ${currentUser?.name} 👋`}
          </h2>
          <p className="page-subtitle">
            {isManagement
              ? 'Tổng quan hệ thống quản lý kế hoạch khai thác thiết bị'
              : 'Hệ thống Quản lý Kế hoạch & Khai thác Thiết bị — Đại học Sao Đỏ'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <CustomSelect
            value={filterMonth}
            onChange={(val) => setFilterMonth(String(val))}
            options={[
              { value: 'ALL', label: 'Tất cả tháng' },
              ...availableMonths.map(m => ({ value: m, label: m }))
            ]}
            icon={<CalendarDays size={15} />}
            minWidth="130px"
          />

          {(currentUser?.role === 'BOARD' || currentUser?.role === 'QC') && (
            <CustomSelect
              value={filterDept}
              onChange={(val) => setFilterDept(String(val))}
              options={[
                { value: 'ALL', label: 'Mọi khoa' },
                ...departments
                  .filter((d: any) => d.name.toLowerCase().includes('khoa') && !d.name.toLowerCase().includes('quản lý'))
                  .map((d: any) => ({ value: d.id, label: d.name }))
              ]}
              icon={<Building size={15} />}
              minWidth="150px"
            />
          )}

          <CustomSelect
            value={filterStatus}
            onChange={(val) => setFilterStatus(String(val))}
            options={[
              { value: 'ALL', label: 'Mọi trạng thái' },
              { value: 'DRAFT', label: 'Bản nháp' },
              { value: 'SUBMITTED', label: 'Chờ T.Khoa duyệt' },
              { value: 'DEPT_APPROVED_TO_BGH', label: 'Chờ BGH duyệt' },
              { value: 'REPORT_SUBMITTED', label: 'Chờ nghiệm thu' },
              { value: 'ACCEPTED_TO_BGH', label: 'Hoàn tất' }
            ]}
            icon={<Filter size={15} />}
            minWidth="130px"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng số phiếu"
          value={totalPlans}
          icon={FileCheck}
          sub="Toàn hệ thống"
          accentColor="#CC0000"
          bgColor="#FFF0F0"
        />
        <StatCard
          title="Chờ xử lý"
          value={pending}
          icon={Clock}
          sub="Cần phê duyệt"
          accentColor="#F59E0B"
          bgColor="#FFFBEB"
        />
        <StatCard
          title="Đã hoàn tất"
          value={completed}
          icon={CheckCircle2}
          sub="Nghiệm thu xong"
          accentColor="#10B981"
          bgColor="#ECFDF5"
        />
        <StatCard
          title="Hiệu suất"
          value={efficiency}
          icon={TrendingUp}
          sub="Tỉ lệ hoàn thành"
          accentColor="#0099DD"
          bgColor="#EFF8FF"
        />
      </div>



      {/* Plan list - My Plans / Department Plans */}
      {(currentUser?.role === 'TEACHER' || currentUser?.role === 'DEPT_HEAD') && (
        <PlanList
          title={currentUser?.role === 'DEPT_HEAD' ? "Kế hoạch của khoa" : "Kế hoạch của tôi"}
          plans={myPlans.slice(0, 6)}
          onSelectPlan={onSelectPlan}
        />
      )}

      {/* Plan list - Other Teachers */}
      {currentUser?.role !== 'DEPT_HEAD' && (
        <PlanList
          title={(currentUser?.role === 'BOARD' || currentUser?.role === 'QC' || currentUser?.role === 'ADMIN') ? "Tất cả kế hoạch" : "Kế hoạch của các giáo viên"}
          plans={otherPlans.slice(0, 6)}
          onSelectPlan={onSelectPlan}
        />
      )}
    </div>
  );
};

export default Dashboard;
