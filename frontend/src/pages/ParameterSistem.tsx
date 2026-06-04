import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Save, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle,
  Coins,
  Scale,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ParameterItem {
  key: string;
  value: string;
  description: string;
}

export default function ParameterSistem() {
  const [params, setParams] = useState<ParameterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form values state mapped by parameter key
  const [formValues, setFormValues] = useState<Record<string, string>>({
    hak_amil_zakat_maal: '12.5',
    hak_amil_infak_sedekah: '20.0',
    hak_amil_zakat_fitrah: '0',
    bps_garis_kemiskinan: '709000',
    upz_hak_salur_persentase: '30'
  });

  // Fetch parameters from backend API
  const fetchParameters = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/parameters');
      setParams(res.data);
      
      // Map API array to form state dictionary
      const valuesMap: Record<string, string> = {};
      res.data.forEach((p: ParameterItem) => {
        valuesMap[p.key] = p.value;
      });
      setFormValues(prev => ({ ...prev, ...valuesMap }));
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat parameter sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (key: string, val: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send sequential posts or individual posts to update each parameter
      const updatePromises = Object.entries(formValues).map(([key, value]) => {
        const matchingParam = params.find(p => p.key === key);
        return axios.post('http://127.0.0.1:4000/api/parameters', {
          key,
          value: value.toString(),
          description: matchingParam?.description || ''
        });
      });

      await Promise.all(updatePromises);
      showToast('Parameter sistem berhasil disimpan!', 'success');
      fetchParameters();
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan parameter.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: string) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-55/30">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border text-sm font-bold",
              toast.type === 'success' 
                ? "bg-emerald-50 text-emerald-800 border-emerald-150" 
                : "bg-rose-50 text-rose-800 border-rose-150"
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="size-5 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title & Description */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Parameter Sistem</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Parameter Sistem BAZNAS
            </h2>
            <p className="text-slate-500 font-medium">
              Konfigurasi persentase Hak Amil dan garis kemiskinan BPS secara dinamis tanpa mengubah baris kode program.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">Memuat ketentuan parameter...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Card: HAK AMIL */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Coins className="size-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900">Parameter Hak Amil</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Persentase (%)</p>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1">
                {/* Hak Amil Zakat Maal */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Hak Amil Zakat Maal
                    </label>
                    <span className="text-[10px] bg-indigo-50 text-primary font-black px-2 py-0.5 rounded">Standard BAZNAS: 12.5%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-50 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.hak_amil_zakat_maal}
                      onChange={(e) => handleInputChange('hak_amil_zakat_maal', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-450">%</span>
                  </div>
                </div>

                {/* Hak Amil Infak/Sedekah */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Hak Amil Infak/Sedekah
                    </label>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-black px-2 py-0.5 rounded">Standard BAZNAS: 20.0%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-50 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.hak_amil_infak_sedekah}
                      onChange={(e) => handleInputChange('hak_amil_infak_sedekah', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-455">%</span>
                  </div>
                </div>

                {/* Hak Amil Zakat Fitrah (UPZ) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Hak Amil Zakat Fitrah (UPZ)
                    </label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded">Standard BAZNAS: 0%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-50 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.hak_amil_zakat_fitrah}
                      onChange={(e) => handleInputChange('hak_amil_zakat_fitrah', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-455">%</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Card: PENDISTRIBUSIAN */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Scale className="size-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900">Parameter Pendistribusian</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">BPS &amp; UPZ</p>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1">
                {/* Garis Kemiskinan BPS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Garis Kemiskinan BPS (per Kapita)
                    </label>
                    <span className="text-[10px] bg-amber-50 text-amber-600 font-black px-2 py-0.5 rounded">Rupiah (Rp)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full text-sm font-bold bg-slate-50 border-slate-200 rounded-xl pr-4 pl-12 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.bps_garis_kemiskinan}
                      onChange={(e) => handleInputChange('bps_garis_kemiskinan', e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Nilai Kalkulasi: <span className="font-bold text-slate-650">{formatCurrency(formValues.bps_garis_kemiskinan)}</span> per kepala keluarga per bulan.
                  </p>
                </div>

                {/* Persentase Hak Salur UPZ */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Persentase Hak Salur UPZ
                    </label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded">Standard UPZ: 30%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-50 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.upz_hak_salur_persentase}
                      onChange={(e) => handleInputChange('upz_hak_salur_persentase', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-455">%</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150/40"
          >
            <button 
              type="button" 
              onClick={fetchParameters}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-55 text-xs font-black rounded-xl text-slate-600 transition-all active:scale-95 disabled:opacity-60"
            >
              <RotateCcw className="size-4" />
              RESET NILAI
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary/95 shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  MENYIMPAN...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  SIMPAN PARAMETER
                </>
              )}
            </button>
          </motion.div>

        </form>
      )}

    </div>
  );
}
