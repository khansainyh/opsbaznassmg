import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Target, 
  TrendingUp, 
  Percent, 
  Users, 
  Calendar, 
  Plus, 
  Download, 
  Edit2, 
  Check, 
  Trash2, 
  X, 
  Info, 
  ChevronRight,
  BarChart4,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar, AsnafTarget } from '../data/pilarData';

interface TargetRKATProps {
  proposals: ProposalMemo[];
  onUpdate?: (updated: ProposalMemo[]) => void;
}

export interface RKATActivity {
  id: string;
  pilarCode: string;   // e.g. "1100" -> Semarang Peduli
  pilarName: string;   // e.g. "Semarang Peduli"
  name: string;        // e.g. "Bantuan Biaya Hidup Sembako" (clean program name)
  keterangan: string;  // e.g. "Pemberian paket sembako dhuafa Semarang Utara"
  mustahik: number;    // Target Mustahik count
  frekuensi: number;   // Frequency
  unitCost: number;    // Cost per unit
  programCode: string; // Associated master program code
  asnafTargetId: string; // Associated asnaf target id
  asnaf?: string;      // Specific Asnaf criteria for the activity
}
export interface RKATAccount {
  code: string;        // e.g. "5.1.01"
  pilarCode: string;   // Matching Pilar e.g. "1300"
  pilarName: string;   // e.g. "Semarang Cerdas"
  monthlyTargetAllocations: { [key: number]: number }; // percentage distribution per month (1-12)
}

export default function TargetRKAT({ proposals }: TargetRKATProps) {
  // 1. Dynamic Pilar Data synced with backend API
  const [data, setData] = useState<Pilar[]>([]);

  const fetchPilars = useCallback(() => {
    axios.get('http://127.0.0.1:4000/api/pilars')
      .then(res => {
        const pilars = res.data.map((pilar: any) => ({
          ...pilar,
          programs: (pilar.programs || []).map((prog: any) => ({
            ...prog,
            asnafTargets: typeof prog.rkat_details === 'string' 
              ? JSON.parse(prog.rkat_details || '[]') 
              : (prog.rkat_details || [])
          }))
        }));
        setData(pilars);
      })
      .catch(err => console.error('Failed to fetch pilars in RKAT', err));
  }, []);

  useEffect(() => {
    fetchPilars();
  }, [fetchPilars]);

  // Flatten programs with their respective Asnaf targets into dynamic individual RKAT list activities
  const activities = useMemo<RKATActivity[]>(() => {
    const list: RKATActivity[] = [];
    (data || []).forEach((pilar) => {
      (pilar.programs || []).forEach((prog) => {
        const targets = prog.asnafTargets || [];
        if (targets.length > 0) {
          targets.forEach((target, tIdx) => {
            const fallbackId = target.id || `act-auto-${prog.code}-${target.asnaf || 'General'}-${tIdx}`;
            list.push({
              id: fallbackId,
              pilarCode: pilar.code,
              pilarName: pilar.name,
              name: prog.name, // Display name clean Program name without suffix
              keterangan: target.keterangan || `Penyaluran program ${prog.name} khusus kriteria asnaf ${target.asnaf}`,
              mustahik: target.mustahik || 0,
              frekuensi: Number(target.frekuensi) || 1,
              unitCost: target.nominal || 0,
              programCode: prog.code,
              asnafTargetId: fallbackId,
              asnaf: target.asnaf
            });
          });
        } else {
          // Fallback program row so it still exists in RKAT if a program is general (nominalUmum)
          const nominalVal = prog.nominalUmum || 0;
          list.push({
            id: `prog-general-${prog.code}`,
            pilarCode: pilar.code,
            pilarName: pilar.name,
            name: prog.name, // Keep program name clean
            keterangan: `Pagu program umum (Tanpa Asnaf)`,
            mustahik: 1,
            frekuensi: 1,
            unitCost: nominalVal,
            programCode: prog.code,
            asnafTargetId: '',
            asnaf: undefined
          });
        }
      });
    });
    return list;
  }, [data]);

  // 2. Ledger Accounts configuration (Linked to Pillars)
  const accounts: RKATAccount[] = useMemo(() => [
    { 
      code: "5.1.04", 
      pilarCode: "1100", 
      pilarName: "Semarang Peduli",
      monthlyTargetAllocations: { 1: 8, 2: 9, 3: 12, 4: 15, 5: 9, 6: 8, 7: 8, 8: 8, 9: 8, 10: 9, 11: 8, 12: 8 } 
    },
    { 
      code: "5.1.02", 
      pilarCode: "1200", 
      pilarName: "Semarang Sehat",
      monthlyTargetAllocations: { 1: 8, 2: 8, 3: 10, 4: 10, 5: 8, 6: 8, 7: 10, 8: 10, 9: 8, 10: 10, 11: 5, 12: 5 } 
    },
    { 
      code: "5.1.01", 
      pilarCode: "1300", 
      pilarName: "Semarang Cerdas",
      monthlyTargetAllocations: { 1: 5, 2: 5, 3: 15, 4: 10, 5: 5, 6: 10, 7: 15, 8: 10, 9: 5, 10: 10, 11: 5, 12: 5 } 
    },
    { 
      code: "5.1.03", 
      pilarCode: "1400", 
      pilarName: "Semarang Taqwa",
      monthlyTargetAllocations: { 1: 5, 2: 5, 3: 15, 4: 25, 5: 5, 6: 5, 7: 10, 8: 10, 9: 5, 10: 5, 11: 5, 12: 5 } 
    },
    { 
      code: "5.1.05", 
      pilarCode: "2100", 
      pilarName: "Semarang Makmur",
      monthlyTargetAllocations: { 1: 5, 2: 5, 3: 10, 4: 10, 5: 15, 6: 10, 7: 5, 8: 10, 9: 15, 10: 5, 11: 5, 12: 5 } 
    }
  ], []);

  // UI Control States
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('Semua');
  const [viewModeMonthly, setViewModeMonthly] = useState<'realisasi' | 'target'>('realisasi');
  
  // Modals / Add/Edit States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form fields for adding program activities per Asnaf
  const [formPilar, setFormPilar] = useState<string>('1100');
  const [formProgramCode, setFormProgramCode] = useState<string>('');
  const [formAsnaf, setFormAsnaf] = useState<string>('Miskin');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formMustahik, setFormMustahik] = useState<number>(10);
  const [formFrekuensi, setFormFrekuensi] = useState<number>(1);
  const [formUnitCost, setFormUnitCost] = useState<number>(250000);

  // Quick inline edits for Table 2
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineMustahik, setInlineMustahik] = useState<number>(0);
  const [inlineFrekuensi, setInlineFrekuensi] = useState<number>(0);
  const [inlineUnitCost, setInlineUnitCost] = useState<number>(0);

  // Filter programs based on selected pilar in form
  const formProgramsAvailable = useMemo(() => {
    const foundPilar = data.find(p => p.code === formPilar);
    return foundPilar ? foundPilar.programs : [];
  }, [data, formPilar]);

  // Set default program code when pilar changes in form
  useEffect(() => {
    if (formProgramsAvailable.length > 0) {
      setFormProgramCode(formProgramsAvailable[0].code);
    } else {
      setFormProgramCode('');
    }
  }, [formProgramsAvailable]);

  // Realized proposals are those that have been paid/disbursed or are currently queued layout
  const realizedProposals = useMemo(() => {
    return proposals.filter(p => 
      p.status === 'Selesai & Arsip' || 
      p.status === 'Realisasi Bantuan' || 
      p.status === 'MENUNGGU_SIMBA' || 
      p.status === 'MENUNGGU_REALISASI_DISTRIBUSI' ||
      p.status === 'Pencairan Dana'
    );
  }, [proposals]);

  // Robust automatic helper matching a proposal dynamically to an RKAT activity based on Pilar + Program + Asnaf
  const getMatchedActivityForProposal = (p: ProposalMemo, currentActivities: typeof activities) => {
    // Auto match by Pilar, Program Name, and Asnaf alignment
    return currentActivities.find(act => {
      const matchesPilar = p.program === act.pilarName;
      if (!matchesPilar) return false;
      
      const matchesProgram = p.jenisPermohonan === act.name;
      if (!matchesProgram) return false;
      
      if (act.asnaf) {
        const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
        return act.asnaf.toLowerCase() === pAsnaf;
      }
      return true;
    }) || null;
  };

  // Queries all proposals assigned/auto-assigned to a specific activity
  const getLinkedMemosForActivity = (act: any, proposalsList: ProposalMemo[]) => {
    return proposalsList.filter(p => {
      const matchesPilar = p.program === act.pilarName;
      if (!matchesPilar) return false;
      
      const matchesProgram = p.jenisPermohonan === act.name;
      if (!matchesProgram) return false;
      
      if (act.asnaf) {
        const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
        return act.asnaf.toLowerCase() === pAsnaf;
      }
      return true;
    });
  };

  // Aggregate static total budget & dynamic realized budgets
  const pilarBudgets = useMemo(() => {
    const sums: { [pilarName: string]: { target: number, realisasi: number } } = {
      'Semarang Peduli': { target: 0, realisasi: 0 },
      'Semarang Sehat': { target: 0, realisasi: 0 },
      'Semarang Cerdas': { target: 0, realisasi: 0 },
      'Semarang Taqwa': { target: 0, realisasi: 0 },
      'Semarang Makmur': { target: 0, realisasi: 0 }
    };

    // Sum Target Budgets from Flattened Activities State
    activities.forEach(act => {
      const budget = act.mustahik * act.frekuensi * act.unitCost;
      if (sums[act.pilarName]) {
        sums[act.pilarName].target += budget;
      }
    });

    // Sum Realized values from Proposals dynamically
    realizedProposals.forEach(p => {
      const amt = p.nominal || 0;
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        if (sums[matchedAct.pilarName]) {
          sums[matchedAct.pilarName].realisasi += amt;
        }
      } else {
        const prog = p.program || 'Semarang Peduli';
        if (sums[prog]) {
          sums[prog].realisasi += amt;
        }
      }
    });

    return sums;
  }, [activities, realizedProposals]);

  // Monthly values breakdown (Jan to Dec, 1 to 12)
  const monthlyRealizationsByPilar = useMemo(() => {
    const matrix: { [pilarName: string]: { [month: number]: number } } = {
      'Semarang Peduli': {},
      'Semarang Sehat': {},
      'Semarang Cerdas': {},
      'Semarang Taqwa': {},
      'Semarang Makmur': {}
    };

    // Initialize months 1-12 with 0
    Object.keys(matrix).forEach(key => {
      for (let m = 1; m <= 12; m++) {
        matrix[key][m] = 0;
      }
    });

    // Populate actual proposal distributions Dynamically
    realizedProposals.forEach(p => {
      const amt = p.nominal || 0;
      let pName = p.program || 'Semarang Peduli';
      
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        pName = matchedAct.pilarName;
      }

      const dateStr = p.tglCairBank || p.tanggalMasuk;
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            if (matrix[pName]) {
              matrix[pName][monthNum] += amt;
            }
          }
        }
      } else {
        // default distribution
        if (matrix[pName]) {
          matrix[pName][3] += amt;
        }
      }
    });

    return matrix;
  }, [realizedProposals, activities]);

  const listPilarKeys = ['Semarang Peduli', 'Semarang Sehat', 'Semarang Cerdas', 'Semarang Taqwa', 'Semarang Makmur'];

  // Filtered target program activities for Table 2
  const filteredActivities = useMemo(() => {
    if (selectedPilarFilter === 'Semua') return activities;
    return activities.filter(act => act.pilarName === selectedPilarFilter);
  }, [activities, selectedPilarFilter]);

  // Overall statistics
  const grandTotalTarget = useMemo(() => {
    return activities.reduce((sum, act) => sum + (act.mustahik * act.frekuensi * act.unitCost), 0);
  }, [activities]);

  const grandTotalRealisasi = useMemo(() => {
    return realizedProposals.reduce((sum, p) => sum + (p.nominal || 0), 0);
  }, [realizedProposals]);

  const totalMustahikTarget = useMemo(() => {
    return activities.reduce((sum, act) => sum + (act.mustahik * act.frekuensi), 0);
  }, [activities]);

  const actualMustahikServed = useMemo(() => {
    return realizedProposals.length;
  }, [realizedProposals]);

  const overallPercentage = useMemo(() => {
    if (grandTotalTarget === 0) return 0;
    return (grandTotalRealisasi / grandTotalTarget) * 100;
  }, [grandTotalTarget, grandTotalRealisasi]);

  // Handler: Add Activity (Appends Asnaf target via backend API)
  const saveNewActivity = () => {
    if (!formProgramCode) {
      alert('Pilih Program SIMBA yang ingin dihubungkan ke asnaf target ini.');
      return;
    }

    const newTarget: AsnafTarget = {
      id: `asnaf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      asnaf: formAsnaf as any,
      frekuensi: formFrekuensi,
      nominal: formUnitCost,
      mustahik: formMustahik,
      keterangan: formKeterangan || `Penyaluran Asnaf ${formAsnaf}`
    };

    let currentTargets: AsnafTarget[] = [];
    data.forEach(p => {
      p.programs.forEach(prog => {
        if (prog.code === formProgramCode) {
          currentTargets = prog.asnafTargets || [];
        }
      });
    });

    const updatedTargets = [...currentTargets, newTarget];

    axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
      rkat_details: updatedTargets
    }).then(() => {
      fetchPilars();
      // Reset
      setFormKeterangan('');
      setFormMustahik(10);
      setFormFrekuensi(1);
      setFormUnitCost(250000);
      setIsAddModalOpen(false);
    }).catch(err => {
      console.error('Gagal menambah activity', err);
      alert('Gagal menyimpan target ke database');
    });
  };

  // Handler: Delete Activity (Removes target via backend API)
  const deleteActivity = (id: string) => {
    if (window.confirm('Yakin ingin menghapus draf rincian program kerja RKAT ini?')) {
      let targetProgramCode = '';
      let updatedTargets: AsnafTarget[] = [];
      let isGeneral = false;

      data.forEach(p => {
        p.programs.forEach(prog => {
          if (id === `prog-general-${prog.code}`) {
            isGeneral = true;
            targetProgramCode = prog.code;
          } else if (prog.asnafTargets && prog.asnafTargets.some(t => t.id === id)) {
            targetProgramCode = prog.code;
            updatedTargets = prog.asnafTargets.filter(t => t.id !== id);
          }
        });
      });

      if (isGeneral) {
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          budget_rkat: 0
        }).then(() => fetchPilars()).catch(console.error);
      } else if (targetProgramCode) {
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          rkat_details: updatedTargets
        }).then(() => fetchPilars()).catch(console.error);
      }
    }
  };

  // Inline Quick edit controls
  const startInlineEdit = (act: RKATActivity) => {
    setInlineEditId(act.id);
    setInlineMustahik(act.mustahik);
    setInlineFrekuensi(act.frekuensi);
    setInlineUnitCost(act.unitCost);
  };

  const saveInlineEdit = (id: string) => {
    let targetProgramCode = '';
    let updatedTargets: AsnafTarget[] = [];
    let isGeneral = false;

    data.forEach(p => {
      p.programs.forEach(prog => {
        if (id === `prog-general-${prog.code}`) {
          isGeneral = true;
          targetProgramCode = prog.code;
        } else if (prog.asnafTargets && prog.asnafTargets.some(t => t.id === id)) {
          targetProgramCode = prog.code;
          updatedTargets = prog.asnafTargets.map(t => {
            if (t.id === id) {
              return {
                ...t,
                mustahik: inlineMustahik,
                frekuensi: inlineFrekuensi,
                nominal: inlineUnitCost
              };
            }
            return t;
          });
        }
      });
    });

    if (isGeneral) {
      axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
        budget_rkat: inlineUnitCost
      }).then(() => {
        fetchPilars();
        setInlineEditId(null);
      }).catch(console.error);
    } else if (targetProgramCode) {
      axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
        rkat_details: updatedTargets
      }).then(() => {
        fetchPilars();
        setInlineEditId(null);
      }).catch(console.error);
    } else {
      setInlineEditId(null);
    }
  };

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getMonthName = (idx: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[idx - 1];
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      {/* Header and overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan Keuangan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Target RKAT &amp; Realisasi</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="size-8 text-primary" />
            RKAT Pendistribusian &amp; Pendayagunaan
          </h2>
          <p className="text-slate-500 font-medium">
            Monitor realisasi anggaran program <strong className="text-slate-700">terkoneksi langsung (LinkedIn)</strong> dengan asnaf di master data <strong className="text-primary">Pilar &amp; Program</strong>.
          </p>
        </div>

        <button
          onClick={() => {
            const defaultPilarCode = '1100';
            setFormPilar(defaultPilarCode);
            setIsAddModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="size-4 stroke-[3]" />
          Tambah Kegiatan RKAT (Asnaf)
        </button>
      </div>

      {/* Sync Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-emerald-500/10 to-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-xs text-slate-700 leading-relaxed font-medium flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>
            🔌 <strong>Connected Database:</strong> RKAT ini dihitung dynamic berdasarkan database program di tab <strong>Pilar &amp; Program</strong>. Setiap edit asnaf pada program master akan me-remap baris-baris RKAT ini.
          </span>
        </div>
        <div className="bg-white/80 border border-emerald-500/20 px-3 py-1 rounded-lg text-emerald-800 font-bold uppercase tracking-wider text-[10px]">
          Simba DB Active
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Anggaran Pagu RKAT</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{formatCurrency(grandTotalTarget)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Percent className="size-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Capai Realisasi Berjalan</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">{formatCurrency(grandTotalRealisasi)}</span>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {overallPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Mustahik Terlayani</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
              {totalMustahikTarget.toLocaleString('id-ID')} Jiwa
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Briefcase className="size-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Realisasi Berkas Bantuan</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">
              {actualMustahikServed} Berkas Mustahik
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto p-1 custom-scrollbar">
          <button
            onClick={() => setSelectedPilarFilter('Semua')}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase rounded-lg transition-all",
              selectedPilarFilter === 'Semua' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            Semua Pilar
          </button>
          {listPilarKeys.map(pName => (
            <button
              key={pName}
              onClick={() => setSelectedPilarFilter(pName)}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase rounded-lg transition-all whitespace-nowrap",
                selectedPilarFilter === pName ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {pName}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 p-1 shrink-0 border-t md:border-0 border-slate-150">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tampilan Bulanan:</span>
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1">
            <button
              onClick={() => setViewModeMonthly('realisasi')}
              className={cn(
                "px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all",
                viewModeMonthly === 'realisasi' ? "bg-white text-primary shadow-xs" : "text-slate-500"
              )}
            >
              🟢 Realisasi Aktual
            </button>
            <button
              onClick={() => setViewModeMonthly('target')}
              className={cn(
                "px-2.5 py-1 text-[9px] font-black uppercase rounded-md transition-all",
                viewModeMonthly === 'target' ? "bg-white text-primary shadow-xs" : "text-slate-500"
              )}
            >
              📌 Alokasi Target
            </button>
          </div>
        </div>
      </div>

      {/* TABLE 1: ACCOUNT LEDGER SPLIT */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart4 className="size-4 text-primary" />
              1. Ikhtisar Akun Anggaran &amp; Realisasi (Linked Ledger)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Ringkasan total pagu anggaran, realisasi mustahik terbayar, dan persentase serapan kumulatif per pilar.</p>
          </div>
          
          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-100">
            {viewModeMonthly === 'realisasi' ? '⚡ Menampilkan Realisasi per Bulan Aktual' : '📌 Menampilkan Target Alokasi Rata-rata'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1240px]">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-48">Kode &amp; Nama Akun Pilar</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Anggaran Biaya</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-36 text-right">Realisasi</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider w-28 text-center">Prosentase</th>
                
                {/* Months */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <th key={month} className="px-3 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right w-24 bg-slate-50/30">
                    {getMonthName(month).substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts
                .filter(acc => selectedPilarFilter === 'Semua' || acc.pilarName === selectedPilarFilter)
                .map((acc, index) => {
                  const targetAnggaran = pilarBudgets[acc.pilarName]?.target || 0;
                  const realisAsi = pilarBudgets[acc.pilarName]?.realisasi || 0;
                  const percent = targetAnggaran > 0 ? (realisAsi / targetAnggaran) * 100 : 0;
                  
                  return (
                    <tr key={acc.code} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-bold text-center">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-primary font-mono">{acc.code}</span>
                          <span className="text-xs font-extrabold text-slate-900">{acc.pilarName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(targetAnggaran)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-black text-emerald-700">
                        {formatCurrency(realisAsi)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-[11px] font-bold text-slate-700">
                            {percent.toFixed(1)}%
                          </span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                percent >= 80 ? "bg-emerald-500" : percent >= 40 ? "bg-amber-400" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Display Jan - Dec Columns */}
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                        let cellVal = 0;
                        if (viewModeMonthly === 'realisasi') {
                          cellVal = monthlyRealizationsByPilar[acc.pilarName]?.[month] || 0;
                        } else {
                          const pctWeight = acc.monthlyTargetAllocations[month] || 0;
                          cellVal = (targetAnggaran * pctWeight) / 100;
                        }

                        return (
                          <td 
                            key={month} 
                            className={cn(
                              "px-3 py-3.5 text-right font-mono text-xs border-l border-slate-100/40",
                              cellVal > 0 ? "text-slate-900 font-bold" : "text-slate-350"
                            )}
                          >
                            {cellVal > 0 ? formatCurrency(cellVal) : 'Rp 0'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              
              {/* Grand Total Row */}
              {selectedPilarFilter === 'Semua' && (
                <tr className="bg-slate-100/80 p-4 font-black text-slate-950 border-t-2 border-slate-250">
                  <td colSpan={2} className="px-4 py-4 text-xs font-black uppercase tracking-wider text-slate-800 text-right">
                    TOTAL KESELURUHAN (DISTRIBUSI)
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-black text-slate-900">
                    {formatCurrency(grandTotalTarget)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs font-black text-emerald-800">
                    {formatCurrency(grandTotalRealisasi)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-extrabold bg-primary text-white px-2 py-0.5 rounded">
                      {overallPercentage.toFixed(1)}%
                    </span>
                  </td>

                  {/* Monthly totals summary */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    let sumMonth = 0;
                    if (viewModeMonthly === 'realisasi') {
                      accounts.forEach(acc => {
                        sumMonth += monthlyRealizationsByPilar[acc.pilarName]?.[month] || 0;
                      });
                    } else {
                      accounts.forEach(acc => {
                        const targetAnggaran = pilarBudgets[acc.pilarName]?.target || 0;
                        const pctWeight = acc.monthlyTargetAllocations[month] || 0;
                        sumMonth += (targetAnggaran * pctWeight) / 100;
                      });
                    }

                    return (
                      <td key={month} className="px-3 py-4 text-right font-mono text-xs font-black text-slate-950 border-l border-slate-200 bg-slate-150/50">
                        {formatCurrency(sumMonth)}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: PROGRAM / KEGIATAN TARGETS LIST AS IN SCREENSHOT 1 */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              2. Matriks Detail Program Kerja &amp; Anggaran Biaya (Pilar &gt; Asnaf Split)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Kelola draf kuota, frekuensi, serta nilai unit asnaf. Perubahan akan merombak tab master dan ledger di atas.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Pilar Aktif:</span>
            <span className="px-3 py-1 bg-primary/10 text-primary font-black uppercase text-[10px] rounded-md tracking-wider">
              {selectedPilarFilter}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200">
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-12 text-center">No</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-60">Program / Kegiatan Kerja</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-24 text-center">Asnaf</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Keterangan Spesifikasi</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-48">Target RKAT &amp; Rincian</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right w-48">Realisasi Aktual &amp; Sisa</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider w-72">Memo SIMBA Terkoneksi (Otomatis) 🔌</th>
                <th className="px-4 py-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                    Belum ada program pendistribusian yang terdaftar dalam pilar ini dengan asnaf terpetakan.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act, index) => {
                  const isEditingInline = inlineEditId === act.id;
                  const itemBudgetTotal = act.mustahik * act.frekuensi * act.unitCost;
                  const editedBudgetTotal = inlineMustahik * inlineFrekuensi * inlineUnitCost;
                  
                  // Query proposals linked to this specific activity (automatically matched)
                  const linkedMemos = getLinkedMemosForActivity(act, proposals);
                  const actRealisasi = linkedMemos.reduce((sum, p) => sum + (p.nominal || 0), 0);
                  const sisaDana = itemBudgetTotal - actRealisasi;
                  const realPercent = itemBudgetTotal > 0 ? (actRealisasi / itemBudgetTotal) * 100 : 0;
                  
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-primary uppercase tracking-wide">
                            {act.pilarName} ({act.pilarCode})
                          </span>
                          <span className="text-xs font-black text-slate-900 leading-tight mt-0.5">
                            {act.name}
                          </span>
                          <span className="text-[9.5px] font-bold text-slate-400 font-mono mt-0.5">
                            ID/A: {act.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {act.asnaf ? (
                          <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200/50 font-black text-[10px] uppercase">
                            {act.asnaf}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-medium text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500 max-w-[200px] font-medium leading-relaxed">
                        {act.keterangan || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isEditingInline ? (
                          <div className="flex flex-col gap-1 items-end bg-slate-50 p-1.5 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Mustahik:</span>
                              <input 
                                type="number" 
                                value={inlineMustahik}
                                onChange={(e) => setInlineMustahik(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-16 h-7 text-right text-[11px] font-bold px-1 py-0.5 border border-slate-250 rounded focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Freq:</span>
                              <input 
                                type="number" 
                                value={inlineFrekuensi}
                                onChange={(e) => setInlineFrekuensi(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-12 h-7 text-right text-[11px] font-bold px-1 py-0.5 border border-slate-250 rounded focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Cost:</span>
                              <input 
                                type="number" 
                                step={10000}
                                value={inlineUnitCost}
                                onChange={(e) => setInlineUnitCost(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-24 h-7 text-right text-[11px] font-mono font-bold px-1 py-0.5 border border-slate-250 rounded focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                            <span className="text-xs font-black text-primary leading-none mt-1">
                              {formatCurrency(editedBudgetTotal)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{formatCurrency(itemBudgetTotal)}</span>
                            <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                              {(act.mustahik || 0).toLocaleString('id-ID')} jiwa × {act.frekuensi}x / th
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              @ {formatCurrency(act.unitCost)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-xs font-black",
                            actRealisasi > 0 ? "text-emerald-700 font-mono" : "text-slate-450"
                          )}>
                            {formatCurrency(actRealisasi)}
                          </span>
                          
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-500">Sisa:</span>
                            <span className={cn(
                              "text-[10px] font-extrabold font-mono",
                              sisaDana < 0 ? "text-rose-600 bg-rose-50 px-1 rounded" : "text-slate-700"
                            )}>
                              {formatCurrency(sisaDana)}
                            </span>
                          </div>
 
                          {/* Progress Bar of actual match */}
                          <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 flex">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                realPercent > 100 ? "bg-rose-500" : realPercent >= 80 ? "bg-emerald-500" : realPercent >= 40 ? "bg-amber-400" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(realPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase mt-0.5">
                            Penyerapan: {realPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[245px]">
                          
                          {/* List of associated proposals */}
                          {linkedMemos.length === 0 ? (
                            <span className="text-[10px] font-semibold text-slate-400 italic block">
                              Belum ada berkas terhubung
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                              {linkedMemos.map(p => {
                                return (
                                  <div 
                                    key={p.id} 
                                    className="flex flex-col gap-1 bg-emerald-50/70 border border-emerald-500/10 p-1.5 rounded-lg text-[10px] font-bold text-emerald-950 hover:bg-emerald-100/70 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="truncate pr-1" title={`Agenda #${p.agendaNo} - ${p.namaPemohon}`}>
                                        📋 <strong>#{p.agendaNo}</strong> {p.namaPemohon} ({formatCurrency(p.nominal || 0)})
                                      </span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-[8.5px] bg-emerald-100/80 text-emerald-800 px-1 rounded tracking-wider font-extrabold uppercase flex items-center gap-0.5">
                                        ⚡ Otomatis
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-mono ml-auto">Asnaf: {p.asnaf || 'Miskin'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditingInline ? (
                            <>
                              <button 
                                onClick={() => saveInlineEdit(act.id)}
                                className="p-1 px-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase transition-all flex items-center gap-1 border border-emerald-200"
                                title="Simpan"
                              >
                                <Check className="size-3.5 stroke-[3]" />
                                OK
                              </button>
                              <button 
                                onClick={() => setInlineEditId(null)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Batal"
                              >
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => startInlineEdit(act)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all"
                                title="Ubah Anggaran"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteActivity(act.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER TIPS */}
      <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg mt-0.5">
            <Info className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Prinsip Akuntansi Syariah BAZNAS</h4>
            <p className="text-[11px] text-emerald-950 font-medium leading-relaxed mt-0.5">
              Target RKAT di atas mengikat program pendistribusian mustahik agar sejalan dengan ketersediaan real kas di bank pendukung. Selisih pagu RKAT dan Realisasi berjalan menunjukkan persentase saldo aman likuidasi operasional Kota Semarang yang berhak disalurkan.
            </p>
          </div>
        </div>

        <button 
          onClick={() => {
            alert('File RKAT Berhasil di-eksport ke Excel Format SIMBA!');
          }}
          className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-xs shrink-0"
        >
          <Download className="size-3.5 stroke-[3]" />
          Eksport RKAT Excel
        </button>
      </div>

      {/* ADD TARGET ACTIVITY DIALOG MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="size-5 text-primary" />
                  Tambah Target Asnaf RKAT
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Pilar BAZNAS</label>
                    <select
                      value={formPilar}
                      onChange={(e) => setFormPilar(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      {data.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Program / Kegiatan</label>
                    <select
                      value={formProgramCode}
                      onChange={(e) => setFormProgramCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                      disabled={formProgramsAvailable.length === 0}
                    >
                      {formProgramsAvailable.length > 0 ? (
                        formProgramsAvailable.map(p => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))
                      ) : (
                        <option value="">-- Tidak ada program --</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kategori Asnaf (8 Golongan)</label>
                  <select
                    value={formAsnaf}
                    onChange={(e) => setFormAsnaf(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    <option value="Fakir">Fakir</option>
                    <option value="Miskin">Miskin</option>
                    <option value="Amil">Amil</option>
                    <option value="Mualaf">Mualaf</option>
                    <option value="Riqab">Riqab (Hamba Sahaya)</option>
                    <option value="Gharimin">Gharimin (Orang Berhutang)</option>
                    <option value="Fisabilillah">Fisabilillah</option>
                    <option value="Ibnu Sabil">Ibnu Sabil</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Keterangan / Spesifikasi Bantuan</label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Misal: Bantuan paket sembako lansia"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Mustahik</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formMustahik}
                        onChange={(e) => setFormMustahik(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Jiwa</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Frekuensi / Thn</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formFrekuensi}
                        onChange={(e) => setFormFrekuensi(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">x</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Unit Cost (Rp)</label>
                    <input
                      type="number"
                      step="10000"
                      min="0"
                      value={formUnitCost}
                      onChange={(e) => setFormUnitCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-right"
                    />
                  </div>
                </div>

                {/* Subtotal Summary */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Anggaran Pagu Asnaf:</span>
                  <span className="text-lg font-black text-primary">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(formMustahik * formFrekuensi * formUnitCost)}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={saveNewActivity}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="size-4" />
                  Simpan Target RKAT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
