import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  ChevronRight,
  Eye,
  FileText,
  X,
  ClipboardList,
  AlertTriangle,
  Banknote,
  Info,
  RotateCcw,
  Home,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar } from '../data/pilarData';

interface PenentuanNominalProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function PenentuanNominal({ data, onUpdate }: PenentuanNominalProps) {
  const [pilars, setPilars] = useState<Pilar[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [nominalInputs, setNominalInputs] = useState<Record<string, string>>({});
  const [alasanInputs, setAlasanInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);

  const programTipeMap = useMemo(() => {
    const map: { [code: string]: string } = {};
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        map[prog.code] = prog.tipe || 'Konsumtif';
      });
    });
    return map;
  }, [pilars]);

  useEffect(() => {
    const getTemplateKey = () => {
      if (!selectedProposal) return 'survey_template_individu';
      const jp = (selectedProposal.jenisPengajuan || '').toLowerCase();
      const isLembaga = jp.includes('lembaga') || jp.includes('kelompok');
      if (isLembaga) return 'survey_template_lembaga';
      
      const code = selectedProposal.programCode;
      if (!code) return 'survey_template_individu';
      const cleanCode = code.trim();
      let tipe = 'Konsumtif';
      if (programTipeMap[cleanCode]) {
        tipe = programTipeMap[cleanCode];
      } else {
        const parts = cleanCode.split('.');
        if (parts.length > 2) {
          const parentCode = `${parts[0]}.${parts[1]}`;
          if (programTipeMap[parentCode]) tipe = programTipeMap[parentCode];
        }
      }
      
      if (tipe === 'Produktif') return 'survey_template_perorangan_produktif';
      return 'survey_template_individu';
    };

    const templateKey = getTemplateKey();
    axios.get(`/api/parameters/${templateKey}`)
      .then(res => {
        if (res.data && res.data.value) {
          setDynamicQuestions(JSON.parse(res.data.value));
        }
      })
      .catch(console.error);
  }, [selectedProposal, programTipeMap]);

  useEffect(() => {
    axios.get('/api/pilars')
      .then(res => setPilars(res.data))
      .catch(console.error);
  }, []);

  const getRKATBudget = (jenisPermohonan: string, asnaf?: string, rkatActivityId?: string): number | undefined => {
    // Resolve child-to-parent code fallback (e.g., '1102.3' -> '1102')
    const targetCode = jenisPermohonan.includes('.') ? jenisPermohonan.split('.')[0] : jenisPermohonan;

    for (const pilar of pilars) {
      for (const prog of pilar.programs) {
        if (
          prog.name === jenisPermohonan ||
          prog.code === jenisPermohonan ||
          prog.code === targetCode
        ) {
          if (prog.rkat_details) {
            const details = typeof prog.rkat_details === 'string'
              ? JSON.parse(prog.rkat_details)
              : prog.rkat_details;

            if (Array.isArray(details)) {
              const match = details.find((detail: any) => {
                if (rkatActivityId && detail.id === rkatActivityId) return true;
                if (asnaf) {
                  const dAsnaf = (detail.asnaf || '').toLowerCase();
                  const pAsnaf = asnaf.toLowerCase();
                  return dAsnaf && (dAsnaf.includes(pAsnaf) || pAsnaf.includes(dAsnaf));
                }
                return false;
              });
              if (match) {
                return Number(match.nominal || 0);
              }
            }
          }
          if (typeof prog.budget_rkat === 'number') {
            return prog.budget_rkat;
          }
        }
      }
    }
    return undefined;
  };

  // Filter only proposals with 'Penentuan Nominal' status
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const isPenentuanNominal = item.status === 'Penentuan Nominal';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) ||
        item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.nik || '').includes(searchTerm);
      return isPenentuanNominal && searchMatch;
    });
  }, [data, searchTerm]);

  // Initialize nominal inputs with Kapel recommendation or RKAT defaults
  useEffect(() => {
    if (pilars.length === 0) return;
    const initialNominals: Record<string, string> = { ...nominalInputs };
    filteredData.forEach(item => {
      if (initialNominals[item.id] === undefined) {
        const defaultVal = item.volume && item.volume > 1
          ? (item.rekomendasi_unit_cost || (item.nominal ? Math.round(item.nominal / item.volume) : 0) || getRKATBudget(item.programCode || item.jenisPermohonan, item.asnaf, item.rkatActivityId))
          : (item.nominal || getRKATBudget(item.programCode || item.jenisPermohonan, item.asnaf, item.rkatActivityId));
        if (defaultVal !== undefined && defaultVal !== null) {
          initialNominals[item.id] = defaultVal.toString();
        }
      }
    });
    if (JSON.stringify(initialNominals) !== JSON.stringify(nominalInputs)) {
      setNominalInputs(initialNominals);
    }
  }, [filteredData, pilars]);

  const stats = useMemo(() => {
    const penentuanData = data.filter(d => d.status === 'Penentuan Nominal');
    return {
      total: penentuanData.length,
      urgent: penentuanData.filter(d => d.urgencyLevel === 'Kritis' || d.urgencyLevel === 'Tinggi').length,
      pending: penentuanData.filter(d => !d.nominal).length
    };
  }, [data]);

  const handleNominalChange = (id: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setNominalInputs(prev => ({ ...prev, [id]: numericValue }));
  };

  const handleAlasanChange = (id: string, value: string) => {
    setAlasanInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleResetToRKAT = (id: string, jenis: string) => {
    const item = data.find(d => d.id === id);
    const defaultValue = getRKATBudget(item?.programCode || jenis, item?.asnaf, item?.rkatActivityId);
    if (defaultValue !== undefined) {
      setNominalInputs(prev => ({ ...prev, [id]: defaultValue.toString() }));
      setAlasanInputs(prev => {
        const newAlasan = { ...prev };
        delete newAlasan[id];
        return newAlasan;
      });
    }
  };

  const handleSetTipe = async (id: string, tipe: 'Tunai' | 'Barang') => {
    try {
      await axios.put(`/api/proposals/${id}`, {
        tipe_bantuan: tipe
      });
      const updatedData = data.map(item =>
        item.id === id ? { ...item, tipeBantuan: tipe } : item
      );
      onUpdate(updatedData);
    } catch (e) {
      alert('Gagal update tipe bantuan');
    }
  };

  const handleApprove = async (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;

    const inputValStr = nominalInputs[id] || '0';
    const inputVal = parseInt(inputValStr);
    const defaultNominal = getRKATBudget(item.programCode || item.jenisPermohonan, item.asnaf, item.rkatActivityId);
    const alasan = alasanInputs[id] || '';

    const isLembagaPerorangan = !!(item.volume && item.volume > 1);
    const finalUnitCost = inputVal;
    const finalNominal = isLembagaPerorangan ? ((item.volume || 1) * inputVal) : inputVal;

    if (inputVal <= 0) {
      alert(isLembagaPerorangan ? 'Mohon tentukan unit cost bantuan.' : 'Mohon tentukan nominal bantuan.');
      return;
    }

    const isDifferent = defaultNominal !== undefined && inputVal !== defaultNominal;
    if (isDifferent && !alasan.trim()) {
      alert(isLembagaPerorangan ? 'Mohon isi alasan perubahan unit cost karena tidak sesuai dengan RKAT.' : 'Mohon isi alasan perubahan nominal karena tidak sesuai dengan RKAT.');
      return;
    }

    if (!item.tipeBantuan) {
      alert('Mohon tentukan tipe bantuan (Tunai/Barang).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        nominal: finalNominal,
        alasan_perubahan_nominal: isDifferent ? alasan : undefined,
        status: 'Pencairan_Dana'
      };
      if (isLembagaPerorangan) {
        payload.rekomendasi_unit_cost = finalUnitCost;
      }

      await axios.put(`/api/proposals/${id}`, payload);

      const updatedData = data.map(p =>
        p.id === id ? {
          ...p,
          nominal: finalNominal,
          rekomendasi_unit_cost: isLembagaPerorangan ? finalUnitCost : p.rekomendasi_unit_cost,
          status: 'Pencairan Dana' as any,
          alasanPerubahanNominal: isDifferent ? alasan : undefined
        } : p
      );
      onUpdate(updatedData);
    } catch {
      alert('Gagal memproses penentuan nominal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Persetujuan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Penentuan Nominal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Penentuan Nominal Bantuan
        </h2>
        <p className="text-slate-500 font-medium">
          Layanan penetapan besaran nominal dan tipe penyaluran bantuan bagi mustahik yang disetujui.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Menunggu"
          value={stats.total.toString()}
          icon={<FileText className="size-5" />}
          color="primary"
        />
        <StatCard
          title="Urgensi Tinggi"
          value={stats.urgent.toString()}
          icon={<AlertTriangle className="size-5" />}
          color="red"
        />
        <StatCard
          title="Belum Ditentukan"
          value={stats.pending.toString()}
          icon={<Banknote className="size-5" />}
          color="amber"
        />
      </div>

      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              type="text"
              placeholder="Cari No. Agenda / Nama..."
              className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Nominal Bantuan</th>
                <th className="px-6 py-4">Tipe Bantuan</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => {
                const defaultNominal = getRKATBudget(item.programCode || item.jenisPermohonan, item.asnaf, item.rkatActivityId);
                const currentNominal = parseInt(nominalInputs[item.id] || '0');
                const isDifferentFromRKAT = defaultNominal !== undefined && currentNominal !== defaultNominal;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group align-top">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                        {item.agendaNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase w-fit bg-primary/5 text-primary border border-primary/10">
                          {item.program || 'Umum'}
                        </span>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                          {item.jenisPermohonan}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-3">
                        {item.volume && item.volume > 1 && (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-black uppercase">
                              Volume: {item.volume}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                            <input
                              type="text"
                              value={
                                (() => {
                                  const rawVal = nominalInputs[item.id] !== undefined ? nominalInputs[item.id] : (item.nominal?.toString() || '');
                                  if (!rawVal) return '';
                                  const parsed = parseInt(rawVal.replace(/[^0-9]/g, ''));
                                  return isNaN(parsed) ? '' : parsed.toLocaleString('id-ID');
                                })()
                              }
                              onChange={(e) => handleNominalChange(item.id, e.target.value)}
                              placeholder="0"
                              className={cn(
                                "pl-8 pr-4 py-1.5 w-36 text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-primary focus:border-primary outline-none font-bold text-slate-900",
                                isDifferentFromRKAT && "border-amber-300 ring-1 ring-amber-100"
                              )}
                            />
                          </div>
                          {isDifferentFromRKAT && (
                            <button
                              onClick={() => handleResetToRKAT(item.id, item.jenisPermohonan)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Reset ke RKAT"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {item.volume && item.volume > 1 && (
                          <div className="text-[11px] font-black text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 w-fit">
                            Total Realisasi: {formatCurrency(item.volume * currentNominal)}
                          </div>
                        )}

                        <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-400">
                          {item.asnaf && (
                            <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                              Asnaf: {item.asnaf}
                            </span>
                          )}
                          {defaultNominal !== undefined ? (
                            <div className="flex items-center gap-1">
                              <Info className="size-3 text-slate-400" />
                              <span>{item.volume && item.volume > 1 ? 'RKAT (Unit Cost)' : 'RKAT'}: {formatCurrency(defaultNominal)}</span>
                            </div>
                          ) : (
                            <span className="italic">Belum ada budget RKAT</span>
                          )}
                        </div>

                        {isDifferentFromRKAT && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1.5"
                          >
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                              Alasan Perubahan
                              <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                              value={alasanInputs[item.id] || ''}
                              onChange={(e) => handleAlasanChange(item.id, e.target.value)}
                              placeholder={item.volume && item.volume > 1 ? "Jelaskan alasan perubahan unit cost..." : "Jelaskan alasan perubahan nominal..."}
                              className="w-full text-[11px] bg-amber-50/50 border border-amber-200 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 outline-none min-h-[60px] resize-none font-medium"
                            />
                          </motion.div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSetTipe(item.id, 'Tunai')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Tunai'
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Tunai
                        </button>
                        <button
                          onClick={() => handleSetTipe(item.id, 'Barang')}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                            item.tipeBantuan === 'Barang'
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-400 border-slate-200 hover:border-primary/50"
                          )}
                        >
                          Barang
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProposal(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleApprove(item.id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                          title="Setujui"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada data yang menunggu penentuan nominal.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isDetailModalOpen && selectedProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDetailModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Permohonan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: Data Pemohon & Rincian Lapangan */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                        Data Pemohon
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        <DetailItem label="NIK" value={selectedProposal.nik || '-'} />
                        <div className="col-span-2">
                          <DetailItem label="Alamat" value={selectedProposal.alamat || '-'} />
                        </div>
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan || '-'} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan || '-'} />
                        <DetailItem label="No. Telepon" value={selectedProposal.noTelpon || '-'} />
                        <DetailItem label="Pekerjaan" value={selectedProposal.pekerjaan || '-'} />
                      </div>
                    </div>

                    {/* Rincian Detail Form Survei */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 flex items-center gap-2">
                        <Home className="size-3.5" /> Rincian Kondisi Lapangan
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(() => {
                          const sectionCodes = Array.from(new Set(dynamicQuestions.map(q => q.section))).sort();
                          if (sectionCodes.length === 0) {
                            return (
                              <div className="text-xs font-semibold text-slate-400 italic py-2 col-span-2">
                                Memuat data rincian...
                              </div>
                            );
                          }
                          return sectionCodes.map(secCode => {
                            const sectionQuestions = dynamicQuestions.filter(q => q.section === secCode);
                            if (sectionQuestions.length === 0) return null;
                            
                            const sectionTitle = sectionQuestions[0].sectionTitle || `Bagian ${secCode}`;
                            const items = sectionQuestions.map(q => ({
                              label: q.label,
                              value: getLabelForScore(q.id, (selectedProposal.survey_data as any)?.[q.id], dynamicQuestions)
                            }));
                            
                            return (
                              <div key={secCode} className="col-span-2">
                                <SurveyDetailSection title={sectionTitle} items={items} />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Ringkasan Evaluasi & Dokumen */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                        Hasil Evaluasi &amp; Rekomendasi
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Skor Survei" value={selectedProposal.score?.toString() || '0'} />
                        <DetailItem label="Tingkat Urgensi" value={selectedProposal.urgencyLevel || 'Normal'} />
                        <DetailItem label="Asnaf" value={selectedProposal.asnaf || '-'} />
                        <DetailItem label="Rekomendasi Dana" value={selectedProposal.rekomendasi_kabag || '-'} />
                        <div className="col-span-2">
                          <DetailItem label="Hasil Identifikasi Lapangan" value={selectedProposal.hasil_identifikasi || '-'} />
                        </div>
                        <div className="col-span-2">
                          <DetailItem label="Catatan Kepala Pelaksana" value={selectedProposal.catatanKepala || '-'} />
                        </div>
                      </div>
                    </div>

                    {/* Preview Dokumen */}
                    <div className="space-y-3">
                      {selectedProposal.fileGdriveLink ? (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                              <FileText className="size-3.5" /> Dokumen Proposal
                            </h4>
                            <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                               className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                              Buka di tab baru <ExternalLink className="size-3" />
                            </a>
                          </div>
                          {toGDriveEmbedUrl(selectedProposal.fileGdriveLink) ? (
                            <iframe 
                              src={toGDriveEmbedUrl(selectedProposal.fileGdriveLink)!} 
                              className="w-full h-80 rounded-xl border border-slate-200" 
                              title="File GDrive" 
                            />
                          ) : (
                            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                              <p className="text-xs text-slate-500 font-semibold italic">Link GDrive: <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noreferrer" className="text-primary underline font-bold">{selectedProposal.fileGdriveLink}</a></p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500 font-semibold italic">File proposal tidak dilampirkan atau tidak ada scan dokumen.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{value}</p>
    </div>
  );
}

function StatCard({ title, value, icon, color }: {
  title: string,
  value: string,
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red'
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
      </div>
    </div>
  );
}

function SurveyDetailSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">{item.label}</span>
            <span className="font-bold text-slate-800 text-right max-w-[150px] truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLabelForScore(field: string, score: any, dynamicQuestions?: any[]): string {
  if (score === undefined || score === null || score === 0 || score === '') return '-';
  
  if (dynamicQuestions && dynamicQuestions.length > 0) {
    const question = dynamicQuestions.find(q => q.id === field);
    if (question) {
      if (question.type === 'checkbox') {
        if (Array.isArray(score)) {
          const selectedLabels = score.map((val: any) => {
            const option = question.options?.find((opt: any) => opt.val === val || opt.val === Number(val) || opt.label === val);
            return option ? option.label : val;
          });
          return selectedLabels.join(', ') || '-';
        }
      } else if (question.type === 'text') {
        return String(score);
      } else {
        if (question.options) {
          const option = question.options.find((opt: any) => opt.val === score || opt.val === Number(score) || opt.label === score);
          if (option) return option.label;
        }
      }
    }
  }

  const mapping: Record<string, Record<number, string>> = {
    luasBangunan: { 3: '≤ 8 m²', 2: '8-10 m²', 1: '> 10 m²' },
    jenisLantai: { 3: 'Tanah', 2: 'Semen', 1: 'Keramik' },
    jenisDinding: { 3: 'Kayu/Bambu', 2: 'Bata Polos', 1: 'Tembok Rapi' },
    statusTempatTinggal: { 4: 'Kost', 3: 'Kontrak', 2: 'Menumpang', 1: 'Milik Sendiri' },
    pekerjaanKepala: { 3: 'Pengangguran', 2: 'Buruh/Nelayan', 1: 'Karyawan' },
    frekuensiMakan: { 3: '1x Sehari', 2: '2x Sehari', 1: '3x Sehari' },
    kemampuanLauk: { 3: 'Jarang', 2: '2x Seminggu', 1: 'Setiap Hari' },
    keadaanFisik: { 4: 'Manula Sakit', 3: 'Manula Sehat', 2: 'Cacat Produktif', 1: 'Sehat/Produktif' },
    hutang: { 2: 'Rentenir/Pinjol', 1: 'Bank/Tidak Ada' },
    kesehatan: { 2: 'Tanah/Non-KIS', 1: 'BPJS/KIS' }
  };

  return mapping[field]?.[score] || '-';
}

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  if (link.includes('drive.google.com')) {
    return link.replace(/\/view.*?(\?|$)/, '/preview$1');
  }
  return link;
}
