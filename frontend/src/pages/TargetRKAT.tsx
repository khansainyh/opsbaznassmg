import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  Target, 
  TrendingUp, 
  Percent, 
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
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';
import { Pilar, AsnafTarget } from '../data/pilarData';
import { useAuth } from '../context/AuthContext';

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


export default function TargetRKAT({ proposals }: TargetRKATProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';
  
  const [activeTab, setActiveTab] = useState<'Pengumpulan' | 'Penyaluran' | 'Operasional'>('Penyaluran');
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
              name: target.name || prog.name, // Display custom activity name if present, fallback to clean Program name
              keterangan: target.keterangan || `Penyaluran program ${prog.name} khusus kriteria asnaf ${target.asnaf}`,
              mustahik: target.mustahik || 0,
              frekuensi: Number(target.frekuensi) || 1,
              unitCost: target.nominal || 0,
              programCode: prog.code,
              asnafTargetId: fallbackId,
              asnaf: target.asnaf
            });
          });
        }
      });
    });
    return list;
  }, [data]);



  // UI Control States
  const [selectedPilarFilter, setSelectedPilarFilter] = useState<string>('Semua');
  
  // Modals / Add/Edit States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  
  // Form fields for adding program activities per Asnaf
  const [formPilar, setFormPilar] = useState<string>('1100');
  const [formProgramCode, setFormProgramCode] = useState<string>('');
  const [formNamaKegiatan, setFormNamaKegiatan] = useState<string>('');
  const [formAsnaf, setFormAsnaf] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formMustahik, setFormMustahik] = useState<number>(10);
  const [formFrekuensi, setFormFrekuensi] = useState<number>(1);
  const [formUnitCost, setFormUnitCost] = useState<number>(250000);

  // Edit modal state variables
  const [editingActivity, setEditingActivity] = useState<RKATActivity | null>(null);

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

  const getParentProgramCode = (code?: string): string => {
    if (!code) return "";
    return code.split('.')[0].trim();
  };

  // Robust automatic helper matching a proposal dynamically to an RKAT activity based on Pilar + Program + Asnaf
  const getMatchedActivityForProposal = (p: ProposalMemo, currentActivities: typeof activities) => {
    // 1. Match by parent program code if programCode is present
    if (p.programCode) {
      const parentP = getParentProgramCode(p.programCode);
      const matchByCode = currentActivities.find(act => {
        const parentAct = getParentProgramCode(act.programCode);
        const matchesCode = parentP === parentAct;
        if (!matchesCode) return false;

        if (act.asnaf) {
          const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
          return act.asnaf.toLowerCase() === pAsnaf;
        }
        return true;
      });
      if (matchByCode) return matchByCode;
    }

    // 2. Fallback to name-based matching
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
      // 1. Match by parent program code if programCode is present
      if (p.programCode) {
        const parentP = getParentProgramCode(p.programCode);
        const parentAct = getParentProgramCode(act.programCode);
        const matchesCode = parentP === parentAct;
        if (matchesCode) {
          if (act.asnaf) {
            const pAsnaf = (p.asnaf || 'Miskin').toLowerCase();
            return act.asnaf.toLowerCase() === pAsnaf;
          }
          return true;
        }
        return false;
      }

      // 2. Fallback to name-based matching
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

  // Helper to categorize Semarang Sehat/Cerdas into Konsumtif (Pendistribusian) vs Produktif (Pendayagunaan)
  const getPilarCategory = useCallback((pilarName: string, programCode?: string, jenisPermohonan?: string): string => {
    if (pilarName === 'Semarang Sehat') {
      const isProduktif = programCode?.startsWith('22') || 
        (jenisPermohonan && [
          'sanitasi', 'sumur', 'stunting', 'air bersih', 'lingkungan', 'promosi'
        ].some(word => jenisPermohonan.toLowerCase().includes(word)));
      return isProduktif ? 'Semarang Sehat (Produktif)' : 'Semarang Sehat (Konsumtif)';
    }
    if (pilarName === 'Semarang Cerdas') {
      const isProduktif = programCode?.startsWith('23') || 
        (jenisPermohonan && [
          'tinggi', 'infrastruktur', 'pembinaan', 'karakter', 'kompetensi'
        ].some(word => jenisPermohonan.toLowerCase().includes(word)));
      return isProduktif ? 'Semarang Cerdas (Produktif)' : 'Semarang Cerdas (Konsumtif)';
    }
    return pilarName;
  }, []);

  // Aggregate static total budget & dynamic realized budgets
  const pilarBudgets = useMemo(() => {
    const sums: { [pilarName: string]: { target: number, realisasi: number } } = {
      'Semarang Peduli': { target: 0, realisasi: 0 },
      'Semarang Sehat (Konsumtif)': { target: 0, realisasi: 0 },
      'Semarang Sehat (Produktif)': { target: 0, realisasi: 0 },
      'Semarang Cerdas (Konsumtif)': { target: 0, realisasi: 0 },
      'Semarang Cerdas (Produktif)': { target: 0, realisasi: 0 },
      'Semarang Taqwa': { target: 0, realisasi: 0 },
      'Semarang Makmur': { target: 0, realisasi: 0 }
    };

    // Sum Target Budgets from Flattened Activities State
    activities.forEach(act => {
      const budget = act.mustahik * act.frekuensi * act.unitCost;
      const cat = getPilarCategory(act.pilarName, act.programCode, act.name);
      if (sums[cat]) {
        sums[cat].target += budget;
      }
    });

    // Sum Realized values from Proposals dynamically
    realizedProposals.forEach(p => {
      const amt = p.nominal || 0;
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        const cat = getPilarCategory(matchedAct.pilarName, matchedAct.programCode, matchedAct.name);
        if (sums[cat]) {
          sums[cat].realisasi += amt;
        }
      } else {
        const prog = p.program || 'Semarang Peduli';
        const cat = getPilarCategory(prog, p.programCode, p.jenisPermohonan);
        if (sums[cat]) {
          sums[cat].realisasi += amt;
        }
      }
    });

    return sums;
  }, [activities, realizedProposals, getPilarCategory]);

  // Monthly values breakdown (Jan to Dec, 1 to 12)
  const monthlyRealizationsByPilar = useMemo(() => {
    const matrix: { [pilarName: string]: { [month: number]: number } } = {
      'Semarang Peduli': {},
      'Semarang Sehat (Konsumtif)': {},
      'Semarang Sehat (Produktif)': {},
      'Semarang Cerdas (Konsumtif)': {},
      'Semarang Cerdas (Produktif)': {},
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
      let prCode = p.programCode;
      let jPerm = p.jenisPermohonan;
      
      const matchedAct = getMatchedActivityForProposal(p, activities);
      if (matchedAct) {
        pName = matchedAct.pilarName;
        prCode = matchedAct.programCode;
        jPerm = matchedAct.name;
      }

      const cat = getPilarCategory(pName, prCode, jPerm);

      const dateStr = p.tglCairBank || p.tanggalMasuk;
      if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            if (matrix[cat]) {
              matrix[cat][monthNum] += amt;
            }
          }
        }
      } else {
        // default distribution
        if (matrix[cat]) {
          matrix[cat][3] += amt;
        }
      }
    });

    return matrix;
  }, [realizedProposals, activities, getPilarCategory]);

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
      name: formNamaKegiatan.trim() || undefined,
      asnaf: (formAsnaf || undefined) as any,
      frekuensi: formFrekuensi,
      nominal: formUnitCost,
      mustahik: formMustahik,
      keterangan: formKeterangan || (formAsnaf ? `Penyaluran Asnaf ${formAsnaf}` : `Penyaluran Target Kegiatan`)
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
    const newBudget = updatedTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);

    axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
      rkat_details: updatedTargets,
      budget_rkat: newBudget
    }).then(() => {
      fetchPilars();
      // Reset
      setFormNamaKegiatan('');
      setFormKeterangan('');
      setFormMustahik(10);
      setFormFrekuensi(1);
      setFormUnitCost(250000);
      setFormAsnaf('');
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
          } else {
            const targets = prog.asnafTargets || [];
            const matchIndex = targets.findIndex((t, tIdx) => {
              const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
              return fallbackId === id;
            });
            if (matchIndex !== -1) {
              targetProgramCode = prog.code;
              updatedTargets = targets.filter((_, tIdx) => {
                const fallbackId = targets[tIdx].id || `act-auto-${prog.code}-${targets[tIdx].asnaf || 'General'}-${tIdx}`;
                return fallbackId !== id;
              });
            }
          }
        });
      });

      if (isGeneral) {
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          budget_rkat: 0
        }).then(() => fetchPilars()).catch(console.error);
      } else if (targetProgramCode) {
        const newBudget = updatedTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        axios.put(`http://127.0.0.1:4000/api/programs/${targetProgramCode}`, {
          rkat_details: updatedTargets,
          budget_rkat: newBudget
        }).then(() => fetchPilars()).catch(console.error);
      }
    }
  };

  // Edit Modal helper functions
  const startEditModal = (act: RKATActivity) => {
    setEditingActivity(act);
    setFormPilar(act.pilarCode);
    setFormProgramCode(act.programCode);
    setFormNamaKegiatan(act.name);
    setFormAsnaf(act.asnaf || '');
    setFormKeterangan(act.keterangan);
    setFormMustahik(act.mustahik);
    setFormFrekuensi(act.frekuensi);
    setFormUnitCost(act.unitCost);
  };

  const saveEditActivity = async () => {
    if (!editingActivity) return;
    if (!formProgramCode) {
      alert('Pilih Program SIMBA yang ingin dihubungkan.');
      return;
    }

    const updatedTarget: AsnafTarget = {
      id: editingActivity.asnafTargetId || editingActivity.id,
      name: formNamaKegiatan.trim() || undefined,
      asnaf: (formAsnaf || undefined) as any,
      frekuensi: formFrekuensi,
      nominal: formUnitCost,
      mustahik: formMustahik,
      keterangan: formKeterangan || (formAsnaf ? `Penyaluran Asnaf ${formAsnaf}` : `Penyaluran Target Kegiatan`)
    };

    // If Program changed
    if (editingActivity.programCode !== formProgramCode) {
      try {
        // 1. Remove from old program
        let oldTargets: AsnafTarget[] = [];
        data.forEach(p => {
          p.programs.forEach(prog => {
            if (prog.code === editingActivity.programCode) {
              const targets = prog.asnafTargets || [];
              oldTargets = targets.filter((t, tIdx) => {
                const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
                return fallbackId !== editingActivity.id && t.id !== editingActivity.id;
              });
            }
          });
        });
        const oldBudget = oldTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        await axios.put(`http://127.0.0.1:4000/api/programs/${editingActivity.programCode}`, {
          rkat_details: oldTargets,
          budget_rkat: oldBudget
        });

        // 2. Add to new program
        let newTargets: AsnafTarget[] = [];
        data.forEach(p => {
          p.programs.forEach(prog => {
            if (prog.code === formProgramCode) {
              newTargets = prog.asnafTargets || [];
            }
          });
        });
        const updatedNewTargets = [...newTargets, updatedTarget];
        const newBudget = updatedNewTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);
        await axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
          rkat_details: updatedNewTargets,
          budget_rkat: newBudget
        });

        fetchPilars();
        setEditingActivity(null);
      } catch (err) {
        console.error('Gagal memindahkan kegiatan:', err);
        alert('Gagal memindahkan kegiatan program.');
      }
    } else {
      // Program did not change, just update the target inside the program
      let currentTargets: AsnafTarget[] = [];
      data.forEach(p => {
        p.programs.forEach(prog => {
          if (prog.code === formProgramCode) {
            const targets = prog.asnafTargets || [];
            // Match and replace
            currentTargets = targets.map((t, tIdx) => {
              const fallbackId = t.id || `act-auto-${prog.code}-${t.asnaf || 'General'}-${tIdx}`;
              if (fallbackId === editingActivity.id || t.id === editingActivity.id) {
                return updatedTarget;
              }
              return t;
            });
          }
        });
      });

      const newBudget = currentTargets.reduce((sum, t) => sum + (t.mustahik * Number(t.frekuensi) * t.nominal), 0);

      axios.put(`http://127.0.0.1:4000/api/programs/${formProgramCode}`, {
        rkat_details: currentTargets,
        budget_rkat: newBudget
      }).then(() => {
        fetchPilars();
        setEditingActivity(null);
      }).catch(err => {
        console.error('Gagal memperbarui kegiatan', err);
        alert('Gagal memperbarui kegiatan ke database');
      });
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

  const renderPilarRow = (code: string, displayName: string, budgetKey: string, indexNumber: number) => {
    const targetAnggaran = pilarBudgets[budgetKey]?.target || 0;
    const realisAsi = pilarBudgets[budgetKey]?.realisasi || 0;
    const percent = targetAnggaran > 0 ? (realisAsi / targetAnggaran) * 100 : 0;
    
    return (
      <tr key={code} className="hover:bg-slate-50/50 transition-colors">
        <td className="px-4 py-3.5 text-xs text-slate-500 font-bold text-center">
          {indexNumber}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-col">
            <span className="text-xs font-black text-primary font-mono">{code}</span>
            <span className="text-xs font-semibold text-slate-900 mt-0.5">{displayName}</span>
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
          let cellVal = monthlyRealizationsByPilar[budgetKey]?.[month] || 0;
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
  };



  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 h-full overflow-y-auto">
      
      {/* Header and overview */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex text-xs font-bold text-slate-400 gap-2 items-center mb-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Pelaporan</span>
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="text-primary font-black">Target RKAT</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="size-8 text-primary" />
            Target RKAT
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-2">
            Monitor target dan realisasi anggaran berdasarkan kategori pengelolaan.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {(['Pengumpulan', 'Penyaluran', 'Operasional'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            RKAT {tab}
          </button>
        ))}
      </div>

      {activeTab !== 'Penyaluran' ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <Target className="size-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-600">Modul RKAT {activeTab} Belum Tersedia</h3>
          <p className="text-slate-400 text-sm mt-1">Data dan tampilan untuk RKAT {activeTab} saat ini sedang dalam pengembangan.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-100 text-emerald-700 rounded-xl">
            <TrendingUp className="size-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Anggaran RKAT</p>
            <p className="text-2xl font-black text-slate-900 leading-tight mt-1">{formatCurrency(grandTotalTarget)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-xl">
            <Percent className="size-8" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capai Realisasi Berjalan</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{formatCurrency(grandTotalRealisasi)}</span>
              <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {overallPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 flex items-center w-full shadow-inner max-w-6xl mx-auto overflow-x-auto custom-scrollbar">
        <div className="flex flex-row items-center gap-1.5 w-full min-w-max md:min-w-0 md:justify-center md:flex-wrap">
          <button
            onClick={() => setSelectedPilarFilter('Semua')}
            className={cn(
              "py-2.5 px-4 text-[10px] md:text-xs font-black uppercase rounded-xl transition-all text-center tracking-wider focus:outline-none whitespace-nowrap",
              selectedPilarFilter === 'Semua' 
                ? "bg-white text-primary shadow-sm font-extrabold border border-slate-200/10" 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            )}
          >
            Semua Pilar
          </button>
          {listPilarKeys.map(pName => (
            <button
              key={pName}
              onClick={() => setSelectedPilarFilter(pName)}
              className={cn(
                "py-2.5 px-4 text-[10px] md:text-xs font-black uppercase rounded-xl transition-all text-center tracking-wider focus:outline-none whitespace-nowrap",
                selectedPilarFilter === pName 
                  ? "bg-white text-primary shadow-sm font-extrabold border border-slate-200/10" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
              )}
            >
              {pName}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE 1: ACCOUNT LEDGER SPLIT */}
      <div className="bg-white rounded-2xl border border-primary/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-primary/5 bg-slate-50/40 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart4 className="size-4 text-primary" />
              Anggaran &amp; Realisasi Pilar
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Ringkasan total anggaran, realisasi yang tersalurkan, dan persentase serapan kumulatif untuk masing-masing pilar program.</p>
          </div>
          
          <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-100">
            ⚡ Menampilkan Realisasi per Bulan Aktual
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
              {/* Row 1: Semarang Peduli */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Peduli') && (
                renderPilarRow("1100", "Semarang Peduli", "Semarang Peduli", 1)
              )}
              
              {/* Row 2: Semarang Sehat (Konsumtif) */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Sehat') && (
                renderPilarRow("1200", "Semarang Sehat (Konsumtif)", "Semarang Sehat (Konsumtif)", 2)
              )}
              
              {/* Row 3: Semarang Sehat (Produktif) */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Sehat') && (
                renderPilarRow("2200", "Semarang Sehat (Produktif)", "Semarang Sehat (Produktif)", 3)
              )}
              
              {/* Row 4: Semarang Cerdas (Konsumtif) */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Cerdas') && (
                renderPilarRow("1300", "Semarang Cerdas (Konsumtif)", "Semarang Cerdas (Konsumtif)", 4)
              )}
              
              {/* Row 5: Semarang Cerdas (Produktif) */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Cerdas') && (
                renderPilarRow("2300", "Semarang Cerdas (Produktif)", "Semarang Cerdas (Produktif)", 5)
              )}
              
              {/* Row 6: Semarang Taqwa */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Taqwa') && (
                renderPilarRow("1400", "Semarang Taqwa", "Semarang Taqwa", 6)
              )}
              
              {/* Row 7: Semarang Makmur */}
              {(selectedPilarFilter === 'Semua' || selectedPilarFilter === 'Semarang Makmur') && (
                renderPilarRow("2100", "Semarang Makmur", "Semarang Makmur", 7)
              )}
              
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
                    Object.keys(monthlyRealizationsByPilar).forEach(cat => {
                      sumMonth += monthlyRealizationsByPilar[cat]?.[month] || 0;
                    });

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
              Detail Target &amp; Realisasi Kegiatan
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Rincian target kegiatan, kriteria asnaf yang disasar, serta estimasi unit cost untuk tiap program.</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs font-bold text-slate-400">Pilar Aktif:</span>
              <span className="px-3 py-1 bg-primary/10 text-primary font-black uppercase text-[10px] rounded-md tracking-wider">
                {selectedPilarFilter}
              </span>
            </div>
            
            {activeTab === 'Penyaluran' && isSuperAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMigrationModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 border border-slate-200"
                >
                  <Upload className="size-3.5 stroke-[3]" />
                  Migrasi
                </button>
                <button
                  onClick={() => {
                    const activePilarObj = data.find(p => p.name === selectedPilarFilter);
                    const defaultPilarCode = activePilarObj ? activePilarObj.code : (data[0]?.code || '1100');
                    setFormPilar(defaultPilarCode);
                    setFormNamaKegiatan('');
                    setIsAddModalOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-md shadow-primary/15 transition-all active:scale-95 shrink-0"
                >
                  <Plus className="size-3.5 stroke-[3]" />
                  Tambah Kegiatan
                </button>
              </div>
            )}
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
                  const itemBudgetTotal = act.mustahik * act.frekuensi * act.unitCost;
                  
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
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">{formatCurrency(itemBudgetTotal)}</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                            {(act.mustahik || 0).toLocaleString('id-ID')} jiwa × {act.frekuensi}x / th
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            @ {formatCurrency(act.unitCost)}
                          </span>
                        </div>
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
                        <div className="flex items-center justify-center gap-1.5">
                          {isSuperAdmin && (
                            <>
                              <button 
                                onClick={() => startEditModal(act)}
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

      {/* ADD / EDIT TARGET ACTIVITY DIALOG MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingActivity !== null) && (
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
                  {editingActivity ? <Edit2 className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
                  {editingActivity ? 'Ubah Target RKAT' : 'Tambah Target Asnaf RKAT'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingActivity(null);
                  }}
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
                  <label className="text-xs font-bold text-slate-700">Nama Kegiatan</label>
                  <input
                    type="text"
                    value={formNamaKegiatan}
                    onChange={(e) => setFormNamaKegiatan(e.target.value)}
                    placeholder="Misal: Pemberian paket sembako dhuafa Semarang Utara"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kategori Asnaf (8 Golongan)</label>
                  <select
                    value={formAsnaf}
                    onChange={(e) => setFormAsnaf(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Kosong (Umum / Non-Asnaf) --</option>
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
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingActivity(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={editingActivity ? saveEditActivity : saveNewActivity}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="size-4" />
                  {editingActivity ? 'Simpan Perubahan' : 'Simpan Target RKAT'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal RKAT */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMigrationModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Migrasi Data RKAT</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Impor Data via Excel</h4>
                  <p className="text-xs text-slate-500">Gunakan file Excel (.xlsx) dengan kolom: Kode Pilar, Kode Program, Nama Kegiatan, Asnaf, Keterangan, Target Jiwa, Frekuensi, Unit Cost.</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet([
                        { 
                          "Kode Pilar": "1100",
                          "Kode Program": "1102",
                          "Nama Kegiatan": "Bantuan Biaya Hidup Sembako",
                          "Asnaf": "Miskin",
                          "Keterangan": "Pemberian paket sembako dhuafa Semarang Utara",
                          "Target Jiwa": 100,
                          "Frekuensi": 1,
                          "Unit Cost": 250000
                        }
                      ]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Template_RKAT");
                      XLSX.writeFile(wb, "Template_Migrasi_RKAT.xlsx");
                    }} 
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          try {
                            const bstr = evt.target?.result;
                            const wb = XLSX.read(bstr, { type: 'binary' });
                            const wsname = wb.SheetNames[0];
                            const ws = wb.Sheets[wsname];
                            const dataExcel = XLSX.utils.sheet_to_json(ws) as any[];
                            
                            if (dataExcel.length === 0) {
                              alert('File Excel kosong atau tidak terbaca.');
                              return;
                            }

                            // Group activities by Kode Program
                            const groupedByProgram: { [code: string]: any[] } = {};
                            dataExcel.forEach((row) => {
                              const progCode = String(row["Kode Program"] || row["Kode_Program"] || row["kode_program"] || "").trim();
                              if (!progCode) return;
                              if (!groupedByProgram[progCode]) {
                                groupedByProgram[progCode] = [];
                              }
                              
                              const mustahik = Number(row["Target Jiwa"] || row["Target_Jiwa"] || row["target_jiwa"] || 0);
                              const frekuensi = Number(row["Frekuensi"] || row["Frekuensi_Tahun"] || row["frekuensi_tahun"] || 1);
                              const nominal = Number(row["Unit Cost"] || row["Unit_Cost_Rp"] || row["unit_cost"] || 0);

                              groupedByProgram[progCode].push({
                                id: `asnaf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                name: String(row["Nama Kegiatan"] || row["Nama_Kegiatan"] || row["nama_kegiatan"] || "").trim(),
                                asnaf: String(row["Asnaf"] || row["asnaf"] || "").trim(),
                                frekuensi,
                                nominal,
                                mustahik,
                                keterangan: String(row["Keterangan"] || row["keterangan"] || "").trim()
                              });
                            });

                            const programCodes = Object.keys(groupedByProgram);
                            if (programCodes.length === 0) {
                              alert('Tidak ditemukan kolom Kode Program yang valid.');
                              return;
                            }

                            let successCount = 0;
                            for (const code of programCodes) {
                              try {
                                const rkatDetails = groupedByProgram[code];
                                const budgetRkat = rkatDetails.reduce((sum, t) => sum + (t.mustahik * t.frekuensi * t.nominal), 0);
                                await axios.put(`http://127.0.0.1:4000/api/programs/${code}`, {
                                  rkat_details: rkatDetails,
                                  budget_rkat: budgetRkat
                                });
                                successCount++;
                              } catch (err) {
                                console.error(`Gagal migrasi program ${code}:`, err);
                              }
                            }

                            alert(`Migrasi Berhasil! Data Excel terbaca sebanyak ${dataExcel.length} baris. Berhasil memperbarui ${successCount} program di database.`);
                            fetchPilars();
                            setIsMigrationModalOpen(false);
                          } catch (err) {
                            console.error(err);
                            alert('Gagal memproses file Excel');
                          }
                        };
                        reader.readAsBinaryString(file);
                      }} 
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Pastikan Kode Program sesuai dengan referensi master data SIMBA BAZNAS untuk menghindari kegagalan sinkronisasi.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      )}
    </div>
  );
}
