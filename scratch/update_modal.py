import sys

file_path = 'src/components/PlanSchedule.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the modal parts
modal_find = """            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-white">
              {/* Info grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Người thực hiện</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.teacherName}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Khoa/Bộ môn</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.departmentName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Nội dung chi tiết
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-primary uppercase w-12 text-center">STT</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Nội dung công việc</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Kết quả dự kiến</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Địa điểm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedPlanForDetail.items || []).map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-400 text-center">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">{item.topic}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600 line-clamp-3">{item.expectedResult || item.expected_result}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                            {item.locationName || item.room || 'Phòng Lab'}
                          </td>
                        </tr>
                      ))}
                      {(!selectedPlanForDetail.items || selectedPlanForDetail.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
                            Không có nội dung chi tiết
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>"""

modal_replace = """            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 bg-white">
              {/* Info grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Giáo viên thực hiện</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.teacherName}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Khoa</span>
                  <span className="text-sm font-bold text-slate-800">{selectedPlanForDetail.departmentName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Chi tiết hoạt động
                </h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-primary uppercase w-12 text-center">TT</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Tên chủ đề/nội dung nghiên cứu</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Tên thiết bị</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase w-24">Năm sử dụng</th>
                        {selectedPlanForDetail.items?.some((i: any) => !!i.sinh_vien || i.type === 'STUDENT') && (
                          <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Sinh viên thực hiện</th>
                        )}
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase w-[200px]">Kết quả đạt được</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedPlanForDetail.items || []).map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors align-top border-b border-slate-100">
                          <td className="px-4 py-3 text-sm font-bold text-slate-400 text-center">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">{item.chu_de || item.topic}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">{item.ten_thiet_bi || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600 text-center">{item.nam_su_dung || '-'}</td>
                          {selectedPlanForDetail.items?.some((x: any) => !!x.sinh_vien || x.type === 'STUDENT') && (
                            <td className="px-4 py-3 text-sm font-semibold text-slate-600">{item.sinh_vien || '-'}</td>
                          )}
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600 text-sm whitespace-pre-wrap">{item.ket_qua || item.expectedResult || item.expected_result}</td>
                        </tr>
                      ))}
                      {(!selectedPlanForDetail.items || selectedPlanForDetail.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
                            Không có nội dung chi tiết
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>"""

content = content.replace(modal_find, modal_replace)

attach_find = """              )}
            </div>

            {/* Modal Footer */}"""

attach_replace = """              )}

              {/* Evaluation Section */}
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

            {/* Modal Footer */}"""

content = content.replace(attach_find, attach_replace)

if 'import { Check,' not in content:
    content = content.replace('import { ChevronLeft, ChevronRight, FileText, Search } from', 'import { ChevronLeft, ChevronRight, FileText, Search, Check, X } from')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating PlanSchedule.tsx")
