import sys

file_path = 'src/components/PlanSchedule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports for FilePreview
if 'import FilePreview' not in content:
    content = content.replace("import { Calendar, Filter", "import FilePreview from './FilePreview';\nimport { Calendar, Filter")

# 2. Add previewingFile state and update handleMarkCompleted
state_find = """  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<'DAT' | 'CHUA_DAT' | null>(null);

  useEffect(() => {
    setEvaluation(null);
  }, [selectedPlanForDetail]);"""

state_replace = """  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<any>(null);
  const [previewingFile, setPreviewingFile] = useState<any>(null);"""

content = content.replace(state_find, state_replace)

handle_find = """  const handleMarkCompleted = async (plan: any) => {
    try {
      if (!evaluation) {
        alert('Vui lòng chọn kết quả đánh giá!');
        return;
      }
      const comment = evaluation === 'DAT' ? 'Đạt yêu cầu' : 'Chưa đạt yêu cầu';
      await api.put(`/plans/${plan.id}/status`, { status: 'COMPLETED', comment });
      // update locally
      const updatedPlans = plans.map(p => p.id === plan.id ? { ...p, status: 'COMPLETED' as any, evaluation: evaluation } : p);
      useAppStore.setState({ plans: updatedPlans });
      setSelectedPlanForDetail({ ...plan, status: 'COMPLETED', evaluation: evaluation });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };"""

handle_replace = """  const handleMarkCompleted = async (plan: any, result: 'DAT' | 'CHUA_DAT') => {
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

content = content.replace(handle_find, handle_replace)

# 3. Fix Attachments loading
attach_find = """              {selectedPlanForDetail.attachments && selectedPlanForDetail.attachments.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tài liệu đính kèm</h3>
                  <div className="flex flex-col gap-2">
                    {selectedPlanForDetail.attachments.map((file: any, i: number) => (
                      <a 
                        key={i} 
                        href={`http://localhost:8000/storage/${file.path}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                      >"""

attach_replace = """              {selectedPlanForDetail.attachments && selectedPlanForDetail.attachments.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tài liệu đính kèm</h3>
                  <div className="flex flex-col gap-2">
                    {selectedPlanForDetail.attachments.map((file: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => setPreviewingFile(file)}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
                      >"""

content = content.replace(attach_find, attach_replace)

# Change closing </a> to </div>
end_a_find = """                      </a>
                    ))}
                  </div>
                </div>
              )}"""

end_a_replace = """                      </div>
                    ))}
                  </div>
                </div>
              )}"""

content = content.replace(end_a_find, end_a_replace)

# 4. Modify Footer/Evaluate
footer_find = """              {/* Evaluation Section */}
              {selectedPlanForDetail.status !== 'COMPLETED' ? (
                <div className="flex flex-col gap-3 py-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Đánh giá</h3>
                  <div className="flex flex-wrap gap-4">
                    <label onClick={() => setEvaluation('DAT')} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${evaluation === 'DAT' ? 'border-green-500 bg-green-50/50 ring-4 ring-green-500/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${evaluation === 'DAT' ? 'border-green-500' : 'border-slate-300'}`}>
                        {evaluation === 'DAT' && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                      </div>
                      <span className={`text-sm font-black ${evaluation === 'DAT' ? 'text-green-700' : 'text-slate-700'}`}>Đạt yêu cầu</span>
                    </label>
                    
                    <label onClick={() => setEvaluation('CHUA_DAT')} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${evaluation === 'CHUA_DAT' ? 'border-red-500 bg-red-50/50 ring-4 ring-red-500/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${evaluation === 'CHUA_DAT' ? 'border-red-500' : 'border-slate-300'}`}>
                        {evaluation === 'CHUA_DAT' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </div>
                      <span className={`text-sm font-black ${evaluation === 'CHUA_DAT' ? 'text-red-700' : 'text-slate-700'}`}>Chưa đạt yêu cầu</span>
                    </label>
                  </div>
                </div>
              ) : (
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

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0 rounded-b-3xl">
              <button 
                onClick={() => setSelectedPlanForDetail(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                Đóng
              </button>
              {selectedPlanForDetail.status !== 'COMPLETED' ? (
                <button
                  onClick={() => handleMarkCompleted(selectedPlanForDetail)}
                  className="px-6 py-2.5 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} /> Xác nhận hoàn thành
                </button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-green-100 text-green-700">
                  <Check size={18} /> Kế hoạch đã hoàn thành
                </div>
              )}
            </div>
          </div>
        </div>
      )}"""

footer_replace = """              {/* Evaluation Result */}
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

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3 shrink-0 rounded-b-3xl">
              <button 
                onClick={() => setSelectedPlanForDetail(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors mr-auto"
              >
                Đóng
              </button>
              
              {selectedPlanForDetail.status !== 'COMPLETED' ? (
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
              ) : (
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-green-100 text-green-700">
                  <Check size={18} /> Kế hoạch đã hoàn thành
                </div>
              )}
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
      )}"""

content = content.replace(footer_find, footer_replace)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating PlanSchedule.tsx")
