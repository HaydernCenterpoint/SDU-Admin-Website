import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  comment?: string;
}

interface AuditTimelineProps {
  logs: AuditLogEntry[];
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs }) => {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent dark:before:via-zinc-800">
      {logs.map((log, idx) => (
        <motion.div 
          key={log.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative flex items-start gap-6 group"
        >
          <div className={`mt-1 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 z-10 shadow-sm transition-transform group-hover:scale-110 ${
            log.action.includes('Duyệt') || log.action.includes('Phê duyệt') || log.action.includes('Nghiệm thu') 
              ? 'bg-emerald-500 text-white' 
              : log.action.includes('Gửi') || log.action.includes('Nộp')
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-400 text-white'
          }`}>
            {log.action.includes('Duyệt') ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          </div>
          
          <div className="flex-1 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm group-hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{log.action}</span>
                <span className="text-xs text-zinc-400 font-medium">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                <User size={14} className="text-zinc-400" /> {log.actor}
              </div>
            </div>
            
            {log.comment ? (
              <div className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                <MessageSquare size={16} className="text-zinc-300 mt-0.5" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">"{log.comment}"</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Đã thực hiện thao tác {log.action.toLowerCase()} trên hồ sơ.</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AuditTimeline;
