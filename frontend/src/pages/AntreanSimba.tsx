import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, 
  HelpCircle, 
  Search,
  Database,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
      // Update Mustahik NRM in the database
      const res = await axios.put(`http://127.0.0.1:4000/api/mustahik/${mustahikId}`, {
        nrm: nrmValue
      });

      if (res.data?.status === 'success' || res.status === 200) {
        // Sync parent state by updating local proposals array
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
        // Clear editing state
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
      // Update proposal status in the database to 'Realisasi Bantuan'
      const res = await axios.put(`http://127.0.0.1:4000/api/proposals/${proposalId}`, {
        status: 'Realisasi_Bantuan'
      });

      if (res.status === 200) {
        // Sync parent state
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

  // Filter current active list based on search term
  const currentList = activeTab === 'pending' ? pendingNrmList : readyNrmList;
  const filteredList = useMemo(() => {
    return currentList.filter(p => 
      p.agendaNo.toString().includes(searchTerm) ||
      p.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mustahik?.nrm || '').includes(searchTerm)
    );
  }, [currentList, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
      
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest">
            <Database className="size-4 text-primary animate-pulse" />
            Pendistribusian &amp; Pendayagunaan
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Antrean Sinkronisasi SIMBA</h2>
          <p className="text-slate-500 font-medium text-xs md:text-sm">
            Sinkronisasikan data proposal yang telah dicairkan bank ke sistem SIMBA Pusat BAZNAS untuk penerbitan kuitansi resmi.
          </p>
        </div>
      </motion.div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-black transition-all border-b-2 relative ${
            activeTab === 'pending'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="size-2 rounded-full bg-rose-500 animate-ping absolute top-0 right-0 -mr-1" />
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[10px] font-black text-rose-600">🔴</span>
          BELUM ADA NRM
          <span className="ml-1 px-2 py-0.5 rounded-md bg-rose-50 text-[11px] font-black">{pendingNrmList.length}</span>
        </button>

        <button
          onClick={() => { setActiveTab('ready'); setSearchTerm(''); }}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-black transition-all border-b-2 ${
            activeTab === 'ready'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600">🟢</span>
          SUDAH NRM
          <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-black">{readyNrmList.length}</span>
        </button>
      </div>

      {/* Instruction Alert Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl flex gap-3 text-xs md:text-sm text-amber-800 font-medium leading-relaxed"
      >
        <HelpCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-black text-amber-900">Petunjuk Operasional Sinkronisasi SIMBA:</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-amber-850">
            <li>Buka web SIMBA resmi BAZNAS di tab browser terpisah dan daftarkan nama mustahik yang bersangkutan.</li>
            <li>Setelah pendaftaran berhasil, salin <b>Nomor Register Mustahik (NRM)</b> yang diterbitkan oleh SIMBA.</li>
            <li>Tempelkan atau masukkan NRM tersebut ke dalam kolom input di bawah ini, lalu klik tombol simpan <b className="inline-flex items-center bg-white px-1.5 py-0.5 rounded border border-amber-200 text-[10px] text-slate-700 font-bold gap-1"><Save className="size-3 text-slate-500" /> Simpan</b>.</li>
            <li>Setelah NRM tersimpan, cetak Kuitansi Penyaluran di SIMBA, lalu klik tombol checklist <b className="inline-flex items-center bg-emerald-600 px-1.5 py-0.5 rounded text-[10px] text-white font-bold gap-1"><Check className="size-3 text-white" /> Selesai</b> untuk memindahkan data ke daftar Realisasi Bantuan.</li>
          </ol>
        </div>
      </motion.div>

      {/* Filter and Queue Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari agenda atau nama mustahik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
            />
          </div>
          
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menampilkan {filteredList.length} dari {currentList.length} Antrean
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">No. Agenda</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Mustahik</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tgl Cair Bank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-80">NRM (Nomor Register Mustahik)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-36">Aksi</th>
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
                      className="hover:bg-slate-50/30 transition-colors group"
                    >
                      {/* 1. No */}
                      <td className="px-6 py-5 font-bold text-slate-400">{idx + 1}</td>
                      
                      {/* 2. Agenda */}
                      <td className="px-6 py-5 font-mono text-xs text-slate-700 font-bold">
                        {String(item.agendaNo).padStart(3, '0')}
                      </td>
                      
                      {/* 3. Nama Mustahik */}
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800 text-sm">{item.namaPemohon}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">NIK: {item.nik}</div>
                      </td>
                      
                      {/* 4. Tgl Cair Bank */}
                      <td className="px-6 py-5 font-bold text-slate-600 text-xs">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        }) : '-'}
                      </td>
                      
                      {/* 5. NRM (Input / Text) */}
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                          {activeTab === 'pending' ? (
                            <>
                              <input 
                                type="text"
                                placeholder="Ketik NRM disini..."
                                value={draftNrm}
                                onChange={(e) => handleNrmChange(item.id, e.target.value)}
                                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 outline-none text-center"
                              />
                              <button
                                onClick={() => handleSaveNrm(item.id, item.mustahik_id || '')}
                                disabled={savingId === item.id || !draftNrm}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50 text-slate-700 flex items-center shrink-0 shadow-sm border border-slate-200"
                                title="Simpan NRM ke database"
                              >
                                {savingId === item.id ? (
                                  <RefreshCw className="size-4 animate-spin text-slate-500" />
                                ) : (
                                  <Save className="size-4" />
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
                                className="w-28 text-[10px] font-mono font-bold bg-slate-50/50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500/20 outline-none text-center opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                              {draftNrm !== savedNrm && (
                                <button
                                  onClick={() => handleSaveNrm(item.id, item.mustahik_id || '')}
                                  disabled={savingId === item.id}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all shrink-0"
                                >
                                  <Check className="size-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* 6. Action Button (Checklist) */}
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handleCompleteSync(item.id)}
                          disabled={syncingId === item.id || !savedNrm}
                          className="w-full max-w-[100px] mx-auto py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1"
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
