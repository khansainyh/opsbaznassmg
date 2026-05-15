import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  TrendingDown
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface SystemParameter {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export default function ParameterSistem() {
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:4000/api/parameters');
      setParameters(res.data);
      
      // Ensure Garis Kemiskinan BPS exists
      const hasBps = res.data.find((p: any) => p.key === 'GARIS_KEMISKINAN_BPS');
      if (!hasBps) {
        // Initial seed if not exists
        const defaultBps = {
          key: 'GARIS_KEMISKINAN_BPS',
          value: '709785',
          description: 'Garis Kemiskinan BPS (Rp per kapita per bulan) untuk evaluasi Mustahik.'
        };
        await axios.post('http://127.0.0.1:4000/api/parameters', defaultBps);
        fetchParameters();
      }
    } catch (err) {
      console.error('Failed to fetch parameters:', err);
      setMessage({ type: 'error', text: 'Gagal mengambil data parameter.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string, description: string | null) => {
    setSaving(key);
    setMessage(null);
    try {
      await axios.post('http://127.0.0.1:4000/api/parameters', { key, value, description });
      setMessage({ type: 'success', text: 'Parameter berhasil diperbarui.' });
      fetchParameters();
    } catch (err) {
      console.error('Failed to update parameter:', err);
      setMessage({ type: 'error', text: 'Gagal memperbarui parameter.' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-primary/10">
              <Settings2 className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Parameter Sistem</h1>
              <p className="text-sm text-slate-500 font-medium">Kelola informasi dinamis yang digunakan dalam kalkulasi sistem.</p>
            </div>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl flex items-center gap-3 border shadow-sm",
              message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
            <span className="text-sm font-bold">{message.text}</span>
          </motion.div>
        )}

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 gap-6">
          {parameters.map((param) => (
            <motion.div 
              key={param.key}
              layout
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-primary/30 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      {param.key.replace(/_/g, ' ')}
                    </h3>
                    <div className="p-1 bg-slate-100 rounded-md group-hover:bg-primary/10 transition-colors">
                      <TrendingDown className="size-3 text-slate-400 group-hover:text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md">
                    {param.description}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter pt-2">
                    Terakhir diperbarui: {new Date(param.updatedAt).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-48">
                    <input 
                      type="text"
                      defaultValue={param.value}
                      onBlur={(e) => {
                        if (e.target.value !== param.value) {
                          handleUpdate(param.key, e.target.value, param.description);
                        }
                      }}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Info className="size-4" />
                    </div>
                  </div>
                  
                  <button 
                    disabled={saving === param.key}
                    className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {saving === param.key ? (
                      <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-amber-200 shrink-0">
            <AlertCircle className="size-5 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-900">Perhatian</h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Perubahan pada parameter sistem akan langsung berdampak pada perhitungan kalkulasi di seluruh modul terkait (seperti Tim Survei). Harap pastikan data yang dimasukkan sudah sesuai dengan ketentuan terbaru dari instansi terkait.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
