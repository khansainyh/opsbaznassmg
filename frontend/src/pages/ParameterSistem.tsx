import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  TrendingDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [messages, setMessages] = useState<{ type: 'success' | 'error', text: string }[]>([]);

  useEffect(() => {
    fetchParameters();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

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
      setMessages([{ type: 'error', text: 'Gagal mengambil data parameter.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string, description: string | null) => {
    setSaving(key);
    try {
      await axios.post('http://127.0.0.1:4000/api/parameters', { key, value, description });
      setMessages([{ type: 'success', text: 'Parameter Berhasil Diperbarui' }]);
      fetchParameters();
    } catch (err) {
      console.error('Failed to update parameter:', err);
      setMessages([{ type: 'error', text: 'Gagal memperbarui parameter.' }]);
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
    <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col h-screen">
      {/* Header - Matching User Management */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings2 className="size-6 text-primary" />
              Parameter Sistem
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Kelola informasi dinamis yang digunakan dalam kalkulasi sistem.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          
          {/* Toast Notifications */}
          <AnimatePresence>
            {messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed top-8 right-8 z-[100] flex flex-col gap-2 w-80 shadow-2xl"
              >
                {messages.map((msg, idx) => (
                  <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
                    msg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {msg.type === 'success'
                      ? <CheckCircle2 className="size-5 shrink-0" />
                      : <AlertCircle className="size-5 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-1">
                        {msg.type === 'success' ? 'Berhasil' : 'Gagal'}
                      </p>
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
                      onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLElement).querySelector('input');
                        if (input) {
                          handleUpdate(param.key, input.value, param.description);
                        }
                      }}
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
        </div>
      </main>
    </div>
  );
}
