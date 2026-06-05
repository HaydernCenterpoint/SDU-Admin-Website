import React, { useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import {
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

type FileType = 'pdf' | 'docx' | 'xlsx' | 'unknown';

interface FilePreviewProps {
  filePath: string;  // e.g. "plans/abc123.pdf"
  fileName?: string;
  fileUrl?: string;
}

// ---------- Utility ----------
export function getFileType(fileName?: string, filePath?: string): FileType {
  const name = (fileName || filePath || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  return 'unknown';
}

export function fileTypeLabel(ft: FileType): string {
  switch (ft) {
    case 'pdf': return 'PDF';
    case 'docx': return 'Word (DOCX)';
    case 'xlsx': return 'Excel (XLSX)';
    default: return 'Tài liệu';
  }
}

export function FileIcon({ type }: { type: FileType }) {
  switch (type) {
    case 'pdf': return <FileText size={16} className="text-red-500" />;
    case 'docx': return <FileText size={16} className="text-blue-500" />;
    case 'xlsx': return <FileSpreadsheet size={16} className="text-emerald-500" />;
    default: return <File size={16} className="text-zinc-500" />;
  }
}

/**
 * Fetch file as base64 JSON, then decode to ArrayBuffer.
 * IDM cannot intercept JSON responses - guaranteed fix.
 */
async function fetchFileData(filePath: string): Promise<ArrayBuffer> {
  const response = await fetch('/api/preview-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  // Decode base64 natively using fetch (super fast and doesn't block main thread)
  const dataUri = `data:application/pdf;base64,${json.data}`;
  const dataRes = await fetch(dataUri);
  return dataRes.arrayBuffer();
}

// Import the worker locally so we never rely on external CDNs or get blocked
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// ============================================================
// PDF Sub-Viewer (react-pdf-viewer)
// ============================================================
const PDFSubViewer: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    let cancelled = false;
    let urlToRevoke: string | null = null;
    setDataUrl(null);
    setError('');

    fetchFileData(filePath)
      .then(buffer => {
        if (!cancelled) {
          const blob = new Blob([buffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setDataUrl(url);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Không thể tải file PDF');
      });

    return () => { 
      cancelled = true; 
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [filePath]);

  if (error) return <ErrorBox message={error} />;
  if (!dataUrl) return <LoadingSpinner label="Đang tải PDF..." />;

  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-zinc-200">
      <Worker workerUrl={pdfWorkerUrl}>
        <Viewer 
          fileUrl={dataUrl} 
          plugins={[defaultLayoutPluginInstance]} 
          theme="dark"
        />
      </Worker>
    </div>
  );
};

// ============================================================
// DOCX Sub-Viewer (mammoth)
// ============================================================
const DocxSubViewer: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const mammoth = await import('mammoth');
        const arrayBuffer = await fetchFileData(filePath);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) {
          setHtml(result.value);
          setError('');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Không thể tải file Word');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) return <LoadingSpinner label="Đang chuyển đổi file Word..." />;
  if (error) return <ErrorBox message={`Lỗi đọc DOCX: ${error}`} />;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-blue-700 text-blue-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <FileText size={14} />
        <span className="text-xs font-bold">Xem trước tài liệu Word</span>
      </div>
      <div className="flex-1 overflow-auto bg-white p-8 docx-preview custom-scrollbar">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

// ============================================================
// Excel Sub-Viewer (xlsx / SheetJS)
// ============================================================
const ExcelSubViewer: React.FC<{ filePath: string }> = ({ filePath }) => {
  const [sheets, setSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const XLSX = await import('xlsx');
        const arrayBuffer = await fetchFileData(filePath);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const parsed = workbook.SheetNames.map(name => ({
          name,
          data: XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[name], { header: 1 }) as any[][],
        }));
        if (!cancelled) {
          setSheets(parsed);
          setError('');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Không thể tải file Excel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) return <LoadingSpinner label="Đang phân tích file Excel..." />;
  if (error) return <ErrorBox message={`Lỗi đọc Excel: ${error}`} />;
  if (sheets.length === 0) return <ErrorBox message="File Excel rỗng" />;

  const current = sheets[activeSheet];

  return (
    <div className="flex flex-col h-full">
      {/* Sheet tabs */}
      <div className="bg-emerald-700 text-emerald-100 px-4 py-2 flex items-center gap-3 shrink-0 overflow-x-auto">
        <FileSpreadsheet size={14} />
        {sheets.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActiveSheet(i)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              i === activeSheet
                ? 'bg-white text-emerald-700 shadow'
                : 'bg-emerald-600/50 hover:bg-emerald-600 text-emerald-100'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="border-collapse w-full text-xs">
          <tbody>
            {current.data.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'bg-emerald-50 font-bold sticky top-0 z-10' : ri % 2 === 0 ? 'bg-zinc-50/50' : ''}>
                {/* Row number */}
                <td className="border border-zinc-200 px-2 py-1.5 text-center text-zinc-400 bg-zinc-50 w-10 font-mono">{ri + 1}</td>
                {(row as any[]).map((cell, ci) => (
                  <td key={ci} className="border border-zinc-200 px-3 py-1.5 whitespace-nowrap max-w-[300px] truncate">
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================
// Shared Components
// ============================================================
const LoadingSpinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center p-20 text-zinc-400">
    <Loader2 size={32} className="animate-spin mb-4 text-primary" />
    <p className="text-sm font-bold animate-pulse">{label}</p>
  </div>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-16 text-zinc-400">
    <AlertTriangle size={36} className="mb-3 text-amber-400" />
    <p className="text-sm font-bold text-zinc-600 text-center max-w-xs">{message}</p>
    <p className="text-xs text-zinc-400 mt-2">Bạn có thể tải file về máy để xem.</p>
  </div>
);

// ============================================================
// MAIN: FilePreview
// ============================================================
const FilePreview: React.FC<FilePreviewProps> = ({ filePath, fileName }) => {
  const fileType = getFileType(fileName, filePath);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
      {fileType === 'pdf' && <PDFSubViewer filePath={filePath} />}
      {fileType === 'docx' && <DocxSubViewer filePath={filePath} />}
      {fileType === 'xlsx' && <ExcelSubViewer filePath={filePath} />}
      {fileType === 'unknown' && (
        <div className="flex flex-col items-center justify-center h-full p-16 text-zinc-400">
          <File size={48} className="mb-4 opacity-30" />
          <p className="text-sm font-bold text-zinc-500">Không hỗ trợ xem trước loại file này</p>
          <p className="text-xs text-zinc-400 mt-1">Vui lòng tải file về để xem nội dung chi tiết.</p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .react-pdf__Page__canvas {
          margin: 0 auto;
        }
        /* DOCX preview styles */
        .docx-preview h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; color: #18181b; }
        .docx-preview h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #27272a; }
        .docx-preview h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem; color: #3f3f46; }
        .docx-preview p { margin-bottom: 0.5rem; line-height: 1.7; color: #3f3f46; font-size: 0.9rem; }
        .docx-preview table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .docx-preview td, .docx-preview th { border: 1px solid #e4e4e7; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
        .docx-preview th { background-color: #f4f4f5; font-weight: 700; }
        .docx-preview ul, .docx-preview ol { padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .docx-preview li { margin-bottom: 0.25rem; line-height: 1.6; font-size: 0.9rem; }
        .docx-preview img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0; }
      `}</style>
    </div>
  );
};

export default FilePreview;
