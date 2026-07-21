import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  TrendingUp,
  Activity,
  Calendar,
  Printer,
  ChevronDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Info,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

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
  kelompok_dana: string;
  saldo: number;
}

export interface LedgerEntryItem {
  entry_id: string;
  transaksi_id: string;
  coa_code: string;
  debit: number;
  kredit: number;
  account_id?: string;
  coa: COAItem;
  account?: BankAccountItem;
  realisasi: {
    transaksi_id: string;
    proposal_id?: string;
    rkat_id?: string;
    tanggal: string;
    keterangan: string;
    createdAt?: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
};

const KAS_SETARA_KAS_CODES = [
  '11010101', '11010102', '11010103', '11010104', '11010105',
  '11010201', '11010202', '11010203', '11010204', '11010205',
  '11010206', '11010207', '11010208', '11010209', '11010210',
  '11010301', '11010302', '11010303', '11010304', '11010305',
  '11010501', '11010502', '11011501', '11011201'
];

export default function BukuBesar() {
  const [ledger, setLedger] = useState<LedgerEntryItem[]>([]);
  const [coas, setCoas] = useState<COAItem[]>([]);
  const [jurnalCurrentPage, setJurnalCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState('');
  const [selectedMigrationCoa, setSelectedMigrationCoa] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [migrationStats, setMigrationStats] = useState<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    skipped: number;
    errors: any[];
  } | null>(null);

  const downloadBukuBesarTemplate = () => {
    let ws;
    if (selectedMigrationCoa) {
      ws = XLSX.utils.json_to_sheet([
        {
          'Tgl trx': '07/01/2026',
          'KODE AKUN': '41020201',
          'KETERANGAN': 'Terima Zakat Maal dari Wiyatno, Semarang',
          'DEBET': 500000,
          'KREDIT': 0
        },
        {
          'Tgl trx': '08/01/2026',
          'KODE AKUN': '51030201',
          'KETERANGAN': 'Bantuan Pengobatan an. Meriana Indah Widyastuti',
          'DEBET': 0,
          'KREDIT': 1500000
        }
      ]);
    } else {
      ws = XLSX.utils.json_to_sheet([
        {
          tanggal: '2026-01-15',
          keterangan: 'Penerimaan ZIS program Modal Usaha via Cash dari A',
          nominal: 1500000,
          coa_debit: '11010101',
          coa_kredit: '41010101'
        }
      ]);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Buku_Besar");
    XLSX.writeFile(wb, selectedMigrationCoa ? "Template_Migrasi_Jurnal_Per_Akun.xlsx" : "Template_Migrasi_Jurnal_Umum.xlsx");
  };

  const handleBukuBesarFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

      if (parsedData.length === 0) {
        throw new Error("File kosong atau format tidak sesuai.");
      }

      const coaCodesSet = new Set(coas.map(c => c.coa_code));

      const mapped = parsedData.map((row: any, idx: number) => {
        const findKey = (prefixes: string[]) => {
          return Object.keys(row).find(k =>
            prefixes.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
          );
        };

        // 1. Resolve date
        const tglKey = findKey(['tanggal', 'date', 'tgl']);
        const tglVal = tglKey ? String(row[tglKey]).trim() : '';

        let formattedDate = tglVal;
        let isValidDate = false;

        if (tglVal.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const parts = tglVal.split('-');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          isValidDate = true;
        } else if (tglVal.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const parts = tglVal.split('/');
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          isValidDate = true;
        } else if (tglVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
          formattedDate = tglVal;
          isValidDate = true;
        } else if (typeof row[tglKey || ''] === 'number') {
          const dateNum = Number(row[tglKey || '']);
          const dateObj = new Date((dateNum - 25569) * 86400 * 1000);
          formattedDate = dateObj.toISOString().split('T')[0];
          isValidDate = true;
        }

        let warningMsg = '';
        if (isValidDate) {
          const parsedYear = new Date(formattedDate).getFullYear();
          const currentYear = new Date().getFullYear();
          if (parsedYear !== currentYear) {
            warningMsg = `Tahun transaksi (${parsedYear}) berbeda dengan tahun berjalan (${currentYear})!`;
          }
        }

        // 2. Resolve keterangan
        const ketKey = findKey(['keterangan', 'description', 'uraian', 'detail', 'detil']);
        const keterangan = ketKey ? String(row[ketKey]).trim() : 'Transaksi Historis';

        // 3. Clean and parse numbers
        const cleanNumber = (val: any) => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]+/g, '');
          return parseFloat(cleaned) || 0;
        };

        // Case A: Migrasi Rekening Koran per-akun terpilih
        if (selectedMigrationCoa) {
          const offsetKey = findKey(['kodeakun', 'coa', 'akunlawan', 'offset']);
          const offsetCoaCode = offsetKey ? String(row[offsetKey]).trim() : '';

          const debitKey = findKey(['debit', 'debet', 'masuk', 'in']);
          const kreditKey = findKey(['kredit', 'credit', 'keluar', 'out']);

          const debitVal = cleanNumber(debitKey ? row[debitKey] : 0);
          const kreditVal = cleanNumber(kreditKey ? row[kreditKey] : 0);

          let tipe_mutasi: 'DEBIT' | 'KREDIT' = 'DEBIT';
          let nominal = 0;
          let isValidAmount = false;

          if (debitVal > 0 && kreditVal === 0) {
            tipe_mutasi = 'DEBIT';
            nominal = debitVal;
            isValidAmount = true;
          } else if (kreditVal > 0 && debitVal === 0) {
            tipe_mutasi = 'KREDIT';
            nominal = kreditVal;
            isValidAmount = true;
          }

          const coa_debit = tipe_mutasi === 'DEBIT' ? selectedMigrationCoa : offsetCoaCode;
          const coa_kredit = tipe_mutasi === 'DEBIT' ? offsetCoaCode : selectedMigrationCoa;

          const isOffsetCoaValid = coaCodesSet.has(offsetCoaCode);

          return {
            rowNum: idx + 2,
            tanggal: formattedDate,
            keterangan,
            nominal,
            coa_debit,
            coa_kredit,
            bank_account_id: null,
            tipe_mutasi,
            nrm: row.nrm ? String(row.nrm).trim() : null,
            isValid: isValidDate && isOffsetCoaValid && isValidAmount && keterangan !== '',
            warningMsg,
            errorMsg: !isValidDate ? 'Tanggal tidak valid (Gunakan DD-MM-YYYY)' :
              !isOffsetCoaValid ? `Kode akun lawan '${offsetCoaCode}' tidak terdaftar di COA` :
                !isValidAmount ? 'Nominal harus > 0 (Hanya salah satu dari kolom Debet atau Kredit)' : ''
          };
        }

        // Case B: Migrasi Format Default (Umum)
        const coaDebitKey = findKey(['coadebit', 'debitcoa', 'akun_debit']);
        const coaKreditKey = findKey(['coakredit', 'kreditcoa', 'akun_kredit']);
        const coaDebitCode = coaDebitKey ? String(row[coaDebitKey]).trim() : '';
        const coaKreditCode = coaKreditKey ? String(row[coaKreditKey]).trim() : '';

        const nominalKey = findKey(['nominal', 'jumlah', 'amount']);
        const nominalVal = cleanNumber(nominalKey ? row[nominalKey] : 0);

        const isDebitValid = coaCodesSet.has(coaDebitCode);
        const isKreditValid = coaCodesSet.has(coaKreditCode);
        const isValidAmount = nominalVal > 0;

        return {
          rowNum: idx + 2,
          tanggal: formattedDate,
          keterangan,
          nominal: nominalVal,
          coa_debit: coaDebitCode,
          coa_kredit: coaKreditCode,
          bank_account_id: null,
          tipe_mutasi: 'DEBIT',
          nrm: row.nrm ? String(row.nrm).trim() : null,
          isValid: isValidDate && isDebitValid && isKreditValid && isValidAmount && keterangan !== '',
          warningMsg,
          errorMsg: !isValidDate ? 'Tanggal tidak valid (Gunakan YYYY-MM-DD)' :
            !isDebitValid ? `COA Debit '${coaDebitCode}' tidak terdaftar` :
              !isKreditValid ? `COA Kredit '${coaKreditCode}' tidak terdaftar` :
                !isValidAmount ? 'Nominal harus > 0' : ''
        };
      }).filter(Boolean);

      setParsedTransactions(mapped);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal membaca file Excel.');
      setParsedTransactions([]);
      setFileName('');
    } finally {
      e.target.value = '';
    }
  };

  const handleBulkMigrationSubmit = async () => {
    const validItems = parsedTransactions.filter(t => t.isValid);
    if (validItems.length === 0) {
      alert('Tidak ada transaksi valid untuk dimigrasikan.');
      return;
    }

    setMigrating(true);
    setMigrationProgress('Mempersiapkan migrasi...');
    setMigrationStats({
      total: validItems.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    });
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const allErrors: any[] = [];
    
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(validItems.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, validItems.length);
      const batchItems = validItems.slice(startIdx, endIdx);
      
      const pct = Math.round((i / totalBatches) * 100);
      setMigrationProgress(`Mengirim batch ${i + 1}/${totalBatches} (${pct}%)`);

      try {
        const res = await axios.post('/api/finance/ledger/migrate', {
          transactions: batchItems.map(item => ({
            tanggal: item.tanggal,
            keterangan: item.keterangan,
            nominal: item.nominal,
            coa_debit: item.coa_debit,
            coa_kredit: item.coa_kredit,
            bank_account_id: item.bank_account_id,
            tipe_mutasi: item.tipe_mutasi,
            nrm: item.nrm,
            rowNum: item.rowNum
          }))
        });

        const { successCount, failedCount, skippedCount, errors } = res.data;
        totalSuccess += (successCount || 0);
        totalFailed += (failedCount || 0);
        totalSkipped += (skippedCount || 0);
        if (errors && Array.isArray(errors)) {
          allErrors.push(...errors);
        }
      } catch (err: any) {
        console.error('Batch request failed:', err);
        totalFailed += batchItems.length;
        batchItems.forEach(item => {
          allErrors.push({
            rowNum: item.rowNum,
            keterangan: item.keterangan || 'N/A',
            error: err.response?.data?.error || err.message || 'Koneksi jaringan terputus atau server error.'
          });
        });
      }

      setMigrationStats({
        total: validItems.length,
        processed: endIdx,
        success: totalSuccess,
        failed: totalFailed,
        skipped: totalSkipped,
        errors: [...allErrors]
      });
    }

    setMigrationProgress('Menyelesaikan...');
    setMigrating(false);
    fetchData();
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<'jurnal' | 'rekap'>('jurnal');
  const [rekapFilterType, setRekapFilterType] = useState<'semua' | 'kas'>('semua');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [rekapSearchTerm, setRekapSearchTerm] = useState('');

  // Filter parameters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    return `${year}-01-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Selected COA Codes for filtering
  const [selectedCoas, setSelectedCoas] = useState<string[]>([]);
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);
  const [coaSearchTerm, setCoaSearchTerm] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setJurnalCurrentPage(1);
  }, [startDate, endDate, selectedCoas, searchTerm]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to determine normal balance type
  const getNormalBalanceType = (coaCode: string, classification?: string, name?: string) => {
    const code = coaCode.trim();
    const cls = classification?.toLowerCase() || '';
    const nm = name?.toLowerCase() || '';

    // Akumulasi Penyusutan (Accumulated Depreciation) is a contra-asset account with a normal KREDIT balance
    if (
      code.startsWith('1202') ||
      cls.includes('akumulasi penyusutan') ||
      cls.includes('akum. penyusutan') ||
      nm.includes('akumulasi penyusutan') ||
      nm.includes('akum. penyusutan')
    ) {
      return 'KREDIT';
    }

    const firstChar = code[0];

    if (
      firstChar === '1' ||
      firstChar === '5' ||
      firstChar === '6' ||
      cls.includes('aset') ||
      cls.includes('beban') ||
      cls.includes('biaya') ||
      cls.includes('pengeluaran')
    ) {
      return 'DEBIT';
    }
    return 'KREDIT';
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCoaDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Ledger & COAs on Mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLedger, resCoas, resHealth] = await Promise.all([
        axios.get('/api/finance/ledger', {
          params: { startDate, endDate }
        }),
        axios.get('/api/finance/coa'),
        axios.get('/api/finance/ledger/health-check')
      ]);
      setLedger(resLedger.data);
      setCoas(resCoas.data);
      setHealthData(resHealth.data.health);
    } catch (e) {
      console.error('Gagal mengambil data buku besar:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Handle COA selection toggle
  const toggleCoaSelection = (code: string) => {
    setSelectedCoas(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // Select all or clear COA selection
  const selectAllCoas = () => {
    setSelectedCoas(coas.map(c => c.coa_code));
  };

  const clearCoaSelection = () => {
    setSelectedCoas([]);
  };

  // Filtered COAs shown inside the dropdown search
  const filteredCoasForDropdown = useMemo(() => {
    return coas.filter(c =>
      c.coa_code.includes(coaSearchTerm) ||
      c.nama_akun.toLowerCase().includes(coaSearchTerm.toLowerCase())
    );
  }, [coas, coaSearchTerm]);

  // Main client-side filtered ledger entries based on dates, search, and COAs
  const filteredLedger = useMemo(() => {
    return ledger.filter(entry => {
      // 1. Date Range Filter
      const entryDate = entry.realisasi?.tanggal ? entry.realisasi.tanggal.split('T')[0] : '';
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;

      // 2. COA Filter
      if (selectedCoas.length > 0 && !selectedCoas.includes(entry.coa_code)) {
        return false;
      }

      // 3. Text Search Filter
      const search = searchTerm.toLowerCase();
      if (search) {
        const matchesKeterangan = entry.realisasi?.keterangan?.toLowerCase().includes(search);
        const matchesCoaCode = entry.coa_code.includes(search);
        const matchesCoaName = entry.coa?.nama_akun?.toLowerCase().includes(search);
        const matchesAccountName = entry.account?.nama_akun?.toLowerCase().includes(search);
        return matchesKeterangan || matchesCoaCode || matchesCoaName || matchesAccountName;
      }

      return true;
    });
  }, [ledger, startDate, endDate, selectedCoas, searchTerm]);

  // Sorted ledger: Newest transaction date first.
  // Within the same transaction, show KREDIT entries before DEBIT entries.
  const sortedLedger = useMemo(() => {
    return [...filteredLedger].sort((a, b) => {
      // 1. Sort by date descending
      const dateA = new Date(a.realisasi?.tanggal || 0).getTime();
      const dateB = new Date(b.realisasi?.tanggal || 0).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // 2. If same date, sort by input time (createdAt) descending
      const createA = new Date(a.realisasi?.createdAt || a.realisasi?.tanggal || 0).getTime();
      const createB = new Date(b.realisasi?.createdAt || b.realisasi?.tanggal || 0).getTime();
      if (createB !== createA) {
        return createB - createA;
      }

      // 3. Group by transaction_id to keep entries of the same transaction together
      if (a.transaksi_id !== b.transaksi_id) {
        return b.transaksi_id.localeCompare(a.transaksi_id);
      }

      // 4. Within the same transaction, sort Kredit entries first (Number(kredit) > 0 before Number(debit) > 0)
      const isKreditA = Number(a.kredit) > 0 ? 1 : 0;
      const isKreditB = Number(b.kredit) > 0 ? 1 : 0;
      return isKreditB - isKreditA;
    });
  }, [filteredLedger]);

  const paginatedLedger = useMemo(() => {
    const start = (jurnalCurrentPage - 1) * itemsPerPage;
    return sortedLedger.slice(start, start + itemsPerPage);
  }, [sortedLedger, jurnalCurrentPage]);

  // Compute total debit/kredit of filtered list
  const totalDebit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  }, [filteredLedger]);

  const totalKredit = useMemo(() => {
    return filteredLedger.reduce((sum, item) => sum + Number(item.kredit || 0), 0);
  }, [filteredLedger]);

  // COA Summaries calculation for Rekapitulasi tab
  const coaSummaries = useMemo(() => {
    // 1. Group ledger entries by coa_code
    const ledgerByCoa: Record<string, { debit: number; kredit: number }> = {};
    ledger.forEach(entry => {
      if (!ledgerByCoa[entry.coa_code]) {
        ledgerByCoa[entry.coa_code] = { debit: 0, kredit: 0 };
      }
      ledgerByCoa[entry.coa_code].debit += Number(entry.debit || 0);
      ledgerByCoa[entry.coa_code].kredit += Number(entry.kredit || 0);
    });

    // 2. Map over all COAs
    const summaries = coas.map(coa => {
      const entrySum = ledgerByCoa[coa.coa_code] || { debit: 0, kredit: 0 };
      const normalType = getNormalBalanceType(coa.coa_code, coa.klasifikasi, coa.nama_akun);
      const saldoAwal = Number(coa.saldo_awal || 0);

      let saldo = 0;
      if (normalType === 'DEBIT') {
        saldo = saldoAwal + entrySum.debit - entrySum.kredit;
      } else {
        saldo = saldoAwal + entrySum.kredit - entrySum.debit;
      }

      return {
        ...coa,
        saldo_awal: saldoAwal,
        debit: entrySum.debit,
        kredit: entrySum.kredit,
        saldo,
        normalType
      };
    });

    // 3. Filter by search term
    let result = summaries;
    if (rekapSearchTerm.trim()) {
      const search = rekapSearchTerm.toLowerCase();
      result = result.filter(s =>
        s.coa_code.includes(search) ||
        s.nama_akun.toLowerCase().includes(search) ||
        (s.klasifikasi && s.klasifikasi.toLowerCase().includes(search))
      );
    }

    // Filter by Kas & Setara Kas if active
    if (rekapFilterType === 'kas') {
      result = result.filter(s => KAS_SETARA_KAS_CODES.includes(s.coa_code));
    }

    // 4. Filter by zero balance toggle
    if (!showZeroBalances) {
      result = result.filter(s => s.saldo_awal !== 0 || s.debit > 0 || s.kredit > 0 || s.saldo !== 0);
    }

    return result;
  }, [coas, ledger, showZeroBalances, rekapSearchTerm, rekapFilterType]);

  // Compute Trial Balance Totals (for checking standard identity debit == kredit)
  const trialBalanceTotals = useMemo(() => {
    let totalDebitBalance = 0;
    let totalKreditBalance = 0;

    coaSummaries.forEach(s => {
      if (s.normalType === 'DEBIT') {
        if (s.saldo >= 0) {
          totalDebitBalance += s.saldo;
        } else {
          totalKreditBalance += Math.abs(s.saldo);
        }
      } else {
        if (s.saldo >= 0) {
          totalKreditBalance += s.saldo;
        } else {
          totalDebitBalance += Math.abs(s.saldo);
        }
      }
    });

    return {
      debit: totalDebitBalance,
      kredit: totalKreditBalance,
      balanced: Math.abs(totalDebitBalance - totalKreditBalance) < 0.01
    };
  }, [coaSummaries]);

  // Compute Trial Balance Awal Totals (for checking standard identity debit == kredit at start)
  const trialBalanceAwalTotals = useMemo(() => {
    let totalDebitAwal = 0;
    let totalKreditAwal = 0;

    coaSummaries.forEach(s => {
      if (s.normalType === 'DEBIT') {
        if (s.saldo_awal >= 0) {
          totalDebitAwal += s.saldo_awal;
        } else {
          totalKreditAwal += Math.abs(s.saldo_awal);
        }
      } else {
        if (s.saldo_awal >= 0) {
          totalKreditAwal += s.saldo_awal;
        } else {
          totalDebitAwal += Math.abs(s.saldo_awal);
        }
      }
    });

    return {
      debit: totalDebitAwal,
      kredit: totalKreditAwal,
      balanced: Math.abs(totalDebitAwal - totalKreditAwal) < 0.01
    };
  }, [coaSummaries]);

  // Compute Kas & Setara Kas metrics (Awal, Mutasi, Akhir)
  const kasSetaraKasTotals = useMemo(() => {
    let totalAwal = 0;
    let totalMutasi = 0;

    // Group ledger entries by coa_code
    const ledgerByCoa: Record<string, { debit: number; kredit: number }> = {};
    ledger.forEach(entry => {
      if (!ledgerByCoa[entry.coa_code]) {
        ledgerByCoa[entry.coa_code] = { debit: 0, kredit: 0 };
      }
      ledgerByCoa[entry.coa_code].debit += Number(entry.debit || 0);
      ledgerByCoa[entry.coa_code].kredit += Number(entry.kredit || 0);
    });

    KAS_SETARA_KAS_CODES.forEach(code => {
      const coaInfo = coas.find(c => c.coa_code === code);
      const saldoAwal = Number(coaInfo?.saldo_awal || 0);
      totalAwal += saldoAwal;

      const entrySum = ledgerByCoa[code] || { debit: 0, kredit: 0 };
      totalMutasi += (entrySum.debit - entrySum.kredit);
    });

    return {
      awal: totalAwal,
      mutasi: totalMutasi,
      akhir: totalAwal + totalMutasi
    };
  }, [coas, ledger]);

  // Handle printing as PDF using browser built-in print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50 print:bg-white print:p-0 print:overflow-visible">

      {/* Custom Print CSS Styles injected dynamically */}
      <style dangerouslySetInnerHTML={{
        __html: `
 @media print {
   @page {
     size: A4 portrait;
     margin: 10mm 10mm;
   }
   html, body, #root, .flex-1, .overflow-y-auto, [class*="overflow-y-auto"], [class*="min-h-screen"], [class*="h-screen"] {
     height: auto !important;
     min-height: 0 !important;
     overflow: visible !important;
     position: static !important;
   }
   body {
     background-color: white !important;
     color: black !important;
   }
   aside, nav, header, button, .no-print, input, select, [role="tablist"] {
     display: none !important;
   }
   .print-header {
     display: block !important;
     margin-bottom: 15px !important;
   }
   .shadow-sm, .rounded-3xl, .rounded-2xl, .bg-slate-50\/50 {
     box-shadow: none !important;
     border-radius: 0 !important;
     border: none !important;
     background: transparent !important;
   }
   table {
     width: 100% !important;
     border-collapse: collapse !important;
   }
   th, td {
     border: 1px solid #cbd5e1 !important;
     padding: 4px 6px !important;
     font-size: 8px !important;
     line-height: 1.1 !important;
   }
   tr {
     page-break-inside: avoid !important;
   }
 }
 .print-header {
   display: none;
 }
`}} />

      {/* Print-Only Header Block */}
      <div className="print-header space-y-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-950 tracking-wide">
              BAZNAS KOTA SEMARANG
            </h1>
            <p className="text-xs text-slate-500 font-bold">
              {activeTab === 'jurnal'
                ? 'Laporan Jurnal Buku Besar (General Ledger)'
                : rekapFilterType === 'kas'
                  ? 'Laporan Rekapitulasi Kas & Setara Kas'
                  : 'Laporan Rekapitulasi Saldo Chart of Accounts (COA)'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
            <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
            <p>Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : '-'} s/d {endDate ? new Date(endDate).toLocaleDateString('id-ID') : '-'}</p>
          </div>
        </div>
        <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
          <strong>Filter Akun:</strong> {selectedCoas.length === 0 ? 'Semua Akun Buku Besar' : selectedCoas.join(',')}
        </div>
      </div>

      {/* Page Header (No-Print) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-100 pb-5 no-print"
      >
        <div className="space-y-2">
          <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <span className="hover:text-primary transition-colors cursor-pointer text-slate-400 shrink-0">Pelaporan</span>
            <ChevronRight className="size-4 text-slate-300 shrink-0" />
            <span className="text-primary font-bold shrink-0">Jurnal Buku Besar</span>
          </nav>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
            Jurnal Buku Besar
          </h2>
          <p className="text-slate-500 font-medium">
            Tinjau seluruh pencatatan transaksi kas masuk, keluar, dan mutasi internal BAZNAS Kota Semarang secara real-time.
          </p>
        </div>
      </motion.div>

      {/* Balancing & Health Check Banner (No-Print) */}
      {healthData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-5 rounded-2xl border no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm",
            healthData.isSystemHealthy
              ? "bg-emerald-50/40 border-emerald-100 text-emerald-950"
              : "bg-amber-50/40 border-amber-105 text-amber-950"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              healthData.isSystemHealthy ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
            )}>
              <HeartPulse className="size-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black">
                Kesehatan Balancing Sistem: {healthData.isSystemHealthy ? "Prima & Seimbang" : "Butuh Penyelarasan"}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {healthData.isSystemHealthy
                  ? "Seluruh jurnal pencatatan umum seimbang sempurna (Total Debit = Total Kredit) dan saldo kas log sinkron."
                  : `Ditemukan ${healthData.unbalancedTransactions.length} transaksi tidak seimbang atau ketidaksesuaian saldo akun kas.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDiagnosticsModal(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 shadow-sm hover:scale-102 active:scale-98",
              healthData.isSystemHealthy
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            <Activity className="size-4" />
            Buka Diagnostik Jurnal
          </button>
        </motion.div>
      )}

      {/* Tab Switcher (No-Print) */}
      <div className="flex border-b border-slate-200 no-print gap-1">
        <button
          onClick={() => setActiveTab('jurnal')}
          className={cn(
            "px-6 py-3 text-xs font-black transition-all border-b-2",
            activeTab === 'jurnal'
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          Jurnal Transaksi
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          className={cn(
            "px-6 py-3 text-xs font-black transition-all border-b-2",
            activeTab === 'rekap'
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          Rekapitulasi Saldo COA
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'jurnal' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Debit Jurnal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalDebit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6 rotate-90" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Kredit Jurnal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(totalKredit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 no-print">
                <Activity className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Jumlah Baris Transaksi</span>
                <p className="text-lg font-black text-slate-800">{filteredLedger.length} Baris Jurnal</p>
              </div>
            </motion.div>
          </>
        ) : rekapFilterType === 'kas' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Kas Awal</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(kasSetaraKasTotals.awal)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className={cn(
                "size-12 rounded-xl flex items-center justify-center shrink-0 no-print",
                kasSetaraKasTotals.mutasi >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                <Activity className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Mutasi Kas</span>
                <p className={cn(
                  "text-lg font-black",
                  kasSetaraKasTotals.mutasi >= 0 ? "text-emerald-700" : "text-rose-700"
                )}>
                  {kasSetaraKasTotals.mutasi >= 0 ? '+' : ''}{formatCurrency(kasSetaraKasTotals.mutasi)}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Kas Akhir</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(kasSetaraKasTotals.akhir)}</p>
              </div>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Saldo Debit</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(trialBalanceTotals.debit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 no-print">
                <TrendingUp className="size-6 rotate-90" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Total Saldo Kredit</span>
                <p className="text-lg font-black text-slate-800">{formatCurrency(trialBalanceTotals.kredit)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 print:border print:border-slate-100"
            >
              <div className={cn(
                "size-12 rounded-xl flex items-center justify-center shrink-0 no-print",
                trialBalanceTotals.balanced
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600"
              )}>
                {trialBalanceTotals.balanced ? (
                  <Check className="size-6 text-emerald-600" />
                ) : (
                  <X className="size-6 text-rose-600" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400">Status Keseimbangan</span>
                <p className={cn(
                  "text-base font-black",
                  trialBalanceTotals.balanced ? "text-emerald-600" : "text-rose-600"
                )}>
                  {trialBalanceTotals.balanced ? 'Seimbang (Balanced)' : 'Belum Seimbang'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Filter and Ledger Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:border-0"
      >

        {/* TAB 1: JURNAL TRANSAKSI - Filters Panel (No-Print) */}
        {activeTab === 'jurnal' && (
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4 no-print">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

              {/* Search Input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400">Pencarian Transaksi</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input
                    type="text"
                    placeholder="Cari keterangan, kode COA, atau kas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Start */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">

              {/* Multi-Select COA Dropdown */}
              <div className="space-y-1.5 md:col-span-3" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400">Filter Berdasarkan Akun (COA)</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCoaDropdownOpen(!isCoaDropdownOpen)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-all text-slate-700"
                  >
                    <span className="truncate pr-4">
                      {selectedCoas.length === 0
                        ? "Menampilkan Semua Akun COA"
                        : `Terpilih ${selectedCoas.length} Akun COA (${selectedCoas.slice(0, 3).join(',')}${selectedCoas.length > 3 ? '...' : ''})`
                      }
                    </span>
                    <ChevronDown className="size-4 text-slate-400 shrink-0" />
                  </button>

                  <AnimatePresence>
                    {isCoaDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                          <input
                            type="text"
                            placeholder="Cari COA..."
                            value={coaSearchTerm}
                            onChange={(e) => setCoaSearchTerm(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={selectAllCoas}
                              className="text-[10px] font-black text-primary hover:underline"
                            >
                              Semua
                            </button>
                            <span className="text-slate-355">|</span>
                            <button
                              type="button"
                              onClick={clearCoaSelection}
                              className="text-[10px] font-black text-rose-500 hover:underline"
                            >
                              Bersih
                            </button>
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                          {filteredCoasForDropdown.length === 0 ? (
                            <p className="p-4 text-xs font-semibold text-slate-400 italic text-center">Akun tidak ditemukan</p>
                          ) : (
                            filteredCoasForDropdown.map((coa) => {
                              const isSelected = selectedCoas.includes(coa.coa_code);
                              return (
                                <div
                                  key={coa.coa_code}
                                  onClick={() => toggleCoaSelection(coa.coa_code)}
                                  className={cn(
                                    "px-4 py-2.5 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 font-bold transition-all",
                                    isSelected ? "bg-primary/5 text-primary" : "text-slate-700"
                                  )}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-mono">{coa.coa_code}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{coa.nama_akun}</span>
                                  </div>
                                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Cetak PDF Button */}
              <div className="space-y-1.5 self-end">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-primary/10"
                >
                  <Printer className="size-4" />
                  Cetak PDF
                </button>
              </div>

              {/* Migrasi Buku Besar Button */}
              <div className="space-y-1.5 self-end no-print">
                <button
                  type="button"
                  onClick={() => setIsMigrationModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
                >
                  <Upload className="size-4" />
                  Migrasi Jurnal
                </button>
              </div>

              {/* Refresh Button */}
              <div className="space-y-1.5 self-end">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-60"
                >
                  {loading ? 'Me-refresh...' : 'Refresh Jurnal'}
                </button>
              </div>

            </div>

            {/* Active COA Badges */}
            {selectedCoas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/50">
                <span className="text-[9px] font-black text-slate-400 mr-1">Filter Aktif:</span>
                {selectedCoas.map(code => {
                  const matchingCoa = coas.find(c => c.coa_code === code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    >
                      <span>{code} {matchingCoa ? `(${matchingCoa.nama_akun})` : ''}</span>
                      <button
                        type="button"
                        onClick={() => toggleCoaSelection(code)}
                        className="hover:text-rose-600 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: REKAPITULASI COA - Filters Panel (No-Print) */}
        {activeTab === 'rekap' && (
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4 no-print">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

              {/* Search Input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400">Cari Akun COA</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input
                    type="text"
                    placeholder="Cari kode COA, nama akun, klasifikasi..."
                    value={rekapSearchTerm}
                    onChange={(e) => setRekapSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Start */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">

              <div className="flex flex-wrap items-center gap-6">
                {/* Sub-Tab Selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRekapFilterType('semua')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      rekapFilterType === 'semua'
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Semua COA
                  </button>
                  <button
                    type="button"
                    onClick={() => setRekapFilterType('kas')}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      rekapFilterType === 'kas'
                        ? "bg-white text-primary shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Kas & Setara Kas
                  </button>
                </div>

                {/* Zero Balances Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showZeroBalances"
                    checked={showZeroBalances}
                    onChange={(e) => setShowZeroBalances(e.target.checked)}
                    className="rounded text-primary focus:ring-primary size-4"
                  />
                  <label htmlFor="showZeroBalances" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
                    Tampilkan Akun Bersaldo Nol
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Cetak PDF Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-primary/10"
                >
                  <Printer className="size-4" />
                  Cetak PDF Rekap
                </button>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition-all disabled:opacity-60"
                >
                  {loading ? 'Me-refresh...' : 'Refresh'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: JURNAL TRANSAKSI - Table */}
        {activeTab === 'jurnal' && (
          <div className="overflow-x-auto print:overflow-visible">
            {loading ? (
              <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
                Memproses Data Buku Besar...
              </div>
            ) : (
              <>
                {/* Table for Screen Display (with pagination) */}
                <table className="w-full text-left print:hidden">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Tanggal Jurnal</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Keterangan Jurnal (Realisasi)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Kode COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400">Nama Akun COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Debet (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right">Kredit (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedLedger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Buku besar jurnal kosong / Tidak ditemukan</td>
                      </tr>
                    ) : paginatedLedger.map((item) => (
                      <tr key={item.entry_id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 font-mono text-xs text-slate-650 font-bold">
                          <div>{new Date(item.realisasi.tanggal).toLocaleDateString('id-ID')}</div>
                          {item.realisasi.createdAt && (
                            <div className="text-[9px] text-slate-400 font-sans font-normal mt-0.5">
                              Dicatat: {new Date(item.realisasi.createdAt).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-800">
                          {item.realisasi.keterangan}
                          {item.account && <span className="block text-[10px] text-slate-400 mt-1 font-semibold">Kas Fisik: {item.account.nama_akun}</span>}
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-650 font-bold">{item.coa_code}</td>
                        <td className="px-6 py-5 font-bold text-slate-800">{item.coa.nama_akun}</td>
                        <td className="px-6 py-5 text-right font-black text-emerald-700">
                          {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-blue-700">
                          {Number(item.kredit) > 0 ? formatCurrency(Number(item.kredit)) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table for PDF Print (complete list of all records without pagination) */}
                <table className="w-full text-left hidden print:table">
                  <thead>
                    <tr className="print:border-b">
                      <th className="px-6 py-4 text-[10px] font-black text-black">Tanggal Jurnal</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black">Keterangan Jurnal (Realisasi)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black">Kode COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-black">Nama Akun COA</th>
                      <th className="px-6 py-4 text-[10px] font-black text-right text-black">Debet (IDR)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-right text-black">Kredit (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {sortedLedger.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">Buku besar jurnal kosong / Tidak ditemukan</td>
                      </tr>
                    ) : sortedLedger.map((item) => (
                      <tr key={item.entry_id} className="print:border-b">
                        <td className="px-6 py-5 font-mono text-xs text-black font-bold">
                          <div>{new Date(item.realisasi.tanggal).toLocaleDateString('id-ID')}</div>
                        </td>
                        <td className="px-6 py-5 font-bold text-black">
                          {item.realisasi.keterangan}
                          {item.account && <span className="block text-[10px] text-slate-500 mt-1 font-semibold">Kas Fisik: {item.account.nama_akun}</span>}
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-black font-bold">{item.coa_code}</td>
                        <td className="px-6 py-5 font-bold text-black">{item.coa.nama_akun}</td>
                        <td className="px-6 py-5 text-right font-black text-black">
                          {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-black">
                          {Number(item.kredit) > 0 ? formatCurrency(Number(item.kredit)) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs print:hidden">
                  <p className="text-slate-400 font-bold">
                    Menampilkan {sortedLedger.length === 0 ? 0 : (jurnalCurrentPage - 1) * itemsPerPage + 1}-{Math.min(jurnalCurrentPage * itemsPerPage, sortedLedger.length)} dari {sortedLedger.length} Transaksi Jurnal
                  </p>
                  <div className="flex gap-1 items-center">
                    <button
                      type="button"
                      onClick={() => setJurnalCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={jurnalCurrentPage === 1}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold px-2">
                      <span>Halaman</span>
                      <input
                        type="number"
                        min={1}
                        max={Math.ceil(sortedLedger.length / itemsPerPage) || 1}
                        value={jurnalCurrentPage === 0 ? '' : jurnalCurrentPage}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                          const totalPages = Math.ceil(sortedLedger.length / itemsPerPage) || 1;
                          if (val === 0) {
                            setJurnalCurrentPage(0);
                          } else if (!isNaN(val) && val >= 1 && val <= totalPages) {
                            setJurnalCurrentPage(val);
                          }
                        }}
                        onBlur={() => {
                          if (jurnalCurrentPage === 0) {
                            setJurnalCurrentPage(1);
                          }
                        }}
                        className="w-12 text-center py-1 border border-slate-200 rounded-md bg-white text-slate-750 outline-none focus:border-primary text-[11px] font-extrabold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span>dari {Math.ceil(sortedLedger.length / itemsPerPage) || 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJurnalCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedLedger.length / itemsPerPage) || 1))}
                      disabled={jurnalCurrentPage === (Math.ceil(sortedLedger.length / itemsPerPage) || 1)}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: REKAPITULASI COA - Table */}
        {activeTab === 'rekap' && (
          <div className="overflow-x-auto print:overflow-visible">
            {loading ? (
              <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
                Memproses Rekapitulasi COA...
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 print:bg-white print:border-b">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 print:text-black">Kode COA</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 print:text-black">Nama Akun COA</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 print:text-black">Klasifikasi</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 print:text-black">Normal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right print:text-black">Saldo Awal (IDR)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right print:text-black">Total Debet (IDR)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right print:text-black">Total Kredit (IDR)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right print:text-black">Saldo Akhir (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {coaSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic font-medium">Rekapitulasi COA kosong / Tidak ditemukan</td>
                    </tr>
                  ) : (
                    <>
                      {coaSummaries.map((item) => (
                        <tr key={item.coa_code} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-4 font-mono text-xs text-slate-650 font-bold print:text-black">{item.coa_code}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 print:text-black">{item.nama_akun}</td>
                          <td className="px-6 py-4 font-bold text-slate-500 print:text-black">
                            {item.klasifikasi || '—'}
                          </td>
                          <td className="px-6 py-4 font-bold text-xs text-slate-400 print:text-black">
                            {item.normalType}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-600 print:text-black">
                            {item.saldo_awal !== 0 ? formatCurrency(item.saldo_awal) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700 print:text-black">
                            {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-blue-700 print:text-black">
                            {item.kredit > 0 ? formatCurrency(item.kredit) : '—'}
                          </td>
                          <td className={cn(
                            "px-6 py-4 text-right font-black print:text-black",
                            item.saldo >= 0 ? "text-slate-800" : "text-rose-700"
                          )}>
                            {formatCurrency(item.saldo)}
                            {item.saldo < 0 && <span className="text-[10px] font-bold block text-rose-500 print:hidden">Defisit / Kontra</span>}
                          </td>
                        </tr>
                      ))}
                      {/* Total Summary Row for Trial Balance */}
                      <tr className="bg-slate-50/70 font-black border-t-2 border-slate-200">
                        <td colSpan={4} className="px-6 py-5 text-slate-800 text-xs">
                          Total Saldo Rekapitulasi COA
                        </td>
                        <td className="px-6 py-5 text-right text-slate-700 text-sm">
                          {formatCurrency(trialBalanceAwalTotals.debit)}
                        </td>
                        <td className="px-6 py-5 text-right text-emerald-800 text-sm">
                          {formatCurrency(coaSummaries.reduce((sum, s) => sum + s.debit, 0))}
                        </td>
                        <td className="px-6 py-5 text-right text-blue-800 text-sm">
                          {formatCurrency(coaSummaries.reduce((sum, s) => sum + s.kredit, 0))}
                        </td>
                        <td className="px-6 py-5 text-right text-slate-900 text-sm">
                          <div className="flex flex-col items-end">
                            <span>
                              {formatCurrency(trialBalanceTotals.debit)}
                            </span>
                            {rekapFilterType !== 'semua' || rekapSearchTerm.trim() !== '' ? (
                              <span className="text-[9px] font-bold mt-0.5 text-slate-400">
                                SUB-TOTAL FILTER
                              </span>
                            ) : (
                              <span className={cn(
                                "text-[9px] font-bold mt-0.5",
                                trialBalanceTotals.balanced ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {trialBalanceTotals.balanced ? 'BALANCED' : 'UNBALANCED'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </motion.div>

      {/* Diagnostics & Balancing Modal (No-Print) */}
      <AnimatePresence>
        {showDiagnosticsModal && healthData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center text-white shadow-md",
                    healthData.isSystemHealthy ? "bg-emerald-500" : "bg-amber-500"
                  )}>
                    <Activity className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Diagnostik & Penyelarasan Jurnal
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Pemeriksaan integritas double-entry ledger dan saldo kas secara real-time.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-55 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto">

                {/* Audit Ringkasan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400 block">Total Debit Ledger</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(healthData.overall.totalDebit)}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400 block">Total Kredit Ledger</span>
                    <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(healthData.overall.totalKredit)}</span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-xl border",
                    healthData.overall.isBalanced ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"
                  )}>
                    <span className="text-[10px] font-black text-slate-450 block">Selisih Keseimbangan</span>
                    <span className={cn(
                      "text-base font-black mt-1 block",
                      healthData.overall.isBalanced ? "text-emerald-700" : "text-rose-700"
                    )}>
                      {formatCurrency(healthData.overall.difference)}
                    </span>
                  </div>
                </div>

                {/* Section 1: Bank Ledger Cross-Reference */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Penyelarasan Saldo Kas & Bank dengan Buku Besar
                  </h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 font-bold text-slate-600">Nama Akun Kas/Bank</th>
                          <th className="px-4 py-3 font-bold text-slate-600">COA</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Awal</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Log Jurnal</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-600">Saldo Akun</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-600">Status Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {healthData.bankChecks.map((check: any) => (
                          <tr key={check.account_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-750">{check.nama_akun}</td>
                            <td className="px-4 py-3 font-mono text-slate-500 font-bold">{check.coa_code}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-600">{formatCurrency(check.saldo_awal)}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-750">{formatCurrency(check.calculatedBalance)}</td>
                            <td className="px-4 py-3 text-right font-black text-primary">{formatCurrency(check.currentSaldo)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black",
                                check.isMatch
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-rose-55 text-rose-700 border border-rose-100"
                              )}>
                                {check.isMatch ? (
                                  <>
                                    <Check className="size-3" /> MATCHING
                                  </>
                                ) : (
                                  <>
                                    <X className="size-3" /> SELISIH {formatCurrency(check.difference)}
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 pl-1">
                    <Info className="size-3.5 shrink-0" />
                    Catatan: Saldo Log Jurnal dihitung dari Saldo Awal Akun ditambah total Debit Jurnal dikurangi total Kredit Jurnal yang tercatat di Buku Besar.
                  </p>
                </div>

                {/* Section 2: Unbalanced Transactions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <ShieldAlert className="size-4 text-amber-600" />
                    Pendeteksi Transaksi Pincang (Unbalanced)
                  </h4>
                  {healthData.unbalancedTransactions.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/20 text-center flex flex-col items-center justify-center gap-2">
                      <div className="size-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check className="size-6" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-emerald-900 tracking-wide">Semua Transaksi Seimbang Sempurna</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">Tidak ditemukan transaksi yang pincang di dalam Buku Besar.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-3 font-bold text-slate-600">Tanggal</th>
                            <th className="px-4 py-3 font-bold text-slate-600">Keterangan Transaksi (ID Realisasi)</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Total Debit</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Total Kredit</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {healthData.unbalancedTransactions.map((tx: any) => (
                            <tr key={tx.transaksi_id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-slate-500 font-mono font-bold">{new Date(tx.tanggal).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-800 block">{tx.keterangan}</span>
                                <span className="text-[9px] font-mono text-slate-400 font-semibold">ID: {tx.transaksi_id}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-emerald-700">{formatCurrency(tx.debit)}</td>
                              <td className="px-4 py-3 text-right font-black text-blue-700">{formatCurrency(tx.kredit)}</td>
                              <td className="px-4 py-3 text-right font-black text-rose-700">{formatCurrency(tx.difference)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    fetchData();
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-700 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Pindai Ulang Ledger
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migrasi Buku Besar Modal (No-Print) */}
      {isMigrationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-primary" />
                <h3 className="text-lg font-black text-slate-900 font-sans">Migrasi Jurnal</h3>
              </div>
              <button onClick={() => { setIsMigrationModalOpen(false); setSelectedMigrationCoa(''); setParsedTransactions([]); setFileName(''); setMigrationStats(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            {migrating ? (
              <div className="p-12 text-center space-y-6 flex-1 flex flex-col justify-center items-center">
                <div className="relative size-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <FileSpreadsheet className="size-8 text-primary animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-slate-800">Sedang Memproses Migrasi</h4>
                  <p className="text-xs text-slate-500 font-bold">
                    {migrationProgress}
                  </p>
                </div>

                {/* Progress Bar */}
                {migrationStats && (
                  <div className="w-full max-w-md space-y-2">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.round((migrationStats.processed / migrationStats.total) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                      <span>Progres: {Math.round((migrationStats.processed / migrationStats.total) * 100)}%</span>
                      <span>{migrationStats.processed} / {migrationStats.total} Baris</span>
                    </div>

                    {/* Mini Stats Row */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 text-center">
                        <span className="text-[9px] font-bold text-emerald-600 block">Berhasil</span>
                        <span className="text-sm font-black text-emerald-700">{migrationStats.success}</span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/50 text-center">
                        <span className="text-[9px] font-bold text-amber-600 block">Dilewati</span>
                        <span className="text-sm font-black text-amber-700">{migrationStats.skipped}</span>
                      </div>
                      <div className="bg-rose-50/50 p-2 rounded-xl border border-rose-100/50 text-center">
                        <span className="text-[9px] font-bold text-rose-600 block">Gagal</span>
                        <span className="text-sm font-black text-rose-700">{migrationStats.failed}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : migrationStats ? (
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Result Message Card */}
                <div className={cn(
                  "p-5 rounded-2xl border text-center flex flex-col items-center justify-center gap-3",
                  migrationStats.failed === 0
                    ? "bg-emerald-50/40 border-emerald-100 text-emerald-950"
                    : "bg-amber-50/40 border-amber-100 text-amber-950"
                )}>
                  <div className={cn(
                    "size-12 rounded-full flex items-center justify-center text-white shadow-md",
                    migrationStats.failed === 0 ? "bg-emerald-500" : "bg-amber-500"
                  )}>
                    {migrationStats.failed === 0 ? <Check className="size-6" /> : <AlertTriangle className="size-6" />}
                  </div>
                  <div>
                    <h4 className="text-base font-black">
                      {migrationStats.failed === 0 ? "Migrasi Selesai Sempurna!" : "Migrasi Selesai dengan Catatan"}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      {migrationStats.failed === 0
                        ? `Seluruh ${migrationStats.success} transaksi valid berhasil dimasukkan ke dalam Buku Besar.`
                        : `Sebanyak ${migrationStats.success} transaksi berhasil diimpor, ${migrationStats.skipped} dilewati (duplikat), dan ${migrationStats.failed} transaksi mengalami kesalahan.`
                      }
                    </p>
                  </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Total Baris</span>
                    <span className="text-xl font-black text-slate-800 mt-1 block">{migrationStats.total}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                    <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider">Berhasil</span>
                    <span className="text-xl font-black text-emerald-700 mt-1 block">{migrationStats.success}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                    <span className="text-[9px] font-black text-amber-600 block uppercase tracking-wider">Duplikat</span>
                    <span className="text-xl font-black text-amber-700 mt-1 block">{migrationStats.skipped}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-center">
                    <span className="text-[9px] font-black text-rose-600 block uppercase tracking-wider">Gagal</span>
                    <span className="text-xl font-black text-rose-700 mt-1 block">{migrationStats.failed}</span>
                  </div>
                </div>

                {/* Error Log Panel */}
                {migrationStats.errors.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">
                      Detail Kesalahan Transaksi ({migrationStats.errors.length})
                    </h5>
                    <div className="border border-rose-100 rounded-2xl overflow-hidden bg-rose-50/10 max-h-56 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-rose-50/80 text-rose-700 font-bold border-b border-rose-100">
                            <th className="px-4 py-3 w-16 text-center">Baris</th>
                            <th className="px-4 py-3 w-1/3">Uraian / Keterangan</th>
                            <th className="px-4 py-3">Penyebab Gagal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {migrationStats.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/30">
                              <td className="px-4 py-3 text-center font-mono font-bold text-rose-800">{err.rowNum}</td>
                              <td className="px-4 py-3 text-slate-800 font-semibold truncate max-w-[200px]" title={err.keterangan}>
                                {err.keterangan}
                              </td>
                              <td className="px-4 py-3 text-rose-600 font-medium">
                                {err.error}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-4">
                  {/* 1. Rekening Dropdown Select */}
                  <div className="space-y-2 mt-4 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pilih Rekening Kas/Bank Utama:</label>
                    <select
                      value={selectedMigrationCoa}
                      onChange={(e) => { setSelectedMigrationCoa(e.target.value); setParsedTransactions([]); setFileName(''); }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      <option value="">-- Migrasi Umum (Jurnal Buku Besar) --</option>
                      {coas.filter(c => c.coa_code.startsWith('1101') || c.coa_code.startsWith('1102')).map(c => (
                        <option key={c.coa_code} value={c.coa_code}>
                          {c.coa_code} - {c.nama_akun.split('|').pop()?.trim()}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-bold leading-normal">
                      * Pilih Rekening Kas/Bank jika Anda ingin mengunggah riwayat mutasi per rekening. Jika dikosongkan, Anda dapat mengunggah jurnal umum secara keseluruhan.
                    </p>
                  </div>

                  {/* 2. Download Template / Upload File Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Download Template */}
                    <button
                      onClick={downloadBukuBesarTemplate}
                      className="flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="size-5 text-primary" />
                        <div className="text-left font-sans">
                          <p className="text-xs font-bold text-primary">Download Format Template</p>
                          <p className="text-[10px] text-primary/70 font-semibold">Unduh kolom format migrasi</p>
                        </div>
                      </div>
                    </button>

                    {/* Upload File */}
                    <label className="flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                        <div className="text-left font-sans">
                          <p className="text-xs font-bold text-slate-700 group-hover:text-primary transition-colors">
                            {fileName ? 'Ganti File Excel' : 'Upload File Data Baru'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">
                            {fileName ? fileName : 'Pilih file (.xlsx / .xls)'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBukuBesarFileUpload}
                        disabled={migrating}
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Staging/Preview Table */}
                {parsedTransactions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    {parsedTransactions.some(p => p.warningMsg) && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 font-bold flex items-start gap-2">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 animate-pulse" />
                        <div>
                          Peringatan: Terdeteksi {parsedTransactions.filter(p => p.warningMsg).length} transaksi dengan tahun yang berbeda dari tahun berjalan ({new Date().getFullYear()}). Harap pastikan tahun transaksi Anda sudah benar!
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Pratinjau Hasil Pembacaan Excel ({parsedTransactions.length} Baris)
                      </h4>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {parsedTransactions.filter(p => p.isValid).length} Valid
                        </span>
                        {parsedTransactions.filter(p => p.warningMsg).length > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="size-2 rounded-full bg-amber-500" />
                            {parsedTransactions.filter(p => p.warningMsg).length} Peringatan
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-red-500" />
                          {parsedTransactions.filter(p => !p.isValid).length} Error
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="px-4 py-2 text-center w-12">Baris</th>
                            <th className="px-4 py-2 w-24">Tanggal</th>
                            <th className="px-4 py-2 w-24">Debit (Masuk)</th>
                            <th className="px-4 py-2 w-24">Kredit (Keluar)</th>
                            <th className="px-4 py-2">Keterangan</th>
                            <th className="px-4 py-2 text-center w-16">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedTransactions.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-center font-semibold text-slate-400">{item.rowNum}</td>
                              <td className="px-4 py-2 font-semibold text-slate-700">
                                <span className={cn(item.warningMsg ? "text-amber-700 bg-amber-50 px-1 rounded font-bold border border-amber-100" : "")}>
                                  {item.tanggal || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono font-semibold text-emerald-600">
                                {item.tipe_mutasi === 'DEBIT' ? `Rp ${item.nominal.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="px-4 py-2 font-mono font-semibold text-rose-600">
                                {item.tipe_mutasi === 'KREDIT' ? `Rp ${item.nominal.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-slate-500 max-w-[200px] truncate" title={item.keterangan}>
                                {item.keterangan || '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {item.isValid ? (
                                  item.warningMsg ? (
                                    <span className="inline-flex p-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100" title={item.warningMsg}>
                                      <AlertTriangle className="size-3.5" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex p-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                      <Check className="size-3.5" />
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex p-0.5 rounded-full bg-red-50 text-red-600" title={item.errorMsg}>
                                    <ShieldAlert className="size-3.5" />
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            {migrationStats && !migrating ? (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 w-full">
                <button
                  onClick={() => {
                    setMigrationStats(null);
                    setParsedTransactions([]);
                    setFileName('');
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Migrasi Data Baru
                </button>
                <button
                  onClick={() => {
                    setIsMigrationModalOpen(false);
                    setSelectedMigrationCoa('');
                    setParsedTransactions([]);
                    setFileName('');
                    setMigrationStats(null);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all"
                >
                  Tutup
                </button>
              </div>
            ) : !migrating && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 w-full">
                <button
                  onClick={handleBulkMigrationSubmit}
                  disabled={parsedTransactions.filter(p => p.isValid).length === 0}
                  className="w-full py-3.5 bg-primary disabled:bg-slate-100 disabled:text-slate-400 hover:bg-primary/95 text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  Proses Migrasi ({parsedTransactions.filter(p => p.isValid).length} Transaksi Valid)
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
