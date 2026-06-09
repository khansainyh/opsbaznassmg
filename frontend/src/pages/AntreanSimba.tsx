import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, 
  HelpCircle, 
  Search,
  Save,
  Check,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanSimbaProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanSimba({ data, onUpdate }: AntreanSimbaProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'ready'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNrm, setEditingNrm] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Filter disbursed proposals (status is 'Selesai & Arsip')
  const disbursedProposals = useMemo(() => {
    return data.filter(p => p.status === 'Selesai & Arsip');
  }, [data]);

  // Group into pending NRM and ready NRM
  const pendingNrmList = useMemo(() => {
    return disbursedProposals.filter(p => !p.mustahik?.nrm);
  }, [disbursedProposals]);

  const readyNrmList = useMemo(() => {
    return disbursedProposals.filter(p => !!p.mustahik?.nrm);
  }, [disbursedProposals]);

  // Handle NRM input changes
  const handleNrmChange = (proposalId: string, value: string) => {
    setEditingNrm(prev => ({ ...prev, [proposalId]: value }));
  };

  // Save NRM to database
  const handleSaveNrm = async (proposalId: string, mustahikId: string) => {
    const nrmValue = editingNrm[proposalId]?.trim();
    if (!nrmValue) {
      alert('Mohon masukkan Nomor Register Mustahik (NRM) terlebih dahulu.');
      return;
    }

    setSavingId(proposalId);
    try {
      const res = await axios.put(`/api/mustahik/${mustahikId}`, {
        nrm: nrmValue
      });

      if (res.data?.status === 'success' || res.status === 200) {
        const updated = data.map(p => {
          if (p.id === proposalId) {
            return {
              ...p,
              mustahik: {
                ...p.mustahik,
                nrm: nrmValue
              }
            };
          }
          return p;
        });
        onUpdate(updated);
        setEditingNrm(prev => {
          const next = { ...prev };
          delete next[proposalId];
          return next;
        });
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal menyimpan NRM: ' + (e.response?.data?.message || e.message));
    } finally {
      setSavingId(null);
    }
  };

  // Mark SIMBA Sync as completed -> move to 'Realisasi Bantuan'
  const handleCompleteSync = async (proposalId: string) => {
    setSyncingId(proposalId);
    try {
      const res = await axios.put(`/api/proposals/${proposalId}`, {
        status: 'Realisasi_Bantuan'
      });

      if (res.status === 200) {
        const updated = data.map(p => {
          if (p.id === proposalId) {
            return { ...p, status: 'Realisasi Bantuan' };
          }
          return p;
        });
        onUpdate(updated);
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal menyelesaikan sinkronisasi: ' + (e.response?.data?.error || e.message));
    } finally {
      setSyncingId(null);
    }
  };

  const currentList = activeTab === 'pending' ? pendingNrmList : readyNrmList;
  const filteredList = useMemo(() => {
    return currentList.filter(p => 
      p.agendaNo.toString().includes(searchTerm) ||
      p.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mustahik?.nrm || '').includes(searchTerm)
    );
  }, [currentList, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Pendistribusian</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Antrean SIMBA</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Antrean Sinkronisasi SIMBA</h2>
        <p className="text-slate-500 font-medium">
          Sinkronisasikan data proposal yang telah dicairkan bank ke sistem SIMBA Pusat BAZNAS untuk penerbitan kuitansi resmi.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-rose-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="size-5" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Belum Ada NRM</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {pendingNrmList.length} <span className="text-xs font-medium text-slate-400">Proposal</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Perlu didaftarkan di SIMBA Pusat untuk nomor registrasi</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Check className="size-5" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider font-semibold">Sudah Ada NRM (Siap Sinkron)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {readyNrmList.length} <span className="text-xs font-medium text-slate-400">Proposal</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Siap dicetak kuitansi dan ditandai selesai sinkronisasi</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-black gap-1 self-start w-fit">
        <button
          onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
          className={cn(
            "px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold",
            activeTab === 'pending'
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-rose-250" />
          Belum Ada NRM ({pendingNrmList.length})
        </button>

        <button
          onClick={() => { setActiveTab('ready'); setSearchTerm(''); }}
          className={cn(
            "px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-bold",
            activeTab === 'ready'
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-250" />
          Sudah Ada NRM ({readyNrmList.length})
        </button>
      </div>

      {/* Instruction Alert Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-primary/10 p-6 rounded-2xl shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <HelpCircle className="size-5 text-primary" />
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Petunjuk Sinkronisasi SIMBA</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Langkah 1</span>
            <p className="font-bold text-slate-800">Daftarkan Mustahik</p>
            <p className="text-[11px] text-slate-500 leading-normal">Buka web SIMBA resmi BAZNAS di tab terpisah dan daftarkan mustahik.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Langkah 2</span>
            <p className="font-bold text-slate-800">Salin NRM</p>
            <p className="text-[11px] text-slate-500 leading-normal">Setelah didaftarkan, salin Nomor Register Mustahik (NRM) dari sistem SIMBA.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Langkah 3</span>
            <p className="font-bold text-slate-800">Simpan NRM</p>
            <p className="text-[11px] text-slate-500 leading-normal">Tempelkan NRM ke input proposal bersangkutan di tabel bawah, lalu simpan.</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Langkah 4</span>
            <p className="font-bold text-slate-800">Finalisasi</p>
            <p className="text-[11px] text-slate-500 leading-normal">Cetak kuitansi resmi di SIMBA, kemudian klik tombol "Selesai" di aplikasi.</p>
          </div>
        </div>
      </motion.div>

      {/* Filter and Queue Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari agenda atau nama mustahik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
            />
          </div>
          
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            Menampilkan {filteredList.length} dari {currentList.length} Antrean
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4 w-16">No</th>
                <th className="px-6 py-4 w-28">No. Agenda</th>
                <th className="px-6 py-4">Nama Mustahik</th>
                <th className="px-6 py-4">Tgl Cair Bank</th>
                <th className="px-6 py-4 text-center w-80">NRM (Nomor Register Mustahik)</th>
                <th className="px-6 py-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <AnimatePresence mode="popLayout">
                {filteredList.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                      {searchTerm ? 'Pencarian tidak ditemukan' : 'Antrean sinkronisasi SIMBA kosong'}
                    </td>
                  </tr>
                ) : filteredList.map((item, idx) => {
                  const savedNrm = item.mustahik?.nrm || '';
                  const draftNrm = editingNrm[item.id] !== undefined ? editingNrm[item.id] : savedNrm;
                  
                  return (
                    <motion.tr 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* 1. No */}
                      <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                      
                      {/* 2. Agenda */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 font-bold">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">
                          {String(item.agendaNo).padStart(3, '0')}
                        </span>
                      </td>
                      
                      {/* 3. Nama Mustahik */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{item.namaPemohon}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">NIK: {item.nik}</div>
                      </td>
                      
                      {/* 4. Tgl Cair Bank */}
                      <td className="px-6 py-4 font-bold text-slate-500 text-xs">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : '-'}
                      </td>
                      
                      {/* 5. NRM (Input / Text) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                          {activeTab === 'pending' ? (
                            <>
                              <input 
                                type="text"
                                placeholder="Ketik NRM disini..."
                                value={draftNrm}
                                onChange={(e) => handleNrmChange(item.id, e.target.value)}
                                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 outline-none text-center"
                              />
                              <button
                                onClick={() => handleSaveNrm(item.id, item.mustahik_id || '')}
                                disabled={savingId === item.id || !draftNrm}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-50 text-slate-700 flex items-center shrink-0 shadow-sm border border-slate-200"
                                title="Simpan NRM ke database"
                              >
                                {savingId === item.id ? (
                                  <RefreshCw className="size-4 animate-spin text-slate-500" />
                                ) : (
                                  <Save className="size-4 text-slate-500" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 font-mono text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                                {savedNrm}
                              </span>
                              <input 
                                type="text"
                                placeholder="Koreksi NRM..."
                                value={draftNrm}
                                onChange={(e) => handleNrmChange(item.id, e.target.value)}
                                className="w-28 text-[10px] font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500/20 outline-none text-center opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                              {draftNrm !== savedNrm && (
                                <button
                                  onClick={() => handleSaveNrm(item.id, item.mustahik_id || '')}
                                  disabled={savingId === item.id}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shrink-0"
                                >
                                  <Check className="size-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* 6. Action Button (Checklist) */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCompleteSync(item.id)}
                          disabled={syncingId === item.id || !savedNrm}
                          className="w-full max-w-[100px] mx-auto py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1"
                          title={!savedNrm ? 'Masukkan NRM terlebih dahulu' : 'Selesai Cetak Kuitansi SIMBA'}
                        >
                          {syncingId === item.id ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="size-3" />
                              Selesai
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
