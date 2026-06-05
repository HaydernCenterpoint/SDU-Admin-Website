import sys
import re

file_path = 'src/components/PlanSchedule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'\{\/\* Evaluation Section \*\/}.*?\{\/\* Modal Footer \*\/}', re.DOTALL)

replacement = """{/* Evaluation Result */}
              {selectedPlanForDetail.status === 'COMPLETED' && (
                <div className="flex flex-col gap-3 py-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kết quả đánh giá</h3>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                    {selectedPlanForDetail.evaluation === 'DAT' || (selectedPlanForDetail.auditLogs && selectedPlanForDetail.auditLogs.some((l: any) => l.comment === 'Đạt yêu cầu')) ? (
                       <><div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={16} strokeWidth={3} /></div><span className="text-sm font-bold text-green-700">Đạt yêu cầu</span></>
                    ) : (
                       <><div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><X size={16} strokeWidth={3} /></div><span className="text-sm font-bold text-red-700">Chưa đạt yêu cầu</span></>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}"""

content = re.sub(pattern, replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
