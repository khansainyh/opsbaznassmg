import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Minimal 6 karakter', ok: password.length >= 6 },
    { label: 'Mengandung huruf besar', ok: /[A-Z]/.test(password) },
    { label: 'Mengandung angka', ok: /[0-9]/.test(password) },
    { label: 'Mengandung karakter spesial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const strengthLabel = score <= 1 ? 'Lemah' : score === 2 ? 'Cukup' : score === 3 ? 'Kuat' : 'Sangat Kuat';
  const strengthColor = score <= 1 ? 'bg-rose-500' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-500' : 'bg-emerald-500';
  const strengthTextColor = score <= 1 ? 'text-rose-600' : score === 2 ? 'text-amber-600' : score === 3 ? 'text-blue-600' : 'text-emerald-600';

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kekuatan Password</span>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${strengthTextColor}`}>{strengthLabel}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < score ? strengthColor : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {checks.map((c, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[10px] font-medium ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {c.ok
              ? <CheckCircle2 className="size-3 shrink-0" />
              : <div className="size-3 rounded-full border border-slate-300 shrink-0" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GantiPassword() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ type: 'success' | 'error'; text: string }[]>([]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessages([{ type, text }]);
    setTimeout(() => setMessages([]), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('error', 'Konfirmasi password tidak cocok dengan password baru.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('error', 'Password baru minimal 6 karakter.');
      return;
    }
    if (oldPassword === newPassword) {
      showToast('error', 'Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`/api/users/${user?.id}/change-password`, {
        oldPassword,
        newPassword,
      });
      showToast('success', 'Password berhasil diperbarui! Gunakan password baru saat login berikutnya.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal memperbarui password. Coba lagi.';
      showToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-8 right-8 z-[100] flex flex-col gap-2 w-80 shadow-2xl"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
                  msg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {msg.type === 'success'
                  ? <CheckCircle2 className="size-5 shrink-0" />
                  : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{msg.type === 'success' ? 'Berhasil' : 'Gagal'}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
                <button
                  onClick={() => setMessages(messages.filter((_, i) => i !== idx))}
                  className="shrink-0 p-1 hover:bg-black/5 rounded-md"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ganti Password</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Perbarui kata sandi akun Anda untuk menjaga keamanan.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-lg mx-auto">

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6"
          >
            <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" />
              <div>
                <p className="font-bold text-slate-800 text-sm">Akun yang aktif</p>
                <p className="text-xs text-slate-500 font-medium">{user?.name} · <span className="uppercase">{user?.role ? (user.role.startsWith('Kabag') && !user.role.includes('Administrasi') ? user.role.replace('Kabag', 'Kabid').replace(/_/g, ' ') : user.role.replace(/_/g, ' ')) : ''}</span></p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Masukkan password lama Anda terlebih dahulu untuk verifikasi, kemudian buat password baru yang kuat.
                Password tidak akan tersimpan dalam bentuk teks biasa.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Lock className="size-4 text-slate-500" />
                Form Perubahan Password
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Password Lama */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Password Lama
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini..."
                    className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-5">
                {/* Password Baru */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Buat password baru..."
                      className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={newPassword} />
                </div>

                {/* Konfirmasi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru..."
                      className={`w-full px-4 py-2.5 pr-11 bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all text-sm font-medium ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="size-3" /> Password tidak cocok
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Password cocok
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Simpan Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
