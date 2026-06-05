import sys
import re

file_path = 'src/components/PlanSchedule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleMarkCompleted
handle_find = """  const handleMarkCompleted = async (plan: any, result: 'DAT' | 'CHUA_DAT') => {
    try {
      const comment = result === 'DAT' ? 'Đạt yêu cầu' : 'Chưa đạt yêu cầu';
      await api.put(`/plans/${plan.id}/status`, { status: 'COMPLETED', comment });
      // update locally
      const updatedPlans = plans.map(p => p.id === plan.id ? { ...p, status: 'COMPLETED' as any, evaluation: result } : p);
      useAppStore.setState({ plans: updatedPlans });
      setSelectedPlanForDetail({ ...plan, status: 'COMPLETED', evaluation: result });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };"""

handle_replace = """  const handleMarkCompleted = async (plan: any, result?: 'DAT' | 'CHUA_DAT') => {
    try {
      const comment = result === 'DAT' ? 'Đạt yêu cầu' : result === 'CHUA_DAT' ? 'Chưa đạt yêu cầu' : '';
      await api.put(`/plans/${plan.id}/status`, { status: 'COMPLETED', comment });
      
      const updatedPlans = plans.map(p => p.id === plan.id ? { 
        ...p, 
        status: 'COMPLETED' as any, 
        evaluation: result || p.evaluation,
        auditLogs: [...(p.auditLogs || []), { comment }] 
      } : p);
      
      useAppStore.setState({ plans: updatedPlans });
      setSelectedPlanForDetail({ 
        ...plan, 
        status: 'COMPLETED', 
        evaluation: result || plan.evaluation,
        auditLogs: [...(plan.auditLogs || []), { comment }] 
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };"""
content = content.replace(handle_find, handle_replace)

# 2. Update Card Colors (morning)
m_find = """                      className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <div className="text-[10px] font-black text-amber-700 uppercase flex items-center justify-between">"""
                      
m_replace = """                      className={`p-2.5 rounded-xl border shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform cursor-pointer ${
                        act.fullPlan.status === 'COMPLETED' 
                          ? 'border-green-300 bg-green-100' 
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className={`text-[10px] font-black uppercase flex items-center justify-between ${
                        act.fullPlan.status === 'COMPLETED' ? 'text-green-800' : 'text-blue-700'
                      }`}>"""
content = content.replace(m_find, m_replace)

m_title_find = """                      <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-3 break-words" title={act.planTitle}>{act.planTitle}</p>
                      <div className="mt-1 flex flex-col gap-0.5 border-t border-amber-200/60 pt-1.5">
                        <span className="text-[10px] font-bold text-amber-900 truncate">👨‍🏫 {act.teacherName || 'Trống'}</span>
                        {selectedDeptId === 'all' && (
                          <span className="text-[9px] font-bold text-amber-700/70 truncate uppercase tracking-wide">🏢 {act.departmentName}</span>
                        )}"""

m_title_replace = """                      <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-3 break-words" title={act.planTitle}>{act.planTitle}</p>
                      <div className={`mt-1 flex flex-col gap-0.5 border-t pt-1.5 ${
                        act.fullPlan.status === 'COMPLETED' ? 'border-green-300/60' : 'border-blue-200/60'
                      }`}>
                        <span className={`text-[10px] font-bold truncate ${
                          act.fullPlan.status === 'COMPLETED' ? 'text-green-900' : 'text-blue-900'
                        }`}>👨‍🏫 {act.teacherName || 'Trống'}</span>
                        {selectedDeptId === 'all' && (
                          <span className={`text-[9px] font-bold truncate uppercase tracking-wide ${
                            act.fullPlan.status === 'COMPLETED' ? 'text-green-800/70' : 'text-blue-700/70'
                          }`}>🏢 {act.departmentName}</span>
                        )}"""
content = content.replace(m_title_find, m_title_replace)

# 3. Update Card Colors (afternoon)
a_find = """                      className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 shadow-sm flex flex-col gap-1.5 hover:-translate-y-0.5 transition-transform cursor-pointer"
                    >
                      <div className="text-[10px] font-black text-blue-700 uppercase flex items-center justify-between">"""

content = content.replace(a_find, m_replace)  # we use the same replace for consistency 

a_title_find = """                      <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-3 break-words" title={act.planTitle}>{act.planTitle}</p>
                      <div className="mt-1 flex flex-col gap-0.5 border-t border-blue-200/60 pt-1.5">
                        <span className="text-[10px] font-bold text-blue-900 truncate">👨‍🏫 {act.teacherName || 'Trống'}</span>
                        {selectedDeptId === 'all' && (
                          <span className="text-[9px] font-bold text-blue-700/70 truncate uppercase tracking-wide">🏢 {act.departmentName}</span>
                        )}"""

content = content.replace(a_title_find, m_title_replace)

# 4. Evaluation Result Conditional rendering Box
eval_box_find = """              {/* Evaluation Result */}
              {selectedPlanForDetail.status === 'COMPLETED' && (
                <div className="flex flex-col gap-3 py-2">"""
                
eval_box_replace = """              {/* Evaluation Result */}
              {selectedPlanForDetail.status === 'COMPLETED' && (selectedPlanForDetail.evaluation || (selectedPlanForDetail.auditLogs && selectedPlanForDetail.auditLogs.some((l: any) => l.comment === 'Đạt yêu cầu' || l.comment === 'Chưa đạt yêu cầu'))) && (
                <div className="flex flex-col gap-3 py-2">"""
content = content.replace(eval_box_find, eval_box_replace)

# 5. Footer Buttons Logic
footer_find_regex = re.compile(r'\{\/\* Modal Footer \*\/}.*?(?=\<\/div\>\s*?\<\/div\>\s*?\<\/div\>\s*?\{\/\* Fullscreen File)', re.DOTALL)

footer_replace = """{/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3 rounded-b-3xl shrink-0">
              <button
                onClick={() => setSelectedPlanForDetail(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors mr-auto"
              >
                Đóng
              </button>
              
              {currentUser?.role === 'TRUONG_KHOA' && selectedPlanForDetail.status === 'COMPLETED' && (!selectedPlanForDetail.evaluation && !(selectedPlanForDetail.auditLogs && selectedPlanForDetail.auditLogs.some((l: any) => l.comment === 'Đạt yêu cầu' || l.comment === 'Chưa đạt yêu cầu'))) ? (
                <>
                  <button
                    onClick={() => handleMarkCompleted(selectedPlanForDetail, 'CHUA_DAT')}
                    className="px-5 py-2.5 rounded-xl font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-sm active:scale-95 transition-all flex items-center gap-2"
                  >
                    <X size={16} strokeWidth={3} /> Chưa đạt yêu cầu
                  </button>
                  <button
                    onClick={() => handleMarkCompleted(selectedPlanForDetail, 'DAT')}
                    className="px-5 py-2.5 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Check size={16} strokeWidth={3} /> Đạt yêu cầu
                  </button>
                </>
              ) : currentUser?.role === 'GIAO_VIEN' && selectedPlanForDetail.status !== 'COMPLETED' ? (
                <button
                  onClick={() => handleMarkCompleted(selectedPlanForDetail)}
                  className="px-6 py-2.5 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Xác nhận hoàn thành
                </button>
              ) : selectedPlanForDetail.status === 'COMPLETED' ? (
                <div className="px-6 py-2.5 rounded-xl font-bold bg-green-100 text-green-700 flex items-center gap-2 border border-green-200">
                  <Check size={18} />
                  Kế hoạch đã hoàn thành
                </div>
              ) : null}
            </div>"""

content = re.sub(footer_find_regex, footer_replace, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
