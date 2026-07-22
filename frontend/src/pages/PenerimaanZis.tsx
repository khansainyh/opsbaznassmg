import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Eye, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  X, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Layers,
  UserPlus,
  TrendingUp,
  FileSpreadsheet,
  Edit3,
  BookOpen,
  Printer,
  FileText,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PROGRAM_KODE_TO_RKAT_MAP: Record<string, { rkat_no: string | null; jenis: string; isUpz: boolean }> = {
  '101.1': { rkat_no: '2', jenis: 'Zakat Maal Perorangan', isUpz: false },
  '101.2': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah Perorangan', isUpz: false },
  '101.3': { rkat_no: '16', jenis: 'CSR/PKBL', isUpz: false },
  '101.4': { rkat_no: '14', jenis: 'Qurban', isUpz: false },
  '101.5': { rkat_no: '15', jenis: 'Fidyah Perorangan', isUpz: false },
  '101.8': { rkat_no: '7', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat', isUpz: false },
  '101.9': { rkat_no: '10', jenis: 'Penerimaan Infak Sedekah Terikat Kas', isUpz: false },
  '101.10': { rkat_no: '11', jenis: 'Penerimaan Infak Sedekah Terikat Natura', isUpz: false },
  '101.11': { rkat_no: '13', jenis: 'Infak/Sedekah Terikat Operasional Amil', isUpz: false },
  '101.12': { rkat_no: '10', jenis: 'Infak dan Sedekah Terikat DSK Lainnya', isUpz: false },
  '101.13': { rkat_no: '1', jenis: 'Zakat Maal Entitas', isUpz: false },
  '101.14': { rkat_no: null, jenis: 'Belum Diketahui', isUpz: false },

  '102.1': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kota (UPZ Pengumpulan)', isUpz: true },
  '102.2': { rkat_no: '3', jenis: 'Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)', isUpz: true },
  '102.3': { rkat_no: '4', jenis: 'Zakat Maal UPZ Penyaluran', isUpz: true },
  '102.4': { rkat_no: '5', jenis: 'Penerimaan Zakat Fitrah via UPZ', isUpz: true },
  '102.5': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota', isUpz: true },
  '102.6': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan', isUpz: true },
  '102.7': { rkat_no: '8', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Pengumpulan', isUpz: true },
  '102.7.1': { rkat_no: '9', jenis: 'Penerimaan Infak/Sedekah Tidak Terikat via UPZ Penyaluran', isUpz: true },
  '102.8': { rkat_no: '14', jenis: 'Qurban Via UPZ', isUpz: true },
  '102.9': { rkat_no: '15', jenis: 'Fidyah Via UPZ', isUpz: true },
  '102.10': { rkat_no: '10', jenis: 'DSKL Lainnya Via UPZ', isUpz: true },
  '102.11': { rkat_no: '3', jenis: 'Zakat Maal UPZ Pengumpulan', isUpz: true }
};

// SummaryCard Component
function SummaryCard({ title, value, subtext, icon, colorClass }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 font-medium">{subtext}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", colorClass || "bg-slate-50 text-slate-500")}>
        {icon}
      </div>
    </div>
  );
}

export default function PenerimaanZis() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super_Admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [simbaFilter, setSimbaFilter] = useState('Semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const downloadPenerimaanTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "No": 44879,
        "Kode Program": "101.1",
        "Kode Akun": "41020201",
        "Sumber Dana": "BSI-BSM",
        "Tanggal Trx": "01/06/2026",
        "No Transaksi": "01/06/26/km/1/0000002",
        "Keterangan": "Terima Zakat Maal a.n Aulia Rahman",
        "Nominal": 335000,
        "Nama Muzakki": "Aulia Rahman",
        "Nama UPZ": "UPZ Kecamatan Genuk"
      },
      {
        "No": 44880,
        "Kode Program": "102.1",
        "Kode Akun": "41020201",
        "Sumber Dana": "BSI-BSM",
        "Tanggal Trx": "02/06/2026",
        "No Transaksi": "02/06/26/km/1/0000003",
        "Keterangan": "Terima Zakat Maal via UPZ Sekretariat DPRD",
        "Nominal": 5000000,
        "Nama Muzakki": "UPZ Sekretariat DPRD",
        "Nama UPZ": "UPZ Sekretariat DPRD"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Penerimaan");
    XLSX.writeFile(wb, "Template_Migrasi_Penerimaan_ZIS.xlsx");
  };

  const handlePenerimaanFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMigrating(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json(ws);

        if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
          alert('File Excel kosong atau tidak terbaca.');
          return;
        }

        const res = await axios.post('/api/penerimaan-zis/migrate', {
          transactions: rawRows,
          options: { skipJournal: true }
        });

        if (res.data?.status === 'success') {
          const s = res.data.summary || {};
          alert(`Migrasi Data Penerimaan ZIS Selesai!\nTotal Berhasil: ${s.successCount || 0}\nGagal: ${s.failedCount || 0}`);
        } else {
          alert('Migrasi selesai dengan beberapa perhatian.');
        }

        setIsMigrationModalOpen(false);
        fetchData();
      } catch (err: any) {
        console.error('Gagal migrasi Excel:', err);
        alert(err.response?.data?.error || 'Gagal memproses file Excel.');
      } finally {
        setMigrating(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'simba-queue'>('all');
  const [npwzModalOpen, setNpwzModalOpen] = useState(false);
  const [selectedMuzakkiForNpwz, setSelectedMuzakkiForNpwz] = useState<any>(null);
  const [newNpwzValue, setNewNpwzValue] = useState('');
  const [isSimbaPromptOpen, setIsSimbaPromptOpen] = useState(false);
  const [promptSimbaItem, setPromptSimbaItem] = useState<any>(null);
  const [promptSimbaValue, setPromptSimbaValue] = useState('');

  // States for Cetak Laporan Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [pdfReportDate, setPdfReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<any[]>([]);
  const [signatories, setSignatories] = useState({
    kabagKeuangan: '',
    kabidPengumpulan: '',
    stafPengumpulan: ''
  });
  
  const [selectedData, setSelectedData] = useState<any>(null);
  
  const [penerimaanData, setPenerimaanData] = useState<any[]>([]);
  const [muzakkiList, setMuzakkiList] = useState<any[]>([]);
  const [rkatList, setRkatList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{type: 'success'|'error'|'warning', text: string}[]>([]);

  // Pagination & Debounced Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paginationInfo, setPaginationInfo] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [summaryTotals, setSummaryTotals] = useState({ totalTransactions: 0, totalNominal: 0 });

  // Form State
  const [selectedMuzakkiId, setSelectedMuzakkiId] = useState('');
  const [selectedRkatId, setSelectedRkatId] = useState('');
  const [selectedCoaCode, setSelectedCoaCode] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [nominal, setNominal] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState('TRANSFER');
  const [tanggalPembayaran, setTanggalPembayaran] = useState(new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState('');
  const [noKuitansi, setNoKuitansi] = useState('');
  const [muzakkiSearch, setMuzakkiSearch] = useState('');
  const [showMuzakkiDropdown, setShowMuzakkiDropdown] = useState(false);
  const [isOutsideRkat, setIsOutsideRkat] = useState(false);
  const [coaSearch, setCoaSearch] = useState('');
  const [isCoaDropdownOpen, setIsCoaDropdownOpen] = useState(false);
  const [noTransaksiSimba, setNoTransaksiSimba] = useState('');
  const [selectedKodeProgram, setSelectedKodeProgram] = useState('');
  const [selectedUpzId, setSelectedUpzId] = useState('');
  const [upzList, setUpzList] = useState<any[]>([]);

  // Laporan Bulanan Rekap ZIS State
  const [bulananReportMonth, setBulananReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulananReportYear, setBulananReportYear] = useState<number>(new Date().getFullYear());
  const [isFetchingRekap, setIsFetchingRekap] = useState(false);
  const [rekapBulananCategories, setRekapBulananCategories] = useState<Record<string, any[]>>({});
  const [signatoriesBulanan, setSignatoriesBulanan] = useState({
    kepalaPelaksana: 'Muhammad Asyhar, S.Sos.I',
    kabagPengumpulan: 'Ahmad Muhtadin, S.HI',
    waka1: 'Drs. H. Labib, M.M'
  });
  const [selectedReportType, setSelectedReportType] = useState<'harian' | 'bulanan_upz' | 'excel'>('harian');

  // Quick register muzakki inside modal
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickNik, setQuickNik] = useState('');
  const [quickHandphone, setQuickHandphone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickKategori, setQuickKategori] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [quickJenisKelamin, setQuickJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [isFabOpen, setIsFabOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMetadata();

    const stored = localStorage.getItem('selected_muzakki_penerimaan');
    if (stored) {
      try {
        const muz = JSON.parse(stored);
        setSelectedMuzakkiId(muz.id);
        setMuzakkiSearch(muz.nama);
        setIsModalOpen(true);
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem('selected_muzakki_penerimaan');
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setMessages([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    if (isReportModalOpen) {
      axios.get('/api/users')
        .then(res => {
          const uList = res.data || [];
          setUsers(uList);
          
          const kkUser = uList.find((u: any) => u.role === 'Kabag_Keuangan') || uList.find((u: any) => u.role === 'Staf_Keuangan' || u.role === 'Kabag_Administrasi');
          const kpUser = uList.find((u: any) => u.role === 'Kabag_Pengumpulan');
          const spUser = uList.find((u: any) => u.role === 'Staf_Pengumpulan');
          
          setSignatories({
            kabagKeuangan: kkUser ? kkUser.name : '',
            kabidPengumpulan: kpUser ? kpUser.name : '',
            stafPengumpulan: spUser ? spUser.name : ''
          });
        })
        .catch(err => console.error('Error fetching users:', err));
    }
  }, [isReportModalOpen]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/penerimaan-zis', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch,
          startDate: reportStartDate || undefined,
          endDate: reportEndDate || undefined
        }
      });
      if (res.data?.status === 'success') {
        setPenerimaanData(res.data.data || []);
        if (res.data.pagination) setPaginationInfo(res.data.pagination);
        if (res.data.summary) setSummaryTotals(res.data.summary);
      }
    } catch (error) {
      console.error(error);
      setMessages([{ type: 'error', text: 'Gagal memuat data Penerimaan ZIS.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, debouncedSearch, reportStartDate, reportEndDate]);

  const fetchMetadata = async () => {
    try {
      const [resMuzakki, resRkat, resAccounts, resCoas, resUpz] = await Promise.all([
        axios.get('/api/muzakki'),
        axios.get('/api/rkat-pengumpulan'),
        axios.get('/api/finance/accounts'),
        axios.get('/api/finance/coa'),
        axios.get('/api/upz').catch(() => ({ data: [] }))
      ]);
      
      if (resMuzakki.data?.status === 'success') {
        setMuzakkiList(resMuzakki.data.data || []);
      } else {
        setMuzakkiList(Array.isArray(resMuzakki.data) ? resMuzakki.data : []);
      }

      const rkatData = resRkat.data?.status === 'success' ? resRkat.data.data : resRkat.data;
      setRkatList(Array.isArray(rkatData) ? rkatData : []);

      const accountsData = resAccounts.data?.status === 'success' ? resAccounts.data.data : resAccounts.data;
      setAccountsList(Array.isArray(accountsData) ? accountsData : []);

      const coaData = resCoas.data?.status === 'success' ? resCoas.data.data : resCoas.data;
      setCoaList(Array.isArray(coaData) ? coaData : []);

      const upzData = resUpz?.data?.status === 'success' ? resUpz.data.data : (resUpz?.data || []);
      setUpzList(Array.isArray(upzData) ? upzData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpzChange = (upzId: string) => {
    setSelectedUpzId(upzId);
    if (!upzId) return;

    const upzItem = upzList.find(u => u.id === upzId);
    if (!upzItem) return;

    const nama = upzItem.nama_upz.toUpperCase();
    let suggestedKode = '102.1';

    if (nama.includes('KECAMATAN')) {
      suggestedKode = '102.2';
    } else if (nama.includes('SD') || nama.includes('SMP') || nama.includes('SMA') || nama.includes('MI') || nama.includes('MTS') || nama.includes('MAN') || nama.includes('SEKOLAH')) {
      suggestedKode = '102.7';
    }

    setSelectedKodeProgram(suggestedKode);

    const mapInfo = PROGRAM_KODE_TO_RKAT_MAP[suggestedKode];
    if (mapInfo && mapInfo.rkat_no) {
      const matchedRkat = rkatList.find(r => r.no === mapInfo.rkat_no || r.id === mapInfo.rkat_no);
      if (matchedRkat) {
        handleRkatChange(matchedRkat.id);
      }
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

  const filteredData = useMemo(() => {
    return penerimaanData.filter(item => {
      // Explicitly exclude records with status FAILED or associated Gagal Potong keywords
      const isFailed = item.status_simba === 'FAILED';
      const nk = (item.no_kuitansi || '').toLowerCase();
      const k = (item.keterangan || '').toLowerCase();
      const isGagalPotong = 
        isFailed ||
        nk.includes('/ gagal /') || nk.includes('gagal potong') || nk.includes('gagal') ||
        k.includes('gagal potong') || k.includes('failed_deduction') || k.includes('failed');
      
      if (isGagalPotong) return false;

      const matchesSearch = 
        (item.no_kuitansi && item.no_kuitansi.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.muzakki?.nama && item.muzakki.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.muzakki?.npwz && item.muzakki.npwz.includes(searchTerm)) ||
        (item.rkat?.nama_program && item.rkat.nama_program.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'Semua' || item.rkat?.kategori === categoryFilter;
      const matchesSimba = activeTab === 'simba-queue' 
        ? item.status_simba === 'PENDING'
        : (simbaFilter === 'Semua' || item.status_simba === simbaFilter);

      return matchesSearch && matchesCategory && matchesSimba;
    });
  }, [penerimaanData, searchTerm, categoryFilter, simbaFilter, activeTab]);

  // Calculations for stats
  const stats = useMemo(() => {
    let total = summaryTotals.totalNominal || 0;
    let count = summaryTotals.totalTransactions || 0;
    let zakat = 0;
    let infak = 0;
    let dskl = 0;

    penerimaanData.forEach(item => {
      const nominalVal = Number(item.nominal || 0);
      if (item.rkat?.kategori === 'Zakat') zakat += nominalVal;
      else if (item.rkat?.kategori === 'Infak') infak += nominalVal;
      else dskl += nominalVal;
    });

    return { total, count, zakat, infak, dskl };
  }, [penerimaanData, summaryTotals]);

  const handleQuickRegisterMuzakki = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickNama || !quickAddress || !quickHandphone) {
      alert('Nama, Handphone/Telepon, dan Alamat wajib diisi');
      return;
    }

    try {
      const payload: any = {
        kategori: quickKategori,
        nama: quickNama,
        alamat: quickAddress,
        telepon: quickHandphone,
        status: 'Aktif'
      };

      if (quickKategori === 'Perorangan') {
        payload.nik = quickNik || `NIK-${Date.now()}`;
        payload.handphone = quickHandphone;
        payload.jenis_kelamin = quickJenisKelamin;
      } else {
        payload.cp_nama = quickNama;
        payload.cp_telepon = quickHandphone;
      }

      const res = await axios.post('/api/muzakki', payload);
      if (res.data.status === 'success') {
        const newMuzakki = res.data.data;
        setMuzakkiList(prev => [newMuzakki, ...prev]);
        setSelectedMuzakkiId(newMuzakki.id);
        setMuzakkiSearch(newMuzakki.nama);
        setShowQuickRegister(false);
        setQuickNama('');
        setQuickNik('');
        setQuickHandphone('');
        setQuickAddress('');
        setQuickJenisKelamin('Laki-laki');
        setMessages([{ type: 'success', text: `Muzakki ${newMuzakki.nama} berhasil diregistrasi secara instan!` }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Gagal meregistrasi Muzakki baru');
    }
  };

  const handleAddPenerimaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMuzakkiId) {
      alert('Mohon pilih Muzakki terlebih dahulu.');
      return;
    }
    const needsRkat = !isOutsideRkat;
    if (needsRkat && !selectedRkatId) {
      alert('Mohon pilih program RKAT Pengumpulan.');
      return;
    }
    if (!selectedCoaCode) {
      alert('Mohon pilih Program Kegiatan (COA) / Akun Buku Besar.');
      return;
    }
    if (!selectedAccountId) {
      alert('Mohon pilih Rekening Penerima.');
      return;
    }
    if (!nominal || Number(nominal) <= 0) {
      alert('Mohon isi nominal setoran dengan benar.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        no_kuitansi: noKuitansi,
        muzakki_id: selectedMuzakkiId,
        upz_id: selectedUpzId || null,
        rkat_id: needsRkat ? selectedRkatId : null,
        kode_program: selectedKodeProgram || null,
        jenis_program: selectedKodeProgram && PROGRAM_KODE_TO_RKAT_MAP[selectedKodeProgram] ? PROGRAM_KODE_TO_RKAT_MAP[selectedKodeProgram].jenis : null,
        bank_account_id: selectedAccountId,
        coa_code: selectedCoaCode,
        nominal: Number(nominal),
        metode_pembayaran: metodePembayaran,
        tanggal_pembayaran: tanggalPembayaran,
        no_transaksi_simba: noTransaksiSimba || null,
        keterangan
      };

      const res = editingId 
        ? await axios.put(`/api/penerimaan-zis/${editingId}`, payload)
        : await axios.post('/api/penerimaan-zis', payload);

      if (res.data?.status === 'success' || res.status === 200 || res.status === 201 || res.data?.success) {
        setIsModalOpen(false);
        resetForm();
        fetchData();
        setMessages([{ 
          type: 'success', 
          text: editingId 
            ? 'Transaksi Penerimaan ZIS berhasil diperbarui!' 
            : 'Transaksi Penerimaan ZIS berhasil dicatat & Jurnal Keuangan terbentuk otomatis!' 
        }]);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Gagal menyimpan transaksi.';
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setSelectedMuzakkiId(item.muzakki_id);
    setMuzakkiSearch(item.muzakki?.nama || '');
    setSelectedRkatId(item.rkat_id || '');
    setSelectedCoaCode(item.coa_code || '');
    setSelectedAccountId(item.bank_account_id);
    setNominal(String(item.nominal || ''));
    setMetodePembayaran(item.metode_pembayaran || 'TRANSFER');
    if (item.tanggal_pembayaran) {
      setTanggalPembayaran(new Date(item.tanggal_pembayaran).toISOString().split('T')[0]);
    }
    setKeterangan(item.keterangan || '');
    setNoKuitansi(item.no_kuitansi || '');
    setNoTransaksiSimba(item.no_transaksi_simba || '');
    setIsOutsideRkat(!item.rkat_id);
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenNpwzModal = (muzakki: any) => {
    setSelectedMuzakkiForNpwz(muzakki);
    setNewNpwzValue(muzakki?.npwz || '');
    setNpwzModalOpen(true);
  };

  const handleSaveNpwz = async () => {
    if (!newNpwzValue.trim()) {
      alert('NPWZ tidak boleh kosong.');
      return;
    }
    try {
      const res = await axios.put(`/api/muzakki/${selectedMuzakkiForNpwz.id}`, {
        npwz: newNpwzValue
      });
      if (res.data.status === 'success') {
        setMessages([{ type: 'success', text: `NPWZ Muzakki ${selectedMuzakkiForNpwz.nama} berhasil diregistrasi!` }]);
        setNpwzModalOpen(false);
        fetchData();
        fetchMetadata();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menyimpan NPWZ.');
    }
  };

  const handleSaveSimbaNo = async () => {
    if (!promptSimbaValue.trim()) {
      alert('No Transaksi SIMBA wajib diisi untuk metode pembayaran Kas Tunai!');
      return;
    }

    try {
      const res = await axios.patch(`/api/penerimaan-zis/${promptSimbaItem.id}/simba`, {
        status_simba: 'SYNCED',
        no_transaksi_simba: promptSimbaValue.trim()
      });
      if (res.data.status === 'success') {
        setPenerimaanData(prev => prev.map(p => p.id === promptSimbaItem.id ? res.data.data : p));
        setMessages([{ type: 'success', text: `Status SIMBA berhasil diperbarui ke SYNCED!` }]);
        setIsSimbaPromptOpen(false);
        setPromptSimbaItem(null);
        setPromptSimbaValue('');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal memperbarui status SIMBA.');
    }
  };

  const toggleSimbaStatus = async (item: any) => {
    const nextStatus = item.status_simba === 'PENDING' ? 'SYNCED' : 'PENDING';
    
    if (nextStatus === 'SYNCED' && item.metode_pembayaran === 'TUNAI') {
      setPromptSimbaItem(item);
      setPromptSimbaValue(item.no_transaksi_simba || '');
      setIsSimbaPromptOpen(true);
      return;
    }

    try {
      const res = await axios.patch(`/api/penerimaan-zis/${item.id}/simba`, {
        status_simba: nextStatus,
        no_transaksi_simba: item.no_transaksi_simba
      });
      if (res.data.status === 'success') {
        setPenerimaanData(prev => prev.map(p => p.id === item.id ? res.data.data : p));
        setMessages([{ type: 'success', text: `Status SIMBA berhasil diperbarui ke ${nextStatus}!` }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal memperbarui status SIMBA.');
    }
  };

  const handleDeletePenerimaan = async (item: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus transaksi ${item.no_kuitansi}? Tindakan ini akan mengembalikan saldo kas & menghapus jurnal realisasi.`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/penerimaan-zis/${item.id}`);
      if (res.data.status === 'success') {
        fetchData();
        setMessages([{ type: 'success', text: 'Transaksi berhasil dihapus & saldo dikoreksi.' }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Gagal menghapus transaksi.');
    }
  };

  const resetForm = () => {
    setSelectedMuzakkiId('');
    setSelectedRkatId('');
    setSelectedCoaCode('');
    setSelectedAccountId('');
    setNominal('');
    setMetodePembayaran('TRANSFER');
    setTanggalPembayaran(new Date().toISOString().split('T')[0]);
    setKeterangan('');
    setNoKuitansi('');
    setMuzakkiSearch('');
    setShowQuickRegister(false);
    setEditingId(null);
    setIsOutsideRkat(false);
    setCoaSearch('');
    setIsCoaDropdownOpen(false);
    setNoTransaksiSimba('');
  };

  // Filtered muzakki list for autocomplete dropdown
  const filteredMuzakkiForDropdown = useMemo(() => {
    const list = Array.isArray(muzakkiList) ? muzakkiList : [];
    const search = (muzakkiSearch || '').toLowerCase();
    if (!search) return list.slice(0, 10);
    return list.filter(m => {
      const nama = String(m?.nama || '').toLowerCase();
      const npwz = String(m?.npwz || '').toLowerCase();
      const nik = String(m?.nik || '').toLowerCase();
      return nama.includes(search) || npwz.includes(search) || nik.includes(search);
    }).slice(0, 10);
  }, [muzakkiList, muzakkiSearch]);

  const filteredCoasForSearch = useMemo(() => {
    const basePenerimaan = coaList.filter(c => c.klasifikasi === 'Penerimaan' || c.coa_code.startsWith('4'));
    if (!coaSearch) return basePenerimaan;
    const term = coaSearch.toLowerCase();
    return basePenerimaan.filter(coa => 
      coa.coa_code.toLowerCase().includes(term) || 
      coa.nama_akun.toLowerCase().includes(term)
    );
  }, [coaList, coaSearch]);

  const getIndonesianDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formatIndonesianDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getIndonesianMonthName = (monthIdx: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthIdx];
  };

  const getSignatureDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = getIndonesianMonthName(date.getMonth());
    const year = date.getFullYear();
    return `Semarang, ${day} ${month} ${year}`;
  };

  const classifyPenerimaan = (item: any) => {
    const coa = (item.coa_code || '').trim();
    const rkatName = (item.rkat?.nama_program || '').toLowerCase();
    const category = (item.rkat?.kategori || '').toLowerCase();
    
    if (category === 'zakat' || coa.startsWith('1.1') || rkatName.includes('zakat')) {
      return 'ZAKAT';
    } else if (category === 'infak' || category === 'sedekah' || coa.startsWith('1.2') || rkatName.includes('infak') || rkatName.includes('sedekah')) {
      return 'INFAK';
    } else {
      return 'DONASI';
    }
  };

  const handleExportExcel = () => {
    const start = new Date(reportStartDate);
    start.setHours(0,0,0,0);
    const end = new Date(reportEndDate);
    end.setHours(23,59,59,999);

    const dataFiltered = penerimaanData.filter(item => {
      const pDate = new Date(item.tanggal_pembayaran);
      const isFailed = item.status_simba === 'FAILED' || (item.keterangan || '').toLowerCase().includes('gagal potong');
      if (isFailed) return false;
      return pDate >= start && pDate <= end;
    });

    if (dataFiltered.length === 0) {
      alert('Tidak ada data penerimaan ZIS pada rentang tanggal tersebut.');
      return;
    }

    const reportData = dataFiltered.map(item => ({
      'Tanggal Transaksi': new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID'),
      'No Registrasi (NPWZ)': item.muzakki?.npwz || '-',
      'No Kuitansi / BSZ': item.no_kuitansi,
      'Nama Muzakki': item.muzakki?.nama || '-',
      'Jenis Dana': item.rkat?.kategori || '-',
      'Kegiatan (RKAT)': item.rkat?.nama_program || '-',
      'via (Kas & Bank)': item.bankAccount?.nama_akun || '-',
      'Program Kegiatan (COA)': item.rkat?.coa_codes || '-',
      'Nominal': Number(item.nominal || 0),
      'No Transaksi SIMBA': item.no_transaksi_simba || '-',
      'Status SIMBA': item.status_simba
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Penerimaan ZIS');
    XLSX.writeFile(workbook, `Laporan_Penerimaan_ZIS_${reportStartDate}_sd_${reportEndDate}.xlsx`);
  };

  const handleExportPDFDaily = () => {
    const targetDateStr = pdfReportDate;
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0,0,0,0);
    
    const dataFiltered = penerimaanData.filter(item => {
      const itemDate = new Date(item.tanggal_pembayaran);
      const sameDay = itemDate.getFullYear() === targetDate.getFullYear() &&
                      itemDate.getMonth() === targetDate.getMonth() &&
                      itemDate.getDate() === targetDate.getDate();
      const isTunai = item.metode_pembayaran === 'TUNAI';
      const isFailed = item.status_simba === 'FAILED' || (item.keterangan || '').toLowerCase().includes('gagal potong');
      return sameDay && isTunai && !isFailed;
    });

    if (dataFiltered.length === 0) {
      alert('Tidak ada transaksi Kas Tunai pada tanggal tersebut.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Laporan Kas Masuk', 105, 15, { align: 'center' });
    doc.text('Via Tunai', 105, 21, { align: 'center' });
    
    const dayName = getIndonesianDayName(targetDateStr);
    const formattedDate = formatIndonesianDate(targetDateStr);
    doc.text(`Hari ${dayName} Tanggal ${formattedDate}`, 105, 27, { align: 'center' });

    const tableBody: any[] = [];
    let totalZakat = 0;
    let totalInfak = 0;
    let totalDonasi = 0;

    dataFiltered.forEach((item, index) => {
      const nominal = Number(item.nominal || 0);
      const category = classifyPenerimaan(item);
      
      let zakatCol = 'Rp -';
      let infakCol = 'Rp -';
      let donasiCol = 'Rp -';

      if (category === 'ZAKAT') {
        zakatCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalZakat += nominal;
      } else if (category === 'INFAK') {
        infakCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalInfak += nominal;
      } else {
        donasiCol = `Rp ${nominal.toLocaleString('id-ID')}`;
        totalDonasi += nominal;
      }

      tableBody.push([
        String(index + 1),
        item.no_transaksi_simba || '-',
        item.keterangan || `Terima ZIS dari ${item.muzakki?.nama || '-'}`,
        zakatCol,
        infakCol,
        donasiCol
      ]);
    });

    const totalAll = totalZakat + totalInfak + totalDonasi;

    tableBody.push([
      { content: 'JUMLAH', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalZakat > 0 ? `Rp ${totalZakat.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalInfak > 0 ? `Rp ${totalInfak.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: totalDonasi > 0 ? `Rp ${totalDonasi.toLocaleString('id-ID')}` : 'Rp -', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } }
    ]);

    tableBody.push([
      { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: `Rp ${totalAll.toLocaleString('id-ID')}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          { content: 'No', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'No Transaksi', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Nama', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Jenis Penerimaan', colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }
        ],
        [
          { content: 'Zakat', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Infak', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } },
          { content: 'Donasi', styles: { halign: 'center', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }
        ]
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY + 65 > 297) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(getSignatureDateString(targetDateStr), 195, finalY + 12, { align: 'right' });

    doc.text('Penerima.', 15, finalY + 20);
    doc.text('Kabag Keuangan', 15, finalY + 25);

    doc.text('Kabid Pengumpulan', 105, finalY + 25, { align: 'center' });

    doc.text('Penyetor,', 195, finalY + 20, { align: 'right' });
    doc.text('Staff Bid. Pengumpulan', 195, finalY + 25, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(signatories.kabagKeuangan || '........................', 15, finalY + 55);
    doc.text(signatories.kabidPengumpulan || '........................', 105, finalY + 55, { align: 'center' });
    doc.text(signatories.stafPengumpulan || '........................', 195, finalY + 55, { align: 'right' });

    doc.save(`Laporan_Kas_Masuk_Tunai_${formattedDate.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Pengumpulan</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Penerimaan ZIS</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Penerimaan ZIS
        </h2>
        <p className="text-slate-500 font-medium">
          Mencatat dan mengelola penerimaan dana zakat, infak, sedekah, dan dana sosial keagamaan.
        </p>
      </motion.div>

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
              <div key={idx} className={cn(
                "p-4 rounded-xl flex items-start gap-3 border shadow-sm",
                msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                msg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              )}>
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <SummaryCard 
          title="Total Penerimaan ZIS" 
          value={`Rp ${stats.total.toLocaleString('id-ID')}`} 
          subtext="Akumulasi seluruh setoran"
          icon={<DollarSign className="size-5 text-primary" />}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard 
          title="Penerimaan Zakat" 
          value={`Rp ${stats.zakat.toLocaleString('id-ID')}`} 
          subtext="Dana Zakat Maal & Fitrah"
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard 
          title="Penerimaan Infak" 
          value={`Rp ${stats.infak.toLocaleString('id-ID')}`} 
          subtext="Sedekah & Infak Terikat/Bebas"
          icon={<Layers className="size-5 text-blue-600" />}
          colorClass="bg-blue-50 text-blue-600"
        />
      </motion.div>

      {/* Toolbar & Filter */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all active:scale-95",
              activeTab === 'all'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Semua Transaksi
          </button>
          <button
            onClick={() => setActiveTab('simba-queue')}
            className={cn(
              "px-6 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 active:scale-95",
              activeTab === 'simba-queue'
                ? "border-primary text-primary bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Antrean SIMBA
            {penerimaanData.filter(item => item.status_simba === 'PENDING').length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {penerimaanData.filter(item => item.status_simba === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari kuitansi, nama, NPWZ..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select 
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="Semua">Kategori: Semua</option>
              <option value="Zakat">Zakat</option>
              <option value="Infak">Infak</option>
              <option value="DSKL">DSKL</option>
              <option value="CSR">CSR</option>
            </select>

            {/* Simba Sync Filter */}
            <select 
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer"
              value={simbaFilter}
              onChange={(e) => setSimbaFilter(e.target.value)}
            >
              <option value="Semua">Status Simba: Semua</option>
              <option value="PENDING">PENDING (Belum Sync)</option>
              <option value="SYNCED">SYNCED (Sudah Sync)</option>
            </select>
          </div>

          <div className="hidden md:flex gap-2">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer className="size-4" />
              Cetak Laporan
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Plus className="size-4" />
              Input Penerimaan ZIS
            </button>
            <button 
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Upload className="size-4" />
              Migrasi Penerimaan
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center p-8 text-primary font-bold text-sm gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Memuat data Penerimaan...
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4">Tanggal Transaksi</th>
                  <th className="px-6 py-4">NPWZ</th>
                  <th className="px-6 py-4">Nama Muzakki</th>
                  <th className="px-6 py-4">Jenis Dana</th>
                  <th className="px-6 py-4">Kegiatan (RKAT)</th>
                  <th className="px-6 py-4">via (Kas & Bank)</th>
                  <th className="px-6 py-4">Program Kegiatan (COA)</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                  <th className="px-6 py-4 text-center">Simba Sync</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                      Belum ada data penerimaan ZIS yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {new Date(item.tanggal_pembayaran).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">
                        {item.muzakki?.npwz || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {item.muzakki?.nama || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                          item.rkat?.kategori === 'Zakat' ? 'bg-emerald-100 text-emerald-800' :
                          item.rkat?.kategori === 'Infak' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        )}>
                          {item.rkat?.kategori || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {item.rkat?.nama_program || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {item.bankAccount?.nama_akun || '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {item.rkat?.coa_codes ? item.rkat.coa_codes.split(',')[0].trim() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        Rp {Number(item.nominal || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {item.status_simba === 'SYNCED' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                SYNCED
                              </span>
                              {item.no_transaksi_simba && (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {item.no_transaksi_simba}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {(() => {
                                const hasNpwz = item.muzakki?.npwz && item.muzakki.npwz.trim().length > 0 && !item.muzakki.npwz.startsWith('PENDING') && !item.muzakki.npwz.startsWith('NIK-');
                                if (hasNpwz) {
                                  return (
                                    <button 
                                      onClick={() => toggleSimbaStatus(item)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Input Kas Masuk ke SIMBA"
                                    >
                                      <CheckCircle2 className="size-4" />
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button 
                                      onClick={() => handleOpenNpwzModal(item.muzakki)}
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-650 rounded-xl border border-amber-100 transition-all active:scale-95 flex items-center justify-center"
                                      title="Registrasi NPWZ SIMBA (Belum ada NPWZ)"
                                    >
                                      <UserPlus className="size-4" />
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-amber-600 rounded-xl transition-colors" title="Edit">
                            <Edit3 className="size-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedData(item); setIsDetailModalOpen(true); }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" title="Detail">
                            <Eye className="size-4" />
                          </button>
                          {isSuperAdmin && (
                            <button 
                              onClick={() => handleDeletePenerimaan(item)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors" title="Hapus">
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/40 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold">
              Menampilkan {paginationInfo.total === 0 ? 0 : (paginationInfo.page - 1) * paginationInfo.limit + 1} - {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)} dari {paginationInfo.total} transaksi
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value={25}>25 per halaman</option>
              <option value={50}>50 per halaman</option>
              <option value={100}>100 per halaman</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            
            <span className="px-3 py-1 font-bold text-slate-700">
              Halaman {currentPage} dari {paginationInfo.totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(paginationInfo.totalPages, prev + 1))}
              disabled={currentPage >= paginationInfo.totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-600 disabled:opacity-40"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Input Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">{editingId ? 'Edit Penerimaan ZIS' : 'Input Penerimaan ZIS'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddPenerimaan} className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                
                {/* Autocomplete Muzakki */}
                <div className="space-y-1 relative">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki *</label>
                    <button 
                      type="button" 
                      onClick={() => setShowQuickRegister(!showQuickRegister)}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="size-3" />
                      {showQuickRegister ? "Batal Register" : "+ Registrasi Cepat Muzakki"}
                    </button>
                  </div>

                  {showQuickRegister ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-1">
                      <p className="text-[9px] font-black text-primary uppercase tracking-widest">Registrasi Muzakki Instan</p>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Perorangan')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Perorangan' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Perorangan
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setQuickKategori('Lembaga')}
                          className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all", quickKategori === 'Lembaga' ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          Lembaga
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap / Lembaga *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickNama} 
                        onChange={(e) => setQuickNama(e.target.value)} 
                      />
                      {quickKategori === 'Perorangan' && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="NIK (KTP)" 
                            className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                            value={quickNik} 
                            onChange={(e) => setQuickNik(e.target.value)} 
                          />
                          <select
                            className="bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-slate-600"
                            value={quickJenisKelamin}
                            onChange={(e) => setQuickJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                          >
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                      )}
                      <input 
                        type="text" 
                        placeholder="No Handphone *" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickHandphone} 
                        onChange={(e) => setQuickHandphone(e.target.value)} 
                      />
                      <textarea 
                        placeholder="Alamat *" 
                        rows={2} 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none" 
                        value={quickAddress} 
                        onChange={(e) => setQuickAddress(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={handleQuickRegisterMuzakki} 
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Daftarkan & Pilih Muzakki
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        placeholder="Ketik nama, NIK, atau NPWZ Muzakki..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={muzakkiSearch}
                        onChange={(e) => {
                          setMuzakkiSearch(e.target.value);
                          setShowMuzakkiDropdown(true);
                        }}
                        onFocus={() => setShowMuzakkiDropdown(true)}
                      />
                      {showMuzakkiDropdown && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                          {filteredMuzakkiForDropdown.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic">Muzakki tidak ditemukan.</div>
                          ) : (
                            filteredMuzakkiForDropdown.map((muzakki) => (
                              <button
                                key={muzakki.id}
                                type="button"
                                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs"
                                onClick={() => {
                                  setSelectedMuzakkiId(muzakki.id);
                                  setMuzakkiSearch(muzakki.nama);
                                  setShowMuzakkiDropdown(false);
                                }}
                              >
                                <div>
                                  <p className="font-bold text-slate-800">{muzakki.nama}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">NPWZ: {muzakki.npwz || '-'}</p>
                                </div>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{muzakki.kategori}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                  {/* Checkbox Tidak Ada di RKAT */}
                  <div className="flex items-center gap-2 text-left mb-1">
                    <input 
                      type="checkbox" 
                      id="isOutsideRkat"
                      checked={isOutsideRkat}
                      onChange={(e) => {
                        setIsOutsideRkat(e.target.checked);
                        if (e.target.checked) {
                          setSelectedRkatId('');
                          setSelectedCoaCode('');
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="isOutsideRkat" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Tidak ada di RKAT (Penerimaan di luar RKAT)
                    </label>
                  </div>

                  {/* Select UPZ (Pilihan UPZ jika via UPZ) */}
                  <div className={`space-y-1 transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Pilih UPZ (Khusus Penerimaan via UPZ)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-800"
                      value={selectedUpzId}
                      onChange={(e) => handleUpzChange(e.target.value)}
                      disabled={isOutsideRkat}
                    >
                      <option value="">Pilih UPZ (Auto-Select Program &amp; RKAT)...</option>
                      {upzList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nama_upz} {u.kategori ? `(${u.kategori})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kode Program Pengumpulan (101.1 - 102.11) */}
                  <div className={`space-y-1 transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Kode Program Pengumpulan (Materi SIMBA / Laporan)
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-800"
                      value={selectedKodeProgram}
                      onChange={(e) => {
                        const code = e.target.value;
                        setSelectedKodeProgram(code);
                        if (code && PROGRAM_KODE_TO_RKAT_MAP[code]) {
                          const mapInfo = PROGRAM_KODE_TO_RKAT_MAP[code];
                          if (mapInfo.rkat_no) {
                            const matchedRkat = rkatList.find(r => 
                              r.no === mapInfo.rkat_no || 
                              r.id === mapInfo.rkat_no ||
                              r.nama_program.toLowerCase().includes(mapInfo.jenis.toLowerCase().split(' ')[0])
                            );
                            if (matchedRkat) {
                              handleRkatChange(matchedRkat.id);
                            }
                          }
                        }
                      }}
                      disabled={isOutsideRkat}
                    >
                      <option value="">Pilih Kode Program (Auto-select RKAT)...</option>
                      <optgroup label="101.x - Penghimpunan Dana Langsung">
                        <option value="101.1">101.1 || Zakat Maal Perorangan</option>
                        <option value="101.2">101.2 || Penerimaan Zakat Fitrah Perorangan</option>
                        <option value="101.3">101.3 || CSR/PKBL</option>
                        <option value="101.4">101.4 || Qurban</option>
                        <option value="101.5">101.5 || Fidyah Perorangan</option>
                        <option value="101.8">101.8 || Penerimaan Infak/Sedekah Tidak Terikat</option>
                        <option value="101.9">101.9 || Penerimaan Infak Sedekah Terikat Kas</option>
                        <option value="101.10">101.10 || Penerimaan Infak Sedekah Terikat Natura</option>
                        <option value="101.11">101.11 || Infak/Sedekah Terikat Operasional Amil</option>
                        <option value="101.12">101.12 || Infak dan Sedekah Terikat DSK Lainnya</option>
                        <option value="101.13">101.13 || Zakat Maal Entitas</option>
                        <option value="101.14">101.14 || Belum Diketahui</option>
                      </optgroup>
                      <optgroup label="102.x - Penghimpunan Dana via UPZ">
                        <option value="102.1">102.1 || Zakat Maal UPZ Kota (UPZ Pengumpulan)</option>
                        <option value="102.2">102.2 || Zakat Maal UPZ Kecamatan (UPZ Pengumpulan)</option>
                        <option value="102.3">102.3 || Zakat Maal UPZ Penyaluran</option>
                        <option value="102.4">102.4 || Penerimaan Zakat Fitrah via UPZ</option>
                        <option value="102.5">102.5 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kota</option>
                        <option value="102.6">102.6 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Kecamatan</option>
                        <option value="102.7">102.7 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Pengumpulan</option>
                        <option value="102.7.1">102.7.1 || Penerimaan Infak/Sedekah Tidak Terikat via UPZ Penyaluran</option>
                        <option value="102.8">102.8 || Qurban Via UPZ</option>
                        <option value="102.9">102.9 || Fidyah Via UPZ</option>
                        <option value="102.10">102.10 || DSKL Lainnya Via UPZ</option>
                        <option value="102.11">102.11 || Zakat Maal UPZ Pengumpulan</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* RKAT Program selection */}
                  <div className={`space-y-1 transition-all duration-300 ${isOutsideRkat ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT) *</label>
                    <select 
                      required={!isOutsideRkat} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 font-bold text-slate-800"
                      value={selectedRkatId}
                      onChange={(e) => handleRkatChange(e.target.value)}
                      disabled={isOutsideRkat}
                    >
                      <option value="">Pilih Kegiatan RKAT Pengumpulan...</option>
                      {rkatList.map(rkat => (
                        <option key={rkat.id} value={rkat.id}>
                          [{rkat.kategori}] {rkat.nama_program}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Program Kegiatan (COA) matching the selected Kegiatan (RKAT) */}
                  {!isOutsideRkat && selectedRkatId && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA) *</label>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-slate-700"
                        value={selectedCoaCode}
                        onChange={(e) => setSelectedCoaCode(e.target.value)}
                      >
                        {(() => {
                          const rkat = rkatList.find(r => r.id === selectedRkatId);
                          const codes = rkat?.coa_codes ? rkat.coa_codes.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
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

                  {/* 3. Akun Buku Besar (Penerimaan COA) - Outside RKAT search */}
                  {isOutsideRkat && (
                    <div className="space-y-1.5 text-left animate-fade-in">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Akun Buku Besar (Penerimaan COA) *
                      </label>
                      {selectedCoaCode ? (
                        <div className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-xl text-xs font-black">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="size-4 shrink-0" />
                            Terpilih: {selectedCoaCode} - {coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || 'Memuat...'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setSelectedCoaCode('');
                              setCoaSearch('');
                            }} 
                            className="hover:text-rose-600"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 size-3.5" />
                            <input 
                              type="text"
                              placeholder="Cari kode COA atau nama akun Penerimaan..."
                              value={coaSearch}
                              onChange={(e) => setCoaSearch(e.target.value)}
                              onFocus={() => setIsCoaDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setIsCoaDropdownOpen(false), 205)}
                              className="w-full text-xs font-semibold bg-slate-50 border-none rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>

                          {(isCoaDropdownOpen || coaSearch) && (
                            <div className="bg-white border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs font-bold shadow-inner text-left">
                              {filteredCoasForSearch.length === 0 ? (
                                <p className="p-2 text-[10px] text-slate-400 italic">COA tidak ditemukan</p>
                              ) : (
                                filteredCoasForSearch.map(coa => (
                                  <div 
                                    key={coa.coa_code}
                                    onClick={() => {
                                      setSelectedCoaCode(coa.coa_code);
                                      setCoaSearch('');
                                      setIsCoaDropdownOpen(false);
                                    }}
                                    className="p-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5 text-slate-700"
                                  >
                                    <span className="font-mono text-primary text-[11px]">{coa.coa_code}</span>
                                    <span className="text-slate-650 text-[10px]">{coa.nama_akun}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <input 
                        type="text" 
                        value={selectedCoaCode} 
                        required 
                        onChange={() => {}} 
                        className="sr-only h-0 w-0" 
                      />
                    </div>
                  )}

                 {/* Bank Account / Kas selection */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">via Kas & Bank *</label>
                   <select 
                     required 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                     value={selectedAccountId}
                     onChange={(e) => setSelectedAccountId(e.target.value)}
                   >
                      <option value="">Pilih Rekening Tujuan...</option>
                      {!accountsList.some(acc => acc.account_id === 'non_kas') && (
                        <option value="non_kas">Non Kas</option>
                      )}
                      {accountsList.map(acc => {
                        const isNonKas = acc.account_id === 'non_kas';
                        return (
                          <option key={acc.account_id} value={acc.account_id}>
                            {acc.nama_akun} {!isNonKas ? `(Saldo: Rp ${Number(acc.saldo).toLocaleString('id-ID')})` : ''}
                          </option>
                        );
                      })}
                    </select>
                 </div>

                 {/* Nominal */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal (Rp) *</label>
                   <input 
                     required 
                     type="number" 
                     placeholder="Nominal setoran..." 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     value={nominal}
                     onChange={(e) => setNominal(e.target.value)}
                   />
                 </div>

                {/* Metode & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran *</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                      value={metodePembayaran}
                      onChange={(e) => setMetodePembayaran(e.target.value)}
                    >
                      <option value="TRANSFER">Transfer Bank</option>
                      <option value="TUNAI">Kas Tunai</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Setor *</label>
                    <input 
                      required 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={tanggalPembayaran}
                      onChange={(e) => setTanggalPembayaran(e.target.value)}
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan / Memo</label>
                  <textarea 
                    rows={2} 
                    placeholder="Catatan transfer atau nomor referensi..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>

                {/* Preview Accounting Entries helper */}
                {nominal && Number(nominal) > 0 && selectedAccountId && (selectedRkatId || (isOutsideRkat && selectedCoaCode)) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block">Preview Entri Jurnal Akuntansi</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="font-bold text-emerald-600">DEBIT</span>
                        <p className="font-medium truncate">{accountsList.find(a => a.account_id === selectedAccountId)?.nama_akun || 'Rekening'}</p>
                        <p className="font-mono text-slate-400">Rp {Number(nominal).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">KREDIT</span>
                        <p className="font-medium truncate">
                          {isOutsideRkat 
                            ? `Penerimaan di luar RKAT (${coaList.find(c => c.coa_code === selectedCoaCode)?.nama_akun || selectedCoaCode || 'COA'})`
                            : `Pendapatan ${rkatList.find(r => r.id === selectedRkatId)?.nama_program || 'Program'}`
                          }
                        </p>
                        <p className="font-mono text-slate-400">Rp {Number(nominal).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Simpan Penerimaan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedData && (
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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Detail Penerimaan ZIS</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuitansi / BSZ</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">{selectedData.no_kuitansi}</p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                    selectedData.status_simba === 'SYNCED' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    SIMBA: {selectedData.status_simba}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muzakki</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.muzakki?.nama || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NPWZ</p>
                    <p className="text-sm font-bold font-mono text-slate-700">{selectedData.muzakki?.npwz || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Dana</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.rkat?.kategori || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Setor</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(selectedData.tanggal_pembayaran).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kegiatan (RKAT)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedData.rkat?.nama_program || '-'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Kegiatan (COA)</p>
                  <p className="text-sm font-bold text-slate-850">
                    {(() => {
                      const coa = coaList.find(c => c.coa_code === selectedData.coa_code);
                      return coa ? `${selectedData.coa_code} - ${coa.nama_akun}` : (selectedData.coa_code || '-');
                    })()}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Penerima (via)</p>
                  <p className="text-sm font-bold text-slate-800">{selectedData.bankAccount?.nama_akun || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal Setoran</p>
                    <p className="text-lg font-black text-slate-900">
                      Rp {Number(selectedData.nominal || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode</p>
                    <p className="text-sm font-bold text-slate-800">{selectedData.metode_pembayaran}</p>
                  </div>
                </div>

                <div className="space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memo / Keterangan</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedData.keterangan || 'Tidak ada catatan.'}</p>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex gap-3 shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registrasi NPWZ SIMBA Modal */}
      <AnimatePresence>
        {npwzModalOpen && selectedMuzakkiForNpwz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setNpwzModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">Registrasi NPWZ SIMBA</h3>
                <button onClick={() => setNpwzModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Muzakki</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedMuzakkiForNpwz.nama}</p>
                  <p className="text-slate-500 mt-1 font-medium">{selectedMuzakkiForNpwz.alamat}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor Pokok Wajib Zakat (NPWZ) *</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan NPWZ 15 digit..." 
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    value={newNpwzValue}
                    onChange={(e) => setNewNpwzValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setNpwzModalOpen(false)}
                  className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSaveNpwz}
                  className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Simpan &amp; Registrasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Input No Transaksi SIMBA Modal */}
      <AnimatePresence>
        {isSimbaPromptOpen && promptSimbaItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setIsSimbaPromptOpen(false);
                setPromptSimbaItem(null);
                setPromptSimbaValue('');
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
            >
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-900">Input No Transaksi SIMBA</h3>
                <button 
                  onClick={() => {
                    setIsSimbaPromptOpen(false);
                    setPromptSimbaItem(null);
                    setPromptSimbaValue('');
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Muzakki</p>
                  <p className="font-bold text-slate-800 text-sm">{promptSimbaItem.muzakki?.nama || '-'}</p>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mt-2">Nominal</p>
                  <p className="font-bold text-slate-800 text-sm">
                    Rp {Number(promptSimbaItem.nominal || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Transaksi SIMBA *</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan No Transaksi Kas Masuk SIMBA..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    value={promptSimbaValue}
                    onChange={(e) => setPromptSimbaValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-slate-100 flex flex-col-reverse md:flex-row gap-2.5 md:gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsSimbaPromptOpen(false);
                    setPromptSimbaItem(null);
                    setPromptSimbaValue('');
                  }}
                  className="hidden md:inline-flex justify-center items-center px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleSaveSimbaNo}
                  className="w-full md:flex-1 px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Simpan &amp; Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cetak Laporan Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsReportModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] z-10"
            >
              {/* Header */}
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Printer className="size-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Cetak Laporan ZIS</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Pilih format dan rentang data laporan yang ingin Anda unduh / cetak.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="size-4 text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 min-h-0">
                
                {/* Select Type Laporan Dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Laporan Yang Ingin Dicetak / Diunduh *</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                  >
                    <option value="harian">PDF Laporan Penerimaan ZIS Harian (Kas Tunai)</option>
                    <option value="bulanan_upz">PDF Laporan Rekapitulasi ZIS Bulanan Per UPZ (Format Resmi BAZNAS)</option>
                    <option value="excel">Export Data Penerimaan ZIS (Spreadsheet Excel .xlsx)</option>
                  </select>
                </div>

                {/* Option 1: PDF Laporan Harian */}
                {selectedReportType === 'harian' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">PDF Laporan Harian (Kas Tunai)</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cetak Laporan Kas Masuk khusus pembayaran Kas Tunai pada tanggal tertentu dalam format PDF BAZNAS.
                    </p>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Tanggal Laporan</label>
                      <input 
                        type="date"
                        value={pdfReportDate}
                        onChange={(e) => setPdfReportDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>

                    {/* Penandatangan (Signatories) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">
                        Penandatangan Laporan Harian
                      </h5>

                      {/* Kabag Keuangan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Kabag Keuangan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, kabagKeuangan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.kabagKeuangan) ? signatories.kabagKeuangan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Kabag_Keuangan' || u.role === 'Staf_Keuangan' || u.role === 'Kabag_Administrasi').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.kabagKeuangan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, kabagKeuangan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Kabid Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Kabid Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, kabidPengumpulan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.kabidPengumpulan) ? signatories.kabidPengumpulan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Kabag_Pengumpulan').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.kabidPengumpulan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, kabidPengumpulan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Staff Bid. Pengumpulan */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600">Staff Bid. Pengumpulan</label>
                        <div className="flex gap-2">
                          <select
                            className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            onChange={(e) => {
                              if (e.target.value) {
                                setSignatories(prev => ({ ...prev, stafPengumpulan: e.target.value }));
                              }
                            }}
                            value={users.some(u => u.name === signatories.stafPengumpulan) ? signatories.stafPengumpulan : ''}
                          >
                            <option value="">-- Pilih --</option>
                            {users.filter(u => u.role === 'Staf_Pengumpulan').map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={signatories.stafPengumpulan}
                            onChange={(e) => setSignatories(prev => ({ ...prev, stafPengumpulan: e.target.value }))}
                            placeholder="Nama..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                    </div>

                    <button
                      onClick={handleExportPDFDaily}
                      className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <FileText className="size-4" />
                      Cetak Laporan Harian PDF
                    </button>
                  </div>
                )}

                {/* Option 2: PDF Laporan Bulanan Rekapitulasi ZIS per UPZ */}
                {selectedReportType === 'bulanan_upz' && (
                  <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-teal-800">
                      <Printer className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Cetak Laporan Bulanan Rekapitulasi ZIS (Per UPZ)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cetak Rekapitulasi Penerimaan Zakat, Infak, Sedekah (ZIS) per UPZ sesuai format resmi BAZNAS Kota Semarang.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Bulan</label>
                        <select
                          value={bulananReportMonth}
                          onChange={(e) => setBulananReportMonth(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-700"
                        >
                          <option value={1}>Januari</option>
                          <option value={2}>Februari</option>
                          <option value={3}>Maret</option>
                          <option value={4}>April</option>
                          <option value={5}>Mei</option>
                          <option value={6}>Juni</option>
                          <option value={7}>Juli</option>
                          <option value={8}>Agustus</option>
                          <option value={9}>September</option>
                          <option value={10}>Oktober</option>
                          <option value={11}>November</option>
                          <option value={12}>Desember</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Tahun</label>
                        <input
                          type="number"
                          value={bulananReportYear}
                          onChange={(e) => setBulananReportYear(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-teal-100 space-y-2 text-xs">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        Penandatangan Laporan Bulanan
                      </h5>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Kepala Pelaksana</label>
                        <input
                          type="text"
                          value={signatoriesBulanan.kepalaPelaksana}
                          onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, kepalaPelaksana: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Kabag Pengumpulan</label>
                        <input
                          type="text"
                          value={signatoriesBulanan.kabagPengumpulan}
                          onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, kabagPengumpulan: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Waka I Bidang Pengumpulan</label>
                        <input
                          type="text"
                          value={signatoriesBulanan.waka1}
                          onChange={(e) => setSignatoriesBulanan(prev => ({ ...prev, waka1: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none font-bold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        setIsFetchingRekap(true);
                        try {
                          const res = await axios.get('/api/penerimaan-zis/rekap-bulanan', {
                            params: { month: bulananReportMonth, year: bulananReportYear }
                          });
                          setRekapBulananCategories(res.data?.categories || {});
                          setTimeout(() => {
                            window.print();
                            setIsFetchingRekap(false);
                            setIsReportModalOpen(false);
                          }, 250);
                        } catch (err) {
                          console.error('Gagal mengambil data rekap bulanan:', err);
                          alert('Gagal mengambil data Laporan Bulanan Rekap ZIS');
                          setIsFetchingRekap(false);
                        }
                      }}
                      disabled={isFetchingRekap}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isFetchingRekap ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Menyiapkan Laporan...
                        </>
                      ) : (
                        <>
                          <Printer className="size-4" />
                          Cetak Laporan Bulanan Rekap ZIS
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Option 3: Laporan Excel */}
                {selectedReportType === 'excel' && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <FileSpreadsheet className="size-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Download Laporan Penerimaan (Excel)</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Unduh rekapan penerimaan ZIS dalam format spreadsheet Excel.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dari Tanggal</label>
                        <input 
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sampai Tanggal</label>
                        <input 
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleExportExcel}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="size-4" />
                      Unduh Excel
                    </button>
                  </div>
                )}

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-3"
            >
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Printer className="size-4 text-slate-500" />
                Cetak Laporan
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Penerimaan
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Input Penerimaan ZIS
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className={cn("size-6 transition-transform duration-300", isFabOpen ? "rotate-45" : "rotate-0")} />
        </button>
      </div>

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsMigrationModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 font-sans">Migrasi Penerimaan ZIS</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900 font-sans">Impor Data via Excel</h4>
                  <p className="text-xs text-slate-500 font-sans leading-relaxed">
                    Gunakan file Excel (.xlsx) dengan kolom: <strong>no_kuitansi, muzakki_id, rkat_id, bank_account_id, coa_code, nominal, metode_pembayaran, tanggal_pembayaran, keterangan, no_transaksi_simba</strong>.
                  </p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadPenerimaanTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-primary font-sans">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium font-sans">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors font-sans">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium font-sans">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handlePenerimaanFileUpload} 
                      disabled={migrating}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Print Layout for Laporan Bulanan Rekapitulasi ZIS per UPZ */}
      <div className="hidden print:block w-full text-black font-sans text-xs p-2">
        <div className="text-center font-bold text-xs uppercase tracking-wide mb-3">
          <p className="text-sm font-black">REKAPITULASI PENERIMAAN ZAKAT, INFAK, SEDEKAH (ZIS)</p>
          <p className="text-xs font-black">BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</p>
          <p className="text-xs font-bold mt-0.5">
            PERIODE {['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'][bulananReportMonth - 1]} {bulananReportYear}
          </p>
        </div>

        <table className="w-full border-collapse text-left [table-layout:fixed] text-[9px]">
          <thead>
            <tr className="border border-black bg-slate-100 font-bold text-[9px]">
              <th className="w-8 border border-black p-1 text-center">NO</th>
              <th className="border border-black p-1">NAMA UPZ</th>
              <th className="w-24 border border-black p-1 text-right">ZAKAT</th>
              <th className="w-24 border border-black p-1 text-right">INFAK</th>
              <th className="w-28 border border-black p-1 text-right">JUMLAH ZIS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black border border-black">
            {Object.entries(rekapBulananCategories).map(([catName, items]: [string, any]) => {
              const catZakat = items.reduce((sum: number, it: any) => sum + Number(it.zakat || 0), 0);
              const catInfak = items.reduce((sum: number, it: any) => sum + Number(it.infak || 0), 0);
              const catTotal = catZakat + catInfak;

              return (
                <React.Fragment key={catName}>
                  <tr className="bg-slate-100 font-black border border-black">
                    <td colSpan={5} className="p-1 uppercase tracking-wide font-black">
                      {catName}
                    </td>
                  </tr>
                  {items.map((it: any, idx: number) => (
                    <tr key={it.id || idx} className="border-b border-slate-300">
                      <td className="p-1 text-center font-mono text-[8px]">{idx + 1}</td>
                      <td className="p-1 font-bold text-[8px]">{it.nama_upz}</td>
                      <td className="p-1 text-right font-mono text-[8px]">
                        {it.zakat > 0 ? `Rp ${Number(it.zakat).toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                      <td className="p-1 text-right font-mono text-[8px]">
                        {it.infak > 0 ? `Rp ${Number(it.infak).toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                      <td className="p-1 text-right font-mono font-bold text-[8px]">
                        {it.total > 0 ? `Rp ${Number(it.total).toLocaleString('id-ID')}` : 'Rp -'}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-black border border-black bg-slate-50">
                    <td colSpan={2} className="p-1 text-right font-black">JUMLAH</td>
                    <td className="p-1 text-right font-mono font-black">
                      {catZakat > 0 ? `Rp ${catZakat.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="p-1 text-right font-mono font-black">
                      {catInfak > 0 ? `Rp ${catInfak.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                    <td className="p-1 text-right font-mono font-black">
                      {catTotal > 0 ? `Rp ${catTotal.toLocaleString('id-ID')}` : 'Rp -'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Footer Tanda Tangan Resmi BAZNAS Kota Semarang */}
        <div className="mt-8 text-[9px] font-bold flex justify-between items-start">
          <div className="text-center w-1/3">
            <p>Kepala Pelaksana</p>
            <div className="h-14" />
            <p className="underline font-black">{signatoriesBulanan.kepalaPelaksana}</p>
          </div>

          <div className="text-center w-1/3">
            <p>Semarang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>Kepala Bagian Pengumpulan</p>
            <div className="h-14" />
            <p className="underline font-black">{signatoriesBulanan.kabagPengumpulan}</p>
          </div>
        </div>

        <div className="mt-4 text-center text-[9px] font-bold">
          <p>Mengetahui,</p>
          <p>Wakil Ketua I Bidang Pengumpulan</p>
          <div className="h-14" />
          <p className="underline font-black">{signatoriesBulanan.waka1}</p>
        </div>
      </div>
    </div>
  );
}
