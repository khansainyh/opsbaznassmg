import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  RefreshCw, 
  HelpCircle, 
  Search,
  Save,
  Check,
  ChevronRight,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import * as XLSX from 'xlsx';

interface AntreanSimbaProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

const mapRawProposalToMemo = (item: any): ProposalMemo => {
  return {
    id: item.id,
    agendaNo: item.agenda_no,
    tanggalMasuk: item.tanggal_masuk ? new Date(item.tanggal_masuk).toISOString().split('T')[0] : '',
    namaInstansi: item.nama_instansi || '',
    pimpinanOrganisasi: item.pimpinan_organisasi || '',
    namaPemohon: item.nama_pemohon || '',
    namaAnak: item.nama_anak || '',
    nik: item.nik || '',
    alamat: item.alamat || '',
    kelurahan: item.kelurahan || '',
    kecamatan: item.kecamatan || '',
    pekerjaan: item.pekerjaan || '',
    jenisPermohonan: item.program ? item.program.name : (item.jenis_permohonan || ''),
    programCode: item.jenis_permohonan || '',
    noTelpon: item.no_telpon || '',
    jamPengajuan: item.jam_pengajuan || '',
    yangMengajukan: item.yang_mengajukan || '',
    hasMemo: !!item.has_memo,
    memoSource: item.memo_source || '',
    jenisPengajuan: item.jenis_ajuan || item.jenis_pengajuan || '',
    status: item.status ? item.status.replace(/_/g, ' ') : '',
    keterangan: item.keterangan || '',
    rekomendasi: item.rekomendasi || '',
    fileGdriveLink: item.file_gdrive_link || '',
    surveyorName: item.surveyorName || undefined,
    isBeingSurveyed: !!item.isBeingSurveyed,
    urgencyLevel: item.urgencyLevel || undefined,
    score: item.score || 0,
    surveySubmittedAt: item.surveySubmittedAt || undefined,
    survey_data: item.survey_data || undefined,
    catatanKepala: item.catatanKepala || undefined,
    nominal: item.nominal || 0,
    tipeBantuan: item.tipe_bantuan || '',
    alasanPerubahanNominal: item.alasan_perubahan_nominal || '',
    asnaf: item.asnaf || undefined,
    hasil_identifikasi: item.hasil_identifikasi || undefined,
    rekomendasi_kabag: item.rekomendasi_kabag || undefined,
    approval_kabag: item.approval_kabag !== null ? item.approval_kabag : undefined,
    rkatActivityId: item.rkat_activity_id || undefined,
    mustahik: item.mustahik || null,
    mustahik_id: item.mustahik_id || null,
    updatedAt: item.updated_at || '',
    is_rutin: item.is_rutin ?? false,
    frekuensi_berulang: item.frekuensi_berulang ?? undefined,
    tanggal_pencairan: item.tanggal_pencairan ?? undefined,
    butuh_survei: item.butuh_survei ?? true,
    penerima_detail: item.penerima_detail || [],
    program: item.program ? (
      item.program.pilar_code === '1100' || item.program.pilar_code === '2101' ? 'Semarang Peduli' :
      item.program.pilar_code === '1200' || item.program.pilar_code === '2201' ? 'Semarang Sehat' :
      item.program.pilar_code === '1300' || item.program.pilar_code === '2301' ? 'Semarang Cerdas' :
      item.program.pilar_code === '1400' || item.program.pilar_code === '2501' ? 'Semarang Taqwa' :
      item.program.pilar_code === '2100' || item.program.pilar_code === '2401' ? 'Semarang Makmur' :
      undefined
    ) : undefined
  };
};

export default function AntreanSimba({ data, onUpdate }: AntreanSimbaProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'ready'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNrm, setEditingNrm] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Auto-sync NRMs from Database on mount
  useEffect(() => {
    const autoSync = async () => {
      try {
        const res = await axios.post('/api/proposals/sync-nrm-from-mustahik');
        if (res.status === 200 && res.data?.status === 'success' && res.data.proposals) {
          onUpdate(res.data.proposals.map(mapRawProposalToMemo));
        }
      } catch (e) {
        console.error('[AUTO SYNC NRM ERROR]', e);
      }
    };
    autoSync();
  }, []);

  const handleSyncNrmFromMustahik = async () => {
    setIsSyncingAll(true);
    try {
      const res = await axios.post('/api/proposals/sync-nrm-from-mustahik');
      if (res.status === 200 && res.data?.status === 'success') {
        alert(res.data.message || 'Sinkronisasi NRM selesai.');
        if (res.data.proposals) {
          onUpdate(res.data.proposals.map(mapRawProposalToMemo));
        }
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal sinkronisasi NRM: ' + (e.response?.data?.error || e.message));
    } finally {
      setIsSyncingAll(false);
    }
  };

  // By Name Modal States
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [byNameList, setByNameList] = useState<any[]>([]);
  const [isSavingByName, setIsSavingByName] = useState(false);
  const [inputMethod, setInputMethod] = useState<'manual' | 'excel'>('manual');
  const [excelPasteText, setExcelPasteText] = useState('');

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formNik, setFormNik] = useState('');
  const [formNrm, setFormNrm] = useState('');
  const [formJk, setFormJk] = useState('Pria');
  const [formAlamat, setFormAlamat] = useState('');
  const [formTelpon, setFormTelpon] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');

  // Check Mustahik by NIK
  const handleCheckMustahikByNik = async (nikVal: string) => {
    if (nikVal.length !== 16) return;
    try {
      const res = await axios.get(`/api/mustahik/nik/${nikVal}`);
      if (res.status === 200 && res.data?.data) {
        const m = res.data.data;
        setFormNama(m.nama || '');
        if (m.nrm) setFormNrm(m.nrm);
        setFormJk(m.jenis_kelamin === 'Wanita' ? 'Wanita' : 'Pria');
        setFormAlamat(m.alamat || '');
        setFormTelpon(m.telepon || '');
        setFormHp(m.handphone || '');
        setFormKeterangan(m.catatan || '');
      }
    } catch (e) {
      // Ignored
    }
  };

  // Check Mustahik by NRM
  const handleCheckMustahikByNrm = async (nrmVal: string) => {
    const trimmed = nrmVal.trim();
    if (!trimmed) return;
    try {
      const res = await axios.get(`/api/mustahik/nrm/${trimmed}`);
      if (res.status === 200 && res.data?.data) {
        const m = res.data.data;
        setFormNama(m.nama || '');
        if (m.nik) setFormNik(m.nik);
        setFormJk(m.jenis_kelamin === 'Wanita' ? 'Wanita' : 'Pria');
        setFormAlamat(m.alamat || '');
        setFormTelpon(m.telepon || '');
        setFormHp(m.handphone || '');
        setFormKeterangan(m.catatan || '');
      }
    } catch (e) {
      // Ignored
    }
  };

  const disbursedProposals = useMemo(() => {
    const list = data || [];
    return list.filter(p => p.status === 'Selesai & Arsip');
  }, [data]);

  // Group into pending NRM and ready NRM (checking by-name sub-records if applicable)
  const pendingNrmList = useMemo(() => {
    return disbursedProposals.filter(p => {
      const isByName = p.jenisPengajuan === 'Lembaga' && p.penerima_detail && Array.isArray(p.penerima_detail) && p.penerima_detail.length > 0;
      if (isByName) {
        return (p.penerima_detail as any[]).some(item => !item.nrm);
      }
      return !p.mustahik?.nrm;
    });
  }, [disbursedProposals]);

  const readyNrmList = useMemo(() => {
    return disbursedProposals.filter(p => {
      const isByName = p.jenisPengajuan === 'Lembaga' && p.penerima_detail && Array.isArray(p.penerima_detail) && p.penerima_detail.length > 0;
      if (isByName) {
        const list = p.penerima_detail as any[];
        return list.length > 0 && list.every(item => !!item.nrm);
      }
      return !!p.mustahik?.nrm;
    });
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

  const handleOpenByNameModal = (proposal: ProposalMemo) => {
    setSelectedProposal(proposal);
    setByNameList(proposal.penerima_detail || []);
    setInputMethod('manual');
    setExcelPasteText('');
    // Reset form
    setFormNama('');
    setFormNik('');
    setFormNrm('');
    setFormJk('Pria');
    setFormAlamat('');
    setFormTelpon('');
    setFormHp('');
    setFormKeterangan('');
  };

  const handleAddByName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formNik || !formJk || !formAlamat) {
      alert('Mohon lengkapi data wajib (Nama Lengkap, NIK, Jenis Kelamin, Alamat).');
      return;
    }
    if (formNik.length !== 16) {
      alert('NIK harus terdiri dari 16 digit.');
      return;
    }

    const newItem = {
      nama_lengkap: formNama,
      nik: formNik,
      nrm: formNrm || '',
      jenis_kelamin: formJk,
      alamat: formAlamat,
      telepon: formTelpon,
      handphone: formHp,
      keterangan: formKeterangan
    };

    setByNameList(prev => [...prev, newItem]);
    
    // Reset fields
    setFormNama('');
    setFormNik('');
    setFormNrm('');
    setFormJk('Pria');
    setFormAlamat('');
    setFormTelpon('');
    setFormHp('');
    setFormKeterangan('');
  };

  const handleRemoveByName = (index: number) => {
    setByNameList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveByName = async () => {
    if (!selectedProposal) return;
    setIsSavingByName(true);
    try {
      const res = await axios.put(`/api/proposals/${selectedProposal.id}`, {
        penerima_detail: byNameList
      });

      if (res.status === 200) {
        const updated = data.map(p => {
          if (p.id === selectedProposal.id) {
            return {
              ...p,
              penerima_detail: byNameList
            };
          }
          return p;
        });
        onUpdate(updated);
        alert('Data penerima by-name berhasil disimpan.');
        setSelectedProposal(null);
      }
    } catch (e: any) {
      console.error(e);
      alert('Gagal menyimpan data penerima: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSavingByName(false);
    }
  };

  const downloadExcel = (proposal: ProposalMemo, list: any[]) => {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const dataToExport = list.map((p) => ({
      'Tanggal registrasi': todayStr,
      'Nama lengkap': p.nama_lengkap || '',
      'NIK': p.nik || '',
      'Jenis Kelamin (Pria/Wanita)': p.jenis_kelamin || 'Pria',
      'Alamat': p.alamat || proposal.alamat || '',
      'Telepon': p.telepon || p.handphone || '',
      'Handphone': '',
      'Email': p.email || '',
      'Keterangan': p.keterangan || proposal.keterangan || `Penerima By-Name Agenda ${proposal.agendaNo}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');
    XLSX.writeFile(workbook, `SIMBA_Penerima_ByName_Agenda_${proposal.agendaNo}.xlsx`);
  };

  const downloadTemplateExcel = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const templateData = [
      {
        'Tanggal registrasi': todayStr,
        'Nama lengkap': 'Ahmad Fauzi',
        'NIK': '3374123456789012',
        'Jenis Kelamin (Pria/Wanita)': 'Pria',
        'Alamat': 'Jl. Pemuda No. 123, Semarang',
        'Telepon': '081234567890',
        'Handphone': '',
        'Email': 'ahmad.fauzi@example.com',
        'Keterangan': 'Penerima Sembako'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');
    XLSX.writeFile(workbook, 'Template_Import_Penerima_ByName.xlsx');
  };

  const downloadAllPendingSimbaExcel = () => {
    const listToExport: any[] = [];
    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

    pendingNrmList.forEach(proposal => {
      const isByName = proposal.jenisPengajuan === 'Lembaga' && proposal.penerima_detail && Array.isArray(proposal.penerima_detail) && proposal.penerima_detail.length > 0;
      if (isByName) {
        (proposal.penerima_detail as any[]).forEach(item => {
          if (!item.nrm) {
            listToExport.push({
              'Tanggal registrasi': todayStr,
              'Nama lengkap': item.nama_lengkap || '',
              'NIK': item.nik || '',
              'Jenis Kelamin (Pria/Wanita)': item.jenis_kelamin || 'Pria',
              'Alamat': item.alamat || proposal.alamat || '',
              'Telepon': item.telepon || item.handphone || '',
              'Handphone': '',
              'Email': item.email || '',
              'Keterangan': item.keterangan || proposal.keterangan || `Penerima By-Name Agenda ${proposal.agendaNo}`
            });
          }
        });
      } else {
        if (!proposal.mustahik?.nrm) {
          listToExport.push({
            'Tanggal registrasi': todayStr,
            'Nama lengkap': proposal.namaPemohon || '',
            'NIK': proposal.nik || '',
            'Jenis Kelamin (Pria/Wanita)': proposal.mustahik?.jenis_kelamin || proposal.jenis_kelamin || 'Pria',
            'Alamat': proposal.mustahik?.alamat || proposal.alamat || '',
            'Telepon': proposal.mustahik?.telepon || proposal.mustahik?.handphone || proposal.noTelpon || '',
            'Handphone': '',
            'Email': proposal.mustahik?.email || '',
            'Keterangan': proposal.keterangan || ''
          });
        }
      }
    });

    if (listToExport.length === 0) {
      alert('Tidak ada data dalam antrean Belum Ada NRM yang bisa diunduh.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(listToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');
    XLSX.writeFile(workbook, `SIMBA_Antrean_Belum_Ada_NRM_${todayStr}.xlsx`);
  };

  const currentList = activeTab === 'pending' ? pendingNrmList : readyNrmList;
  const filteredList = useMemo(() => {
    return currentList.filter(p => {
      const agendaStr = p.agendaNo ? String(p.agendaNo) : '';
      const namaPemohonStr = p.namaPemohon ? String(p.namaPemohon).toLowerCase() : '';
      const searchLower = searchTerm.toLowerCase();

      const matchAgenda = agendaStr.includes(searchTerm);
      const matchNama = namaPemohonStr.includes(searchLower);
      const matchNrm = (p.mustahik?.nrm || '').includes(searchTerm);

      const matchByName = !!(p.penerima_detail && Array.isArray(p.penerima_detail) && 
        (p.penerima_detail as any[]).some(item => 
          (item.nrm || '').includes(searchTerm) || 
          (item.nama_lengkap || '').toLowerCase().includes(searchLower)
        ));

      return matchAgenda || matchNama || matchNrm || matchByName;
    });
  }, [currentList, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="space-y-2">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pendistribusian</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Antrean SIMBA</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Antrean Sinkronisasi SIMBA</h2>
          <p className="text-slate-500 font-medium max-w-3xl">
            Layanan integrasi dan sinkronisasi data mustahik penerima pencairan ke sistem SIMBA Pusat BAZNAS. Setelah data tersinkronisasi, rekam Nomor Register Mustahik (NRM) untuk finalisasi kuitansi.
          </p>
        </div>
        <button
          onClick={handleSyncNrmFromMustahik}
          disabled={isSyncingAll}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={cn("size-4", isSyncingAll && "animate-spin")} />
          Cek & Perbarui NRM
        </button>
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
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
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
            {activeTab === 'pending' && (
              <button
                onClick={downloadAllPendingSimbaExcel}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow active:scale-95 cursor-pointer shrink-0"
              >
                <Download className="size-4" />
                Unduh Template Reg SIMBA
              </button>
            )}
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
                  const isByName = item.jenisPengajuan === 'Lembaga' && item.penerima_detail && Array.isArray(item.penerima_detail) && item.penerima_detail.length > 0;
                  const savedNrm = item.mustahik?.nrm || '';
                  const draftNrm = editingNrm[item.id] !== undefined ? editingNrm[item.id] : savedNrm;
                  const isReady = isByName 
                    ? (item.penerima_detail as any[]).every(x => !!x.nrm)
                    : !!savedNrm;
                  
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
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 text-sm">{item.namaPemohon}</div>
                          {item.jenisPengajuan === 'Lembaga' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded border border-purple-200 uppercase">
                              Lembaga
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">NIK: {item.nik}</div>
                        
                        {/* By Name Button */}
                        <div className="mt-2">
                          <button
                            onClick={() => handleOpenByNameModal(item)}
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors border border-primary/20 bg-primary/5 px-2 py-1 rounded"
                          >
                            <Users className="size-3" />
                            Penerima By-Name ({item.penerima_detail?.length || 0})
                          </button>
                        </div>
                      </td>
                      
                      {/* 4. Tgl Cair Bank */}
                      <td className="px-6 py-4 font-bold text-slate-500 text-xs">
                        {(() => {
                          if (!item.updatedAt) return '-';
                          const d = new Date(item.updatedAt);
                          if (isNaN(d.getTime())) return '-';
                          return d.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          });
                        })()}
                      </td>
                      
                      {/* 5. NRM (Input / Text / By-Name Status) */}
                      <td className="px-6 py-4">
                        {isByName ? (
                          <div className="text-center">
                            <span className="px-2.5 py-1 text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 rounded-lg uppercase tracking-wider block w-fit mx-auto">
                              Registrasi Per-Mustahik
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold block mt-1">
                              {item.penerima_detail && Array.isArray(item.penerima_detail)
                                ? `${(item.penerima_detail as any[]).filter((x: any) => !!x.nrm).length} dari ${(item.penerima_detail as any[]).length} NRM Terisi`
                                : '0 Mustahik'
                              }
                            </span>
                          </div>
                        ) : (
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
                        )}
                      </td>
                      
                      {/* 6. Action Button (Checklist) */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCompleteSync(item.id)}
                          disabled={syncingId === item.id || !isReady}
                          className="w-full max-w-[100px] mx-auto py-2 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1"
                          title={!isReady ? (isByName ? 'Lengkapi NRM seluruh Mustahik di tombol By-Name terlebih dahulu' : 'Masukkan NRM terlebih dahulu') : 'Selesai Cetak Kuitansi SIMBA'}
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

      {/* Modal Kelola Penerima By-Name */}
      <AnimatePresence>
        {selectedProposal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedProposal(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        {activeTab === 'ready' ? 'Detail Penerima By-Name' : 'Kelola Penerima By-Name'}
                      </h3>
                      {activeTab === 'ready' && (
                        <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-250 rounded uppercase tracking-wider">
                          Read-Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Agenda No: {String(selectedProposal.agendaNo).padStart(3, '0')} | Lembaga: {selectedProposal.namaPemohon}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {byNameList.length > 0 && activeTab !== 'ready' && (
                    <button
                      onClick={() => downloadExcel(selectedProposal, byNameList)}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all flex items-center gap-1.5 border border-slate-200"
                    >
                      <Download className="size-3.5" />
                      Download Excel
                    </button>
                  )}
                  <button onClick={() => setSelectedProposal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="size-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
                
                {/* Form Add (Left Column) */}
                {activeTab !== 'ready' && (
                  <div className="w-full lg:w-[440px] shrink-0 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5 h-fit">
                  <div className="flex bg-slate-100 p-1.5 rounded-xl text-xs font-bold gap-1.5 border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setInputMethod('manual')}
                      className={cn(
                        "flex-1 py-2 rounded-lg transition-all font-bold text-center uppercase tracking-wider text-xs",
                        inputMethod === 'manual'
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Input Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMethod('excel')}
                      className={cn(
                        "flex-1 py-2 rounded-lg transition-all font-bold text-center uppercase tracking-wider text-xs",
                        inputMethod === 'excel'
                          ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Paste Excel
                    </button>
                  </div>

                  {inputMethod === 'manual' ? (
                    <form onSubmit={handleAddByName} className="space-y-4">
                      
                      {/* Nama Lengkap (Wajib) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          value={formNama}
                          onChange={(e) => setFormNama(e.target.value)}
                          placeholder="Ketik nama lengkap..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      {/* NIK (Wajib) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          NIK (16 Digit) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text"
                          maxLength={16}
                          required
                          value={formNik}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormNik(val);
                            if (val.length === 16) {
                              handleCheckMustahikByNik(val);
                            }
                          }}
                          onBlur={() => handleCheckMustahikByNik(formNik)}
                          placeholder="3374..."
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      {/* NRM (Opsional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          NRM (Opsional, untuk koordinasi SIMBA)
                        </label>
                        <input 
                          type="text"
                          value={formNrm}
                          onChange={(e) => setFormNrm(e.target.value)}
                          onBlur={() => handleCheckMustahikByNrm(formNrm)}
                          placeholder="Ketik NRM untuk autofill..."
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      {/* Jenis Kelamin (Wajib) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          Jenis Kelamin <span className="text-red-500">*</span>
                        </label>
                        <select 
                          required
                          value={formJk}
                          onChange={(e) => setFormJk(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        >
                          <option value="Pria">Pria</option>
                          <option value="Wanita">Wanita</option>
                        </select>
                      </div>

                      {/* Alamat (Wajib) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          Alamat Lengkap <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          required
                          rows={3}
                          value={formAlamat}
                          onChange={(e) => setFormAlamat(e.target.value)}
                          placeholder="Ketik alamat..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850 resize-none"
                        />
                      </div>

                      {/* Telepon (Opsional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          No. Telepon (Opsional)
                        </label>
                        <input 
                          type="text"
                          value={formTelpon}
                          onChange={(e) => setFormTelpon(e.target.value.replace(/\D/g, ''))}
                          placeholder="024..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      {/* Handphone (Opsional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          No. HP / WhatsApp (Opsional)
                        </label>
                        <input 
                          type="text"
                          value={formHp}
                          onChange={(e) => setFormHp(e.target.value.replace(/\D/g, ''))}
                          placeholder="0812..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      {/* Keterangan (Opsional) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          Keterangan (Opsional)
                        </label>
                        <input 
                          type="text"
                          value={formKeterangan}
                          onChange={(e) => setFormKeterangan(e.target.value)}
                          placeholder="Catatan tambahan..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-slate-850"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-4 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-4"
                      >
                        <Plus className="size-4" />
                        Tambah Ke Daftar
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-100 p-4 rounded-xl text-xs text-slate-650 leading-relaxed font-semibold space-y-2 border border-slate-200/40">
                        <p className="font-bold text-slate-800">Cara Copy-Paste dari Excel/Spreadsheet:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Buat/unduh template Excel dengan urutan kolom yang sesuai.</li>
                          <li>Copy baris data yang ingin diimpor (tanpa header).</li>
                          <li>Paste di kotak di bawah dan klik "Proses Impor".</li>
                        </ol>
                        <button
                          type="button"
                          onClick={downloadTemplateExcel}
                          className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-50 text-primary border border-primary/20 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase shadow-sm"
                        >
                          <Download className="size-3.5" />
                          Unduh Template Excel (.xlsx)
                        </button>
                      </div>

                      <textarea
                        rows={10}
                        value={excelPasteText}
                        onChange={(e) => setExcelPasteText(e.target.value)}
                        placeholder="Tempel baris data Excel disini..."
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg p-3.5 focus:ring-2 focus:ring-primary/20 outline-none text-slate-850"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const lines = excelPasteText.split('\n');
                          const importedList: any[] = [];
                          let successCount = 0;
                          let failCount = 0;

                          for (let line of lines) {
                            const trimmedLine = line.trim();
                            if (!trimmedLine) continue;

                            const cols = trimmedLine.split('\t');
                            if (cols.length < 5) {
                              failCount++;
                              continue;
                            }

                            const nama = (cols[1] || '').trim();
                            const nik = ((cols[2] || '').trim()).replace(/\D/g, '');
                            const jkRaw = ((cols[3] || '').trim()).toLowerCase();
                            const alamat = (cols[4] || '').trim();
                            const telpon = (cols[5] || '').trim();
                            const hp = (cols[6] || '').trim();
                            const email = (cols[7] || '').trim();
                            const keterangan = (cols[8] || '').trim();

                            if (!nama || !nik || nik.length !== 16 || !alamat) {
                              failCount++;
                              continue;
                            }

                            // Parse gender (Pria/Wanita or Laki-laki/Perempuan or L/P)
                            let jk = 'Pria';
                            if (jkRaw.startsWith('pr') || jkRaw.startsWith('l')) {
                              jk = 'Pria';
                            } else if (jkRaw.startsWith('w') || jkRaw.startsWith('pe') || jkRaw === 'p') {
                              jk = 'Wanita';
                            }

                            importedList.push({
                              nama_lengkap: nama,
                              nik: nik,
                              nrm: '',
                              jenis_kelamin: jk,
                              alamat: alamat,
                              telepon: telpon,
                              handphone: hp,
                              email: email,
                              keterangan: keterangan
                            });
                            successCount++;
                          }

                          if (importedList.length > 0) {
                            setByNameList(prev => [...prev, ...importedList]);
                            alert(`Berhasil mengimpor ${successCount} data penerima.${failCount > 0 ? ` Gagal mengimpor ${failCount} baris karena data/format tidak valid.` : ''}`);
                            setExcelPasteText('');
                          } else {
                            alert('Tidak ada data valid yang ditemukan. Pastikan format kolom: Tanggal registrasi, Nama lengkap, NIK (16 digit), Jenis Kelamin, Alamat, Telepon, Handphone, Email, Keterangan.');
                          }
                        }}
                        disabled={!excelPasteText.trim()}
                        className="w-full py-2.5 px-4 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-primary/95 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
                      >
                        <Plus className="size-3.5" />
                        Proses Impor Excel
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* List Table (Right Column) */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <div className="flex-1 border border-slate-100 rounded-2xl overflow-hidden flex flex-col bg-white">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        Daftar Penerima ({byNameList.length})
                      </h4>
                      {byNameList.length === 0 && (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="size-3.5" /> Belum ada penerima
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-auto max-h-[40vh] lg:max-h-[50vh] w-full">
                      <table className="min-w-[1000px] w-full text-left table-auto">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold tracking-wider border-b border-slate-100">
                            <th className="px-4 py-3 w-10">No</th>
                            <th className="px-4 py-3">Nama Penerima</th>
                            <th className="px-4 py-3">NIK</th>
                            <th className="px-4 py-3">NRM</th>
                            <th className="px-4 py-3">Jenis Kelamin</th>
                            <th className="px-4 py-3">Alamat</th>
                            <th className="px-4 py-3">Telepon</th>
                            <th className="px-4 py-3">Handphone</th>
                            <th className="px-4 py-3">Keterangan</th>
                            {activeTab !== 'ready' && <th className="px-4 py-3 text-center w-16">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {byNameList.length === 0 ? (
                            <tr>
                              <td colSpan={activeTab === 'ready' ? 9 : 10} className="px-4 py-16 text-center text-slate-400 italic">
                                Belum ada data penerima by-name. Isi form di sebelah kiri atau paste dari Excel untuk menambahkan.
                              </td>
                            </tr>
                          ) : (
                            byNameList.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{p.nama_lengkap}</td>
                                <td className="px-4 py-3 font-mono font-semibold text-slate-650">{p.nik}</td>
                                <td className="px-4 py-2">
                                  {activeTab === 'ready' ? (
                                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-center block w-fit mx-auto">
                                      {p.nrm || '-'}
                                    </span>
                                  ) : (
                                    <input 
                                      type="text"
                                      placeholder="Ketik NRM..."
                                      value={p.nrm || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setByNameList(prev => prev.map((item, i) => i === idx ? { ...item, nrm: val } : item));
                                      }}
                                      className="w-32 text-xs font-mono font-bold bg-white border border-slate-200 rounded px-2.5 py-1 focus:ring-2 focus:ring-primary/20 outline-none text-center"
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-600">{p.jenis_kelamin}</td>
                                <td className="px-4 py-3 font-medium text-slate-500 max-w-[120px] truncate" title={p.alamat}>
                                  {p.alamat}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-500">{p.telepon || '-'}</td>
                                <td className="px-4 py-3 font-medium text-slate-500">{p.handphone || '-'}</td>
                                <td className="px-4 py-3 font-medium text-slate-500 max-w-[120px] truncate" title={p.keterangan}>
                                  {p.keterangan || '-'}
                                </td>
                                {activeTab !== 'ready' && (
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleRemoveByName(idx)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded transition-all"
                                      title="Hapus penerima"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                {activeTab === 'ready' ? (
                  <button
                    onClick={() => setSelectedProposal(null)}
                    className="px-5 py-2 text-xs font-black uppercase bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-sm"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedProposal(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-all border border-slate-200"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveByName}
                      disabled={isSavingByName}
                      className="px-5 py-2 text-xs font-black uppercase bg-primary hover:bg-primary/95 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSavingByName ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      Simpan Penerima
                    </button>
                  </>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
