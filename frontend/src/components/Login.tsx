import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center">
          <img 
            src="https://cdn.haitrieu.com/wp-content/uploads/2022/11/Logo-Dai-hoc-Sao-Do-956x1024.png" 
            alt="Đại học Sao Đỏ" 
            className="w-24 h-24 object-contain drop-shadow-md"
          />
          <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900">
            Đăng nhập hệ thống
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Đại học Sao Đỏ - Quản lý Kế hoạch
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã giảng viên</label>
              <input
                type="text"
                required
                className="appearance-none w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] sm:text-sm shadow-sm"
                placeholder="VD: 1000001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                required
                className="appearance-none w-full px-4 py-3 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] sm:text-sm shadow-sm"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#CC0000] hover:bg-[#990000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC0000] transition-colors"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <button onClick={onSwitchToRegister} className="font-medium text-[#CC0000] hover:text-[#990000]">
              Đăng ký ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
