import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Plus, 
  Search, 
  Building, 
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface RawRow {
  No?: any;
  Nama?: any;
  OPD?: any;
  'No. Rekening'?: any;
  no_rekening?: any;
  norek?: any;
  Nominal?: any;
  jumlah?: any;
  'Status Potongan'?: any;
  status?: any;
}

interface ProcessedTransaction {
  no: number;
  nama: string;
  opd: string;
  no_rekening: string;
  nominal: number;
  status_potongan: string;
  matched: boolean;
  muzakki_id: string | null;
  npwz: string | null;
  nama_muzakki: string | null;
  selected: boolean;
}

export default function PenerimaanBankJateng() {
  const [activeTab, setActiveTab] = useState<'berhasil' | 'opd'>('berhasil');
  const [fileData, setFileData] = useState<ProcessedTransaction[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // API Data
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  
  // Selections
  const [selectedRkatId, setSelectedRkatId] = useState<string>('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedCoaCode, setSelectedCoaCode] = useState<string>('');
  const [tanggalPembayaran, setTanggalPembayaran] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<{type: 'success' | 'error' | 'warning', text: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal for registering Muzakki
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedRowToRegister, setSelectedRowToRegister] = useState<{nama: string, no_rekening: string} | null>(null);
  const [registerNik, setRegisterNik] = useState('');
  const [registerAddress, setRegisterAddress] = useState('Kota Semarang');
  const [registerPhone, setRegisterPhone] = useState('-');
  const [registerGender, setRegisterGender] = useState('Pria');
  const [registerUpz, setRegisterUpz] = useState('');

  // Fetch RKAT & Bank Accounts & History
  useEffect(() => {
    fetchMeta();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 6000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/bank-jateng/history');
      if (res.data.status === 'success') {
        setHistoryData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchMeta = async () => {
    try {
      const [rkatRes, bankRes, coaRes] = await Promise.all([
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa')
      ]);
      
      let initialRkatId = '';
      if (rkatRes.data.status === 'success') {
        setRkatList(rkatRes.data.data);
        if (rkatRes.data.data.length > 0) {
          initialRkatId = rkatRes.data.data[0].id;
          setSelectedRkatId(initialRkatId);
        }
      }
      
      const bankData = bankRes.data?.status === 'success' ? bankRes.data.data : bankRes.data;
      if (Array.isArray(bankData)) {
        const banksOnly = bankData.filter((acc: any) => acc.tipe_kas === 'BANK');
        setBankAccounts(banksOnly);
        if (banksOnly.length > 0) {
          setSelectedBankAccountId(banksOnly[0].account_id);
        }
      }
      
      const coaData = coaRes.data?.status === 'success' ? coaRes.data.data : coaRes.data;
      setCoaList(Array.isArray(coaData) ? coaData : []);

      // Initialize default COA code based on initial RKAT
      const rkatData = rkatRes.data?.status === 'success' ? rkatRes.data.data : rkatRes.data;
      if (initialRkatId && Array.isArray(rkatData)) {
        const firstRkat = rkatData.find((r: any) => r.id === initialRkatId);
        const codes = firstRkat?.coa_codes ? firstRkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
        if (codes.length > 0) {
          setSelectedCoaCode(codes[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const handleRkatChange = (rkatId: string) => {
    setSelectedRkatId(rkatId);
    const rkat = rkatList.find(r => r.id === rkatId);
    const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
    if (codes.length > 0) {
      setSelectedCoaCode(codes[0]);
    } else {
      setSelectedCoaCode('');
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Process Excel File
  const processFile = async (file: File) => {
    setFileName(file.name);
    setMessages([]);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: RawRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        throw new Error('File excel kosong');
      }

      // Filter and clean rows
      const items: ProcessedTransaction[] = [];

      json.forEach((row: any, index) => {
        // Helper function for flexible case-insensitive and space-insensitive key retrieval
        const getValue = (keys: string[], defaultVal: any = '') => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return row[k];
            }
          }
          // Fallback to normalized match
          const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
          for (const rk of Object.keys(row)) {
            const normRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedKeys.includes(normRk)) {
              return row[rk];
            }
          }
          return defaultVal;
        };

        const no = Number(getValue(['no', 'nomor', 'id', 'no.'], index + 1));
        const nama = String(getValue(['nama', 'name', 'nama lengkap', 'warga', 'nama muzakki'], '')).trim();
        const opd = String(getValue(['opd', 'instansi', 'dinas', 'unit', 'unit kerja', 'opd/instansi', 'opd / instansi'], 'Lainnya')).trim();
        const no_rekening = String(getValue(['no rekening', 'norek', 'no rek', 'no_rekening', 'no. rekening', 'nomor rekening', 'norekening'], '')).trim();
        const nominalRaw = getValue(['nominal', 'jumlah', 'nominal potong', 'jumlah potong', 'total', 'nominal_potongan', 'jumlah_potongan'], '0');
        const nominal = Number(String(nominalRaw).replace(/[^0-9]/g, ''));

        if (!nama || !no_rekening) return; // skip row if mandatory fields missing

        items.push({
          no,
          nama,
          opd,
          no_rekening,
          nominal,
          status_potongan: 'Berhasil',
          matched: false,
          muzakki_id: null,
          npwz: null,
          nama_muzakki: null,
          selected: true
        });
      });

      if (items.length === 0) {
        setFileData([]);
        setMessages([{ type: 'warning', text: 'Tidak ditemukan transaksi valid di dalam file.' }]);
        return;
      }

      // Trigger auto-mapping lookup
      await performLookup(items);

    } catch (err: any) {
      console.error(err);
      setMessages([{ type: 'error', text: `Gagal membaca file: ${err.message || String(err)}` }]);
    }
  };

  // Perform Lookup API
  const performLookup = async (items: ProcessedTransaction[]) => {
    try {
      const res = await axios.post('/api/bank-jateng/lookup', { items });
      if (res.data.status === 'success') {
        const lookedUp = res.data.data.map((item: any) => ({
          ...item,
          selected: !!item.matched // default select matched rows
        }));
        setFileData(lookedUp);
        
        const matchedCount = lookedUp.filter((i: any) => i.matched).length;
        const unmatchedCount = lookedUp.length - matchedCount;
        
        setMessages([
          { 
            type: 'success', 
            text: `Berhasil memetakan data. Mapped: ${matchedCount} Muzakki, Belum Terdaftar: ${unmatchedCount}` 
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages([{ type: 'error', text: `Gagal melakukan auto-mapping: ${err.message || String(err)}` }]);
    }
  };

  // Re-run lookup for current file data
  const handleRecheck = async () => {
    if (fileData.length === 0) return;
    await performLookup(fileData);
  };

  // Select all toggles
  const handleToggleSelectAll = () => {
    const allSelected = fileData.every(item => item.selected);
    setFileData(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const handleToggleSelectRow = (index: number) => {
    setFileData(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  // Open register modal
  const openRegisterModal = (row: ProcessedTransaction) => {
    setSelectedRowToRegister({
      nama: row.nama,
      no_rekening: row.no_rekening
    });
    setRegisterNik('');
    setRegisterAddress('Kota Semarang');
    setRegisterPhone('-');
    setRegisterGender('Pria');
    setRegisterUpz(row.opd || '');
    setIsRegisterModalOpen(true);
  };

  // Submit new Muzakki registration
  const handleRegisterMuzakki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRowToRegister) return;

    if (!registerNik || registerNik.length !== 16) {
      alert('NIK harus 16 digit angka.');
      return;
    }

    try {
      const payload = {
        kategori: 'Perorangan',
        nama: selectedRowToRegister.nama,
        nik: registerNik,
        no_rekening: selectedRowToRegister.no_rekening,
        alamat: registerAddress,
        handphone: registerPhone,
        jenis_kelamin: registerGender,
        upz: registerUpz,
        status: 'Aktif'
      };

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        setIsRegisterModalOpen(false);
        setMessages([{ type: 'success', text: `Muzakki ${selectedRowToRegister.nama} berhasil didaftarkan!` }]);
        
        // Refresh mapping logic directly
        await handleRecheck();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan muzakki';
      alert(`Gagal: ${msg}`);
    }
  };

  // Approve & Save Selected Transactions
  const handleApprove = async () => {
    const selectedTx = fileData.filter(item => item.selected && item.matched);
    
    if (selectedTx.length === 0) {
      setMessages([{ type: 'warning', text: 'Tidak ada transaksi yang terdaftar (Matched) yang dipilih untuk diimpor.' }]);
      return;
    }

    if (!selectedBankAccountId || !selectedRkatId) {
      setMessages([{ type: 'error', text: 'Silakan pilih rekening penerima dan program RKAT terlebih dahulu.' }]);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transactions: selectedTx.map(t => ({
          muzakki_id: t.muzakki_id,
          nominal: t.nominal,
          no_rekening: t.no_rekening,
          keterangan: `Penerimaan payroll Bank Jateng OPD ${t.opd} - Rekening ${t.no_rekening}`
        })),
        bank_account_id: selectedBankAccountId,
        rkat_id: selectedRkatId,
        coa_code: selectedCoaCode,
        tanggal_pembayaran: tanggalPembayaran
      };

      const res = await axios.post('/api/bank-jateng/approve', payload);
      if (res.data.status === 'success') {
        setMessages([{ 
          type: 'success', 
          text: `Berhasil mengimpor dan membukukan ${res.data.data.length} transaksi ke Penerimaan ZIS & Jurnal Keuangan.` 
        }]);
        // Remove imported transactions from local state
        setFileData(prev => prev.filter(item => !item.selected || !item.matched));
        // Refresh history
        fetchHistory();
      }
    } catch (err: any) {
      console.error(err);
      setMessages([{ type: 'error', text: `Gagal memproses approval: ${err.response?.data?.error || err.message}` }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by OPD for display and downloads
  const opdGroups = useMemo(() => {
    const groups: { [key: string]: { name: string, count: number, total: number, items: ProcessedTransaction[] } } = {};
    
    fileData.forEach(item => {
      const key = item.opd || 'Lainnya';
      if (!groups[key]) {
        groups[key] = { name: key, count: 0, total: 0, items: [] };
      }
      groups[key].count += 1;
      groups[key].total += item.nominal;
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [fileData]);

  // Export to SIMBA format for specific OPD or all
  const exportToSimba = (groupName?: string) => {
    let itemsToExport = fileData;
    if (groupName) {
      itemsToExport = fileData.filter(item => item.opd === groupName);
    }

    if (itemsToExport.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const exportRows = itemsToExport.map((item, idx) => {
      const selectedRkat = rkatList.find(r => r.id === selectedRkatId);
      const isFitrah = selectedRkat?.nama_program?.toLowerCase().includes('fitrah');
      const isZakat = selectedRkat?.kategori?.toLowerCase() === 'zakat';
      const isInfak = selectedRkat?.kategori?.toLowerCase() === 'infak';

      let zakatVal = '';
      let zakatFitrahVal = '';
      let infakVal = '';
      let titipanVal = '';

      if (isFitrah) {
        zakatFitrahVal = String(item.nominal);
      } else if (isZakat) {
        zakatVal = String(item.nominal);
      } else if (isInfak) {
        infakVal = String(item.nominal);
      } else {
        titipanVal = String(item.nominal);
      }

      // Build Keterangan
      let labelTipe = 'Penerimaan';
      if (isFitrah) labelTipe = 'Zakat Fitrah';
      else if (isZakat) labelTipe = 'Zakat Maal';
      else if (isInfak) labelTipe = 'Infak';
      else labelTipe = selectedRkat ? selectedRkat.kategori : 'Titipan';

      const namaMuzakki = item.nama_muzakki || item.nama;
      const keteranganVal = `Terima ${labelTipe} a.n ${namaMuzakki}`;

      // Date format: DD/MM/YYYY
      const dateParts = tanggalPembayaran.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : tanggalPembayaran;

      return {
        'No': idx + 1,
        'tgl_transaksi': formattedDate,
        'NPWZ': item.npwz || '-',
        'nama': namaMuzakki,
        'zakat': zakatVal ? Number(zakatVal) : '',
        'zakat fitrah': zakatFitrahVal ? Number(zakatFitrahVal) : '',
        'infak': infakVal ? Number(infakVal) : '',
        'titipan': titipanVal ? Number(titipanVal) : '',
        'Keterangan': keteranganVal
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');
    
    const docName = groupName 
      ? `SIMBA_Migration_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      : `SIMBA_Migration_All.xlsx`;

    XLSX.writeFile(workbook, docName);
  };

  // Filter local file items based on search
  const filteredFileData = useMemo(() => {
    return fileData.filter(item => 
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.opd.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.no_rekening.includes(searchTerm) ||
      (item.npwz && item.npwz.includes(searchTerm))
    );
  }, [fileData, searchTerm]);

  const totalFilteredNominal = useMemo(() => {
    return filteredFileData.reduce((sum, item) => sum + item.nominal, 0);
  }, [filteredFileData]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center text-slate-550">
          <span>Pengumpulan</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Penerimaan Bulk</span>
        </nav>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <Building className="size-8 text-primary" />
          Penerimaan Bulk (OPD &amp; Bank Jateng)
        </h2>
        <p className="text-slate-500 font-medium max-w-3xl">
          Modul otomasi rekonsiliasi data penerimaan bulk (OPD, instansi, potong gaji, payroll, Bank Jateng). Upload file Excel rekapitulasi, mapping NPWZ secara real-time, dan lakukan posting jurnal pembukuan instan.
        </p>
      </motion.div>

      {/* Alert Notifications */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-8 right-8 z-[100] flex flex-col gap-2 shrink-0 w-96 shadow-2xl"
          >
            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "p-4 rounded-xl flex items-start gap-3 border shadow-lg",
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              )}>
                {msg.type === 'success' ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <AlertCircle className="size-5 shrink-0 text-amber-600" />}
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

      {/* File Upload / Drag & Drop Area */}
      {fileData.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all flex flex-col items-center justify-center cursor-pointer",
            isDragOver 
              ? "border-primary bg-primary/5 shadow-inner" 
              : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <input 
            id="file-upload-input" 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
            onChange={handleFileChange}
          />
          <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
            <Upload className="size-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Upload File Rekapan Realisasi Bulk</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Drag &amp; drop file Excel/CSV atau klik untuk browsing dari device Anda.
          </p>
          <div className="flex gap-4 text-xs font-bold text-slate-550 bg-slate-550 px-4 py-2.5 rounded-lg border border-slate-200">
            <span>Kolom Wajib: Nama, OPD, No. Rekening, Nominal</span>
          </div>
        </motion.div>
      )}

      {/* After File Uploaded */}
      {fileData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main List Section */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* Action Bar & Tabs */}
            <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              
              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setActiveTab('berhasil')}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2",
                    activeTab === 'berhasil' ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  Daftar Transaksi ({fileData.length})
                </button>
                <button
                  onClick={() => setActiveTab('opd')}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2",
                    activeTab === 'opd' ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Building className="size-4" />
                  Grup OPD ({opdGroups.length})
                </button>
              </div>

              {/* Reset File Button */}
              <div className="flex items-center gap-3">
                {fileName && (
                  <span className="text-xs text-slate-550 font-medium max-w-[200px] truncate">
                    File: <span className="text-slate-750 font-bold">{fileName}</span>
                  </span>
                )}
                <button
                  onClick={() => exportToSimba()}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                >
                  <FileSpreadsheet className="size-3.5" />
                  Format SIMBA (Semua)
                </button>
                <button 
                  onClick={() => { setFileData([]); setFileName(''); }}
                  className="text-xs text-rose-650 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50/50 transition-colors"
                >
                  Ganti File
                </button>
              </div>
            </div>

            {/* List Table container */}
            <div className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden">
              
              {/* Search within data */}
              {activeTab === 'berhasil' && (
                <div className="p-4 border-b border-slate-150 flex gap-4 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input 
                      type="text"
                      placeholder="Cari transaksi berdasarkan nama, rekening, atau OPD..."
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-800 placeholder-slate-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleRecheck}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 transition-all"
                  >
                    Re-check Lookup
                  </button>
                </div>
              )}

              {/* Table rendering based on tab */}
              {activeTab === 'berhasil' && (
                <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 uppercase text-[10px] font-bold tracking-wider border-b border-slate-150">
                        <th className="px-4 py-3 text-center w-12">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-350 text-primary focus:ring-primary bg-white" 
                            checked={fileData.length > 0 && fileData.every(item => item.selected)}
                            onChange={handleToggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3">Warga / Norek</th>
                        <th className="px-4 py-3">NPWZ / Muzakki Terpetakan</th>
                        <th className="px-4 py-3">OPD / Instansi</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                        <th className="px-4 py-3 text-center">Status Mapping</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredFileData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                            Tidak ada transaksi terfilter.
                          </td>
                        </tr>
                      ) : (
                        filteredFileData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-3 text-center">
                              <input 
                                type="checkbox"
                                className="rounded border-slate-350 text-primary focus:ring-primary bg-white"
                                checked={row.selected}
                                onChange={() => handleToggleSelectRow(idx)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{row.nama}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.no_rekening}</p>
                            </td>
                            <td className="px-4 py-3">
                              {row.matched ? (
                                <div>
                                  <p className="font-mono font-bold text-slate-900 text-xs">{row.npwz || '-'}</p>
                                  <p className="text-[10px] text-primary font-medium mt-0.5">{row.nama_muzakki}</p>
                                </div>
                              ) : (
                                <span className="text-rose-600 font-semibold text-[10px] italic bg-rose-50 px-2.5 py-1 rounded border border-rose-100 inline-block">
                                  Belum Mapped / Data Tidak Ada
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-700">{row.opd}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              Rp {row.nominal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.matched ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <Check className="size-3" /> Mapped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                  Warning: Belum Terdaftar
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!row.matched && (
                                <button
                                  onClick={() => openRegisterModal(row)}
                                  className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-2.5 py-1 rounded text-[10px] font-bold border border-primary/20 transition-all"
                                >
                                  Daftarkan
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  
                  {/* Footer Stats summary */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-150 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">
                      Menampilkan {filteredFileData.length} transaksi
                    </span>
                    <span className="text-slate-900 font-black">
                      Total Nominal: Rp {totalFilteredNominal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'opd' && (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Data Realisasi Dikelompokkan Per OPD</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opdGroups.map((group, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors">
                        <div>
                          <h4 className="font-black text-slate-800 text-sm mb-1">{group.name}</h4>
                          <div className="flex justify-between text-xs text-slate-550 mt-2">
                            <span>Jumlah: {group.count} pegawai</span>
                            <span className="font-semibold text-emerald-600">Rp {group.total.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                          <button
                            onClick={() => exportToSimba(group.name)}
                            className="bg-primary/20 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <FileSpreadsheet className="size-3.5" />
                            Format SIMBA
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Import / Approval Control Sidebar */}
          <div className="col-span-1 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm space-y-6">
              <div className="border-b border-slate-150 pb-4">
                <h3 className="text-lg font-black text-slate-900">Konfirmasi &amp; Approval</h3>
                <p className="text-xs text-slate-550 mt-1">Konfigurasikan pembukuan ZIS untuk data transaksi Bank Jateng.</p>
              </div>

              {/* Meta Config Form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kegiatan (RKAT) *</label>
                  <select 
                    value={selectedRkatId} 
                    onChange={(e) => handleRkatChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 cursor-pointer font-semibold"
                  >
                    {rkatList.map((rkat) => (
                      <option key={rkat.id} value={rkat.id}>
                        [{rkat.kategori}] {rkat.nama_program}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRkatId && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Program Kegiatan (COA) *</label>
                    <select
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-700"
                      value={selectedCoaCode}
                      onChange={(e) => setSelectedCoaCode(e.target.value)}
                    >
                      {(() => {
                        const rkat = rkatList.find(r => r.id === selectedRkatId);
                        const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
                        if (codes.length === 0) {
                          return <option value="">Tidak ada COA pemetaan</option>;
                        }
                        return codes.map((code: string) => {
                          const coa = coaList.find(c => c.coa_code === code);
                          const label = coa ? `${code} - ${coa.nama_akun}` : `${code} - Penerimaan ${rkat?.nama_program || ''}`;
                          return (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">via (Bank) *</label>
                  <select 
                    value={selectedBankAccountId} 
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 cursor-pointer font-semibold"
                  >
                    {bankAccounts.map((bank) => (
                      <option key={bank.account_id} value={bank.account_id}>
                        {bank.nama_akun} - {bank.no_rekening || bank.nomor_rekening}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tanggal Pembayaran / Potong</label>
                  <input 
                    type="date"
                    value={tanggalPembayaran}
                    onChange={(e) => setTanggalPembayaran(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Stats & Approvals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ringkasan Impor</span>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-550">Total Terpilih:</span>
                  <span className="font-bold text-slate-800">
                    {fileData.filter(i => i.selected).length} transaksi
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-550">Siap Diimpor (Mapped):</span>
                  <span className="font-bold text-emerald-600">
                    {fileData.filter(i => i.selected && i.matched).length} dari {fileData.filter(i => i.selected).length}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 pt-2">
                  <span className="text-slate-550 font-bold">Total Nominal:</span>
                  <span className="font-black text-emerald-600">
                    Rp {fileData.filter(i => i.selected && i.matched).reduce((sum, item) => sum + item.nominal, 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleApprove}
                disabled={isSubmitting || fileData.filter(i => i.selected && i.matched).length === 0}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                  fileData.filter(i => i.selected && i.matched).length > 0
                    ? "bg-primary text-white hover:bg-primary/90 shadow-primary/25 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Memproses Pembukuan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Approve &amp; Simpan ke Penerimaan
                  </>
                )}
              </button>
              
              <button
                onClick={() => exportToSimba()}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center border border-slate-200 text-slate-650 hover:bg-slate-55 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="size-3.5" />
                Unduh Master SIMBA Excel (Semua)
              </button>
            </div>
            
          </div>

        </div>
      )}

      {/* Riwayat Transaksi Terimpor dari Bank Jateng */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-150 pb-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Building className="size-5 text-primary" />
            Riwayat Rekonsiliasi &amp; Impor Bank Jateng
          </h3>
          <p className="text-xs text-slate-500 mt-1">Daftar transaksi potong gaji Bank Jateng yang telah didepositkan ke database.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-550 uppercase text-[10px] font-bold tracking-wider border-b border-slate-150">
                <th className="px-4 py-3 w-10 text-center">No</th>
                <th className="px-4 py-3">No. Kuitansi</th>
                <th className="px-4 py-3">Muzakki (NPWZ)</th>
                <th className="px-4 py-3">Program / RKAT</th>
                <th className="px-4 py-3">Rekening Penerima</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-center">Tanggal Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    Belum ada riwayat transaksi terimpor di database.
                  </td>
                </tr>
              ) : (
                historyData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.no_kuitansi}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{item.muzakki?.nama || '-'}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.muzakki?.npwz || 'NPWZ tidak ada'}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      [{item.rkat?.kategori || '-'}] {item.rkat?.nama_program || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{item.bankAccount?.nama_akun || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.bankAccount?.nomor_rekening || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">
                      Rp {Number(item.nominal).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sleek Register Muzakki Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && selectedRowToRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm"
              onClick={() => setIsRegisterModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white border border-slate-150 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Plus className="size-5 text-primary" />
                  Daftarkan Muzakki Baru
                </h3>
                <button onClick={() => setIsRegisterModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleRegisterMuzakki} className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-slate-700">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Data Hasil Import Excel</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Nama:</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedRowToRegister.nama}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">No. Rekening:</span>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedRowToRegister.no_rekening}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIK Muzakki (16 Digit) *</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={16}
                    value={registerNik}
                    onChange={(e) => setRegisterNik(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800" 
                    placeholder="Masukkan NIK 16 digit..." 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin</label>
                    <select 
                      value={registerGender}
                      onChange={(e) => setRegisterGender(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 cursor-pointer"
                    >
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UPZ / Dinas / OPD</label>
                    <input 
                      type="text" 
                      value={registerUpz}
                      onChange={(e) => setRegisterUpz(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800" 
                      placeholder="Dinas Pendidikan..." 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. HP / WA</label>
                  <input 
                    type="text" 
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Rumah</label>
                  <textarea 
                    rows={2}
                    value={registerAddress}
                    onChange={(e) => setRegisterAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800" 
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl transition-all mt-4"
                >
                  Simpan &amp; Verifikasi Rekening
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
