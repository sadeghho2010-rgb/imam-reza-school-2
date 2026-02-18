import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { LogIn, UserPlus, Phone, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { DEFAULT_PERMISSIONS, ADMIN_USER } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    try {
      if (isRegistering) {
        const users = await dbService.getUsers();
        if (users.find(u => u.username.toLowerCase() === cleanUsername)) {
          setError('نام کاربری تکراری است');
          setIsLoading(false);
          return;
        }
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          username: cleanUsername,
          password: cleanPassword,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          title: 'کاربر عادی',
          role: UserRole.CUSTOM,
          isActive: true,
          permissions: DEFAULT_PERMISSIONS
        };
        await dbService.saveUser(newUser);
        setIsRegistering(false);
        setError('ثبت‌نام با موفقیت انجام شد. اکنون وارد شوید.');
      } else {
        // چک کردن ادمین اصلی به صورت هاردکد شده برای اطمینان ۱۰۰ درصدی
        if (cleanUsername === ADMIN_USER.username && cleanPassword === ADMIN_USER.password) {
           onLogin(ADMIN_USER);
           return;
        }

        const users = await dbService.getUsers();
        const user = users.find(u => 
          u.username.toLowerCase() === cleanUsername && 
          u.password === cleanPassword
        );
        
        if (user) {
          onLogin(user);
        } else {
          setError('نام کاربری یا رمز عبور اشتباه است');
        }
      }
    } catch (e: any) {
      setError("خطای ارتباطی با سرور. لطفاً از فیلترشکن یا DNS استفاده کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/50 rounded-full filter blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-100/50 rounded-full filter blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl p-10 md:p-14 relative z-10 border border-white">
        <div className="text-center mb-12">
          <div className="w-28 h-28 bg-emerald-600 rounded-[2.5rem] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-emerald-200 rotate-6 transition-transform hover:rotate-0 duration-500">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-3">مدرسه علمیه امام رضا (ع)</h1>
          <p className="text-gray-400 font-bold text-sm">سامانه جامع مدیریت و ثبت مصوبات</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-[11px] font-black mb-8 text-center animate-shake border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <>
              <div className="relative group">
                <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="نام و نام خانوادگی" 
                  required
                  className="w-full pr-16 pl-6 py-5 bg-white/50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-black font-black placeholder:text-gray-300"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="relative group">
                <Phone className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="tel" 
                  placeholder="شماره موبایل" 
                  required
                  className="w-full pr-16 pl-6 py-5 bg-white/50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-black font-black placeholder:text-gray-300"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="relative group">
            <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="نام کاربری" 
              required
              className="w-full pr-16 pl-6 py-5 bg-white/50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-black font-black placeholder:text-gray-300"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              disabled={isLoading}
            />
          </div>

          <div className="relative group">
            <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input 
              type="password" 
              placeholder="رمز عبور" 
              required
              className="w-full pr-16 pl-6 py-5 bg-white/50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-black font-black placeholder:text-gray-300"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 disabled:bg-gray-400 disabled:shadow-none"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : (isRegistering ? <UserPlus size={24} /> : <LogIn size={24} />)}
            {isLoading ? 'در حال تایید...' : (isRegistering ? 'ایجاد حساب کاربری' : 'ورود به سامانه')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            disabled={isLoading}
            className="text-gray-500 text-sm font-black hover:text-emerald-600 transition-colors decoration-emerald-200 decoration-2 underline-offset-8 hover:underline disabled:opacity-50"
          >
            {isRegistering ? 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید' : 'حساب کاربری ندارید؟ همین حالا عضو شوید'}
          </button>
        </div>
      </div>
      
      <p className="mt-12 text-gray-400 text-[10px] font-black tracking-widest uppercase opacity-40">Designed for Imam Reza Seminary (A.S)</p>
    </div>
  );
};

export default Login;