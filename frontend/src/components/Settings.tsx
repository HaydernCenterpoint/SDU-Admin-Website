import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Moon, Sun, Monitor, Shield, Mail, Smartphone, Globe, Save } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Settings = () => {
  const { theme, setTheme } = useAppStore();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [reportNotif, setReportNotif] = useState(false);

  const handleSave = () => {
    alert('Cài đặt đã được lưu!');
  };

  return (
    <div className="space-y-6 animate-in max-w-4xl mx-auto pb-10">
      <div className="page-header flex justify-between items-end">
        <div>
          <h2 className="page-title">Cài đặt hệ thống</h2>
          <p className="page-subtitle">Tùy chỉnh giao diện, thông báo và trải nghiệm hệ thống.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC0000] text-white font-bold rounded-xl shadow-md hover:bg-[#990000] transition-colors"
        >
          <Save size={16} />
          Lưu cài đặt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Nav */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white text-[#CC0000] font-bold rounded-xl shadow-sm border border-slate-100">
            <Bell size={18} /> Giao diện & Thông báo
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-100 transition-colors">
            <Shield size={18} /> Quyền riêng tư
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-100 transition-colors">
            <Globe size={18} /> Ngôn ngữ & Khu vực
          </button>
        </div>

        {/* Right Content */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card: Giao diện */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h3 className="text-lg font-black text-navy mb-1">Giao diện (Theme)</h3>
            <p className="text-sm text-slate-500 mb-5">Chọn giao diện phân giải theo sở thích của bạn.</p>
            
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-[#CC0000] bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Sun size={24} className={theme === 'light' ? 'text-[#CC0000]' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-[#CC0000]' : 'text-slate-600'}`}>Sáng</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-[#CC0000] bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Moon size={24} className={theme === 'dark' ? 'text-[#CC0000]' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[#CC0000]' : 'text-slate-600'}`}>Tối</span>
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-[#CC0000] bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Monitor size={24} className={theme === 'system' ? 'text-[#CC0000]' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${theme === 'system' ? 'text-[#CC0000]' : 'text-slate-600'}`}>Hệ thống</span>
              </button>
            </div>
          </motion.div>

          {/* Card: Thông báo */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h3 className="text-lg font-black text-navy mb-1">Tùy chọn thông báo</h3>
            <p className="text-sm text-slate-500 mb-5">Quản lý cách hệ thống gửi thông báo bảo vệ và cập nhật kế hoạch cho bạn.</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Thông báo qua Email</p>
                    <p className="text-xs text-slate-500">Nhận thông báo khi có người bình luận hoặc duyệt kế hoạch.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Thông báo đẩy (Push Notifications)</p>
                    <p className="text-xs text-slate-500">Hiển thị thông báo trên trình duyệt ngay lập tức.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={pushNotif} onChange={(e) => setPushNotif(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Báo cáo tổng hợp tuần</p>
                    <p className="text-xs text-slate-500">Gửi tự động vào sáng thứ Hai hàng tuần qua email.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={reportNotif} onChange={(e) => setReportNotif(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CC0000]"></div>
                </label>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
