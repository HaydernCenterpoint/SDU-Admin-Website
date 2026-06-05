import re

file_path = 'src/components/PlanSchedule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Evaluation Section (KẾT QUẢ ĐÁNH GIÁ) to contain the buttons
eval_box_regex = re.compile(r'\{\/\* Evaluation Result \*\/}.*?(?=\s*\{\/\* Modal Footer \*\/})', re.DOTALL)

eval_box_replace = """{/* Evaluation Result Area */}
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
                    currentUser?.role === 'DEPT_HEAD' || currentUser?.role === 'BOARD' ? (
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
                        <span className="text-sm font-bold text-slate-600">Đang chờ đánh giá từ Trưởng khoa...</span>
                      </div>
                    )
                  )}
                </div>
              )}"""

content = re.sub(eval_box_regex, eval_box_replace, content)

# 2. Update Footer Logic for Teacher Button
footer_regex = re.compile(r'\{\/\* Modal Footer \*\/}.*?(?=\s*\{\/\* Fullscreen File)', re.DOTALL)

footer_replace = """{/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3 rounded-b-3xl shrink-0">
              <button
                onClick={() => setSelectedPlanForDetail(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors mr-auto"
              >
                Đóng
              </button>
              
              {currentUser?.role === 'TEACHER' && selectedPlanForDetail.status !== 'COMPLETED' ? (
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
            </div>
          </div>
        </div>
      )}"""

content = re.sub(footer_regex, footer_replace, content)

# 3. Phóng to lịch to ra 
# User: "Phóng to cái lịch to ra một tí."
# Currently: className="flex-1 overflow-auto p-6 sm:p-10" and min-w-[800px]
# I will make min-w-[1200px]
calendar_find = 'min-w-[800px]'
calendar_replace = 'min-w-[1000px]'
content = content.replace(calendar_find, calendar_replace)

# Also there's height. min-h-[200px] maybe increase to min-h-[240px]
morning_h_find = 'min-h-[200px]'
morning_h_replace = 'min-h-[260px]'
content = content.replace(morning_h_find, morning_h_replace)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done styling update via python")
