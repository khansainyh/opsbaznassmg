import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Lock, Mail, Loader2, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (errorToast) {
      const t = setTimeout(() => setErrorToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [errorToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorToast('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.status === 'success') {
        login(response.data.data.user, response.data.data.token);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan saat menghubungi server. Pastikan koneksi Anda stabil.';
      setErrorToast(msg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      {/* Toast Error Popup */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-2xl flex items-start gap-3">
              <div className="size-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold mb-0.5">Login Gagal</p>
                <p className="text-xs font-medium leading-relaxed">{errorToast}</p>
              </div>
              <button
                onClick={() => setErrorToast('')}
                className="shrink-0 p-1 hover:bg-red-100 rounded-lg transition-colors mt-0.5"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-primary px-8 py-10 text-center">
          <div className="bg-white size-24 rounded-2xl flex items-center justify-center mx-auto mb-4 p-1 shadow-sm">
            <img src="/LogoBAZNASHUB.svg" className="w-full h-full object-contain" alt="BAZNAS Logo" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">BAZNAS Operational</h1>
          <p className="text-primary-foreground/80 text-sm">Masuk ke sistem pengelolaan dan distribusi</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Akses</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 text-sm font-medium"
                  placeholder="admin@baznas.org"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  MENGAUTENTIKASI...
                </>
              ) : (
                'MASUK SEKARANG'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Sistem Operasional BAZNAS &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
