import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Wallet, 
  Building2, 
  X, 
  Activity,
  RefreshCw, 
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export interface COAItem {
  coa_code: string;
  nama_akun: string;
  klasifikasi: string;
  tipe_dana?: string;
  saldo_awal?: number;
}

export interface BankAccountItem {
  account_id: string;
  nama_akun: string;
  tipe_kas: 'TUNAI' | 'BANK';
  kelompok_dana: 'ZAKAT' | 'INFAK_TERIKAT' | 'INFAK_TIDAK_TERIKAT' | 'AMIL' | 'APBD' | 'NON-HALAL';
  saldo: number;
  no_rekening?: string;
  kode_laci?: string;
  coa_code: string;
  coa?: COAItem;
}

export interface CoaMappingRuleItem {
  rule_id: string;
  program_code: string;
  asnaf_id?: string;
  tipe_kas: 'TUNAI' | 'BANK';
  sumber_dana_tag: 'ZAKAT' | 'INFAK_TERIKAT' | 'INFAK_TIDAK_TERIKAT' | 'AMIL' | 'APBD';
  debit_coa_code: string;
  kredit_coa_code: string;
  debitCoa?: COAItem;
  kreditCoa?: COAItem;
}



export interface ProposalItem {
  id: string;
  agenda_no: number;
  nama_pemohon: string;
  jenis_permohonan: string; // program code
  nominal: number;
  asnaf?: string;
  tipe_bantuan?: string;
  status: string;
  program?: {
    name: string;
  };
}

export default function PengaturanKeuangan() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [activeTab, setActiveTab] = useState<'accounts' | 'mapping' | 'coa' | 'kategori-biaya'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');

  // DB States
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [rules, setRules] = useState<CoaMappingRuleItem[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [penerimaanMappings, setPenerimaanMappings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategorySubmitLoading, setIsCategorySubmitLoading] = useState(false);
  const [isPenerimaanModalOpen, setIsPenerimaanModalOpen] = useState(false);
  const [penerimaanForm, setPenerimaanForm] = useState({
    kategori: '',
    persentase_amil: 12.5,
    persentase_upz: 5.0,
    persentase_baznas: 7.5,
    persentase_salur_pembantuan: 70.0,
    coa_debit_beban: '',
    coa_kredit_amil: '',
    coa_kredit_utang: '',
    coa_codes: ''
  });

  const [isPenerimaanCoasDropdownOpen, setIsPenerimaanCoasDropdownOpen] = useState(false);
  const [penerimaanCoasSearch, setPenerimaanCoasSearch] = useState('');
  const [isPenerimaanDebitDropdownOpen, setIsPenerimaanDebitDropdownOpen] = useState(false);
  const [penerimaanDebitSearch, setPenerimaanDebitSearch] = useState('');
  const [isPenerimaanKreditAmilDropdownOpen, setIsPenerimaanKreditAmilDropdownOpen] = useState(false);
  const [penerimaanKreditAmilSearch, setPenerimaanKreditAmilSearch] = useState('');
  const [isPenerimaanKreditUtangDropdownOpen, setIsPenerimaanKreditUtangDropdownOpen] = useState(false);
  const [penerimaanKreditUtangSearch, setPenerimaanKreditUtangSearch] = useState('');


  // Loading indicator
  const [loading, setLoading] = useState(false);

  // Modals / Add/Edit Forms
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCOAModalOpen, setIsCOAModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isMigrationCOAModalOpen, setIsMigrationCOAModalOpen] = useState(false);
  const [isMigrationRuleModalOpen, setIsMigrationRuleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Custom Dropdown & Search States
  const [isFormKelompokDanaDropdownOpen, setIsFormKelompokDanaDropdownOpen] = useState(false);
  const [isFormCoaDropdownOpen, setIsFormCoaDropdownOpen] = useState(false);
  const [formCoaSearchQuery, setFormCoaSearchQuery] = useState('');

  const [isRuleProgramDropdownOpen, setIsRuleProgramDropdownOpen] = useState(false);
  const [ruleProgramSearchQuery, setRuleProgramSearchQuery] = useState('');
  const [isRuleAsnafDropdownOpen, setIsRuleAsnafDropdownOpen] = useState(false);
  const [isRuleMetodeKasDropdownOpen, setIsRuleMetodeKasDropdownOpen] = useState(false);
  const [isRuleKelompokDanaDropdownOpen, setIsRuleKelompokDanaDropdownOpen] = useState(false);
  const [isRuleDebitCoaDropdownOpen, setIsRuleDebitCoaDropdownOpen] = useState(false);
  const [ruleDebitCoaSearchQuery, setRuleDebitCoaSearchQuery] = useState('');
  const [isRuleKreditCoaDropdownOpen, setIsRuleKreditCoaDropdownOpen] = useState(false);
  const [ruleKreditCoaSearchQuery, setRuleKreditCoaSearchQuery] = useState('');

  const [isCoaKlasifikasiDropdownOpen, setIsCoaKlasifikasiDropdownOpen] = useState(false);
  const [isCoaTipeDanaDropdownOpen, setIsCoaTipeDanaDropdownOpen] = useState(false);

  // Toast notifications state
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  // Form states - Accounts
  const [accountForm, setAccountForm] = useState({
    nama_akun: '',
    tipe_kas: 'TUNAI' as 'TUNAI' | 'BANK',
    kelompok_dana: 'ZAKAT' as any,
    saldo: 0,
    no_rekening: '',
    kode_laci: '',
    coa_code: ''
  });

  // Form states - COA
  const [coaForm, setCoaForm] = useState({
    coa_code: '',
    nama_akun: '',
    klasifikasi: 'Aktiva',
    tipe_dana: '',
    saldo_awal: 0
  });

  // Form states - Rules
  const [ruleForm, setRuleForm] = useState({
    program_code: '',
    asnaf_id: '',
    tipe_kas: 'TUNAI' as 'TUNAI' | 'BANK',
    sumber_dana_tag: 'ZAKAT' as any,
    debit_coa_code: '',
    kredit_coa_code: ''
  });

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);



  // Migrasi COA Methods
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        coa_code: '110101003',
        nama_akun: 'Bank Mandiri Zakat',
        klasifikasi: 'Aktiva',
        tipe_dana: 'ZAKAT',
        saldo_awal: 10000000
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_COA");
    XLSX.writeFile(wb, "Template_Migrasi_COA.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessages([]);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let successCount = 0;
        let failCount = 0;

        for (const row of data as any[]) {
          if (!row.coa_code || !row.nama_akun) continue;
          try {
            await axios.post('/api/finance/coa', {
              coa_code: String(row.coa_code),
              nama_akun: String(row.nama_akun),
              klasifikasi: row.klasifikasi ? String(row.klasifikasi) : 'Aktiva',
              tipe_dana: row.tipe_dana ? String(row.tipe_dana) : null,
              saldo_awal: row.saldo_awal !== undefined && row.saldo_awal !== null ? Number(row.saldo_awal) : 0
            });
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        
        const newMessages = [];
        if (successCount > 0) {
          newMessages.push({ type: 'success' as const, text: `Berhasil migrasi/memperbarui ${successCount} data COA.` });
        }
        if (failCount > 0) {
          newMessages.push({ type: 'warning' as const, text: `Gagal migrasi ${failCount} data COA.` });
        }
        if (successCount === 0 && failCount === 0) {
          newMessages.push({ type: 'warning' as const, text: 'Tidak ada data COA yang diproses.' });
        }
        setMessages(newMessages);
        setIsMigrationCOAModalOpen(false);
        fetchData();
      } catch (err) {
        setMessages([{ type: 'error', text: 'Gagal memproses file Excel.' }]);
        setLoading(false);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadRuleTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        program_code: 'K01',
        asnaf_id: 'Miskin',
        tipe_kas: 'BANK',
        sumber_dana_tag: 'ZAKAT',
        debit_coa_code: '510101001',
        kredit_coa_code: '110101003'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Mapping");
    XLSX.writeFile(wb, "Template_Migrasi_Mapping_COA.xlsx");
  };

  const handleRuleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessages([]);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let successCount = 0;
        let failCount = 0;

        for (const row of data as any[]) {
          if (!row.program_code || !row.tipe_kas || !row.sumber_dana_tag || !row.debit_coa_code || !row.kredit_coa_code) continue;
          try {
            await axios.post('/api/finance/mapping-rules', {
              program_code: String(row.program_code).trim(),
              asnaf_id: row.asnaf_id ? String(row.asnaf_id).trim() : null,
              tipe_kas: String(row.tipe_kas).trim(),
              sumber_dana_tag: String(row.sumber_dana_tag).trim(),
              debit_coa_code: String(row.debit_coa_code).trim(),
              kredit_coa_code: String(row.kredit_coa_code).trim()
            });
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        
        const newMessages = [];
        if (successCount > 0) {
          newMessages.push({ type: 'success' as const, text: `Berhasil migrasi/memperbarui ${successCount} aturan pemetaan COA.` });
        }
        if (failCount > 0) {
          newMessages.push({ type: 'warning' as const, text: `Gagal migrasi ${failCount} aturan pemetaan COA.` });
        }
        if (successCount === 0 && failCount === 0) {
          newMessages.push({ type: 'warning' as const, text: 'Tidak ada data aturan mapping yang diproses.' });
        }
        setMessages(newMessages);
        setIsMigrationRuleModalOpen(false);
        fetchData();
      } catch (err) {
        setMessages([{ type: 'error', text: 'Gagal memproses file Excel.' }]);
        setLoading(false);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCoas, resAccounts, resRules, resPrograms, resPenerimaan, resCategories] = await Promise.all([
        axios.get('/api/finance/coa'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/mapping-rules'),
        axios.get('/api/programs'),
        axios.get('/api/penerimaan-mapping'),
        axios.get('/api/kategori-biaya')
      ]);

      setCoas(resCoas.data);
      setAccounts(resAccounts.data);
      setRules(resRules.data);
      setPrograms(resPrograms.data);
      setPenerimaanMappings(resPenerimaan.data.data || []);
      setCategories(resCategories.data.data || []);
    } catch (error) {
      console.error('Gagal mengambil data keuangan:', error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  // Format IDR Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Helper lists
  const filteredKasAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.tipe_kas === 'TUNAI' && (
        a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.coa_code.includes(searchTerm)
      )
    );
  }, [accounts, searchTerm]);

  const filteredBankAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.tipe_kas === 'BANK' && (
        a.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.no_rekening?.includes(searchTerm) ||
        a.coa_code.includes(searchTerm)
      )
    );
  }, [accounts, searchTerm]);

  const filteredCOAs = useMemo(() => {
    return coas.filter(c => 
      c.nama_akun.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.coa_code.includes(searchTerm)
    );
  }, [coas, searchTerm]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => 
      r.program_code.includes(searchTerm) ||
      (r.asnaf_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);



  // ==========================================
  // Account Actions
  // ==========================================
  const handleOpenAccountModal = (item: any = null, defaultTipe: 'TUNAI' | 'BANK' = 'TUNAI') => {
    setIsFormKelompokDanaDropdownOpen(false);
    setIsFormCoaDropdownOpen(false);
    setFormCoaSearchQuery('');
    if (item) {
      setEditingItem(item);
      setAccountForm({
        nama_akun: item.nama_akun,
        tipe_kas: item.tipe_kas,
        kelompok_dana: item.kelompok_dana,
        saldo: Number(item.saldo),
        no_rekening: item.no_rekening || '',
        kode_laci: item.kode_laci || '',
        coa_code: item.coa_code
      });
    } else {
      setEditingItem(null);
      const defaultCoa = coas.find(c => c.klasifikasi === 'Aktiva');
      setAccountForm({
        nama_akun: '',
        tipe_kas: defaultTipe,
        kelompok_dana: 'ZAKAT',
        saldo: defaultCoa ? Number(defaultCoa.saldo_awal || 0) : 0,
        no_rekening: '',
        kode_laci: '',
        coa_code: defaultCoa?.coa_code || ''
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...accountForm,
        kelompok_dana: accountForm.tipe_kas === 'BANK' ? 'PENYIMPANAN' : accountForm.kelompok_dana
      };
      if (editingItem) {
        await axios.put(`/api/finance/accounts/${editingItem.account_id}`, payload);
      } else {
        await axios.post('/api/finance/accounts', payload);
      }
      setIsAccountModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan akun: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus akun fisik ini?')) return;
    try {
      await axios.delete(`/api/finance/accounts/${id}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  // ==========================================
  // COA Actions
  // ==========================================
  const handleOpenCOAModal = (item: any = null) => {
    setIsCoaKlasifikasiDropdownOpen(false);
    setIsCoaTipeDanaDropdownOpen(false);
    if (item) {
      setEditingItem(item);
      setCoaForm({
        coa_code: item.coa_code,
        nama_akun: item.nama_akun,
        klasifikasi: item.klasifikasi || 'Aktiva',
        tipe_dana: item.tipe_dana || '',
        saldo_awal: Number(item.saldo_awal) || 0
      });
    } else {
      setEditingItem(null);
      setCoaForm({
        coa_code: '',
        nama_akun: '',
        klasifikasi: 'Aktiva',
        tipe_dana: '',
        saldo_awal: 0
      });
    }
    setIsCOAModalOpen(true);
  };

  const handleSaveCOA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...coaForm,
        tipe_dana: coaForm.tipe_dana || null,
        saldo_awal: Number(coaForm.saldo_awal) || 0
      };
      if (editingItem) {
        await axios.put(`/api/finance/coa/${editingItem.coa_code}`, payload);
      } else {
        await axios.post('/api/finance/coa', payload);
      }
      setIsCOAModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan COA: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteCOA = async (code: string) => {
    if (!window.confirm('Yakin ingin menghapus kode COA master ini?')) return;
    try {
      await axios.delete(`/api/finance/coa/${code}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  // ==========================================
  // Rule Actions
  // ==========================================
  const handleOpenRuleModal = (item: any = null) => {
    setIsRuleProgramDropdownOpen(false);
    setRuleProgramSearchQuery('');
    setIsRuleAsnafDropdownOpen(false);
    setIsRuleMetodeKasDropdownOpen(false);
    setIsRuleKelompokDanaDropdownOpen(false);
    setIsRuleDebitCoaDropdownOpen(false);
    setRuleDebitCoaSearchQuery('');
    setIsRuleKreditCoaDropdownOpen(false);
    setRuleKreditCoaSearchQuery('');
    if (item) {
      setEditingItem(item);
      setRuleForm({
        program_code: item.program_code,
        asnaf_id: item.asnaf_id || '',
        tipe_kas: item.tipe_kas,
        sumber_dana_tag: item.sumber_dana_tag,
        debit_coa_code: item.debit_coa_code,
        kredit_coa_code: item.kredit_coa_code
      });
    } else {
      setEditingItem(null);
      setRuleForm({
        program_code: programs[0]?.code || '',
        asnaf_id: '',
        tipe_kas: 'TUNAI',
        sumber_dana_tag: 'ZAKAT',
        debit_coa_code: coas.find(c => c.klasifikasi === 'Penyaluran')?.coa_code || '',
        kredit_coa_code: coas.find(c => c.klasifikasi === 'Aktiva')?.coa_code || ''
      });
    }
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/finance/mapping-rules/${editingItem.rule_id}`, ruleForm);
      } else {
        await axios.post('/api/finance/mapping-rules', ruleForm);
      }
      setIsRuleModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan aturan: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus aturan mapping ini?')) return;
    try {
      await axios.delete(`/api/finance/mapping-rules/${id}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsCategorySubmitLoading(true);
      const res = await axios.post('/api/kategori-biaya', { nama: newCategoryName });
      if (res.data.status === 'success') {
        setNewCategoryName('');
        setMessages([{ type: 'success', text: 'Kategori biaya berhasil ditambahkan.' }]);
        fetchData();
      }
    } catch (e: any) {
      alert('Gagal menambah kategori: ' + (e.response?.data?.error || e.message));
    } finally {
      setIsCategorySubmitLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus kategori biaya ini?')) return;
    try {
      const res = await axios.delete(`/api/kategori-biaya/${id}`);
      if (res.data.status === 'success') {
        setMessages([{ type: 'success', text: 'Kategori biaya berhasil dihapus.' }]);
        fetchData();
      }
    } catch (e: any) {
      alert('Gagal menghapus kategori: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleOpenPenerimaanModal = (item: any = null) => {
    setIsPenerimaanCoasDropdownOpen(false);
    setPenerimaanCoasSearch('');
    setIsPenerimaanDebitDropdownOpen(false);
    setPenerimaanDebitSearch('');
    setIsPenerimaanKreditAmilDropdownOpen(false);
    setPenerimaanKreditAmilSearch('');
    setIsPenerimaanKreditUtangDropdownOpen(false);
    setPenerimaanKreditUtangSearch('');
    if (item) {
      setEditingItem(item);
      setPenerimaanForm({
        kategori: item.kategori,
        persentase_amil: Number(item.persentase_amil),
        persentase_upz: Number(item.persentase_upz),
        persentase_baznas: Number(item.persentase_baznas),
        persentase_salur_pembantuan: Number(item.persentase_salur_pembantuan),
        coa_debit_beban: item.coa_debit_beban,
        coa_kredit_amil: item.coa_kredit_amil,
        coa_kredit_utang: item.coa_kredit_utang,
        coa_codes: item.coa_codes || ''
      });
    } else {
      setEditingItem(null);
      setPenerimaanForm({
        kategori: '',
        persentase_amil: 12.5,
        persentase_upz: 5.0,
        persentase_baznas: 7.5,
        persentase_salur_pembantuan: 70.0,
        coa_debit_beban: '51020101',
        coa_kredit_amil: '43010101',
        coa_kredit_utang: '21040101',
        coa_codes: ''
      });
    }
    setIsPenerimaanModalOpen(true);
  };

  const togglePenerimaanCoa = (code: string) => {
    const current = penerimaanForm.coa_codes ? penerimaanForm.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    const next = current.includes(code)
      ? current.filter((c: string) => c !== code)
      : [...current, code];
    setPenerimaanForm({ ...penerimaanForm, coa_codes: next.join(', ') });
  };

  const handleSavePenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/penerimaan-mapping/${editingItem.id}`, penerimaanForm);
      } else {
        await axios.post('/api/penerimaan-mapping', penerimaanForm);
      }
      setIsPenerimaanModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan aturan: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeletePenerimaan = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus aturan mapping penerimaan ini?')) return;
    try {
      await axios.delete(`/api/penerimaan-mapping/${id}`);
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };






  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Toast Notifications */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-8 right-8 z-[100] flex flex-col gap-2 shrink-0 w-80 shadow-2xl"
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              }`}>
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertCircle className="size-5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{msg.type === 'success' ? 'Berhasil' : msg.type === 'warning' ? 'Peringatan' : 'Gagal'}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
                <button onClick={() => setMessages(messages.filter((_, i) => i !== idx))} className="shrink-0 p-1 hover:bg-black/5 rounded-md">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Keuangan</span>
            <ChevronRight className="size-4 text-slate-300 shrink-0" />
            <span className="text-primary font-bold shrink-0">Pengaturan Keuangan</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
            Pengaturan &amp; Pelaporan Keuangan
          </h2>
          <p className="text-slate-500 font-medium">
            Kelola posisi kas, aturan pemetaan COA otomatis, replenishment laci kas kecil, dan eksekusi pencairan bantuan.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={cn("size-5 text-slate-500", loading && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 w-full max-w-6xl overflow-x-auto scrollbar-none shrink-0 pb-px mb-4">
        <div className="flex flex-row gap-6 w-full min-w-max">
          <button
            onClick={() => { setActiveTab('accounts'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'accounts'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Kas &amp; Bank
          </button>
          <button
            onClick={() => { setActiveTab('mapping'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'mapping'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Mapping COA
          </button>
          <button
            onClick={() => { setActiveTab('coa'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'coa'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Master COA
          </button>
          <button
            onClick={() => { setActiveTab('kategori-biaya'); setSearchTerm(''); }}
            className={cn(
              "pb-3 text-sm font-black transition-all border-b-2",
              activeTab === 'kategori-biaya'
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Kategori Biaya
          </button>

        </div>
      </div>

      {/* Main Tab Panels */}
      <AnimatePresence mode="wait">
        
        {/* ==========================================
            TAB: KAS & BANK LIST
            ========================================== */}
        {activeTab === 'accounts' && (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Wallet className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black">Total Saldo Kas Fisik</p>
                  <p className="text-xl font-black text-slate-950 mt-1">
                    {formatCurrency(accounts.filter(a => a.tipe_kas === 'TUNAI').reduce((sum, item) => sum + Number(item.saldo), 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black">Total Saldo Bank</p>
                  <p className="text-xl font-black text-slate-950 mt-1">
                    {formatCurrency(accounts.filter(a => a.tipe_kas === 'BANK').reduce((sum, item) => sum + Number(item.saldo), 0))}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className="size-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600">
                  <Activity className="size-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black">Total Akun Terhubung</p>
                  <p className="text-xl font-black text-slate-950 mt-1">{accounts.length} Akun Fisik</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                <input 
                  type="text"
                  placeholder="Cari kode/nama akun kas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm bg-slate-50 border-none rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                />
              </div>
            </div>

            {/* Section A: Laci Kas Tunai */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                  Daftar Kas Kecil &amp; Operasional
                </h3>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleOpenAccountModal(null, 'TUNAI')}
                    className="hidden md:flex px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/10 hover:bg-primary/90 transition-all items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Tambah Kas
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Nama Kas Fisik / Operasional</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Grup Kelompok Dana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Hubungan Master COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Saldo Riil (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredKasAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Tidak ada kas kecil / operasional ditemukan</td>
                      </tr>
                    ) : filteredKasAccounts.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 font-bold text-slate-900">
                          {item.nama_akun}
                          {item.kode_laci && <span className="block font-mono text-[10px] text-slate-400 mt-1 font-bold">LACI: {item.kode_laci}</span>}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black">
                            {item.kelompok_dana}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {item.coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.coa?.nama_akun || 'Chart of Account'}</span>
                        </td>
                        <td className="px-6 py-5 font-black text-slate-950">
                          {formatCurrency(Number(item.saldo))}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenAccountModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAccount(item.account_id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-55 rounded-xl transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B: Rekening Bank */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                  Daftar Rekening Bank
                </h3>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleOpenAccountModal(null, 'BANK')}
                    className="hidden md:flex px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/10 hover:bg-primary/90 transition-all items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Tambah Bank
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Nama Rekening &amp; Bank</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Hubungan Master COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Saldo Riil (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredBankAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic font-medium">Tidak ada rekening bank ditemukan</td>
                      </tr>
                    ) : filteredBankAccounts.map((item) => (
                      <tr key={item.account_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 font-bold text-slate-900">
                          {item.nama_akun}
                          {item.no_rekening && <span className="block font-mono text-[10px] text-slate-400 mt-1 font-bold">REK: {item.no_rekening}</span>}
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {item.coa_code}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.coa?.nama_akun || 'Chart of Account'}</span>
                        </td>
                        <td className="px-6 py-5 font-black text-slate-950">
                          {formatCurrency(Number(item.saldo))}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenAccountModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAccount(item.account_id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-55 rounded-xl transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            TAB: AUTOMATIC COA MAPPING RULES
            ========================================== */}
        {activeTab === 'mapping' && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Section 1: Penyaluran */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50/40 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aturan Pemetaan COA Penyaluran (Pencairan Proposal)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Pemetaan otomatis untuk menjurnal proposal mustahik/penyaluran.</p>
                </div>
                {isSuperAdmin && (
                  <div className="hidden md:flex gap-2">
                    <button 
                      onClick={() => setIsMigrationRuleModalOpen(true)}
                      className="px-4 py-2 bg-white border border-primary text-primary rounded-xl text-xs font-black hover:bg-primary/5 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Upload className="size-3.5" /> Migrasi Mapping
                    </button>
                    <button 
                      onClick={() => handleOpenRuleModal()}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/10 hover:bg-primary/95 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Tambah Rule Penyaluran
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Kondisi Aturan</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Metode Kas</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Tag Sumber Dana</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-emerald-700">Entri Debit (Beban/Penyaluran)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-blue-700">Entri Kredit (Kas/Bank)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredRules.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada aturan mapping penyaluran terdaftar</td>
                        </tr>
                      ) : filteredRules.map((item) => (
                        <tr key={item.rule_id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-black text-primary font-mono">
                                {item.program_code} - {programs.find(p => p.code === item.program_code)?.name || 'Program'}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                Asnaf: <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600">{item.asnaf_id || 'Global/Non-Asnaf'}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700">{item.tipe_kas}</td>
                          <td className="px-6 py-5 font-bold text-slate-700">{item.sumber_dana_tag}</td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                              {item.debit_coa_code}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.debitCoa?.nama_akun || 'Akun Penyaluran'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                              {item.kredit_coa_code}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{item.kreditCoa?.nama_akun || 'Akun Kas'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => handleOpenRuleModal(item)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                              >
                                <Edit className="size-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteRule(item.rule_id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Section 2: Penerimaan */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50/40 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    Aturan Pemetaan COA Penerimaan (ZIS & Hak Amil)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Pemetaan otomatis potongan porsi amil BAZNAS dan UPZ saat penerimaan zakat/infak.</p>
                </div>
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleOpenPenerimaanModal()}
                    className="hidden md:flex px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Tambah Rule Penerimaan
                  </button>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Kategori Penerimaan</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Porsi Amil (%)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-indigo-700">Porsi UPZ / BAZNAS (%)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-emerald-700">COA Debit (Beban Amil)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-blue-700">COA Kredit Amil BAZNAS</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-amber-700">COA Kredit Utang UPZ</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {penerimaanMappings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada aturan mapping penerimaan terdaftar</td>
                        </tr>
                      ) : penerimaanMappings.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-5">
                            <span className="font-black text-slate-900 block">{item.kategori}</span>
                            {item.coa_codes && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-w-[200px]">
                                {item.coa_codes.split(',').map((code: string) => {
                                  const cleanCode = code.trim();
                                  if (!cleanCode) return null;
                                  return (
                                    <span key={cleanCode} className="inline-block text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                      {cleanCode}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700">{Number(item.persentase_amil)}%</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-indigo-700">UPZ: {Number(item.persentase_upz)}%</span>
                              <span className="text-xs font-bold text-emerald-700">BAZNAS: {Number(item.persentase_baznas)}%</span>
                              <span className="text-[10px] text-slate-400">Salur Pembantuan: {Number(item.persentase_salur_pembantuan)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                              {item.coa_debit_beban}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{coas.find(c => c.coa_code === item.coa_debit_beban)?.nama_akun || 'Beban Hak Amil'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                              {item.coa_kredit_amil}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{coas.find(c => c.coa_code === item.coa_kredit_amil)?.nama_akun || 'Pendapatan Hak Amil'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                              {item.coa_kredit_utang}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{coas.find(c => c.coa_code === item.coa_kredit_utang)?.nama_akun || 'Utang Hak Amil UPZ'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => handleOpenPenerimaanModal(item)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                              >
                                <Edit className="size-4" />
                              </button>
                              <button 
                                onClick={() => handleDeletePenerimaan(item.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            TAB: CHART OF ACCOUNTS (COA) MASTER
            ========================================== */}
        {activeTab === 'coa' && (
          <motion.div
            key="coa"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/40">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input 
                    type="text"
                    placeholder="Cari kode COA / nama akun..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-xl pl-10 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                {isSuperAdmin && (
                  <div className="hidden md:flex gap-2">
                    <button 
                      onClick={() => setIsMigrationCOAModalOpen(true)}
                      className="px-4 py-2.5 bg-white border border-primary text-primary rounded-xl text-xs font-black hover:bg-primary/5 transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Upload className="size-3.5" /> Migrasi COA
                    </button>
                    <button 
                      onClick={() => handleOpenCOAModal()}
                      className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/10 hover:bg-primary/90 transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Tambah COA
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Kode Akun COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Nama Rekening / Akun Buku Besar</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Klasifikasi</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Tipe Alokasi Dana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Saldo Awal (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCOAs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Bagan akun COA masih kosong</td>
                      </tr>
                    ) : filteredCOAs.map((item) => (
                      <tr key={item.coa_code} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 font-mono text-xs font-black text-slate-900 bg-slate-50 border border-slate-100 rounded-xl w-fit px-2.5 py-1">
                          {item.coa_code}
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-900">{item.nama_akun}</td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black border",
                            item.klasifikasi === 'Aktiva' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            item.klasifikasi === 'Penyaluran' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            item.klasifikasi === 'Penerimaan' ? "bg-purple-50 text-purple-600 border-purple-100" :
                            item.klasifikasi === 'Penggunaan' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            item.klasifikasi === 'Saldo' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                            item.klasifikasi === 'Kewajiban' ? "bg-rose-50 text-rose-600 border-rose-100" :
                            "bg-slate-50 text-slate-600 border-slate-150"
                          )}>
                            {item.klasifikasi || 'Umum'}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-700">{item.tipe_dana || '-'}</td>
                        <td className="px-6 py-5 font-black text-slate-950 text-right">
                          {formatCurrency(Number(item.saldo_awal || 0))}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleOpenCOAModal(item)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCOA(item.coa_code)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-55 rounded-xl transition-all"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            TAB: KATEGORI BIAYA CRUD
            ========================================== */}
        {activeTab === 'kategori-biaya' && (
          <motion.div
            key="kategori-biaya"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Input Kategori Baru */}
              <div className="hidden lg:block lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-fit space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  Tambah Kategori Biaya
                </h3>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Nama Kategori</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Contoh: Honorarium Narasumber"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCategorySubmitLoading || !newCategoryName.trim()}
                    className="w-full h-11 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/10 hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {isCategorySubmitLoading ? 'Menyimpan...' : 'Simpan Kategori'}
                  </button>
                </form>
              </div>

              {/* Daftar Kategori */}
              <div className="col-span-1 lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/40">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    Daftar Kategori Biaya Aktif
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Nama Kategori</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400">Dibuat Pada</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada kategori biaya ditemukan</td>
                        </tr>
                      ) : categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-900">{cat.nama}</td>
                          <td className="px-6 py-5 text-xs text-slate-400">
                            {new Date(cat.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODALS & FORMS OVERLAYS
          ========================================== */}
      
      {/* 1. Account Add/Edit Modal */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAccountModalOpen(false)}
            />


            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-visible flex flex-col z-50"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Akun Fisik' : 'Tambah Akun Fisik Baru'}
                </h3>
                <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Nama Rekening/Laci Kas</label>
                  <input
                    type="text"
                    required
                    value={accountForm.nama_akun}
                    onChange={(e) => setAccountForm({ ...accountForm, nama_akun: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    placeholder="Contoh: BSI - Rekening Utama Zakat"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(accountForm.tipe_kas === 'BANK' ? "col-span-2" : "col-span-1", "space-y-1")}>
                    <label className="text-[10px] font-black text-slate-400">Tipe Kas</label>
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-between text-xs bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold cursor-not-allowed text-slate-500 text-left"
                    >
                      <span>{accountForm.tipe_kas}</span>
                    </button>
                  </div>

                  {accountForm.tipe_kas !== 'BANK' && (
                    <div className="space-y-1 col-span-1">
                      <label className="text-[10px] font-black text-slate-400">Grup Kelompok Dana</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsFormKelompokDanaDropdownOpen(!isFormKelompokDanaDropdownOpen)}
                          className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                        >
                          <span>{accountForm.kelompok_dana}</span>
                          <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isFormKelompokDanaDropdownOpen && "rotate-180")} />
                        </button>

                        {isFormKelompokDanaDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsFormKelompokDanaDropdownOpen(false)} />
                            <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                              {['ZAKAT', 'INFAK_TERIKAT', 'INFAK_TIDAK_TERIKAT', 'AMIL', 'APBD', 'NON-HALAL'].map((kd) => (
                                <button
                                  key={kd}
                                  type="button"
                                  onClick={() => {
                                    setAccountForm({ ...accountForm, kelompok_dana: kd as any });
                                    setIsFormKelompokDanaDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    accountForm.kelompok_dana === kd ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{kd}</span>
                                  {accountForm.kelompok_dana === kd && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Hubungan Master COA</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormCoaDropdownOpen(!isFormCoaDropdownOpen);
                        setFormCoaSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {coas.find(c => c.coa_code === accountForm.coa_code)
                          ? `${accountForm.coa_code} - ${coas.find(c => c.coa_code === accountForm.coa_code)?.nama_akun}`
                          : '-- Pilih Kode COA --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isFormCoaDropdownOpen && "rotate-180")} />
                    </button>

                    {isFormCoaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsFormCoaDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={formCoaSearchQuery}
                              onChange={(e) => setFormCoaSearchQuery(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                           <div className="overflow-y-auto custom-scrollbar flex-1 max-h-48">
                            {coas
                              .filter(c => c.klasifikasi === 'Aktiva' || c.klasifikasi === 'Kewajiban')
                              .filter(c => 
                                c.coa_code.toLowerCase().includes(formCoaSearchQuery.toLowerCase()) || 
                                c.nama_akun.toLowerCase().includes(formCoaSearchQuery.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setAccountForm({ 
                                      ...accountForm, 
                                      coa_code: c.coa_code,
                                      saldo: Number(c.saldo_awal || 0)
                                    });
                                    setIsFormCoaDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    accountForm.coa_code === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {accountForm.coa_code === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                            {coas.filter(c => c.klasifikasi === 'Aktiva' || c.klasifikasi === 'Kewajiban').filter(c => 
                              c.coa_code.toLowerCase().includes(formCoaSearchQuery.toLowerCase()) || 
                              c.nama_akun.toLowerCase().includes(formCoaSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <p className="text-[11px] text-slate-400 italic text-center py-4">COA tidak ditemukan</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {accountForm.tipe_kas === 'BANK' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">No. Rekening</label>
                    <input
                      type="text"
                      value={accountForm.no_rekening}
                      onChange={(e) => setAccountForm({ ...accountForm, no_rekening: e.target.value })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                      placeholder="Contoh: 05000-800-84"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Kode Laci Kasir (A s.d G)</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={accountForm.kode_laci}
                      onChange={(e) => setAccountForm({ ...accountForm, kode_laci: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                      placeholder="Contoh: A"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Saldo Awal (IDR)</label>
                  <input
                    type="number"
                    value={accountForm.saldo || 0}
                    required
                    disabled={true}
                    className="w-full bg-slate-100 border-slate-200 rounded-xl px-4 py-3 text-xs outline-none transition-all font-bold cursor-not-allowed text-slate-500"
                  />
                  <p className="text-[9px] text-slate-400 font-bold leading-normal mt-1">
                    * Saldo awal ditarik otomatis dari Saldo Awal Chart of Accounts (COA) terpilih.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. COA Add/Edit Modal */}
      <AnimatePresence>
        {isCOAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCOAModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-visible flex flex-col z-50"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Kode COA Master' : 'Tambah Kode COA Master Baru'}
                </h3>
                <button onClick={() => setIsCOAModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveCOA} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Kode Akun COA</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={coaForm.coa_code}
                    onChange={(e) => setCoaForm({ ...coaForm, coa_code: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    placeholder="Contoh: 111010101"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Nama Akun</label>
                  <input
                    type="text"
                    required
                    value={coaForm.nama_akun}
                    onChange={(e) => setCoaForm({ ...coaForm, nama_akun: e.target.value })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    placeholder="Contoh: Kas Dana Zakat"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Klasifikasi</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCoaKlasifikasiDropdownOpen(!isCoaKlasifikasiDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span>{coaForm.klasifikasi}</span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isCoaKlasifikasiDropdownOpen && "rotate-180")} />
                    </button>

                    {isCoaKlasifikasiDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsCoaKlasifikasiDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {['Aktiva', 'Penyaluran', 'Penerimaan', 'Penggunaan', 'Saldo', 'Kewajiban'].map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                setCoaForm({ ...coaForm, klasifikasi: k });
                                setIsCoaKlasifikasiDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                coaForm.klasifikasi === k ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{k}</span>
                              {coaForm.klasifikasi === k && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Tipe Alokasi Dana (Opsional)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCoaTipeDanaDropdownOpen(!isCoaTipeDanaDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span>{coaForm.tipe_dana || '-- Tanpa Tipe Dana --'}</span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isCoaTipeDanaDropdownOpen && "rotate-180")} />
                    </button>

                    {isCoaTipeDanaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsCoaTipeDanaDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {[
                            { value: '', label: '-- Tanpa Tipe Dana --' },
                            { value: 'ZAKAT', label: 'ZAKAT' },
                            { value: 'INFAK_TERIKAT', label: 'INFAK_TERIKAT' },
                            { value: 'INFAK_TIDAK_TERIKAT', label: 'INFAK_TIDAK_TERIKAT' },
                            { value: 'AMIL', label: 'AMIL' },
                            { value: 'APBD', label: 'APBD' }
                          ].map((td) => (
                            <button
                              key={td.value}
                              type="button"
                              onClick={() => {
                                setCoaForm({ ...coaForm, tipe_dana: td.value });
                                setIsCoaTipeDanaDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                coaForm.tipe_dana === td.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{td.label}</span>
                              {coaForm.tipe_dana === td.value && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Saldo Awal (IDR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={coaForm.saldo_awal}
                    onChange={(e) => setCoaForm({ ...coaForm, saldo_awal: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-right"
                    placeholder="0"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan COA
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Rule Add/Edit Modal */}
      <AnimatePresence>
        {isRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsRuleModalOpen(false)}
            />
             <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-visible flex flex-col z-50"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Aturan Pemetaan COA' : 'Tambah Aturan Pemetaan COA Baru'}
                </h3>
                <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Program SIMBA</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRuleProgramDropdownOpen(!isRuleProgramDropdownOpen);
                        setRuleProgramSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {ruleForm.program_code
                          ? `${ruleForm.program_code} - ${programs.find(p => p.code === ruleForm.program_code)?.name}`
                          : '-- Pilih Program --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleProgramDropdownOpen && "rotate-180")} />
                    </button>

                    {isRuleProgramDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsRuleProgramDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari Program..."
                              value={ruleProgramSearchQuery}
                              onChange={(e) => setRuleProgramSearchQuery(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-48">
                            {programs
                              .filter(p => 
                                p.code.toLowerCase().includes(ruleProgramSearchQuery.toLowerCase()) || 
                                p.name.toLowerCase().includes(ruleProgramSearchQuery.toLowerCase())
                              )
                              .map(p => (
                                <button
                                  key={p.code}
                                  type="button"
                                  onClick={() => {
                                    setRuleForm({ ...ruleForm, program_code: p.code });
                                    setIsRuleProgramDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    ruleForm.program_code === p.code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{p.code} - {p.name}</span>
                                  {ruleForm.program_code === p.code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                            {programs.filter(p => 
                              p.code.toLowerCase().includes(ruleProgramSearchQuery.toLowerCase()) || 
                              p.name.toLowerCase().includes(ruleProgramSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <p className="text-[11px] text-slate-400 italic text-center py-4">Program tidak ditemukan</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Asnaf Target (Opsional)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsRuleAsnafDropdownOpen(!isRuleAsnafDropdownOpen)}
                        className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                      >
                        <span>{ruleForm.asnaf_id || '-- Kosong (Umum) --'}</span>
                        <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleAsnafDropdownOpen && "rotate-180")} />
                      </button>

                      {isRuleAsnafDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setIsRuleAsnafDropdownOpen(false)} />
                          <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {[
                              { value: '', label: '-- Kosong (Umum / Non-Asnaf) --' },
                              { value: 'Fakir', label: 'Fakir' },
                              { value: 'Miskin', label: 'Miskin' },
                              { value: 'Amil', label: 'Amil' },
                              { value: 'Mualaf', label: 'Mualaf' },
                              { value: 'Riqab', label: 'Riqab (Hamba Sahaya)' },
                              { value: 'Gharimin', label: 'Gharimin' },
                              { value: 'Fisabilillah', label: 'Fisabilillah' },
                              { value: 'Ibnu Sabil', label: 'Ibnu Sabil' }
                            ].map((asn) => (
                              <button
                                key={asn.value}
                                type="button"
                                onClick={() => {
                                  setRuleForm({ ...ruleForm, asnaf_id: asn.value });
                                  setIsRuleAsnafDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                  ruleForm.asnaf_id === asn.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                )}
                              >
                                <span>{asn.label}</span>
                                {ruleForm.asnaf_id === asn.value && <Check className="size-4 text-primary shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Metode Kas</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsRuleMetodeKasDropdownOpen(!isRuleMetodeKasDropdownOpen)}
                        className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                      >
                        <span>{ruleForm.tipe_kas === 'TUNAI' ? 'Laci Tunai' : 'Transfer Bank'}</span>
                        <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleMetodeKasDropdownOpen && "rotate-180")} />
                      </button>

                      {isRuleMetodeKasDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setIsRuleMetodeKasDropdownOpen(false)} />
                          <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {[
                              { value: 'TUNAI', label: 'Laci Tunai' },
                              { value: 'BANK', label: 'Transfer Bank' }
                            ].map((mk) => (
                              <button
                                key={mk.value}
                                type="button"
                                onClick={() => {
                                  setRuleForm({ ...ruleForm, tipe_kas: mk.value as any });
                                  setIsRuleMetodeKasDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                  ruleForm.tipe_kas === mk.value ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                )}
                              >
                                <span>{mk.label}</span>
                                {ruleForm.tipe_kas === mk.value && <Check className="size-4 text-primary shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Kelompok Dana</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRuleKelompokDanaDropdownOpen(!isRuleKelompokDanaDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span>{ruleForm.sumber_dana_tag}</span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleKelompokDanaDropdownOpen && "rotate-180")} />
                    </button>

                    {isRuleKelompokDanaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsRuleKelompokDanaDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 max-h-56 overflow-y-auto custom-scrollbar">
                          {['ZAKAT', 'INFAK_TERIKAT', 'INFAK_TIDAK_TERIKAT', 'AMIL', 'APBD'].map((sd) => (
                            <button
                              key={sd}
                              type="button"
                              onClick={() => {
                                setRuleForm({ ...ruleForm, sumber_dana_tag: sd as any });
                                setIsRuleKelompokDanaDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                ruleForm.sumber_dana_tag === sd ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                              )}
                            >
                              <span>{sd}</span>
                              {ruleForm.sumber_dana_tag === sd && <Check className="size-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 text-emerald-700">Akun Penyaluran/Belanja (Debit COA)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRuleDebitCoaDropdownOpen(!isRuleDebitCoaDropdownOpen);
                        setRuleDebitCoaSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {ruleForm.debit_coa_code
                          ? `${ruleForm.debit_coa_code} - ${coas.find(c => c.coa_code === ruleForm.debit_coa_code)?.nama_akun}`
                          : '-- Pilih COA Debit --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleDebitCoaDropdownOpen && "rotate-180")} />
                    </button>

                    {isRuleDebitCoaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsRuleDebitCoaDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={ruleDebitCoaSearchQuery}
                              onChange={(e) => setRuleDebitCoaSearchQuery(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-48">
                            {coas
                              .filter(c => c.klasifikasi === 'Penyaluran' || c.klasifikasi === 'Penggunaan')
                              .filter(c => 
                                c.coa_code.toLowerCase().includes(ruleDebitCoaSearchQuery.toLowerCase()) || 
                                c.nama_akun.toLowerCase().includes(ruleDebitCoaSearchQuery.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setRuleForm({ ...ruleForm, debit_coa_code: c.coa_code });
                                    setIsRuleDebitCoaDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    ruleForm.debit_coa_code === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {ruleForm.debit_coa_code === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                            {coas.filter(c => c.klasifikasi === 'Penyaluran' || c.klasifikasi === 'Penggunaan').filter(c => 
                              c.coa_code.toLowerCase().includes(ruleDebitCoaSearchQuery.toLowerCase()) || 
                              c.nama_akun.toLowerCase().includes(ruleDebitCoaSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <p className="text-[11px] text-slate-400 italic text-center py-4">COA tidak ditemukan</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 text-blue-700">Akun Kas/Bank Default (Kredit COA)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRuleKreditCoaDropdownOpen(!isRuleKreditCoaDropdownOpen);
                        setRuleKreditCoaSearchQuery('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {ruleForm.kredit_coa_code
                          ? `${ruleForm.kredit_coa_code} - ${coas.find(c => c.coa_code === ruleForm.kredit_coa_code)?.nama_akun}`
                          : '-- Pilih COA Kredit --'
                        }
                      </span>
                      <ChevronDown className={cn("size-4 text-slate-400 transition-transform shrink-0", isRuleKreditCoaDropdownOpen && "rotate-180")} />
                    </button>

                    {isRuleKreditCoaDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsRuleKreditCoaDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={ruleKreditCoaSearchQuery}
                              onChange={(e) => setRuleKreditCoaSearchQuery(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-48">
                            {coas
                              .filter(c => c.klasifikasi === 'Aktiva')
                              .filter(c => 
                                c.coa_code.toLowerCase().includes(ruleKreditCoaSearchQuery.toLowerCase()) || 
                                c.nama_akun.toLowerCase().includes(ruleKreditCoaSearchQuery.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setRuleForm({ ...ruleForm, kredit_coa_code: c.coa_code });
                                    setIsRuleKreditCoaDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    ruleForm.kredit_coa_code === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {ruleForm.kredit_coa_code === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                            {coas.filter(c => c.klasifikasi === 'Aktiva').filter(c => 
                              c.coa_code.toLowerCase().includes(ruleKreditCoaSearchQuery.toLowerCase()) || 
                              c.nama_akun.toLowerCase().includes(ruleKreditCoaSearchQuery.toLowerCase())
                            ).length === 0 && (
                              <p className="text-[11px] text-slate-400 italic text-center py-4">COA tidak ditemukan</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                 <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Simpan Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPenerimaanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsPenerimaanModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col z-50 max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  {editingItem ? 'Ubah Aturan Penerimaan' : 'Tambah Aturan Penerimaan Baru'}
                </h3>
                <button onClick={() => setIsPenerimaanModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSavePenerimaan} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Kategori Penerimaan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Zakat Maal, Infak, dll."
                    value={penerimaanForm.kategori}
                    onChange={(e) => setPenerimaanForm({ ...penerimaanForm, kategori: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">COA Penerimaan Terkait (Multi-select)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPenerimaanCoasDropdownOpen(!isPenerimaanCoasDropdownOpen);
                        setPenerimaanCoasSearch('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {penerimaanForm.coa_codes
                          ? `${penerimaanForm.coa_codes.split(',').length} COA Terpilih: ${penerimaanForm.coa_codes}`
                          : '-- Pilih COA Penerimaan --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400 transition-transform shrink-0" />
                    </button>

                    {isPenerimaanCoasDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPenerimaanCoasDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA Penerimaan..."
                              value={penerimaanCoasSearch}
                              onChange={(e) => setPenerimaanCoasSearch(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-40">
                            {coas
                              .filter(c => c.coa_code.startsWith('4'))
                              .filter(c => 
                                c.coa_code.includes(penerimaanCoasSearch) || 
                                c.nama_akun.toLowerCase().includes(penerimaanCoasSearch.toLowerCase())
                              )
                              .map(c => {
                                const currentCodes = penerimaanForm.coa_codes 
                                  ? penerimaanForm.coa_codes.split(',').map((code: string) => code.trim()).filter(Boolean) 
                                  : [];
                                const isChecked = currentCodes.includes(c.coa_code);
                                return (
                                  <label
                                    key={c.coa_code}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1 cursor-pointer text-slate-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePenerimaanCoa(c.coa_code)}
                                      className="rounded border-slate-300 text-primary focus:ring-primary/20 size-3.5 cursor-pointer"
                                    />
                                    <span className="truncate">
                                      {c.coa_code} - {c.nama_akun}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Porsi Amil (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={penerimaanForm.persentase_amil}
                      onChange={(e) => setPenerimaanForm({ ...penerimaanForm, persentase_amil: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Porsi UPZ (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={penerimaanForm.persentase_upz}
                      onChange={(e) => setPenerimaanForm({ ...penerimaanForm, persentase_upz: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Porsi BAZNAS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={penerimaanForm.persentase_baznas}
                      onChange={(e) => setPenerimaanForm({ ...penerimaanForm, persentase_baznas: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">Salur Pembantuan (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={penerimaanForm.persentase_salur_pembantuan}
                      onChange={(e) => setPenerimaanForm({ ...penerimaanForm, persentase_salur_pembantuan: Number(e.target.value) })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">COA Debit (Beban Amil)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPenerimaanDebitDropdownOpen(!isPenerimaanDebitDropdownOpen);
                        setPenerimaanDebitSearch('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {penerimaanForm.coa_debit_beban
                          ? `${penerimaanForm.coa_debit_beban} - ${coas.find(c => c.coa_code === penerimaanForm.coa_debit_beban)?.nama_akun}`
                          : '-- Pilih Akun --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400 transition-transform shrink-0" />
                    </button>

                    {isPenerimaanDebitDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPenerimaanDebitDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={penerimaanDebitSearch}
                              onChange={(e) => setPenerimaanDebitSearch(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-40">
                            {coas
                              .filter(c => 
                                c.coa_code.includes(penerimaanDebitSearch) || 
                                c.nama_akun.toLowerCase().includes(penerimaanDebitSearch.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setPenerimaanForm({ ...penerimaanForm, coa_debit_beban: c.coa_code });
                                    setIsPenerimaanDebitDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    penerimaanForm.coa_debit_beban === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {penerimaanForm.coa_debit_beban === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">COA Kredit (Pendapatan Amil BAZNAS)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPenerimaanKreditAmilDropdownOpen(!isPenerimaanKreditAmilDropdownOpen);
                        setPenerimaanKreditAmilSearch('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {penerimaanForm.coa_kredit_amil
                          ? `${penerimaanForm.coa_kredit_amil} - ${coas.find(c => c.coa_code === penerimaanForm.coa_kredit_amil)?.nama_akun}`
                          : '-- Pilih Akun --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400 transition-transform shrink-0" />
                    </button>

                    {isPenerimaanKreditAmilDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPenerimaanKreditAmilDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={penerimaanKreditAmilSearch}
                              onChange={(e) => setPenerimaanKreditAmilSearch(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-40">
                            {coas
                              .filter(c => 
                                c.coa_code.includes(penerimaanKreditAmilSearch) || 
                                c.nama_akun.toLowerCase().includes(penerimaanKreditAmilSearch.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setPenerimaanForm({ ...penerimaanForm, coa_kredit_amil: c.coa_code });
                                    setIsPenerimaanKreditAmilDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    penerimaanForm.coa_kredit_amil === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {penerimaanForm.coa_kredit_amil === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">COA Kredit (Utang Hak Amil UPZ)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPenerimaanKreditUtangDropdownOpen(!isPenerimaanKreditUtangDropdownOpen);
                        setPenerimaanKreditUtangSearch('');
                      }}
                      className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 outline-none text-slate-700 text-left cursor-pointer"
                    >
                      <span className="truncate">
                        {penerimaanForm.coa_kredit_utang
                          ? `${penerimaanForm.coa_kredit_utang} - ${coas.find(c => c.coa_code === penerimaanForm.coa_kredit_utang)?.nama_akun}`
                          : '-- Pilih Akun --'
                        }
                      </span>
                      <ChevronDown className="size-4 text-slate-400 transition-transform shrink-0" />
                    </button>

                    {isPenerimaanKreditUtangDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsPenerimaanKreditUtangDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 flex flex-col max-h-64">
                          <div className="relative mb-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                            <input
                              type="text"
                              placeholder="Cari COA..."
                              value={penerimaanKreditUtangSearch}
                              onChange={(e) => setPenerimaanKreditUtangSearch(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary/10 outline-none font-medium"
                            />
                          </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 max-h-40">
                            {coas
                              .filter(c => 
                                c.coa_code.includes(penerimaanKreditUtangSearch) || 
                                c.nama_akun.toLowerCase().includes(penerimaanKreditUtangSearch.toLowerCase())
                              )
                              .map(c => (
                                <button
                                  key={c.coa_code}
                                  type="button"
                                  onClick={() => {
                                    setPenerimaanForm({ ...penerimaanForm, coa_kredit_utang: c.coa_code });
                                    setIsPenerimaanKreditUtangDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-left mb-1",
                                    penerimaanForm.coa_kredit_utang === c.coa_code ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                  )}
                                >
                                  <span>{c.coa_code} - {c.nama_akun}</span>
                                  {penerimaanForm.coa_kredit_utang === c.coa_code && <Check className="size-4 text-primary shrink-0" />}
                                </button>
                              ))
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    Simpan Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationCOAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsMigrationCOAModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Migrasi Data Master COA</h3>
                <button onClick={() => setIsMigrationCOAModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Impor Data via Excel</h4>
                  <p className="text-xs text-slate-500">Gunakan file Excel (.xlsx) dengan kolom coa_code, nama_akun, klasifikasi, tipe_dana.</p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
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
                      onChange={handleFileUpload} 
                      disabled={loading}
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Pastikan kode COA unik. Jika kode COA sudah ada di sistem, maka akan dilewati (skip).
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mapping COA Migration Modal */}
      <AnimatePresence>
        {isMigrationRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsMigrationRuleModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 text-left">Migrasi Aturan Mapping COA</h3>
                <button onClick={() => setIsMigrationRuleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Impor Data via Excel</h4>
                  <p className="text-xs text-slate-500">Gunakan file Excel (.xlsx) dengan kolom program_code, asnaf_id, tipe_kas, sumber_dana_tag, debit_coa_code, kredit_coa_code.</p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadRuleTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
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
                      onChange={handleRuleFileUpload} 
                      disabled={loading}
                    />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-left">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Jika kombinasi program, asnaf, tipe kas, dan sumber dana sudah ada di sistem, maka akan diperbarui (update) otomatis.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Category Add Modal (Mobile only) */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsCategoryModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 text-left"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="size-5 text-primary" />
                  Tambah Kategori Biaya
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  await handleSaveCategory(e);
                  setIsCategoryModalOpen(false);
                }} 
                className="p-6 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400">Nama Kategori</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Contoh: Honorarium Narasumber"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                  />
                </div>
                 <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isCategorySubmitLoading || !newCategoryName.trim()}
                    className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isCategorySubmitLoading ? 'Menyimpan...' : 'Simpan Kategori'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      {isSuperAdmin && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="flex flex-col items-end gap-3"
              >
                {activeTab === 'accounts' && (
                  <>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        handleOpenAccountModal(null, 'BANK');
                      }}
                      className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="size-4 text-primary" />
                      Tambah Bank
                    </button>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        handleOpenAccountModal(null, 'TUNAI');
                      }}
                      className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="size-4" />
                      Tambah Kas
                    </button>
                  </>
                )}

                {activeTab === 'mapping' && (
                  <>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        handleOpenPenerimaanModal();
                      }}
                      className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="size-4 text-blue-600" />
                      Tambah Rule Penerimaan
                    </button>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        setIsMigrationRuleModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Upload className="size-4 text-slate-500" />
                      Migrasi Mapping
                    </button>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        handleOpenRuleModal();
                      }}
                      className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="size-4" />
                      Tambah Rule Penyaluran
                    </button>
                  </>
                )}

                {activeTab === 'coa' && (
                  <>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        setIsMigrationCOAModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Upload className="size-4 text-slate-500" />
                      Migrasi COA
                    </button>
                    <button
                      onClick={() => {
                        setIsFabOpen(false);
                        handleOpenCOAModal();
                      }}
                      className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="size-4" />
                      Tambah COA
                    </button>
                  </>
                )}

                {activeTab === 'kategori-biaya' && (
                  <button
                    onClick={() => {
                      setIsFabOpen(false);
                      setIsCategoryModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="size-4" />
                    Tambah Kategori Biaya
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB Trigger */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={cn(
              "size-14 rounded-full bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 transition-all duration-300 active:scale-90 cursor-pointer",
              isFabOpen ? "rotate-45 bg-slate-800 shadow-slate-800/30" : ""
            )}
          >
            <Plus className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}
