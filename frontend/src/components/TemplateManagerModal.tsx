import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Save, Table as TableIcon, LayoutGrid } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { TableTemplate, TableColumn } from '../types';

interface Props {
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export const TemplateManagerModal = ({ onClose, onSelect }: Props) => {
  const { addTableTemplate } = useAppStore();
  
  const [templateName, setTemplateName] = useState('');
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'col_1', name: '', width: 'min-w-[120px]' },
    { id: 'col_2', name: '', width: 'min-w-[120px]' },
    { id: 'col_3', name: '', width: 'min-w-[120px]' },
  ]);
  const [rows, setRows] = useState<any[]>([{}, {}]);
  
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickRows, setQuickRows] = useState(3);
  const [quickCols, setQuickCols] = useState(4);

  const handleQuickCreate = () => {
    const newCols: TableColumn[] = Array.from({ length: quickCols }).map((_, i) => ({
      id: `col_${Date.now()}_${i}`,
      name: '',
      width: 'min-w-[120px]',
    }));
    const newRows = Array.from({ length: quickRows }).map(() => ({}));
    setColumns(newCols);
    setRows(newRows);
    setShowQuickCreate(false);
  };

  const updateColumnName = (idx: number, name: string) => {
    const newCols = [...columns];
    newCols[idx].name = name;
    setColumns(newCols);
  };

  const updateCellValue = (rIdx: number, colId: string, val: string) => {
    const newRows = [...rows];
    newRows[rIdx][colId] = val;
    setRows(newRows);
  };

  const addColumn = () => {
    setColumns([...columns, { id: `col_${Date.now()}`, name: '', width: 'min-w-[120px]' }]);
  };

  const addRow = () => {
    setRows([...rows, {}]);
  };

  const handleSave = () => {
    if (!templateName.trim() || columns.length === 0) return;
    const newTemplate: TableTemplate = {
      id: `tpl-${Date.now()}`,
      name: templateName,
      columns: columns,
      defaultRows: rows,
    };
    addTableTemplate(newTemplate);
    onSelect(newTemplate.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TableIcon size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-navy uppercase tracking-wider leading-none mb-1">
                Tạo mẫu bảng mới
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Thiết kế cấu trúc báo cáo bằng giao diện lưới trực quan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-hidden flex flex-col flex-1 gap-6 bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Tên mẫu bảng</label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="VD: Kế hoạch thực tập, Báo cáo vật tư..."
                className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-bold text-zinc-800 shadow-sm"
              />
            </div>
            
            <div className="relative">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 opacity-0">Công cụ</label>
              <button 
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors shadow-sm"
              >
                <LayoutGrid size={14} /> Tạo bảng nhanh
              </button>
              
              {showQuickCreate && (
                <div className="absolute right-0 top-[110%] w-64 bg-white border border-zinc-200 shadow-xl rounded-xl p-4 z-10">
                  <h4 className="text-sm font-bold text-navy mb-3">Tạo lưới tự động</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Cột</label>
                      <input type="number" min="1" value={quickCols} onChange={e => setQuickCols(Number(e.target.value))} className="w-full px-3 py-1.5 text-sm font-bold border border-zinc-200 rounded-lg text-center" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Hàng</label>
                      <input type="number" min="0" value={quickRows} onChange={e => setQuickRows(Number(e.target.value))} className="w-full px-3 py-1.5 text-sm font-bold border border-zinc-200 rounded-lg text-center" />
                    </div>
                  </div>
                  <button onClick={handleQuickCreate} className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90">Áp dụng ngay</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                Bản xem trước & Chỉnh sửa lưới
              </div>
              <div className="flex gap-2">
                 <button onClick={addRow} className="px-3 py-1 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-[11px] font-bold hover:bg-zinc-50">+ Thêm hàng</button>
                 <button onClick={addColumn} className="px-3 py-1 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-[11px] font-bold hover:bg-zinc-50">+ Thêm cột</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={col.id} className="border border-zinc-300 p-0 align-top relative min-w-[150px]">
                        <input
                          type="text"
                          value={col.name}
                          onChange={e => updateColumnName(idx, e.target.value)}
                          className="w-full px-3 py-2.5 bg-zinc-50 text-xs font-bold text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary uppercase tracking-wide"
                          placeholder="Nhập tên cột..."
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {columns.map(col => (
                        <td key={col.id} className="border border-zinc-300 p-0 text-sm">
                          <input
                            type="text"
                            value={row[col.id] || ''}
                            onChange={e => updateCellValue(rIdx, col.id, e.target.value)}
                            placeholder="Dữ liệu mẫu..."
                            className="w-full px-3 py-2.5 bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50 text-xs hover:bg-zinc-50/50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-400 text-xs font-medium">
                        Bảng hiện tại không có dữ liệu mẫu. Khi chọn mẫu này, hệ thống sẽ tạo một bảng trống với các cột ở trên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={!templateName.trim() || columns.length === 0}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} /> Lưu & Chọn làm mẫu
          </button>
        </div>
      </motion.div>
    </div>
  );
};
