import { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  History, 
  Settings2, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  XCircle, 
  X, 
  PlusCircle, 
  Eye, 
  MapPin, 
  User, 
  Info,
  Calendar,
  Upload,
  FileSpreadsheet,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { upzData as initialUpzData, skHistoryData as initialSkHistoryData } from '@/src/data/upzData';
import { UPZ, SKHistory } from '@/src/types/upz';
import { getNextRenewalSKNumber, getNextBaseSKNumber, isSKPembentukan, parseSKNumber } from '@/src/utils/skUtils';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';

export default function DatabaseUPZ() {
  const [data, setData] = useState<UPZ[]>(() => {
    const local = localStorage.getItem('baznas_upz_data');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    return initialUpzData;
  });

  useEffect(() => {
    localStorage.setItem('baznas_upz_data', JSON.stringify(data));
  }, [data]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [kecamatanFilter, setKecamatanFilter] = useState('Semua');
  const [selectedUPZ, setSelectedUPZ] = useState<UPZ | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Print Date Modal states
  const [isPrintDateModalOpen, setIsPrintDateModalOpen] = useState(false);
  const [printDateValue, setPrintDateValue] = useState('');
  const [printHistoryTarget, setPrintHistoryTarget] = useState<SKHistory | null>(null);
  const [printActionType, setPrintActionType] = useState<'print' | 'download' | null>(null);

  const openPrintDateModal = (history: SKHistory, action: 'print' | 'download') => {
    setPrintHistoryTarget(history);
    setPrintActionType(action);
    if (history.startDate) {
      setPrintDateValue(history.startDate);
    } else {
      setPrintDateValue(new Date().toISOString().split('T')[0]);
    }
    setIsPrintDateModalOpen(true);
  };

  const handleConfirmPrintDate = () => {
    if (!printHistoryTarget || !printActionType) return;
    setIsPrintDateModalOpen(false);
    if (printActionType === 'print') {
      handlePrintSK(printHistoryTarget, printDateValue);
    } else {
      handleDownloadSKDoc(printHistoryTarget, printDateValue);
    }
    setPrintHistoryTarget(null);
    setPrintActionType(null);
  };

  // History modal view: 'list' | 'perubahan' | 'pembaruan'
  const [historyView, setHistoryView] = useState<'list' | 'perubahan' | 'pembaruan'>('list');

  // SK History state with local storage persistence
  const [skHistory, setSkHistory] = useState<SKHistory[]>(() => {
    const local = localStorage.getItem('baznas_upz_sk_history');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    return initialSkHistoryData;
  });

  useEffect(() => {
    localStorage.setItem('baznas_upz_sk_history', JSON.stringify(skHistory));
  }, [skHistory]);

  // Pembaruan (SK renewal) form state (includes manually filled skNumber)
  const [renewalForm, setRenewalForm] = useState({ skNumber: '', startYear: '', endYear: '', pimpinanName: '', keterangan: '' });

  // Form States for Add/Edit
  const [formKecamatan, setFormKecamatan] = useState('');
  const [formKelurahan, setFormKelurahan] = useState('');
  const [formType, setFormType] = useState<'On-Balance' | 'Off-Balance'>('Off-Balance');
  const [formOnBalanceType, setFormOnBalanceType] = useState<'Pengumpulan' | 'Pembantuan Pendistribusian dan Pendayagunaan'>('Pengumpulan');
  const [formCategory, setFormCategory] = useState('Masjid & Mushola');
  const [formPengurus, setFormPengurus] = useState({
    penasehat: { nama: '', alamat: '' },
    ketua: { nama: '', alamat: '' },
    sekretaris: { nama: '', alamat: '' },
    bendahara: { nama: '', alamat: '' },
    anggota1: { nama: '', alamat: '' },
    anggota2: { nama: '', alamat: '' },
  });
  const [anggotaTambahan, setAnggotaTambahan] = useState<{ nama: string; alamat: string }[]>([]);

  const [formNamaUpz, setFormNamaUpz] = useState('');
  const [formAlamatLengkap, setFormAlamatLengkap] = useState('');
  const [formNoTelepon, setFormNoTelepon] = useState('');
  const [formNoSKPenetapan, setFormNoSKPenetapan] = useState('');
  const [formTahunMulai, setFormTahunMulai] = useState('');
  const [formTahunBerakhir, setFormTahunBerakhir] = useState('');

  // Resignation & Status states
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Tidak Aktif' | 'Mengundurkan Diri'>('Aktif');
  const [formResignationDate, setFormResignationDate] = useState('');
  const [formResignationReason, setFormResignationReason] = useState('');

  // Resignation confirmation modal states
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resignUPZ, setResignUPZ] = useState<UPZ | null>(null);
  const [resignDate, setResignDate] = useState('');
  const [resignReason, setResignReason] = useState('');

  const kelurahanOptions = useMemo(() => {
    const found = kecamatanKelurahanSemarang.find(k => k.kecamatan === formKecamatan);
    return found ? found.kelurahan : [];
  }, [formKecamatan]);

  const isFlexibleAnggota = formCategory === 'OPD' || formCategory === 'Pemerintah Kecamatan' || formCategory === 'Desa/Kelurahan';

  const updatePengurusField = (jabatan: keyof typeof formPengurus, field: 'nama' | 'alamat', value: string) => {
    setFormPengurus(prev => ({ ...prev, [jabatan]: { ...prev[jabatan], [field]: value } }));
  };

  const addAnggotaTambahan = () => {
    setAnggotaTambahan(prev => [...prev, { nama: '', alamat: '' }]);
  };

  const updateAnggotaTambahan = (index: number, field: 'nama' | 'alamat', value: string) => {
    setAnggotaTambahan(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeAnggotaTambahan = (index: number) => {
    setAnggotaTambahan(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormNamaUpz('');
    setFormAlamatLengkap('');
    setFormNoTelepon('');
    setFormNoSKPenetapan('');
    setFormTahunMulai('');
    setFormTahunBerakhir('');
    setFormKecamatan('');
    setFormKelurahan('');
    setFormType('Off-Balance');
    setFormOnBalanceType('Pengumpulan');
    setFormCategory('Masjid & Mushola');
    setFormStatus('Aktif');
    setFormResignationDate('');
    setFormResignationReason('');
    setFormPengurus({
      penasehat: { nama: '', alamat: '' },
      ketua: { nama: '', alamat: '' },
      sekretaris: { nama: '', alamat: '' },
      bendahara: { nama: '', alamat: '' },
      anggota1: { nama: '', alamat: '' },
      anggota2: { nama: '', alamat: '' },
    });
    setAnggotaTambahan([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (upz: UPZ) => {
    const getYearOnly = (dateStr: string) => {
      if (!dateStr) return '';
      if (dateStr.includes('-')) {
        return dateStr.split('-')[0];
      }
      return dateStr;
    };

    setSelectedUPZ(upz);
    setFormNamaUpz(upz.name);
    setFormAlamatLengkap(upz.metadata?.address || '');
    setFormNoTelepon(upz.metadata?.upzPhone || '');
    setFormNoSKPenetapan(upz.activeSKNumber || '');
    setFormTahunMulai(getYearOnly(upz.skStartYear || ''));
    setFormTahunBerakhir(getYearOnly(upz.skExpiryDate || ''));
    setFormStatus(upz.status || 'Aktif');
    setFormResignationDate(upz.resignationDate || '');
    setFormResignationReason(upz.resignationReason || '');

    setFormKecamatan(upz.kecamatan);
    setFormKelurahan(upz.kelurahan);
    setFormType(upz.type);
    setFormOnBalanceType(upz.metadata?.onBalanceType || 'Pengumpulan');
    setFormCategory(upz.category);
    const p = upz.metadata.pengurus;
    if (p) {
      setFormPengurus({
        penasehat: { nama: p.penasehat?.nama || '', alamat: p.penasehat?.alamat || '' },
        ketua: { nama: p.ketua?.nama || '', alamat: p.ketua?.alamat || '' },
        sekretaris: { nama: p.sekretaris?.nama || '', alamat: p.sekretaris?.alamat || '' },
        bendahara: { nama: p.bendahara?.nama || '', alamat: p.bendahara?.alamat || '' },
        anggota1: { nama: p.anggota1?.nama || '', alamat: p.anggota1?.alamat || '' },
        anggota2: { nama: p.anggota2?.nama || '', alamat: p.anggota2?.alamat || '' },
      });
      setAnggotaTambahan((p.anggotaTambahan || []).map(a => ({ nama: a.nama, alamat: a.alamat || '' })));
    }
    setIsEditModalOpen(true);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.kelurahan.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Semua' || item.category === categoryFilter;
      const matchesKecamatan = kecamatanFilter === 'Semua' || item.kecamatan === kecamatanFilter;
      return matchesSearch && matchesCategory && matchesKecamatan;
    });
  }, [data, searchTerm, categoryFilter, kecamatanFilter]);

  const stats = useMemo(() => {
    const onBalance = data.filter(d => d.type === 'On-Balance').length;
    const offBalance = data.filter(d => d.type === 'Off-Balance').length;
    
    return {
      total: data.length,
      onBalance,
      offBalance,
    };
  }, [data]);

  const handleHistoryClick = (upz: UPZ) => {
    setSelectedUPZ(upz);
    setHistoryView('list');
    
    const nextRenewalSK = getNextRenewalSKNumber(upz.activeSKNumber);
    // Load current data into forms with pre-filled renewal SK
    setRenewalForm({ 
      skNumber: nextRenewalSK,
      startYear: upz.skExpiryDate ? (new Date(upz.skExpiryDate).getFullYear()).toString() : '', 
      endYear: upz.skExpiryDate ? (new Date(upz.skExpiryDate).getFullYear() + 5).toString() : '', 
      pimpinanName: upz.metadata.pimpinanName || '', 
      keterangan: '' 
    });

    // Load current pengurus structure
    const p = upz.metadata.pengurus;
    if (p) {
      setFormPengurus({
        penasehat: { nama: p.penasehat?.nama || '', alamat: p.penasehat?.alamat || '' },
        ketua: { nama: p.ketua?.nama || '', alamat: p.ketua?.alamat || '' },
        sekretaris: { nama: p.sekretaris?.nama || '', alamat: p.sekretaris?.alamat || '' },
        bendahara: { nama: p.bendahara?.nama || '', alamat: p.bendahara?.alamat || '' },
        anggota1: { nama: p.anggota1?.nama || '', alamat: p.anggota1?.alamat || '' },
        anggota2: { nama: p.anggota2?.nama || '', alamat: p.anggota2?.alamat || '' },
      });
      setAnggotaTambahan((p.anggotaTambahan || []).map(a => ({ nama: a.nama, alamat: a.alamat || '' })));
    }

    setIsHistoryModalOpen(true);
  };

  const handleTriggerResignation = (upz: UPZ) => {
    setResignUPZ(upz);
    setResignDate(new Date().toISOString().split('T')[0]);
    setResignReason('');
    setIsResignModalOpen(true);
  };

  const handleConfirmResignation = () => {
    if (!resignUPZ) return;
    setData(prev => prev.map(u => u.id === resignUPZ.id ? {
      ...u,
      status: 'Mengundurkan Diri',
      resignationDate: resignDate,
      resignationReason: resignReason
    } : u));
    setSelectedUPZ(prev => prev && prev.id === resignUPZ.id ? {
      ...prev,
      status: 'Mengundurkan Diri',
      resignationDate: resignDate,
      resignationReason: resignReason
    } : prev);
    setIsResignModalOpen(false);
    setResignUPZ(null);
  };

  const handleReactivateUPZ = (upz: UPZ) => {
    if (window.confirm(`Apakah Anda yakin ingin mengaktifkan kembali UPZ "${upz.name}"?`)) {
      setData(prev => prev.map(u => u.id === upz.id ? {
        ...u,
        status: 'Aktif',
        resignationDate: undefined,
        resignationReason: undefined
      } : u));
      setSelectedUPZ(prev => prev && prev.id === upz.id ? {
        ...prev,
        status: 'Aktif',
        resignationDate: undefined,
        resignationReason: undefined
      } : prev);
    }
  };

  const getHistoryForUPZ = (upzId: string) => {
    return skHistory
      .filter((h: SKHistory) => h.upzId === upzId)
      .sort((a, b) => a.skNumber.localeCompare(b.skNumber, undefined, { numeric: true }));
  };

  // Computed: next SK number for selected UPZ (re-evaluated reactively)
  const nextRenewalSK = selectedUPZ ? getNextRenewalSKNumber(selectedUPZ.activeSKNumber) : '';
  // Computed: next base SK number for new UPZ registration
  const nextBaseSK = getNextBaseSKNumber(skHistory);

  const handleRenewalSK = () => {
    if (!selectedUPZ || !renewalForm.skNumber || !renewalForm.startYear || !renewalForm.endYear || !formPengurus.penasehat.nama) {
      alert('Harap isi minimal Nomor SK, Tahun, dan Nama Penasehat/Ketua.');
      return;
    }
    const newEntry: SKHistory = {
      id: `sk-${Date.now()}`,
      upzId: selectedUPZ.id,
      skNumber: renewalForm.skNumber,
      startDate: `${renewalForm.startYear}-01-01`,
      endDate: `${renewalForm.endYear}-12-31`,
      pimpinanName: formPengurus.penasehat.nama,
      status: 'Aktif',
      skType: 'Pembaruan'
    };
    
    setSkHistory(prev => [
      ...prev.map(h => h.upzId === selectedUPZ.id && h.status === 'Aktif' ? { ...h, status: 'Tidak Aktif' as const } : h),
      newEntry,
    ]);

    setData(prev => prev.map(u => u.id === selectedUPZ.id ? { 
      ...u, 
      activeSKNumber: renewalForm.skNumber,
      skExpiryDate: `${renewalForm.endYear}-12-31`,
      metadata: { 
        ...u.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        }
      } 
    } : u));
    
    setSelectedUPZ(prev => prev ? { 
      ...prev, 
      activeSKNumber: renewalForm.skNumber,
      skExpiryDate: `${renewalForm.endYear}-12-31`,
      metadata: { 
        ...prev.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        }
      }
    } : prev);

    setRenewalForm({ skNumber: '', startYear: '', endYear: '', pimpinanName: '', keterangan: '' });
    setHistoryView('list');
    alert(`✅ SK Pembaruan ${renewalForm.skNumber} berhasil disimpan dengan struktur pengurus baru!`);
  };

  const handlePerubahanSK = () => {
    if (!selectedUPZ || !formPengurus.penasehat.nama) {
      alert('Harap isi minimal Nama Penasehat/Ketua.');
      return;
    }

    // Get current SK dates and number to keep them same
    const currentSK = skHistory.find(h => h.upzId === selectedUPZ.id && h.status === 'Aktif');
    const sameSKNumber = selectedUPZ.activeSKNumber;
    
    const newEntry: SKHistory = {
      id: `sk-${Date.now()}`,
      upzId: selectedUPZ.id,
      skNumber: sameSKNumber,
      startDate: currentSK?.startDate || '',
      endDate: currentSK?.endDate || '',
      pimpinanName: formPengurus.penasehat.nama,
      status: 'Aktif',
      skType: 'Perubahan'
    };

    setSkHistory(prev => [
      ...prev.map(h => h.upzId === selectedUPZ.id && h.status === 'Aktif' ? { ...h, status: 'Tidak Aktif' as const } : h),
      newEntry,
    ]);

    setData(prev => prev.map(u => u.id === selectedUPZ.id ? { 
      ...u, 
      metadata: { 
        ...u.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        }
      } 
    } : u));

    setSelectedUPZ(prev => prev ? { 
      ...prev, 
      metadata: { 
        ...prev.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        }
      }
    } : prev);

    setHistoryView('list');
    alert(`✅ Perubahan pengurus berhasil disimpan. No. SK tetap ${sameSKNumber}. Masa berlaku tetap.`);
  };

  const generateSKHtml = (upz: UPZ, history: SKHistory, customTglDitetapkan?: string) => {
    const isPembentukan = history.skType === 'Baru' || isSKPembentukan(history.skNumber);
    
    let tipePerubahan = "";
    let aksiBentukAtauUsul = "membentuk";
    
    if (!isPembentukan) {
      const { version } = parseSKNumber(history.skNumber);
      const numbersInWords = ["PERTAMA", "KEDUA", "KETIGA", "KEEMPAT", "KELIMA", "KEENAM"];
      const versionWord = version > 0 && version <= numbersInWords.length ? numbersInWords[version - 1] : `KE-${version}`;
      tipePerubahan = `PERUBAHAN ${versionWord}`;
      aksiBentukAtauUsul = `mengusulkan Perubahan ${versionWord.charAt(0) + versionWord.slice(1).toLowerCase()}`;
    }
    
    const startDate = history.startDate ? new Date(history.startDate) : new Date();
    const endDate = history.endDate ? new Date(history.endDate) : new Date(startDate.getFullYear() + 5, 11, 31);
    const periodeTahun = `${startDate.getFullYear()} - ${endDate.getFullYear()}`;
    
    const formatIndoDate = (date: Date) => {
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    const tglSuratMasuk = formatIndoDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    
    let chosenDate = startDate;
    let tglDitetapkan = formatIndoDate(startDate);
    if (customTglDitetapkan) {
      const parts = customTglDitetapkan.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        chosenDate = new Date(year, month, day);
        tglDitetapkan = formatIndoDate(chosenDate);
      }
    }

    const getRomanMonth = (monthNum: number): string => {
      const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      return roman[monthNum - 1] || "V";
    };
    
     const p = upz.metadata.pengurus;
    const pengurusList: { nama: string; alamat: string; jabatan: string }[] = [];
    if (p?.penasehat?.nama) pengurusList.push({ nama: p.penasehat.nama, alamat: p.penasehat.alamat || '', jabatan: 'Penasehat' });
    if (p?.ketua?.nama) pengurusList.push({ nama: p.ketua.nama, alamat: p.ketua.alamat || '', jabatan: 'Ketua' });
    if (p?.sekretaris?.nama) pengurusList.push({ nama: p.sekretaris.nama, alamat: p.sekretaris.alamat || '', jabatan: 'Sekretaris' });
    if (p?.bendahara?.nama) pengurusList.push({ nama: p.bendahara.nama, alamat: p.bendahara.alamat || '', jabatan: 'Bendahara' });
    if (p?.anggota1?.nama) pengurusList.push({ nama: p.anggota1.nama, alamat: p.anggota1.alamat || '', jabatan: 'Anggota' });
    if (p?.anggota2?.nama) pengurusList.push({ nama: p.anggota2.nama, alamat: p.anggota2.alamat || '', jabatan: 'Anggota' });
    if (p?.anggotaTambahan && Array.isArray(p.anggotaTambahan)) {
      p.anggotaTambahan.forEach(a => {
        if (a.nama) {
          pengurusList.push({ nama: a.nama, alamat: a.alamat || '', jabatan: 'Anggota' });
        }
      });
    }
       return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Template SK BAZNAS</title>
    <style>
        @page {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.6in;
            margin-right: 0.6in;
        }
        @page Section1 {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.6in;
            margin-right: 0.6in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-paper-source: 0;
        }
        div.Section1 {
            page: Section1;
        }
        body, p, ol, ul, li, table, tr, td, th, div, span {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            mso-margin-top-alt: 0pt;
            mso-margin-bottom-alt: 0pt;
            mso-padding-top-alt: 0pt;
            mso-padding-bottom-alt: 0pt;
            line-height: 1.0;
            mso-line-height-rule: exactly;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #000;
            background-color: #fff;
        }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        
        /* Layout untuk bagian Menimbang, Mengingat, Menetapkan */
        .layout-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            vertical-align: top;
        }
        .layout-table td {
            padding: 1px 0;
            vertical-align: top;
        }
        .col-title { width: 110px; font-weight: bold; }
        .col-colon { width: 15px; text-align: center; font-weight: bold; }
        .col-content { width: calc(100% - 125px); text-align: justify; }

        /* Tabel Susunan Pengurus */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        .data-table th, .data-table td {
            border: 1px solid black;
            padding: 3px 5px;
            text-align: left;
            font-size: 10pt;
            line-height: 1.0;
        }
        .data-table th { text-align: center; font-weight: bold; }

        ol, ul {
            padding-left: 15px;
        }
        li {
            line-height: 1.0;
            text-align: justify;
        }

        .tembusan, .tembusan * {
            line-height: 1.0 !important;
        }
    </style>
</head>
<body>
<div class="Section1">

    <div style="border-top: 2px solid #000; margin-bottom: 12px; width: 100%;"></div>

    <div class="text-center uppercase" style="line-height: 1.0; margin-bottom: 12px;">
        <span class="bold">KEPUTUSAN</span><br>
        <span class="bold">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>
        NOMOR ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>

        <div style="margin: 6px 0;">TENTANG</div>

        PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT ${upz.name.toUpperCase()}<br>
        KELURAHAN ${upz.kelurahan.toUpperCase()} KECAMATAN ${upz.kecamatan.toUpperCase()} KOTA SEMARANG<br>
        MASA BHAKTI ${periodeTahun}<br>

        <div style="margin: 6px 0;">DENGAN RAHMAT TUHAN YANG MAHA ESA</div>
        <span class="bold">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span>
    </div>

    <table class="layout-table">
        <tr>
            <td class="col-title">Menimbang</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 0px;">Bahwa untuk meningkatkan dayaguna dan hasil guna serta akuntabilitas dalam pengelolaan zakat, infak, sedekah dan dana sosial keagamaan lainnya (DSKL), maka dipandang perlu untuk ${aksiBentukAtauUsul} Unit Pengumpul Zakat (UPZ) Masjid se-Kota Semarang;</li>
                    <li style="margin-bottom: 0px;">Surat dari ${upz.name} tanggal ${tglSuratMasuk} tentang permohonan pembentukan pengurus UPZ ${upz.name} BAZNAS Kota Semarang Masa Bhakti ${periodeTahun};</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">Mengingat</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 0px;">Undang-Undang RI Nomor 23 Tahun 2011 tentang Pengelolaan Zakat;</li>
                    <li style="margin-bottom: 0px;">Peraturan Pemerintah Nomor 14 Tahun 2014 tentang Pelaksanaan Undang-Undang Nomor 23 Tahun 2011 tentang Pengelolaan Zakat;</li>
                    <li style="margin-bottom: 0px;">Peraturan BAZNAS Nomor 2 Tahun 2016 tentang Pembentukan dan Tata Kerja Unit Pengumpul Zakat;</li>
                    <li style="margin-bottom: 0px;">Surat Keputusan Walikota Semarang Nomor 450/662 Tahun 2022 tentang Pengangkatan Pimpinan Badan Amil Zakat Nasional (BAZNAS) Kota Semarang Periode 2022-2027.</li>
                </ol>
            </td>
        </tr>
    </table>

    <div class="text-center bold" style="margin-top: 10px; margin-bottom: 10px; font-size: 10pt;">MEMUTUSKAN</div>

    <table class="layout-table">
        <tr>
            <td class="col-title">Menetapkan</td>
            <td class="col-colon">:</td>
            <td class="col-content uppercase">
                KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG TENTANG PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ) ${upz.name.toUpperCase()} MASA BHAKTI ${periodeTahun}.
            </td>
        </tr>
        <tr>
            <td class="col-title">PERTAMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Mengangkat ${tipePerubahan ? tipePerubahan + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upz.name} Masa Bhakti ${periodeTahun} dengan susunan pengurus sebagai berikut:
                
                <table class="data-table">
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 30%;">NAMA</th>
                        <th style="width: 45%;">ALAMAT</th>
                        <th style="width: 20%;">JABATAN</th>
                    </tr>
                    ${pengurusList.map((item, idx) => `
                    <tr>
                        <td class="text-center">${idx + 1}</td>
                        <td>${item.nama}</td>
                        <td>${item.alamat}</td>
                        <td>${item.jabatan}</td>
                    </tr>
                    `).join('')}
                </table>
            </td>
        </tr>
        <tr>
            <td class="col-title">KEDUA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengurus sebagaimana dimaksud pada DIKTUM PERTAMA memiliki tugas dan kewajiban sebagai berikut:
                <ol style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 0px;">Mengumpulkan dan mendistribusikan dana zakat, infak, sedekah dan dana sosial keagamaan lainnya (DSKL) secara mandiri di lingkungan masjid;</li>
                    <li style="margin-bottom: 0px;">Memberikan penyuluhan tentang zakat, infak, sedekah and DSKL kepada masyarakat di wilayah lingkungan masjid;</li>
                    <li style="margin-bottom: 0px;">Memberikan pelaporan hasil pengumpulan, pendistribusian dan pendayagunaan dana zakat, infak, sedekah dan DSKL kepada BAZNAS Kota Semarang;</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">KETIGA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Surat Keputusan ini mulai berlaku sejak tanggal ini ditetapkan dan akan ditinjau kembali jika ada kekeliruan didalamnya;
            </td>
        </tr>
    </table>

    <div style="clear: both; margin-top: 20px; width: 100%; page-break-inside: avoid;">
        <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
            <tr>
                <td style="width: 90px; border: none; padding: 1px 0; font-size: 10pt; font-family: Arial, sans-serif;">Ditetapkan di</td>
                <td style="width: 10px; border: none; padding: 1px 0; text-align: center; font-size: 10pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 1px 0; font-size: 10pt; font-family: Arial, sans-serif;">Semarang</td>
            </tr>
            <tr>
                <td style="border: none; padding: 1px 0; font-size: 10pt; font-family: Arial, sans-serif;">Pada tanggal</td>
                <td style="border: none; padding: 1px 0; text-align: center; font-size: 10pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 1px 0; font-size: 10pt; font-family: Arial, sans-serif;">${tglDitetapkan}</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 10pt; font-family: Arial, sans-serif; padding-top: 8px; padding-bottom: 50px;">K E T U A,</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 10pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
            </tr>
        </table>
        <div style="clear: both;"></div>
    </div>

    <div class="tembusan" style="margin-top: 15px; font-size: 6.5pt; line-height: 1.0; font-family: Arial, sans-serif; color: #000; page-break-inside: avoid; text-align: left;">
        <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Tembusan ini disampaikan kepada Yth.:</div>
        <ol style="margin: 0; padding-left: 12px; list-style-type: decimal;">
            <li style="margin-bottom: 1px;">Walikota Semarang (sebagai laporan);</li>
            <li style="margin-bottom: 1px;">Ketua BAZNAS Provinsi Jawa Tengah (sebagai laporan);</li>
            <li style="margin-bottom: 1px;">Kepala Kementerian Agama Kota Semarang;</li>
            <li style="margin-bottom: 1px;">Ketua Dewan Masjid Indonesia (DMI) Kota Semarang;</li>
            <li style="margin-bottom: 1px;">Camat ${upz.kecamatan};</li>
            <li style="margin-bottom: 1px;">Lurah ${upz.kelurahan}.</li>
        </ol>
    </div>

</div>
</body>
</html>`;
  };

  const handlePrintSK = (history: SKHistory, customTglDitetapkan?: string) => {
    if (!selectedUPZ) return;
    const htmlContent = generateSKHtml(selectedUPZ, history, customTglDitetapkan);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleDownloadSKDoc = (history: SKHistory, customTglDitetapkan?: string) => {
    if (!selectedUPZ) return;
    const htmlContent = generateSKHtml(selectedUPZ, history, customTglDitetapkan);
    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SK_UPZ_${selectedUPZ.name.replace(/\s+/g, '_')}_${history.skNumber.replace(/[\/\\:*?"<>|]/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Master Data</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Database UPZ</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Database & Legalitas UPZ</h2>
            <p className="text-slate-500 font-medium">Manajemen data Unit Pengumpul Zakat (UPZ) On-Balance & Off-Balance.</p>
          </div>
        </div>
      </motion.div>

      {/* Info Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ Terdaftar</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Keseluruhan UPZ BAZNAS</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ On-Balance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.onBalance}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Setoran Tunai BAZNAS</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-emerald-500/5 rounded-full group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total UPZ Off-Balance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.offBalance}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Pengelolaan Mandiri</p>
          </div>
        </div>
      </motion.div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-primary/10 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari Nama UPZ / Kelurahan..."
              className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer font-medium text-slate-600"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Instansi Vertikal">Instansi Vertikal</option>
            <option value="OPD">OPD</option>
            <option value="BUMD">BUMD</option>
            <option value="Perusahaan Swasta">Perusahaan Swasta</option>
            <option value="Masjid & Mushola">Masjid & Mushola</option>
            <option value="Pemerintah Kecamatan">Pemerintah Kecamatan</option>
            <option value="KUA">KUA</option>
            <option value="Desa/Kelurahan">Desa/Kelurahan</option>
            <option value="Univ/PT/Pendidikan Menengah">Univ/PT/Pendidikan Menengah</option>
            <option value="Pendidikan Dasar">Pendidikan Dasar</option>
            <option value="Organisasi Profesi">Organisasi Profesi</option>
            <option value="Yayasan">Yayasan</option>
          </select>
          <select 
            className="text-sm bg-slate-50 border-slate-200 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary outline-none cursor-pointer font-medium text-slate-600"
            value={kecamatanFilter}
            onChange={(e) => setKecamatanFilter(e.target.value)}
          >
            <option value="Semua">Semua Kecamatan</option>
            {kecamatanKelurahanSemarang.map(k => (
              <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsMigrationModalOpen(true)}
            className="flex-1 lg:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload className="size-4" />
            Migrasi Data
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="size-4" />
            Registrasi UPZ Baru
          </button>
        </div>
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">Kode Sistem</th>
                <th className="px-6 py-4">Nama UPZ</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Wilayah (Kec/Kel)</th>
                <th className="px-6 py-4 text-center">SK Aktif</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{item.metadata.pimpinanTitle}: {item.metadata.pimpinanName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded uppercase inline-block",
                      item.type === 'On-Balance' 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-emerald-100 text-emerald-700"
                    )}>
                      {item.category} ({item.type === 'On-Balance' ? 'On' : 'Off'})
                    </span>
                    {item.type === 'On-Balance' && item.metadata.onBalanceType && (
                      <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                        {item.metadata.onBalanceType}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-600">{item.kecamatan}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.kelurahan}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(() => {
                      const expiryYearStr = item.skExpiryDate ? (item.skExpiryDate.includes('-') ? item.skExpiryDate.split('-')[0] : item.skExpiryDate) : '';
                      const expiryYear = parseInt(expiryYearStr, 10);
                      const currentYear = new Date().getFullYear();
                      const isSKExpired = isNaN(expiryYear) || currentYear > expiryYear;
                      const upzStatus = item.status || 'Aktif';
                      const isSKActive = upzStatus === 'Aktif' && !isSKExpired;

                      return (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-bold",
                              isSKActive ? "text-emerald-600 font-extrabold" : "text-slate-400 font-medium"
                            )}>
                              {item.activeSKNumber}
                            </span>
                            {isSKActive ? (
                              <CheckCircle2 className="size-4 text-emerald-500" />
                            ) : (
                              <XCircle className="size-4 text-rose-500" />
                            )}
                          </div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Exp: {expiryYearStr || '-'}</p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(() => {
                      const expiryYearStr = item.skExpiryDate ? (item.skExpiryDate.includes('-') ? item.skExpiryDate.split('-')[0] : item.skExpiryDate) : '';
                      const expiryYear = parseInt(expiryYearStr, 10);
                      const currentYear = new Date().getFullYear();
                      const isSKExpired = isNaN(expiryYear) || currentYear > expiryYear;
                      
                      const upzStatus = item.status || 'Aktif';
                      const displayStatus = upzStatus === 'Mengundurkan Diri' 
                        ? 'Mengundurkan Diri' 
                        : (upzStatus === 'Tidak Aktif' || isSKExpired)
                        ? 'Tidak Aktif' 
                        : 'Aktif';

                      return (
                        <span className={cn(
                          "px-2.5 py-0.5 text-[10px] font-black rounded-full border uppercase tracking-wider inline-block",
                          displayStatus === 'Mengundurkan Diri' 
                            ? "bg-rose-50 text-rose-600 border-rose-100" 
                            : displayStatus === 'Tidak Aktif'
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {displayStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleHistoryClick(item)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Riwayat SK"
                      >
                        <History className="size-5" />
                      </button>
                      <button 
                        onClick={() => { setSelectedUPZ(item); setIsDetailModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" 
                        title="Detail UPZ"
                      >
                        <Eye className="size-5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" 
                        title="Pembaruan UPZ"
                      >
                        <Settings2 className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Menampilkan {filteredData.length} dari {data.length} UPZ
          </p>
          <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all">
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button className="size-8 rounded-lg bg-primary text-white text-xs font-black shadow-lg shadow-primary/20">1</button>
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white transition-all">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* SK History + Perubahan/Pembaruan — satu modal, tanpa stacking */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Header — berubah sesuai view */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  {historyView !== 'list' && (
                    <button onClick={() => setHistoryView('list')}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                      <ChevronRight className="size-5 rotate-180" />
                    </button>
                  )}
                  <div className={cn('size-12 rounded-xl flex items-center justify-center',
                    historyView === 'list' ? 'bg-primary/10 text-primary' :
                    historyView === 'perubahan' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
                    {historyView === 'list' ? <History className="size-6" /> :
                     historyView === 'perubahan' ? <Edit2 className="size-6" /> : <PlusCircle className="size-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">
                      {historyView === 'list' ? 'Riwayat SK & Kepengurusan' :
                       historyView === 'perubahan' ? 'Perubahan Kepengurusan' : 'Pembaruan SK'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-primary font-bold flex items-center gap-1">
                        <Building2 className="size-3" />{selectedUPZ.name} ({selectedUPZ.code})
                      </p>
                      <span className="text-slate-300">|</span>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="size-3" />{selectedUPZ.kelurahan}, {selectedUPZ.kecamatan}
                      </p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* ── VIEW: LIST ── */}
              {historyView === 'list' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Daftar Rekam Jejak SK</h4>
                    {(selectedUPZ.status || 'Aktif') !== 'Aktif' ? (
                      <span className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg uppercase tracking-wider">
                        Aksi Dinonaktifkan (UPZ {selectedUPZ.status || 'Aktif'})
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setHistoryView('perubahan')}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20">
                          <Edit2 className="size-4" />Perubahan
                        </button>
                        <button onClick={() => { setRenewalForm({ skNumber: '', startYear:'', endYear:'', pimpinanName:'', keterangan:'' }); setHistoryView('pembaruan'); }}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                          <PlusCircle className="size-4" />Pembaruan
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                          <th className="px-6 py-4">No. SK</th>
                          <th className="px-6 py-4">Masa Berlaku</th>
                          <th className="px-6 py-4">Pengurus Utama</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          {selectedUPZ.category === 'Masjid & Mushola' && (
                            <th className="px-6 py-4 text-right">Draft SK</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getHistoryForUPZ(selectedUPZ.id).map((history: SKHistory) => (
                          <tr key={history.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <span className={cn(
                                  "text-sm font-black",
                                  (selectedUPZ.status || 'Aktif') !== 'Aktif' ? "text-slate-400 font-medium" : "text-slate-900"
                                )}>{history.skNumber}</span>
                                <p className="text-[9px] font-bold uppercase tracking-wider"
                                  style={{ color: (selectedUPZ.status || 'Aktif') !== 'Aktif' ? '#94a3b8' : (isSKPembentukan(history.skNumber) ? '#16a34a' : '#2563eb') }}>
                                  {isSKPembentukan(history.skNumber) ? '📋 Pembentukan' : '🔄 Pembaruan'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                <Calendar className="size-4 text-slate-400" />
                                <span className={cn((selectedUPZ.status || 'Aktif') !== 'Aktif' && "text-slate-400 font-medium")}>
                                  {new Date(history.startDate).getFullYear()} – {new Date(history.endDate).getFullYear()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                  <User className="size-4" />
                                </div>
                                <div>
                                  <p className={cn(
                                    "text-sm font-bold",
                                    (selectedUPZ.status || 'Aktif') !== 'Aktif' ? "text-slate-400 font-medium" : "text-slate-900"
                                  )}>{history.pimpinanName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Penasehat</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                                (history.status === 'Aktif' && (selectedUPZ.status || 'Aktif') === 'Aktif') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                {(selectedUPZ.status || 'Aktif') === 'Aktif' ? history.status : 'Tidak Aktif'}
                              </span>
                            </td>
                            {selectedUPZ.category === 'Masjid & Mushola' && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openPrintDateModal(history, 'print')}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                                    title="Cetak/Pratinjau SK"
                                  >
                                    Cetak
                                  </button>
                                  <button
                                    onClick={() => openPrintDateModal(history, 'download')}
                                    className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                                    title="Download Word (.doc)"
                                  >
                                    Docx
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-medium leading-relaxed">
                    <span className="font-black text-slate-700">Perubahan</span> = pergantian pengurus, No. SK tetap, masa berlaku tetap. &nbsp;
                    <span className="font-black text-slate-700">Pembaruan</span> = masa berlaku SK habis, No. SK baru diisi manual, masa berlaku baru (5 thn).
                  </div>
                </div>
              )}

              {/* ── VIEW: PERUBAHAN ── */}
              {historyView === 'perubahan' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Nomor SK (Tetap)</p>
                    <p className="text-2xl font-black text-amber-800">{selectedUPZ.activeSKNumber}</p>
                    <p className="text-[10px] text-amber-600 font-medium">Masa berlaku tetap mengikuti SK aktif saat ini.</p>
                  </div>

                  {/* Pengurus Form */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <User className="size-4" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Update Struktur Kepengurusan</h4>
                    </div>
                    {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                      <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="col-span-2">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                          <input type="text" value={formPengurus[jabatan].nama} onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                          <input type="text" value={formPengurus[jabatan].alamat} onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                    ))}
                    {isFlexibleAnggota && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan</p>
                          <button type="button" onClick={addAnggotaTambahan} className="text-[10px] font-black text-primary border border-primary/20 px-3 py-1 rounded-lg">Tambah</button>
                        </div>
                        {anggotaTambahan.map((a, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} placeholder="Nama..." className="bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder="Alamat..." className="flex-1 bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                              <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="text-rose-500"><X className="size-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── VIEW: PEMBARUAN ── */}
              {historyView === 'pembaruan' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest">Nomor SK Pembaruan</label>
                      <input 
                        type="text" 
                        placeholder="Masukkan nomor SK Baru..." 
                        value={renewalForm.skNumber} 
                        onChange={e => setRenewalForm(prev => ({ ...prev, skNumber: e.target.value }))} 
                        className="w-full bg-white border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Mulai</label>
                        <input type="number" value={renewalForm.startYear} onChange={e => setRenewalForm(prev => ({ ...prev, startYear: e.target.value }))} className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Berakhir</label>
                        <input type="number" value={renewalForm.endYear} onChange={e => setRenewalForm(prev => ({ ...prev, endYear: e.target.value }))} className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Pengurus Form */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <User className="size-4" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Update Struktur Kepengurusan</h4>
                    </div>
                    {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                      <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="col-span-2">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                          <input type="text" value={formPengurus[jabatan].nama} onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                          <input type="text" value={formPengurus[jabatan].alamat} onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                    ))}
                    {isFlexibleAnggota && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan</p>
                          <button type="button" onClick={addAnggotaTambahan} className="text-[10px] font-black text-primary border border-primary/20 px-3 py-1 rounded-lg">Tambah</button>
                        </div>
                        {anggotaTambahan.map((a, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} placeholder="Nama..." className="bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder="Alamat..." className="flex-1 bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                              <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="text-rose-500"><X className="size-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                {historyView !== 'list' ? (
                  <>
                    <button onClick={() => setHistoryView('list')}
                      className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-all px-4 py-2">
                      ← Kembali
                    </button>
                    <button
                      onClick={historyView === 'perubahan' ? handlePerubahanSK : handleRenewalSK}
                      className={cn('px-8 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all',
                        historyView === 'perubahan'
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                          : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                      )}>
                      {historyView === 'perubahan' ? 'Simpan Perubahan' : `Simpan SK ${nextRenewalSK}`}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsHistoryModalOpen(false)}
                    className="ml-auto px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                    Tutup
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Date Input Modal */}
      <AnimatePresence>
        {isPrintDateModalOpen && printHistoryTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsPrintDateModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tanggal Penetapan SK</h3>
                <button onClick={() => setIsPrintDateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Silakan masukkan tanggal penetapan SK yang akan tercantum pada dokumen sebelum di-print/unduh.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Ditetapkan</label>
                  <input 
                    type="date"
                    value={printDateValue}
                    onChange={(e) => setPrintDateValue(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsPrintDateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmPrintDate}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors"
                >
                  Proses
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Migration Modal */}
      <AnimatePresence>
        {isMigrationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Migrasi Data UPZ</h3>
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
                  <p className="text-xs text-slate-500">Gunakan template yang tersedia untuk memastikan format data sesuai dengan sistem.</p>
                </div>

                <div className="space-y-3">
                  <a 
                    href="/Template_Migrasi_Database_UPZ.xlsx" 
                    download="Template_Migrasi_Database_UPZ.xlsx"
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </a>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data</p>
                        <p className="text-[10px] text-slate-400 font-medium">Maksimal file 10MB</p>
                      </div>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={() => {
                      alert('Fitur upload sedang diproses. Data akan divalidasi sebelum diimpor.');
                      setIsMigrationModalOpen(false);
                    }} />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      Pastikan kolom Kode UPZ tidak kosong dan unik. Data duplikat akan dilewati secara otomatis oleh sistem.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detail Informasi UPZ</h3>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Sistem</p>
                      <p className="text-sm font-mono font-bold text-primary">{selectedUPZ.code}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Keaktifan</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(() => {
                          const expiryYearStr = selectedUPZ.skExpiryDate ? (selectedUPZ.skExpiryDate.includes('-') ? selectedUPZ.skExpiryDate.split('-')[0] : selectedUPZ.skExpiryDate) : '';
                          const expiryYear = parseInt(expiryYearStr, 10);
                          const currentYear = new Date().getFullYear();
                          const isSKExpired = isNaN(expiryYear) || currentYear > expiryYear;
                          
                          const displayStatus = selectedUPZ.status === 'Mengundurkan Diri'
                            ? 'Mengundurkan Diri'
                            : (selectedUPZ.status === 'Tidak Aktif' || isSKExpired)
                            ? 'Tidak Aktif'
                            : 'Aktif';

                          return (
                            <span className={cn(
                              "px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider border",
                              displayStatus === 'Mengundurkan Diri'
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : displayStatus === 'Tidak Aktif'
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            )}>
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori / Tipe</p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedUPZ.category} ({selectedUPZ.type})
                        {selectedUPZ.type === 'On-Balance' && selectedUPZ.metadata.onBalanceType && (
                          <span className="block text-[11px] text-primary font-semibold mt-0.5">
                            Sub-tipe: {selectedUPZ.metadata.onBalanceType}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wilayah</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.kelurahan}, {selectedUPZ.kecamatan}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</p>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">{selectedUPZ.metadata.address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</p>
                      <p className="text-sm font-bold text-slate-900">{selectedUPZ.metadata.upzPhone || '-'}</p>
                    </div>
                  </div>
                </div>

                {selectedUPZ.status === 'Mengundurkan Diri' && (
                  <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Detail Pengunduran Diri</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Tanggal Mengundurkan Diri</p>
                        <p className="text-sm font-bold text-slate-900">{selectedUPZ.resignationDate || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Alasan</p>
                        <p className="text-sm font-bold text-slate-950">{selectedUPZ.resignationReason || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(() => {
                  const expiryYearStr = selectedUPZ.skExpiryDate ? (selectedUPZ.skExpiryDate.includes('-') ? selectedUPZ.skExpiryDate.split('-')[0] : selectedUPZ.skExpiryDate) : '';
                  const expiryYear = parseInt(expiryYearStr, 10);
                  const currentYear = new Date().getFullYear();
                  const isSKExpired = isNaN(expiryYear) || currentYear > expiryYear;
                  
                  const displayStatus = selectedUPZ.status === 'Mengundurkan Diri'
                    ? 'Mengundurkan Diri'
                    : (selectedUPZ.status === 'Tidak Aktif' || isSKExpired)
                    ? 'Tidak Aktif'
                    : 'Aktif';

                  return (
                    <div className={cn(
                      "p-6 rounded-2xl border transition-all space-y-4",
                      displayStatus !== 'Aktif'
                        ? "bg-slate-50/50 border-slate-200/60 opacity-60"
                        : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Pengurus Utama</h4>
                        {displayStatus !== 'Aktif' && (
                          <span className={cn(
                            "px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase",
                            displayStatus === 'Mengundurkan Diri' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>{displayStatus}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <User className="size-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedUPZ.metadata.pimpinanTitle}</p>
                            <p className={cn(
                              "text-sm font-bold",
                              displayStatus !== 'Aktif' ? "text-slate-400 font-medium" : "text-slate-900"
                            )}>{selectedUPZ.metadata.pimpinanName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <MapPin className="size-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Penasehat</p>
                            <p className={cn(
                              "text-sm font-bold",
                              displayStatus !== 'Aktif' ? "text-slate-400 font-medium" : "text-slate-900"
                            )}>{selectedUPZ.metadata.pimpinanAddress || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                {(selectedUPZ.status || 'Aktif') !== 'Aktif' ? (
                  <button 
                    onClick={() => handleReactivateUPZ(selectedUPZ)}
                    className="px-6 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Aktifkan UPZ Kembali
                  </button>
                ) : (
                  <button 
                    onClick={() => handleTriggerResignation(selectedUPZ)}
                    className="px-6 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Mengundurkan Diri
                  </button>
                )}
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit / Pembaruan Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedUPZ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Edit2 className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pembaruan Data UPZ</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Section 1: Profil Utama */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Profil Utama</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</label>
                      <input 
                        type="text" 
                        value={formNamaUpz}
                        onChange={e => setFormNamaUpz(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori UPZ</label>
                      <select 
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="Instansi Vertikal">Instansi Vertikal</option>
                        <option value="OPD">OPD</option>
                        <option value="BUMD">BUMD</option>
                        <option value="Perusahaan Swasta">Perusahaan Swasta</option>
                        <option value="Masjid & Mushola">Masjid & Mushola</option>
                        <option value="Pemerintah Kecamatan">Pemerintah Kecamatan</option>
                        <option value="KUA">KUA</option>
                        <option value="Desa/Kelurahan">Desa/Kelurahan</option>
                        <option value="Univ/PT/Pendidikan Menengah">Univ/PT/Pendidikan Menengah</option>
                        <option value="Pendidikan Dasar">Pendidikan Dasar</option>
                        <option value="Organisasi Profesi">Organisasi Profesi</option>
                        <option value="Yayasan">Yayasan</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Keaktifan</label>
                      <select 
                        value={formStatus}
                        onChange={e => setFormStatus(e.target.value as any)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                        <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                      </select>
                    </div>
                  </div>

                  {formStatus === 'Mengundurkan Diri' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100/80">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Tanggal Mengundurkan Diri</label>
                        <input 
                          type="date"
                          value={formResignationDate}
                          onChange={e => setFormResignationDate(e.target.value)}
                          className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Alasan Mengundurkan Diri</label>
                        <input 
                          type="text"
                          placeholder="Masukkan alasan pengunduran diri..."
                          value={formResignationReason}
                          onChange={e => setFormResignationReason(e.target.value)}
                          className="w-full bg-white border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Dana</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="edit_type" 
                          checked={formType === 'Off-Balance'} 
                          onChange={() => setFormType('Off-Balance')}
                          className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">Off-Balance Laporan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="edit_type" 
                          checked={formType === 'On-Balance'} 
                          onChange={() => setFormType('On-Balance')}
                          className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">On-Balance (Kas BAZNAS)</span>
                      </label>
                    </div>

                    {formType === 'On-Balance' && (
                      <div className="pl-6 pt-2 border-l-2 border-primary/20 space-y-2 mt-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub-Tipe On-Balance</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio" 
                              name="edit_on_balance_type" 
                              checked={formOnBalanceType === 'Pengumpulan'} 
                              onChange={() => setFormOnBalanceType('Pengumpulan')}
                              className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                            />
                            <span className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">Pengumpulan</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio" 
                              name="edit_on_balance_type" 
                              checked={formOnBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan'} 
                              onChange={() => setFormOnBalanceType('Pembantuan Pendistribusian dan Pendayagunaan')}
                              className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                            />
                            <span className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">Pembantuan Pendistribusian dan Pendayagunaan</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 2: Lokasi & Wilayah */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Lokasi & Wilayah</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      <select 
                        value={formKecamatan}
                        onChange={(e) => { setFormKecamatan(e.target.value); setFormKelurahan(''); }}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="">Pilih Kecamatan</option>
                        {kecamatanKelurahanSemarang.map(k => <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      <select 
                        value={formKelurahan}
                        onChange={(e) => setFormKelurahan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        disabled={!formKecamatan}
                      >
                        <option value="">Pilih Kelurahan</option>
                        {kelurahanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      value={formAlamatLengkap}
                      onChange={e => setFormAlamatLengkap(e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</label>
                    <input 
                      type="text" 
                      value={formNoTelepon}
                      onChange={e => setFormNoTelepon(e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                </section>

                {/* Section 3: Data Legalitas */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Data Legalitas (SK)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. SK Penetapan</label>
                      <input 
                        type="text" 
                        value={formNoSKPenetapan}
                        onChange={e => setFormNoSKPenetapan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Mulai</label>
                      <input 
                        type="number" 
                        value={formTahunMulai}
                        onChange={e => setFormTahunMulai(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Berakhir</label>
                      <input 
                        type="number" 
                        value={formTahunBerakhir}
                        onChange={e => setFormTahunBerakhir(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4: Data Pengurus */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Struktur Kepengurusan</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">Isi nama dan alamat untuk setiap posisi. Jabatan sudah pakem sesuai struktur UPZ.</p>

                  {/* Fixed Roles */}
                  {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                    <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].nama}
                          onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)}
                          placeholder={`Nama ${jabatan}...`}
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder="Alamat..."
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Dynamic Anggota Tambahan - OPD & Kecamatan only */}
                  {isFlexibleAnggota && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan <span className="text-primary">(OPD/Kecamatan)</span></p>
                        <button
                          type="button"
                          onClick={addAnggotaTambahan}
                          className="text-[10px] font-black text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle className="size-3" />
                          Tambah Anggota
                        </button>
                      </div>
                      {anggotaTambahan.map((a, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start">
                          <div className="col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-1 flex items-end justify-end mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                              <X className="size-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm(`Apakah Anda yakin ingin menghapus UPZ "${selectedUPZ.name}"?`)) {
                      setData(prev => prev.filter(u => u.id !== selectedUPZ.id));
                      setIsEditModalOpen(false);
                      alert('Data UPZ berhasil dihapus.');
                    }
                  }}
                  className="px-4 py-2.5 text-xs font-black text-rose-500 border border-rose-200 rounded-xl hover:bg-rose-50 uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  Hapus UPZ
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all cursor-pointer"
                  >
                    Batalkan Perubahan
                  </button>
                   <button 
                    type="button"
                    onClick={() => {
                      if (!formNamaUpz.trim()) {
                        alert('Nama UPZ tidak boleh kosong.');
                        return;
                      }
                      setData(prev => prev.map(u => u.id === selectedUPZ.id ? {
                        ...u,
                        name: formNamaUpz,
                        category: formCategory,
                        type: formType,
                        kecamatan: formKecamatan,
                        kelurahan: formKelurahan,
                        activeSKNumber: formNoSKPenetapan,
                        skExpiryDate: `${formTahunBerakhir}-12-31`,
                        skStartYear: formTahunMulai,
                        status: formStatus,
                        resignationDate: formStatus === 'Mengundurkan Diri' ? formResignationDate : undefined,
                        resignationReason: formStatus === 'Mengundurkan Diri' ? formResignationReason : undefined,
                        metadata: {
                          ...u.metadata,
                          address: formAlamatLengkap,
                          upzPhone: formNoTelepon,
                          onBalanceType: formType === 'On-Balance' ? formOnBalanceType : undefined,
                          pimpinanName: formPengurus.ketua.nama || formPengurus.penasehat.nama || '',
                          pengurus: {
                            ...formPengurus,
                            anggotaTambahan: anggotaTambahan
                          }
                        }
                      } : u));
                      alert('Data UPZ berhasil diperbarui.');
                      setIsEditModalOpen(false);
                    }}
                    className="px-10 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Plus className="size-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Registrasi UPZ Baru</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Section 1: Profil Utama */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Profil Utama</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama UPZ</label>
                      <input 
                        type="text" 
                        value={formNamaUpz}
                        onChange={e => setFormNamaUpz(e.target.value)}
                        placeholder="Masukkan nama UPZ..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori UPZ</label>
                      <select 
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="Instansi Vertikal">Instansi Vertikal</option>
                        <option value="OPD">OPD</option>
                        <option value="BUMD">BUMD</option>
                        <option value="Perusahaan Swasta">Perusahaan Swasta</option>
                        <option value="Masjid & Mushola">Masjid & Mushola</option>
                        <option value="Pemerintah Kecamatan">Pemerintah Kecamatan</option>
                        <option value="KUA">KUA</option>
                        <option value="Desa/Kelurahan">Desa/Kelurahan</option>
                        <option value="Univ/PT/Pendidikan Menengah">Univ/PT/Pendidikan Menengah</option>
                        <option value="Pendidikan Dasar">Pendidikan Dasar</option>
                        <option value="Organisasi Profesi">Organisasi Profesi</option>
                        <option value="Yayasan">Yayasan</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Dana</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="add_type" 
                          checked={formType === 'Off-Balance'} 
                          onChange={() => setFormType('Off-Balance')}
                          className="size-5 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">Off-Balance Laporan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="add_type" 
                          checked={formType === 'On-Balance'} 
                          onChange={() => setFormType('On-Balance')}
                          className="size-5 text-primary border-slate-300 focus:ring-primary/20" 
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-primary transition-colors">On-Balance (Kas BAZNAS)</span>
                      </label>
                    </div>

                    {formType === 'On-Balance' && (
                      <div className="pl-6 pt-2 border-l-2 border-primary/20 space-y-2 mt-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sub-Tipe On-Balance</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio" 
                              name="add_on_balance_type" 
                              checked={formOnBalanceType === 'Pengumpulan'} 
                              onChange={() => setFormOnBalanceType('Pengumpulan')}
                              className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                            />
                            <span className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">Pengumpulan</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="radio" 
                              name="add_on_balance_type" 
                              checked={formOnBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan'} 
                              onChange={() => setFormOnBalanceType('Pembantuan Pendistribusian dan Pendayagunaan')}
                              className="size-4 text-primary border-slate-300 focus:ring-primary/20" 
                            />
                            <span className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">Pembantuan Pendistribusian dan Pendayagunaan</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 2: Lokasi & Wilayah */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Lokasi & Wilayah</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      <select 
                        value={formKecamatan}
                        onChange={(e) => { setFormKecamatan(e.target.value); setFormKelurahan(''); }}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="">Pilih Kecamatan</option>
                        {kecamatanKelurahanSemarang.map(k => <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      <select 
                        value={formKelurahan}
                        onChange={(e) => setFormKelurahan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        disabled={!formKecamatan}
                      >
                        <option value="">Pilih Kelurahan</option>
                        {kelurahanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      value={formAlamatLengkap}
                      onChange={e => setFormAlamatLengkap(e.target.value)}
                      placeholder="Masukkan alamat lengkap..."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Telepon UPZ</label>
                    <input 
                      type="text" 
                      value={formNoTelepon}
                      onChange={e => setFormNoTelepon(e.target.value)}
                      placeholder="Masukkan No. Telepon UPZ..."
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                </section>

                {/* Section 3: Data Legalitas */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Data Legalitas (SK)</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. SK Penetapan</label>
                      <input 
                        type="text" 
                        value={formNoSKPenetapan || nextBaseSK.toString()}
                        onChange={e => setFormNoSKPenetapan(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Mulai</label>
                      <input 
                        type="number" 
                        value={formTahunMulai}
                        onChange={e => setFormTahunMulai(e.target.value)}
                        placeholder="Tahun..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Berakhir</label>
                      <input 
                        type="number" 
                        value={formTahunBerakhir}
                        onChange={e => setFormTahunBerakhir(e.target.value)}
                        placeholder="Tahun..."
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4: Data Pengurus */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="size-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Struktur Kepengurusan</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">Isi nama dan alamat untuk setiap posisi. Jabatan sudah pakem sesuai struktur UPZ.</p>

                  {/* Fixed Roles */}
                  {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                    <div key={jabatan} className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].nama}
                          onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)}
                          placeholder={`Nama ${jabatan}...`}
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder="Alamat..."
                          className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Dynamic Anggota Tambahan - OPD & Kecamatan only */}
                  {isFlexibleAnggota && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anggota Tambahan <span className="text-primary">(OPD/Kecamatan)</span></p>
                        <button
                          type="button"
                          onClick={addAnggotaTambahan}
                          className="text-[10px] font-black text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        >
                          <PlusCircle className="size-3" />
                          Tambah Anggota
                        </button>
                      </div>
                      {anggotaTambahan.map((a, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start">
                          <div className="col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="col-span-1 flex items-end justify-end mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all">
                              <X className="size-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-all"
                >
                  Batalkan Registrasi
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (!formNamaUpz.trim()) {
                      alert('Nama UPZ harus diisi.');
                      return;
                    }

                    const nextCode = `UPZ-${Date.now()}`;
                    const skPenetapan = formNoSKPenetapan || nextBaseSK.toString();

                    const newUpz: UPZ = {
                      id: nextCode,
                      code: nextCode,
                      name: formNamaUpz,
                      category: formCategory,
                      type: formType,
                      kecamatan: formKecamatan || '-',
                      kelurahan: formKelurahan || '-',
                      activeSKNumber: skPenetapan,
                      skStartYear: formTahunMulai || new Date().getFullYear().toString(),
                      skExpiryDate: formTahunBerakhir || (new Date().getFullYear() + 5).toString(),
                      status: 'Aktif',
                      metadata: {
                        address: formAlamatLengkap,
                        upzPhone: formNoTelepon,
                        onBalanceType: formType === 'On-Balance' ? formOnBalanceType : undefined,
                        pimpinanTitle: 'Ketua',
                        pimpinanName: formPengurus.ketua.nama || formPengurus.penasehat.nama || '',
                        pengurus: {
                          penasehat: { nama: formPengurus.penasehat.nama, alamat: formPengurus.penasehat.alamat || '' },
                          ketua: { nama: formPengurus.ketua.nama, alamat: formPengurus.ketua.alamat || '' },
                          sekretaris: { nama: formPengurus.sekretaris.nama, alamat: formPengurus.sekretaris.alamat || '' },
                          bendahara: { nama: formPengurus.bendahara.nama, alamat: formPengurus.bendahara.alamat || '' },
                          anggota1: { nama: formPengurus.anggota1.nama, alamat: formPengurus.anggota1.alamat || '' },
                          anggota2: { nama: formPengurus.anggota2.nama, alamat: formPengurus.anggota2.alamat || '' },
                          anggotaTambahan: anggotaTambahan
                        }
                      }
                    };

                    const newSkHistoryEntry: SKHistory = {
                      id: `SK-${Date.now()}`,
                      upzId: newUpz.id,
                      skNumber: skPenetapan,
                      startDate: newUpz.skStartYear,
                      endDate: newUpz.skExpiryDate,
                      pimpinanName: formPengurus.ketua.nama || '-',
                      status: 'Aktif',
                      skType: 'Baru'
                    };

                    setData(prev => [newUpz, ...prev]);
                    setSkHistory(prev => [newSkHistoryEntry, ...prev]);

                    // Reset form states
                    setFormNamaUpz('');
                    setFormAlamatLengkap('');
                    setFormNoTelepon('');
                    setFormNoSKPenetapan('');
                    setFormTahunMulai('');
                    setFormTahunBerakhir('');
                    setFormKecamatan('');
                    setFormKelurahan('');
                    setFormCategory('Masjid & Mushola');
                    setFormType('Off-Balance');
                    setFormOnBalanceType('Pengumpulan');
                    setFormPengurus({
                      penasehat: { nama: '', alamat: '' },
                      ketua: { nama: '', alamat: '' },
                      sekretaris: { nama: '', alamat: '' },
                      bendahara: { nama: '', alamat: '' },
                      anggota1: { nama: '', alamat: '' },
                      anggota2: { nama: '', alamat: '' }
                    });
                    setAnggotaTambahan([]);

                    alert('UPZ baru berhasil didaftarkan.');
                    setIsAddModalOpen(false);
                  }}
                  className="px-10 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                >
                  Daftarkan UPZ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resignation Confirmation Modal */}
      <AnimatePresence>
        {isResignModalOpen && resignUPZ && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsResignModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-black text-rose-800 uppercase tracking-wider">Form Pengunduran Diri UPZ</h3>
                <button onClick={() => setIsResignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-rose-800 uppercase tracking-wider">UPZ yang Mengundurkan Diri</p>
                  <p className="text-base font-bold text-slate-900">{resignUPZ.name}</p>
                  <p className="text-xs text-slate-500 font-mono">Kode: {resignUPZ.code}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Efektif Mundur</label>
                  <input 
                    type="date"
                    value={resignDate}
                    onChange={(e) => setResignDate(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alasan Pengunduran Diri</label>
                  <textarea 
                    rows={3}
                    placeholder="Tuliskan alasan pengunduran diri UPZ secara lengkap..."
                    value={resignReason}
                    onChange={(e) => setResignReason(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsResignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmResignation}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-colors"
                >
                  Simpan Status
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
