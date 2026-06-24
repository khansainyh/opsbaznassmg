import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, 
  ChevronRight, 
  Eye, 
  X, 
  ClipboardList, 
  Banknote,
  ArrowUpRight,
  Coins,
  Info,
  FileText,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface AntreanPencairanProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function AntreanPencairan({ data }: AntreanPencairanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('/api/finance/accounts');
        setAccounts(res.data);
      } catch (e) {
        console.error('Gagal mengambil data rekening: ', e);
      }
    };
    fetchAccounts();

    axios.get('/api/pilars')
      .then(res => {
        if (res.data) setPilars(res.data);
      })
      .catch(console.error);
  }, []);

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
    if (!selectedProposal) return;
    
    const getTemplateKey = () => {
      let tipe = 'Konsumtif';
      const p = selectedProposal as any;
      if (p.programRedirectionCode) {
        const parts = p.programRedirectionCode.split('.');
        if (parts.length > 2) {
          const parentCode = `${parts[0]}.${parts[1]}`;
          if (programTipeMap[parentCode]) tipe = programTipeMap[parentCode];
        }
      } else if (p.programCode) {
        const parts = p.programCode.split('.');
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

  // Filter only proposals with 'Pencairan Dana' or 'Antrean Bantuan' status
  const filteredData = useMemo(() => {
    const res = data.filter(item => {
      const isPencairan = item.status === 'Pencairan Dana' || item.status === 'Antrean Bantuan';
      const searchMatch = item.agendaNo.toString().includes(searchTerm) || 
                         item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.namaInstansi?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (item.nik || '').includes(searchTerm);
      return isPencairan && searchMatch;
    });

    const urgencyOrder: Record<string, number> = {
      'Sangat Kritis': 4,
      'Kritis': 4,
      'Tinggi': 3,
      'Sedang': 2,
      'Rendah': 1,
    };

    return [...res].sort((a, b) => {
      const orderA = urgencyOrder[a.urgencyLevel || ''] || 0;
      const orderB = urgencyOrder[b.urgencyLevel || ''] || 0;
      if (orderB !== orderA) {
        return orderB - orderA;
      }
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return Number(b.agendaNo) - Number(a.agendaNo);
    });
  }, [data, searchTerm]);

  const stats = useMemo(() => {
    const pencairanData = data.filter(d => d.status === 'Pencairan Dana' || d.status === 'Antrean Bantuan');
    const totalNominal = pencairanData.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
    
    // Accumulate cash balance for Zakat, ISTT, IST
    const kasTersedia = accounts
      .filter(a => 
        a.tipe_kas === 'TUNAI' && (
          a.kelompok_dana === 'ZAKAT' || 
          a.kelompok_dana === 'INFAK_TIDAK_TERIKAT' || 
          a.kelompok_dana === 'INFAK_TERIKAT'
        )
      )
      .reduce((sum, item) => sum + Number(item.saldo), 0);
    
    return {
      total: pencairanData.length,
      totalNominal,
      kasTersedia,
      rekomendasiKas: Math.max(0, totalNominal - kasTersedia)
    };
  }, [data, accounts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
          <span className="hover:text-primary transition-colors cursor-pointer">Keuangan</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-primary font-black">Antrean Pencairan</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Antrean Pencairan Dana
        </h2>
        <p className="text-slate-500 font-medium">
          Daftar bantuan yang menunggu proses pencairan dana oleh bagian keuangan.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Antrean Pencairan" 
          value={formatCurrency(stats.totalNominal)} 
          icon={<Banknote className="size-5" />}
          color="amber"
          subtitle={`Akumulasi ${stats.total} bantuan`}
        />
        <StatCard 
          title="Kas Tersedia (Pencairan)" 
          value={formatCurrency(stats.kasTersedia)} 
          icon={<ArrowUpRight className="size-5" />}
          color="blue"
          subtitle="Akumulasi Kas Zakat, ISTT, & IST"
        />
        <StatCard 
          title="Rekomendasi Penarikan Kas" 
          value={formatCurrency(stats.rekomendasiKas)} 
          icon={<Coins className="size-5" />}
          color="emerald"
          subtitle={stats.rekomendasiKas > 0 ? "Kekurangan dana tunai" : "Kas tunai mencukupi"}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Mustahik</th>
                <th className="px-6 py-4">Program & Jenis</th>
                <th className="px-6 py-4">Urgensi &amp; Skor</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                      {item.agendaNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-wider">{item.nik}</p>
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
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border w-fit uppercase",
                        item.urgencyLevel === 'Sangat Kritis' || item.urgencyLevel === 'Kritis' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        item.urgencyLevel === 'Tinggi' ? "bg-orange-50 text-orange-600 border-orange-100" :
                        item.urgencyLevel === 'Sedang' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-slate-50 text-slate-400 border-slate-200"
                      )}>
                        {item.urgencyLevel || 'Rendah'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Skor: <strong className="font-bold text-slate-700">{item.score || 0}</strong>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(item.nominal || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border",
                      item.tipeBantuan === 'Tunai' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.tipeBantuan === 'Barang' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-slate-50 text-slate-400 border-slate-200"
                    )}>
                      {item.tipeBantuan || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
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
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="size-12 opacity-10" />
                      <p className="text-sm font-medium">Tidak ada antrean pencairan saat ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
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
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Pencairan</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: Data Pemohon, Informasi Bantuan & Hasil Kuesioner */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        </div>
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        <DetailItem label="Alamat" value={selectedProposal.alamat} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Bantuan</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Program" value={selectedProposal.program || 'Umum'} />
                        <DetailItem label="Jenis" value={selectedProposal.jenisPermohonan} />
                        <DetailItem label="Tipe Bantuan" value={selectedProposal.tipeBantuan || '-'} />
                        <DetailItem label="Asnaf (Golongan Penerima)" value={selectedProposal.asnaf || '—'} />
                      </div>
                    </div>

                    {/* Hasil Survei Lapangan Detil */}
                    {selectedProposal.survey_data && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                          Detail Kuesioner Survei
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {(() => {
                            const sectionCodes = Array.from(new Set(dynamicQuestions.map(q => q.section))).sort();
                            return sectionCodes.map(secCode => {
                              const firstQ = dynamicQuestions.find(q => q.section === secCode);
                              const sectionTitle = firstQ ? firstQ.sectionName : secCode;
                              const sectionQuestions = dynamicQuestions.filter(q => q.section === secCode);
                              
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
                    )}
                  </div>

                  {/* RIGHT COLUMN: Hasil Evaluasi, Rekomendasi & Embed Proposal */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">
                        Hasil Evaluasi &amp; Rekomendasi
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Skor Survei" value={selectedProposal.score?.toString() || '0'} />
                        <DetailItem label="Tingkat Urgensi" value={selectedProposal.urgencyLevel || 'Normal'} />
                        
                        <div className="col-span-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Rekomendasi Kas (Kabag Pendistribusian)</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProposal.rekomendasi_kabag || 'Zakat'}</p>
                        </div>

                        <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Nominal Pencairan</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(selectedProposal.nominal || 0)}</p>
                        </div>

                        {selectedProposal.hasil_identifikasi && (
                          <div className="col-span-2">
                            <DetailItem label="Hasil Identifikasi Lapangan" value={selectedProposal.hasil_identifikasi} />
                          </div>
                        )}

                        {selectedProposal.survey_data?.catatanLapangan && (
                          <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Catatan Relawan di Lapangan</p>
                            <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedProposal.survey_data.catatanLapangan}"</p>
                          </div>
                        )}
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
                          {getEmbedUrl(selectedProposal.fileGdriveLink) ? (
                            <iframe 
                              src={getEmbedUrl(selectedProposal.fileGdriveLink)!} 
                              className="w-full h-80 rounded-xl border border-slate-200" 
                              title="Dokumen Proposal" 
                            />
                          ) : (
                            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                              <p className="text-xs text-slate-500 font-semibold italic">Link Dokumen: <a href={selectedProposal.fileGdriveLink} target="_blank" rel="noreferrer" className="text-primary underline font-bold">{selectedProposal.fileGdriveLink}</a></p>
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
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all text-center"
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

function StatCard({ title, value, icon, color, subtitle }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'red' | 'blue',
  subtitle?: string
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600'
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
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
            <Info className="size-3" />
            {subtitle}
          </p>
        )}
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

function getEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  
  if (link.includes('drive.google.com')) {
    const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    const openMatch = link.match(/[?&]id=([^&]+)/);
    if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    return link.replace(/\/view.*?(\?|$)/, '/preview$1');
  }
  
  return link;
}
