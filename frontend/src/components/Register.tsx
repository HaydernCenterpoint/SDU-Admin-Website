import React, { useState, useEffect } from 'react';
import { useAppStore, api } from '../store/useAppStore';
import { User, Mail, Shield, Building2, Key, Calendar, UserRound, Briefcase, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDatePicker from './CustomDatePicker';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const CustomSelect = ({ value, onChange, options, icon: Icon, placeholder, disabled }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
      <div 
        className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all flex items-center justify-between border ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 opacity-70' : isOpen ? 'bg-white border-[#CC0000] ring-4 ring-[#CC0000]/10 cursor-pointer' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'}`}
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
      >
        <span className={selectedOption ? (disabled ? 'text-slate-500' : 'text-slate-700') : 'text-slate-400 font-medium'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.15)] overflow-hidden max-h-60 overflow-y-auto"
          >
            {options.map((opt: any) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-slate-50 flex flex-col ${value === opt.value ? 'bg-[#CC0000]/5 text-[#CC0000] border-l-2 border-[#CC0000]' : 'text-slate-600 border-l-2 border-transparent'}`}
              >
                <span className={`font-semibold ${value === opt.value ? 'text-[#CC0000]' : 'text-slate-700'}`}>{opt.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Nam');
  const [departmentId, setDepartmentId] = useState('');
  const [role, setRole] = useState('TEACHER');
  const [departments, setDepartments] = useState([]);
  
  const [successMsg, setSuccessMsg] = useState('');
  
  const { register, isLoading, error } = useAppStore();

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
    api.get('/users/next-code').then(res => setEmail(res.data.code)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ name, email, password, dob, gender, department_id: departmentId, role });
      const approver = role === 'QC' ? 'Ban Giám hiệu' : role === 'DEPT_HEAD' ? 'Ban Giám hiệu' : 'Trưởng khoa';
      setSuccessMsg(`Đăng ký thành công! Vui lòng chờ ${approver} phê duyệt để có thể đăng nhập.`);
      setName(''); setEmail(''); setPassword(''); setDob(''); setGender('Nam'); setDepartmentId(''); setRole('TEACHER');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-8 bg-white p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative z-10"
      >
        <div className="flex flex-col items-center">
          <img 
            src="https://cdn.haitrieu.com/wp-content/uploads/2022/11/Logo-Dai-hoc-Sao-Do-956x1024.png" 
            alt="Đại học Sao Đỏ" 
            className="w-24 h-24 object-contain drop-shadow-md"
          />
          <h2 className="mt-4 text-center text-3xl font-black text-navy tracking-tight">
            Đăng ký giảng viên
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-slate-500">
            Đại học Sao Đỏ - Quản lý Kế hoạch
          </p>
        </div>
        
        <AnimatePresence mode="wait">
          {successMsg ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
               <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl inline-block max-w-sm">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                    <Shield size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-800 mb-2">Hoàn tất!</h3>
                  <p className="text-sm font-medium text-emerald-600 leading-relaxed">{successMsg}</p>
               </div>
               <div>
                 <button onClick={onSwitchToLogin} className="mt-6 px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                    Trở lại Đăng nhập
                 </button>
               </div>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 space-y-6" 
              onSubmit={handleSubmit}
            >
              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                  <div className="mt-0.5"><Shield size={16} className="text-red-500" /></div>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}
              
              <div className="card p-6 border border-slate-100 bg-slate-50/50 shadow-sm">
                <h4 className="text-sm font-bold text-navy uppercase tracking-widest mb-6 border-b border-slate-200 pb-3">Chi tiết hồ sơ</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Họ và tên</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" required
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:ring-4 focus:ring-[#CC0000]/10 focus:border-[#CC0000] outline-none transition-all"
                        value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Mã giáo viên</label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" 
                        placeholder="Nhập mã giáo viên..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Ngày sinh</label>
                    <CustomDatePicker
                      value={dob}
                      onChange={(date) => setDob(date)}
                      mode="single"
                      placeholder="dd/mm/yyyy"
                      hideFooter={true}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Giới tính</label>
                    <CustomSelect 
                      value={gender} 
                      onChange={setGender} 
                      icon={UserRound}
                      placeholder="Chọn giới tính"
                      options={[
                        { value: 'Nam', label: 'Nam' },
                        { value: 'Nữ', label: 'Nữ' },
                        { value: 'Khác', label: 'Khác' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-bold block mb-1.5 ${role === 'QC' ? 'text-slate-400' : 'text-slate-600'}`}>Khoa / Đơn vị</label>
                    <CustomSelect 
                      value={departmentId} 
                      onChange={setDepartmentId} 
                      icon={Building2}
                      placeholder={role === 'QC' ? "Không áp dụng" : "-- Chọn khoa --"}
                      options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
                      disabled={role === 'QC'}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Chức vụ</label>
                    <CustomSelect 
                      value={role} 
                      onChange={(newRole: string) => {
                        setRole(newRole);
                        if (newRole === 'QC') setDepartmentId('');
                      }} 
                      icon={Briefcase}
                      placeholder="Chọn chức vụ"
                      options={[
                        { value: 'TEACHER', label: 'Giáo viên' },
                        { value: 'DEPT_HEAD', label: 'Trưởng khoa' },
                        { value: 'QC', label: 'Quản lý chất lượng' }
                      ]}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Cài đặt mật khẩu</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password" required minLength={6} placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:ring-4 focus:ring-[#CC0000]/10 focus:border-[#CC0000] outline-none transition-all"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent font-black rounded-xl text-white bg-[#CC0000] hover:bg-[#990000] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#CC0000]/30 transition-all disabled:pointer-events-none disabled:opacity-70"
                >
                  {isLoading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        
        {!successMsg && (
          <div className="text-center mt-6">
            <p className="text-sm font-medium text-slate-500">
              Đã có tài khoản?{' '}
              <button onClick={onSwitchToLogin} className="font-bold text-navy hover:text-[#CC0000] transition-colors underline decoration-2 underline-offset-4">
                Trở lại Đăng nhập
              </button>
            </p>
          </div>
        )}
      </motion.div>
      
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#CC0000]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-navy/5 blur-3xl pointer-events-none" />
    </div>
  );
};

export default Register;
