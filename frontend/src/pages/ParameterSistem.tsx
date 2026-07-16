import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Save, 
  RotateCcw,
  CheckCircle2, 
  AlertCircle,
  Scale,
  ChevronRight,
  Plus,
  Trash2,
  Settings,
  ClipboardList,
  Cloud,
  FolderOpen,
  Info,
  HelpCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface ParameterItem {
  key: string;
  value: string;
  description: string;
}

interface ParameterSistemProps {
  onObsMenuToggle?: (enabled: boolean) => void;
}

export default function ParameterSistem({ onObsMenuToggle }: ParameterSistemProps = {}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [params, setParams] = useState<ParameterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'utama' | 'survei'>('utama');
  const [selectedSurveyType, setSelectedSurveyType] = useState<'perorangan_konsumtif' | 'perorangan_produktif' | 'lembaga'>('perorangan_konsumtif');
  const [surveyTemplate, setSurveyTemplate] = useState<any[]>([]);
  const [showDriveGuide, setShowDriveGuide] = useState(false);
  const [testingConnection, setTestingConnection] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    proposal: 'idle',
    survei: 'idle',
    sk_upz: 'idle',
    surat: 'idle',
    penerimaan: 'idle',
    kuitansi: 'idle'
  });

  const handleTestConnection = async (category: 'proposal' | 'survei' | 'sk_upz' | 'surat' | 'penerimaan' | 'kuitansi') => {
    const folderId = formValues[`gdrive_folder_${category}`];
    if (!folderId || folderId.trim() === '') {
      showToast('Masukkan Folder ID terlebih dahulu sebelum melakukan uji koneksi.', 'error');
      return;
    }

    setTestingConnection(prev => ({ ...prev, [category]: 'loading' }));

    try {
      const res = await axios.post('/api/parameters/test-gdrive', { folderId });
      if (res.data.status === 'success') {
        const info = res.data.data;
        if (info.simulated) {
          showToast(`[SIMULASI] Koneksi berhasil (mode simulasi): "${info.name}"`, 'success');
        } else {
          showToast(`Uji koneksi berhasil ke folder: "${info.name}"!`, 'success');
        }
        setTestingConnection(prev => ({ ...prev, [category]: 'success' }));
      } else {
        showToast(res.data.message || 'Uji koneksi gagal.', 'error');
        setTestingConnection(prev => ({ ...prev, [category]: 'error' }));
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Gagal menghubungi server untuk uji koneksi.';
      showToast(errMsg, 'error');
      setTestingConnection(prev => ({ ...prev, [category]: 'error' }));
    } finally {
      setTimeout(() => {
        setTestingConnection(prev => ({ ...prev, [category]: 'idle' }));
      }, 4000);
    }
  };

  // Form values state mapped by parameter key
  const [formValues, setFormValues] = useState<Record<string, string>>({
    bps_garis_kemiskinan: '709000',
    upz_hak_salur_persentase: '30',
    upz_hak_salur_pengumpulan: '30',
    upz_hak_salur_pembantuan: '70',
    rkat_pengumpulan_no_zakat: '3',
    rkat_pengumpulan_no_infak: '8',
    coa_penerimaan_zakat: '41020201',
    coa_penerimaan_infak: '42020101',
    obs_menu_enabled: 'false',
    gdrive_folder_proposal: '',
    gdrive_folder_survei: '',
    gdrive_folder_sk_upz: '',
    gdrive_folder_surat: '',
    gdrive_folder_penerimaan: '',
    gdrive_folder_kuitansi: ''
  });

  // Load active template whenever survey type selection or loaded formValues change
  useEffect(() => {
    const activeKey = selectedSurveyType === 'perorangan_konsumtif' 
      ? 'survey_template_individu' 
      : selectedSurveyType === 'perorangan_produktif' 
        ? 'survey_template_perorangan_produktif' 
        : 'survey_template_lembaga';
    
    if (formValues[activeKey]) {
      try {
        setSurveyTemplate(JSON.parse(formValues[activeKey]));
      } catch (e) {
        console.error('Failed to parse survey template JSON', e);
      }
    } else {
      setSurveyTemplate([]);
    }
  }, [selectedSurveyType, formValues]);

  // Fetch parameters from backend API
  const fetchParameters = async () => {
    setLoading(true);
    try {
      const resParams = await axios.get('/api/parameters');
      setParams(resParams.data);
      
      // Map API array to form state dictionary
      const valuesMap: Record<string, string> = {};
      resParams.data.forEach((p: ParameterItem) => {
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

  const handleObsToggle = async () => {
    const currentValue = formValues.obs_menu_enabled;
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    // Update local state instantly for UI feedback
    setFormValues(prev => ({
      ...prev,
      obs_menu_enabled: newValue
    }));

    try {
      const matchingParam = params.find(p => p.key === 'obs_menu_enabled');
      await axios.post('/api/parameters', {
        key: 'obs_menu_enabled',
        value: newValue,
        description: matchingParam?.description || 'Status Menu Off-Balancing Aktif (true/false)'
      });
      
      showToast(
        newValue === 'true'
          ? 'Modul Off-Balancing berhasil diaktifkan!'
          : 'Modul Off-Balancing berhasil dinonaktifkan!',
        'success'
      );
      
      if (onObsMenuToggle) {
        onObsMenuToggle(newValue === 'true');
      }
      
      // Refresh parameters in background to sync params state
      const resParams = await axios.get('/api/parameters');
      setParams(resParams.data);
    } catch (error) {
      console.error(error);
      showToast('Gagal mengubah status modul Off-Balancing.', 'error');
      // Revert the state on error
      setFormValues(prev => ({
        ...prev,
        obs_menu_enabled: currentValue
      }));
    }
  };

  const handleUpdateQuestionLabel = (index: number, label: string) => {
    setSurveyTemplate(prev => prev.map((q, i) => i === index ? { ...q, label } : q));
  };

  const handleUpdateQuestionType = (index: number, type: 'radio' | 'checkbox' | 'text') => {
    setSurveyTemplate(prev => prev.map((q, i) => i === index ? { ...q, type } : q));
  };

  const handleUpdateOptionLabel = (questionIndex: number, optionIndex: number, label: string) => {
    setSurveyTemplate(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const options = q.options.map((opt: any, oi: number) => oi === optionIndex ? { ...opt, label } : opt);
      return { ...q, options };
    }));
  };

  const handleUpdateOptionVal = (questionIndex: number, optionIndex: number, val: number) => {
    setSurveyTemplate(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const options = q.options.map((opt: any, oi: number) => oi === optionIndex ? { ...opt, val } : opt);
      return { ...q, options };
    }));
  };

  const handleAddOption = (questionIndex: number) => {
    setSurveyTemplate(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const newVal = q.options.length > 0 ? Math.max(...q.options.map((o: any) => o.val)) + 1 : 1;
      const options = [...q.options, { val: newVal, label: 'Opsi Baru' }];
      return { ...q, options };
    }));
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    setSurveyTemplate(prev => prev.map((q, i) => {
      if (i !== questionIndex) return q;
      const options = q.options.filter((_: any, oi: number) => oi !== optionIndex);
      return { ...q, options };
    }));
  };

  const handleAddQuestion = (section: string, sectionTitle: string) => {
    const newId = `customPertanyaan_${Date.now()}`;
    const newQuestion = {
      id: newId,
      section,
      sectionTitle,
      label: 'Pertanyaan Baru',
      type: 'radio',
      options: [
        { val: 3, label: 'Opsi Tinggi / Kurang Mampu' },
        { val: 2, label: 'Opsi Sedang' },
        { val: 1, label: 'Opsi Mampu / Standard' }
      ]
    };
    setSurveyTemplate(prev => [...prev, newQuestion]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus pertanyaan ini?')) {
      setSurveyTemplate(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Exclude survey templates and obs_menu_enabled as they are saved separately
      const excludedKeys = ['survey_template_individu', 'survey_template_perorangan_produktif', 'survey_template_lembaga', 'obs_menu_enabled'];
      
      const fallbackDescriptions: Record<string, string> = {
        gdrive_folder_proposal: 'Google Drive Folder ID: Scan Proposal',
        gdrive_folder_survei: 'Google Drive Folder ID: Foto Survei Relawan',
        gdrive_folder_sk_upz: 'Google Drive Folder ID: SK UPZ',
        gdrive_folder_surat: 'Google Drive Folder ID: Surat',
        gdrive_folder_penerimaan: 'Google Drive Folder ID: Foto Penerimaan',
        gdrive_folder_kuitansi: 'Google Drive Folder ID: Foto Kuitansi'
      };

      const updatePromises = Object.entries(formValues)
        .filter(([key]) => !excludedKeys.includes(key))
        .map(([key, value]) => {
          const matchingParam = params.find(p => p.key === key);
          return axios.post('/api/parameters', {
            key,
            value: value ? value.toString() : '',
            description: matchingParam?.description || fallbackDescriptions[key] || ''
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

  const handleSaveSurveyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const activeKey = selectedSurveyType === 'perorangan_konsumtif' 
      ? 'survey_template_individu' 
      : selectedSurveyType === 'perorangan_produktif' 
        ? 'survey_template_perorangan_produktif' 
        : 'survey_template_lembaga';
    
    const activeDescription = selectedSurveyType === 'perorangan_konsumtif' 
      ? 'Template Form Asesmen Individu / Perorangan Konsumtif (JSON)' 
      : selectedSurveyType === 'perorangan_produktif' 
        ? 'Template Form Asesmen Perorangan Produktif (JSON)' 
        : 'Template Form Asesmen Lembaga (JSON)';

    try {
      await axios.post('/api/parameters', {
        key: activeKey,
        value: JSON.stringify(surveyTemplate),
        description: activeDescription
      });
      showToast('Format formulir survei berhasil diperbarui!', 'success');
      fetchParameters();
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan format formulir survei.', 'error');
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Header */}
      <div className="space-y-2">
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Pengaturan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Parameter Sistem</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Parameter & Ketetapan Sistem
        </h2>
        <p className="text-slate-500 font-medium">
          {isSuperAdmin 
            ? "Atur hak amil, batas kemiskinan, serta format formulir survei lapangan."
            : "Aktifkan atau nonaktifkan modul eksternal Off-Balancing (OBS)."}
        </p>
      </div>

      {isSuperAdmin ? (
        <>
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('utama')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
            activeTab === 'utama'
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Settings className="size-4" />
          Parameter Utama
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('survei')}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
            activeTab === 'survei'
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <ClipboardList className="size-4" />
          Format Formulir Survei
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">Memuat ketentuan parameter...</p>
        </div>
      ) : activeTab === 'utama' ? (
        <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: PENDISTRIBUSIAN */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
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
                      className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl pr-4 pl-12 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.bps_garis_kemiskinan}
                      onChange={(e) => handleInputChange('bps_garis_kemiskinan', e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Nilai Kalkulasi: <span className="font-bold text-slate-650">{formatCurrency(formValues.bps_garis_kemiskinan)}</span> per kepala keluarga per bulan.
                  </p>
                </div>

                 {/* Persentase Hak Tasaruf UPZ Pengumpulan */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Hak Tasaruf UPZ Pengumpulan
                    </label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded">Standard: 30%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.upz_hak_salur_pengumpulan}
                      onChange={(e) => handleInputChange('upz_hak_salur_pengumpulan', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-455">%</span>
                  </div>
                </div>

                {/* Persentase Hak Tasaruf UPZ Pembantuan */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Hak Tasaruf UPZ Pembantuan Pendistribusian &amp; Pendayagunaan
                    </label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded">Standard: 70%</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100"
                      className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl pr-12 pl-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                      value={formValues.upz_hak_salur_pembantuan}
                      onChange={(e) => handleInputChange('upz_hak_salur_pembantuan', e.target.value)}
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-455">%</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: INTEGRASI BANK JATENG & RKAT/COA */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900">Parameter Integrasi &amp; COA Bank Jateng</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pemetaan RKAT &amp; Kode Akun (COA) Penerimaan UPZ Pengumpulan</p>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1">
                {/* RKAT No Zakat */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                    Nomor RKAT Zakat Maal UPZ
                  </label>
                  <input 
                    type="text" 
                    className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={formValues.rkat_pengumpulan_no_zakat || '3'}
                    onChange={(e) => handleInputChange('rkat_pengumpulan_no_zakat', e.target.value)}
                    required
                  />
                </div>

                {/* RKAT No Infak */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                    Nomor RKAT Infak/Sedekah UPZ
                  </label>
                  <input 
                    type="text" 
                    className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={formValues.rkat_pengumpulan_no_infak || '8'}
                    onChange={(e) => handleInputChange('rkat_pengumpulan_no_infak', e.target.value)}
                    required
                  />
                </div>

                {/* COA Zakat */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                    Kode COA Kredit Zakat Maal
                  </label>
                  <input 
                    type="text" 
                    className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={formValues.coa_penerimaan_zakat || '41020201'}
                    onChange={(e) => handleInputChange('coa_penerimaan_zakat', e.target.value)}
                    required
                  />
                </div>

                {/* COA Infak */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                    Kode COA Kredit Infak/Sedekah
                  </label>
                  <input 
                    type="text" 
                    className="w-full text-sm font-bold bg-slate-55 border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={formValues.coa_penerimaan_infak || '42020101'}
                    onChange={(e) => handleInputChange('coa_penerimaan_infak', e.target.value)}
                    required
                  />
                </div>
              </div>
            </motion.div>

            {/* Card 3: INTEGRASI GOOGLE DRIVE */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden flex flex-col md:col-span-2 shadow-sky-50/20"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <Cloud className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-slate-900">Integrasi Penyimpanan Cloud (Google Drive)</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Konfigurasi Folder Penyimpanan Lampiran Dinamis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDriveGuide(!showDriveGuide)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-lg transition-all"
                >
                  <HelpCircle className="size-4 text-slate-500" />
                  {showDriveGuide ? 'Sembunyikan Panduan' : 'Lihat Panduan Setup'}
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Panduan Setup Google Drive (Collapsible) */}
                <AnimatePresence>
                  {showDriveGuide && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-6 mb-6 space-y-4 text-xs text-slate-600">
                        <div className="flex items-center gap-2 text-sky-850 font-black uppercase tracking-wider">
                          <Info className="size-4 text-sky-655" />
                          <span>Langkah-langkah Setup Google Drive API</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-2 font-medium">
                          <li>Buka folder penyimpanan di Google Drive pribadi atau instansi Anda.</li>
                          <li>Bagikan (Share) folder tersebut ke email Service Account (lihat file <code className="bg-sky-100 text-sky-850 px-1 py-0.5 rounded font-mono font-bold">service-account.json</code> di backend): <code className="bg-sky-105 text-sky-900 px-1 py-0.5 rounded font-mono font-bold">client_email</code>.</li>
                          <li>Pastikan memberikan hak akses sebagai <strong className="text-sky-900 font-bold">Editor</strong> agar sistem dapat mengunggah file.</li>
                          <li>Salin <strong className="text-sky-900 font-bold">Folder ID</strong> dari URL browser.</li>
                        </ol>
                        <div className="p-3 bg-white/80 rounded-xl border border-sky-200/50 text-[11px] font-mono flex items-center justify-between">
                          <span className="text-slate-400">https://drive.google.com/drive/folders/<strong className="text-primary underline">1AbCdEfGhIjKlMnOpQrStUvWxYz</strong></span>
                          <span className="bg-primary/10 text-primary font-black px-2 py-0.5 rounded uppercase text-[9px] tracking-wider">Folder ID Anda</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Folder Proposal */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: Scan Proposal
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_proposal || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_proposal', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-450 font-medium">
                        Menyimpan file hasil scan berkas proposal pemohon bantuan.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('proposal')}
                        disabled={testingConnection.proposal === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.proposal === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-450 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.proposal === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Folder Survei */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: Foto Survei
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_survei || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_survei', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-455 font-medium">
                        Menyimpan lampiran foto survei lapangan mustahik oleh relawan.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('survei')}
                        disabled={testingConnection.survei === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.survei === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-455 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.survei === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Folder SK UPZ */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: SK UPZ
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_sk_upz || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_sk_upz', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-455 font-medium">
                        Menyimpan salinan digital Surat Keputusan (SK) Kepengurusan UPZ.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('sk_upz')}
                        disabled={testingConnection.sk_upz === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.sk_upz === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-455 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.sk_upz === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Folder Surat */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: Surat
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_surat || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_surat', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-455 font-medium">
                        Menyimpan salinan digital berkas surat masuk dan surat keluar.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('surat')}
                        disabled={testingConnection.surat === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.surat === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-455 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.surat === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Folder Foto Penerimaan */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: Foto Penerimaan
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_penerimaan || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_penerimaan', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-455 font-medium">
                        Menyimpan dokumentasi foto serah terima bantuan/penerimaan realisasi.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('penerimaan')}
                        disabled={testingConnection.penerimaan === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.penerimaan === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-455 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.penerimaan === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Folder Foto Kuitansi */}
                  <div className="space-y-2 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest">
                          Folder ID: Kuitansi
                        </label>
                        <FolderOpen className="size-4 text-slate-450" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Contoh: 1AbCdEfGhIj..."
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                        value={formValues.gdrive_folder_kuitansi || ''}
                        onChange={(e) => handleInputChange('gdrive_folder_kuitansi', e.target.value)}
                      />
                      <p className="text-[10px] text-slate-455 font-medium">
                        Menyimpan salinan digital foto kuitansi atau bukti pembayaran.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100/60 mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestConnection('kuitansi')}
                        disabled={testingConnection.kuitansi === 'loading'}
                        className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
                      >
                        {testingConnection.kuitansi === 'loading' ? (
                          <>
                            <div className="size-3 border border-slate-455 border-t-transparent rounded-full animate-spin" />
                            Menguji...
                          </>
                        ) : testingConnection.kuitansi === 'success' ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Koneksi OK
                          </>
                        ) : (
                          'Uji Koneksi'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 4: PENGATURAN MENU FITUR */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden flex flex-col md:col-span-2"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Settings className="size-5" />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900">Pengaturan Fitur Tambahan</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Aktifkan / Nonaktifkan Modul Sistem</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Modul Off-Balancing (OBS)</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Mengaktifkan menu <strong>Off-Balancing</strong> dan <strong>Survei OBS</strong> di Sidebar untuk Staf Pelaporan, Distribusi, dan Relawan Lapangan. (Biasa diaktifkan tiap akhir semester: Juni &amp; Desember).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleObsToggle}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      formValues.obs_menu_enabled === 'true' ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        formValues.obs_menu_enabled === 'true' ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
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
      ) : (
        <div className="space-y-8 max-w-4xl">
          {/* Sub-tabs for Survey Types */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit gap-1 border border-slate-200">
            {[
              { id: 'perorangan_konsumtif', name: 'Perorangan Konsumtif' },
              { id: 'perorangan_produktif', name: 'Perorangan Produktif' },
              { id: 'lembaga', name: 'Lembaga' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedSurveyType(type.id as any)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                  selectedSurveyType === type.id
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {type.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveSurveyTemplate} className="space-y-8">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-850 flex items-start gap-2.5">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 mb-0.5">Perhatian Pengubahan Format Survei:</p>
                <p>Mengubah format atau opsi di sini akan langsung mempengaruhi tampilan pengisian formulir survei oleh Relawan Lapangan. Nilai skor pada opsi digunakan untuk menentukan tingkat urgensi mustahik secara otomatis.</p>
              </div>
            </div>

            <div className="space-y-8">
              {(selectedSurveyType === 'lembaga'
                ? [
                    { code: 'A', title: 'Bagian A: Profil Lembaga' },
                    { code: 'B', title: 'Bagian B: Kelayakan' }
                  ]
                : [
                    { code: 'A', title: 'Bagian A: Kondisi Rumah' },
                    { code: 'B', title: 'Bagian B: Kondisi Ekonomi' },
                    { code: 'C', title: 'Bagian C: Kondisi Fisik & Tanggungan' }
                  ]
              ).map(section => {
              const sectionQuestions = surveyTemplate.filter(q => q.section === section.code);
              
              return (
                <div key={section.code} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-black text-slate-900">{section.title}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {sectionQuestions.length} Pertanyaan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(section.code, section.title)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary text-xs font-black rounded-lg hover:text-white transition-all"
                    >
                      <Plus className="size-3.5" />
                      Tambah Pertanyaan
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {sectionQuestions.map((q, idx) => {
                      const actualIndex = surveyTemplate.findIndex(sq => sq.id === q.id);
                      if (actualIndex === -1) return null;

                      return (
                        <div 
                          key={q.id} 
                          className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-4"
                        >
                          {/* Header Pertanyaan */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-200/50">
                                Pertanyaan #{idx + 1}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                ID: {q.id.replace('customPertanyaan_', '')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(actualIndex)}
                              className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-55 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-all"
                              title="Hapus Pertanyaan"
                            >
                              <Trash2 className="size-3.5" />
                              HAPUS
                            </button>
                          </div>

                          {/* Detail Pertanyaan */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Teks/Label Pertanyaan
                              </label>
                              <input
                                type="text"
                                value={q.label}
                                onChange={(e) => handleUpdateQuestionLabel(actualIndex, e.target.value)}
                                className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Tipe Pertanyaan
                              </label>
                              <select
                                value={q.type || 'radio'}
                                onChange={(e: any) => handleUpdateQuestionType(actualIndex, e.target.value)}
                                className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-primary focus:border-primary outline-none transition-all shadow-inner"
                              >
                                <option value="radio">Pilihan Tunggal</option>
                                <option value="checkbox">Pilihan Ganda</option>
                                <option value="text">Isian Bebas</option>
                              </select>
                            </div>
                          </div>

                          {/* Opsi Jawaban */}
                          {q.type !== 'text' && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-3 shadow-inner">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-505 uppercase tracking-widest">
                                  Opsi Jawaban &amp; Skor/Poin
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(actualIndex)}
                                  className="flex items-center gap-1 text-[10px] text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg font-black transition-all"
                                >
                                  <Plus className="size-3" /> Tambah Opsi
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-2.5">
                                {q.options?.map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <div className="w-20 shrink-0">
                                      <input
                                        type="number"
                                        value={opt.val}
                                        onChange={(e) => handleUpdateOptionVal(actualIndex, optIdx, parseInt(e.target.value) || 0)}
                                        placeholder="Skor"
                                        className="w-full text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:ring-primary focus:border-primary outline-none"
                                        required
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => handleUpdateOptionLabel(actualIndex, optIdx, e.target.value)}
                                        placeholder="Label Opsi Jawaban"
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-primary focus:border-primary outline-none"
                                        required
                                      />
                                    </div>
                                    {q.options.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOption(actualIndex, optIdx)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Hapus Opsi"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {sectionQuestions.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs font-medium italic">
                        Belum ada pertanyaan di bagian ini.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150/40"
          >
            <button 
              type="button" 
              onClick={fetchParameters}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-55 text-xs font-black rounded-xl text-slate-650 transition-all active:scale-95 disabled:opacity-60"
            >
              <RotateCcw className="size-4" />
              RESET
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
                  SIMPAN FORMAT SURVEI
                </>
              )}
            </button>
          </motion.div>
        </form>
        </div>
      )}
        </>
      ) : (
        <div className="max-w-4xl bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Modul Off-Balancing (OBS)</h4>
                <p className="text-xs text-slate-550 font-bold uppercase tracking-wider mt-0.5">Pengaktifan Fitur Tambahan</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Mengaktifkan menu <strong>Off-Balancing</strong> dan <strong>Survei OBS</strong> di Sidebar untuk Staf Pelaporan, Distribusi, dan Relawan Lapangan. (Biasa diaktifkan tiap akhir semester: Juni &amp; Desember).
                </p>
              </div>
              <button
                type="button"
                onClick={handleObsToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  formValues.obs_menu_enabled === 'true' ? "bg-primary" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    formValues.obs_menu_enabled === 'true' ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold",
              toast.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 text-rose-600" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
