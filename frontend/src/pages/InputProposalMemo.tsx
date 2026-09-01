import React, { useState, useRef } from 'react';
import { 
  ChevronRight, 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  FileText,
  Newspaper,
  Clock,
  X,
  History,
  AlertCircle,
  FileCheck,
  ClipboardList,
  Link,
  Upload,
  Trash2,
  ExternalLink,
  FileSearch,
  Monitor,
  Send,
  Printer,
  Download,
  FileSpreadsheet,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { ProposalMemo } from '../data/proposalMemoData';
import { pilarData, Pilar } from '../data/pilarData';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';
import { LOGO_BAZNAS_BASE64 } from '../utils/logoBase64';
import { formatTanggalIndo } from '../utils/dateUtils';

/**
 * Konversi link Google Drive apa pun ke URL embed (iframe preview)
 * Mendukung format /view, /edit, open?id=, dan sharing links
 */
function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  // Format: https://drive.google.com/file/d/FILE_ID/...
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

/**
 * Helper to identify and filter out Direct Penyaluran (Jalur Direct)
 */
function isDirectProposal(item: any): boolean {
  if (!item) return false;
  const numAgenda = typeof item.agendaNo === 'number' ? item.agendaNo : parseInt(String(item.agendaNo || item.agenda_no || ''), 10);
  
  // 1. Explicit proposal agenda: 1 - 89,999 (e.g. 1 - 3000) is STRICTLY Jalur Proposal
  if (!isNaN(numAgenda)) {
    if (numAgenda > 0 && numAgenda < 90000) {
      return false;
    }
    if (numAgenda === 0 || numAgenda >= 90000) {
      return true;
    }
  }

  const memoSource = String(item.memoSource || item.memo_source || '');
  const keterangan = String(item.keterangan || '');
  const catatan = String(item.catatan || '');
  const yangMengajukan = String(item.yangMengajukan || item.yang_mengajukan || '');
  const asalData = String(item.asal_data || item.asalData || '');

  return (
    memoSource === 'DIRECT_PENYALURAN' ||
    memoSource === 'MIGRASI_PENYALURAN' ||
    keterangan.includes('[DIRECT PENYALURAN]') ||
    catatan.includes('Direct Penyaluran') ||
    catatan.includes('Didaftarkan via Direct Penyaluran') ||
    yangMengajukan === 'Direct Penyaluran' ||
    asalData === 'Jalur Direct'
  );
}

interface InputProposalMemoProps {
  data: ProposalMemo[];          // Hanya proposal status Registrasi
  allData?: ProposalMemo[];      // Semua proposal
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function InputProposalMemo({ data, allData: _allData, onUpdate: _onUpdate }: InputProposalMemoProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);
  
  const [nikCheckStr, setNikCheckStr] = useState('');
  const [isCheckingNik, setIsCheckingNik] = useState(false);
  const [nikStatus, setNikStatus] = useState<'idle'|'new'|'pending_nrm'|'success'|'warning'>('idle');
  const [nikMessage, setNikMessage] = useState('');
  const [matchedMustahikId, setMatchedMustahikId] = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState<ProposalMemo | null>(null);
  const [agendaNoInput, setAgendaNoInput] = useState<string>('');
  const [noKk, setNoKk] = useState('');

  const suggestedNextAgenda = React.useMemo(() => {
    const listToCheck = data && data.length > 0 ? data : (_allData || []);
    if (!listToCheck || listToCheck.length === 0) return 1;
    // Filter out direct proposals
    const validItems = listToCheck.filter(p => !isDirectProposal(p));
    if (validItems.length === 0) return 1;
    // Sort so the newest active proposal in Input Proposal is first
    const sorted = [...validItems].sort((a, b) => {
      const dateA = new Date(a.tanggalMasuk).getTime();
      const dateB = new Date(b.tanggalMasuk).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateB !== dateA) return dateB - dateA;
      return Number(b.agendaNo || 0) - Number(a.agendaNo || 0);
    });
    const firstItem = sorted[0];
    const num = typeof firstItem.agendaNo === 'number' ? firstItem.agendaNo : parseInt(String(firstItem.agendaNo || (firstItem as any).agenda_no), 10);
    return !isNaN(num) && num > 0 ? num + 1 : 1;
  }, [data, _allData]);

  const duplicateProposal = React.useMemo(() => {
    if (!agendaNoInput || !agendaNoInput.trim()) return null;
    const targetNum = parseInt(agendaNoInput.trim(), 10);
    if (isNaN(targetNum) || targetNum <= 0) return null;
    
    const listToCheck = _allData && _allData.length > 0 ? _allData : data;
    return listToCheck.find(p => {
      if (editingProposal && p.id === editingProposal.id) return false;
      const num = typeof p.agendaNo === 'number' ? p.agendaNo : parseInt(String(p.agendaNo || (p as any).agenda_no), 10);
      return num === targetNum;
    }) || null;
  }, [editingProposal, agendaNoInput, _allData, data]);

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<ProposalMemo | null>(null);
  const [scanTabMode, setScanTabMode] = useState<'file' | 'link'>('file');
  const [scanLinkInput, setScanLinkInput] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const downloadProposalTemplate = () => {
    const templateRows = [
      {
        ID_Proposal: 'PROP-2026-001',
        Tanggal_Proposal: '2026-08-01',
        Tanggal_Pencairan: '2026-08-05',
        Nama_Instansi: 'SD N 1 Ngaliyan',
        Pimpinan_Organisasi: 'Drs. H. Supriyanto, M.Pd.',
        Nama_Pemohon: 'Budi Santoso, S.Pd.',
        Nama_Anak: 'Ahmad Syahputra',
        NIK: '3374011203090001',
        No_KK: '3374011005050002',
        Alamat: 'Jl. Ngaliyan No. 12',
        Kelurahan: 'Ngaliyan',
        Kecamatan: 'Ngaliyan',
        No_Telpon: '081234567890',
        Jenis_Permohonan: '230101',
        Kode_COA: '51010101',
        Kode_RKAT: 'asnaf-1786077405033-ihye',
        Nominal: 2500000,
        Asnaf: 'Miskin',
        Jenis_Pengajuan: 'Lembaga',
        Status: 'Selesai & Arsip',
        Keterangan: 'Bantuan Operasional SPP Sekolah'
      },
      {
        ID_Proposal: 'PROP-2026-002',
        Tanggal_Proposal: '2026-08-02',
        Tanggal_Pencairan: '',
        Nama_Instansi: '',
        Pimpinan_Organisasi: '',
        Nama_Pemohon: 'Siti Aminah',
        Nama_Anak: '',
        NIK: '3374024506880003',
        No_KK: '3374021104040005',
        Alamat: 'Jl. Kalipancur No. 45',
        Kelurahan: 'Kalipancur',
        Kecamatan: 'Ngaliyan',
        No_Telpon: '085712345678',
        Jenis_Permohonan: 'Bantuan Pengobatan RS',
        Kode_COA: '',
        Kode_RKAT: '',
        Nominal: 0,
        Asnaf: 'Fakir',
        Jenis_Pengajuan: 'Perorangan',
        Status: 'Registrasi',
        Keterangan: 'Proposal Baru Dalam Proses (Dapat di-update COA/RKAT nanti)'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Migrasi_Proposal");
    XLSX.writeFile(wb, "Template_Migrasi_Proposal_BAZNAS.xlsx");
  };

  const handleProposalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMigrating(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post('/api/pengajuan-pencairan/migrate-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { summary } = res.data;
      alert(`Migrasi Berhasil!\n\nTotal Proposal: ${summary.total_proposal}\nTotal Nominal: Rp ${Number(summary.total_nominal).toLocaleString('id-ID')}\nMustahik By Name: ${summary.total_mustahik_by_name} orang`);
      setIsMigrationModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error('Error importing proposal excel:', err);
      alert('Gagal memproses file Excel: ' + (err.response?.data?.error || err.message));
    } finally {
      setMigrating(false);
      e.target.value = '';
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kecamatan/Kelurahan state
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedKelurahan, setSelectedKelurahan] = useState('');
  const [jenisPengajuanState, setJenisPengajuanState] = useState<'Perorangan' | 'Lembaga'>('Perorangan');
  const [isKtpSemarang, setIsKtpSemarang] = useState(true);
  const [pilarsList, setPilarsList] = useState<Pilar[]>(pilarData);
  const [selectedProgramCode, setSelectedProgramCode] = useState('');
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [isProgramDropdownOpen, setIsProgramDropdownOpen] = useState(false);
  const [tanggalLahirInput, setTanggalLahirInput] = useState('');

  // Styled custom dropdown states
  const [hasMemoState, setHasMemoState] = useState(false);
  const [selectedMemoType, setSelectedMemoType] = useState<'Memo' | 'Dispo'>('Memo');
  const [isMemoTypeDropdownOpen, setIsMemoTypeDropdownOpen] = useState(false);
  const [isMemoDropdownOpen, setIsMemoDropdownOpen] = useState(false);
  const [selectedMemoSource, setSelectedMemoSource] = useState('');
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [isPekerjaanDropdownOpen, setIsPekerjaanDropdownOpen] = useState(false);
  const [selectedPekerjaan, setSelectedPekerjaan] = useState('');
  const [isKecamatanDropdownOpen, setIsKecamatanDropdownOpen] = useState(false);
  const [kecamatanSearchQuery, setKecamatanSearchQuery] = useState('');
  const [isKelurahanDropdownOpen, setIsKelurahanDropdownOpen] = useState(false);
  const [kelurahanSearchQuery, setKelurahanSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'send_humas' | 'delete_proposal' | '';
    targetId?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: '',
  });

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'harian_pilar' | 'harian_detail' | 'mingguan' | 'bulanan'>('harian_pilar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeekEndDate, setSelectedWeekEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<any[]>([]);
  const [signatories, setSignatories] = useState({
    kepalaPelaksana: 'H. Muhammad Asyhar, S.Sos.I.',
    kabagAdministrasi: 'H. Moch. Afif, S.H.I.',
    wakilKetuaIv: 'Dr. H. Muhammad Muhtarom, H.M., M.Ag.',
    ketua: 'H. Arnaz Agung Andrarasmara, S.E., M.M.',
    stafAdministrasi: ''
  });

  React.useEffect(() => {
    if (isReportModalOpen) {
      axios.get('/api/users')
        .then(res => {
          setUsers(res.data || []);
        })
        .catch(err => console.error('Error fetching users:', err));
    }
  }, [isReportModalOpen]);

  React.useEffect(() => {
    if (users.length > 0) {
      const kpUser = users.find(u => u.role === 'Kepala_Pelaksana');
      const kabagUser = users.find(u => u.role === 'Kabag_Administrasi');
      const wk4User = users.find(u => u.role === 'Wakil_Ketua_IV');
      const ketuaUser = users.find(u => u.role === 'Ketua');
      const stafUser = users.find(u => u.role === 'Staf_Administrasi') || users.find(u => u.role.startsWith('Staf_'));

      setSignatories(prev => ({
        kepalaPelaksana: kpUser ? kpUser.name : (prev.kepalaPelaksana || 'H. Muhammad Asyhar, S.Sos.I.'),
        kabagAdministrasi: kabagUser ? kabagUser.name : (prev.kabagAdministrasi || 'H. Moch. Afif, S.H.I.'),
        wakilKetuaIv: wk4User ? wk4User.name : (prev.wakilKetuaIv || 'Dr. H. Muhammad Muhtarom, H.M., M.Ag.'),
        ketua: ketuaUser ? ketuaUser.name : (prev.ketua || 'H. Arnaz Agung Andrarasmara, S.E., M.M.'),
        stafAdministrasi: stafUser ? stafUser.name : prev.stafAdministrasi
      }));
    }
  }, [users]);

  const handlePrintReport = () => {
    // Sumber data KHUSUS & HANYA dari Halaman Registrasi Administrasi (bukan Jalur Direct)
    const reportSource = data.filter(item => !isDirectProposal(item));

    const filtered = reportSource.filter(item => {
      if (!item.tanggalMasuk) return false;
      const [y, m] = item.tanggalMasuk.split('-').map(Number);
      if (reportType === 'harian_pilar' || reportType === 'harian_detail') {
        return item.tanggalMasuk === selectedDate;
      } else if (reportType === 'mingguan') {
        return item.tanggalMasuk >= selectedWeekStartDate && item.tanggalMasuk <= selectedWeekEndDate;
      } else if (reportType === 'bulanan') {
        return y === selectedYear && m === selectedMonth;
      }
      return false;
    });

    const formatIndonesianDateStr = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    let title = '';
    let semarangDate = '';

    if (reportType === 'harian_pilar') {
      title = `REKAP PROPOSAL PENGAJUAN ${formatIndonesianDateStr(selectedDate).toUpperCase()}`;
      semarangDate = formatIndonesianDateStr(selectedDate);
    } else if (reportType === 'harian_detail') {
      title = `REKAP DETAIL PROPOSAL MASUK ${formatIndonesianDateStr(selectedDate).toUpperCase()}`;
      semarangDate = formatIndonesianDateStr(selectedDate);
    } else if (reportType === 'mingguan') {
      title = `REKAP PROPOSAL MASUK MINGGU KE-${selectedWeek} BULAN ${MONTH_NAMES[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
      semarangDate = formatIndonesianDateStr(selectedWeekEndDate);
    } else if (reportType === 'bulanan') {
      title = `REKAP PROPOSAL MASUK BULAN ${MONTH_NAMES[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      semarangDate = formatIndonesianDateStr(endDayStr);
    }

    let contentHtml = '';

    if (reportType === 'harian_pilar' || reportType === 'mingguan' || reportType === 'bulanan') {
      const PILARS = [
        'Semarang Peduli',
        'Semarang Sehat',
        'Semarang Cerdas',
        'Semarang Taqwa',
        'Semarang Makmur'
      ];
      
      const counts: Record<string, number> = {};
      PILARS.forEach(p => counts[p] = 0);
      let totalCount = 0;

      filtered.forEach(p => {
        const pilarName = p.program;
        const matched = PILARS.find(pil => pilarName && pilarName.toLowerCase().includes(pil.toLowerCase()));
        if (matched) {
          counts[matched]++;
          totalCount++;
        } else {
          const fallback = PILARS.find(pil => p.jenisPermohonan && p.jenisPermohonan.toLowerCase().includes(pil.toLowerCase()));
          if (fallback) {
            counts[fallback]++;
            totalCount++;
          } else {
            counts['Semarang Peduli']++;
            totalCount++;
          }
        }
      });

      const activeRows = PILARS.map(pilar => ({ pilar, count: counts[pilar] }))
        .filter(r => r.count > 0);

      contentHtml = `
        <h2 style="font-size: 20px; text-align: center; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 30px; line-height: 1.5;">
          ${title}
        </h2>
        <table style="width: 68%; margin: 0 auto; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 17px; margin-bottom: 40px;">
          <thead>
            <tr style="height: 55px;">
              <th style="border: 2px solid #000; padding: 10px; width: 15%; text-align: center; height: 55px;">No</th>
              <th style="border: 2px solid #000; padding: 10px 14px; width: 60%; text-align: center; height: 55px;">Jenis Permohonan</th>
              <th style="border: 2px solid #000; padding: 10px; width: 25%; text-align: center; height: 55px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${activeRows.length === 0 ? `
              <tr style="height: 55px;">
                <td colspan="3" style="border: 2px solid #000; padding: 10px; text-align: center; color: #555; height: 55px;">Tidak ada data proposal masuk</td>
              </tr>
            ` : activeRows.map((r, i) => `
              <tr style="height: 55px;">
                <td style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; height: 55px;">${i + 1}</td>
                <td style="border: 2px solid #000; padding: 10px 14px; font-weight: bold; height: 55px;">${r.pilar}</td>
                <td style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; height: 55px;">${r.count}</td>
              </tr>
            `).join('')}
            <tr style="height: 55px; font-weight: bold;">
              <td colspan="2" style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; height: 55px;">Total</td>
              <td style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; height: 55px;">${totalCount}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      const PILARS = [
        'Semarang Peduli',
        'Semarang Sehat',
        'Semarang Cerdas',
        'Semarang Taqwa',
        'Semarang Makmur'
      ];

      const grouped: Record<string, typeof filtered> = {};
      PILARS.forEach(p => grouped[p] = []);

      filtered.forEach(p => {
        const pilarName = p.program;
        const matched = PILARS.find(pil => pilarName && pilarName.toLowerCase().includes(pil.toLowerCase()));
        if (matched) {
          grouped[matched].push(p);
        } else {
          const fallback = PILARS.find(pil => p.jenisPermohonan && p.jenisPermohonan.toLowerCase().includes(pil.toLowerCase()));
          if (fallback) {
            grouped[fallback].push(p);
          } else {
            grouped['Semarang Peduli'].push(p);
          }
        }
      });

      const activeGroups = PILARS.map(pilar => ({ pilar, items: grouped[pilar] }))
        .filter(g => g.items.length > 0);

      contentHtml = `
        <h2 style="font-size: 18px; text-align: center; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-bottom: 8px;">
          ${title}
        </h2>
        ${activeGroups.length === 0 ? `
          <p style="text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 14px; margin-top: 20px;">Tidak ada data detail proposal masuk</p>
        ` : activeGroups.map(g => `
          <div style="page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 14px; text-align: left; font-family: 'Times New Roman', Times, serif; font-weight: bold; margin-top: 10px; margin-bottom: 4px;">
              ${g.pilar} : ${g.items.length}
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 11px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
              <thead>
                <tr style="background-color: #ffffff; height: 28px;">
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 3%;">No</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 5%;">No Agenda</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 7%;">Tanggal Proposal Masuk</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 10%;">Nama Instansi</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 9%;">Pimpinan Organisasi</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 8%;">Nama Pemohon</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 7%;">Nama Anak</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 11%;">Alamat</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 7%;">Kelurahan</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 7%;">Kecamatan</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 8%;">Jenis Permohonan</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 6%;">NoTelpon</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 4%;">Jam Pengajuan</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 5%;">Yang Mengajukan</th>
                  <th style="border: 1px solid #000; padding: 4px 2px; text-align: center; width: 3%;">TTD</th>
                </tr>
              </thead>
              <tbody>
                ${g.items.map((item, index) => {
                  const combinedPermohonan = item.programCode ? `${item.programCode} || ${item.jenisPermohonan}` : item.jenisPermohonan;
                  return `
                    <tr style="height: 32px;">
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${index + 1}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.agendaNo}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${formatIndonesianDateStr(item.tanggalMasuk)}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.namaInstansi || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.pimpinanOrganisasi || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.namaPemohon || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.namaAnak || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.alamat || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.kelurahan || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${item.kecamatan || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px;">${combinedPermohonan || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.noTelpon || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.jamPengajuan || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.yangMengajukan || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;"></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      `;
    }

    const formatSignatureName = (name: string | undefined) => {
      if (!name || !name.trim()) return '................................';
      return name.trim();
    };

    let signatureHtml = '';
    if (reportType === 'harian_pilar') {
      signatureHtml = `
        <table style="width: 96%; border: none; margin: 25px auto 0; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 14px; page-break-inside: avoid; break-inside: avoid;">
          <tr style="border: none;">
            <td style="border: none; width: 60%; padding-left: 20px;"></td>
            <td style="border: none; width: 40%; text-align: left; padding-bottom: 8px; white-space: nowrap;">
              Semarang, ${semarangDate}
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 60%; text-align: left; vertical-align: top; padding-left: 20px;">
              Kepala Pelaksana
            </td>
            <td style="border: none; width: 40%; text-align: left; vertical-align: top; padding: 0;">
              Kepala Bagian<br>
              Administrasi, SDM, dan Umum
            </td>
          </tr>
          <tr style="border: none; height: 60px;">
            <td style="border: none;"></td>
            <td style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 60%; text-align: left; vertical-align: top; padding-left: 20px; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kepalaPelaksana)}</strong>
            </td>
            <td style="border: none; width: 40%; text-align: left; vertical-align: top; padding: 0; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kabagAdministrasi)}</strong>
            </td>
          </tr>
        </table>
      `;
    } else if (reportType === 'harian_detail') {
      signatureHtml = `
        <table style="width: 96%; border: none; margin-top: 15px; margin-left: 2%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 14px; page-break-inside: avoid; break-inside: avoid;">
          <tr style="border: none;">
            <td style="border: none; width: 60%; padding-left: 15%;"></td>
            <td style="border: none; width: 40%; text-align: left; padding-bottom: 4px; white-space: nowrap;">
              Semarang, ${semarangDate}
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 60%; text-align: left; vertical-align: top; padding-left: 15%;">
              Kepala Bagian<br>
              Administrasi, SDM, dan Umum
            </td>
            <td style="border: none; width: 40%; text-align: left; vertical-align: top; padding: 0;">
              Staff Administrasi, SDM, dan Umum
            </td>
          </tr>
          <tr style="border: none; height: 60px;">
            <td style="border: none;"></td>
            <td style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 60%; text-align: left; vertical-align: top; padding-left: 15%; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kabagAdministrasi)}</strong>
            </td>
            <td style="border: none; width: 40%; text-align: left; vertical-align: top; padding: 0; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.stafAdministrasi)}</strong>
            </td>
          </tr>
        </table>
      `;
    } else if (reportType === 'mingguan') {
      signatureHtml = `
        <table style="width: 100%; margin: 25px auto 0; border: none; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 13px; page-break-inside: avoid; break-inside: avoid;">
          <tr style="border: none;">
            <td style="border: none; width: 33%; padding-right: 5px;"></td>
            <td style="border: none; width: 34%; padding-right: 5px;"></td>
            <td style="border: none; width: 33%; text-align: left; padding-bottom: 8px; white-space: nowrap;">
              Semarang, ${semarangDate}
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; padding-right: 5px;">
              Mengetahui<br>
              Wakil Ketua IV
            </td>
            <td style="border: none; width: 34%; text-align: left; vertical-align: top; padding-right: 5px;">
              Kepala Pelaksana
            </td>
            <td style="border: none; width: 33%; text-align: left; vertical-align: top;">
              Kepala Bagian<br>
              Administrasi, SDM, dan Umum
            </td>
          </tr>
          <tr style="border: none; height: 60px;">
            <td style="border: none;"></td>
            <td style="border: none;"></td>
            <td style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; padding-right: 5px; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.wakilKetuaIv)}</strong>
            </td>
            <td style="border: none; width: 34%; text-align: left; vertical-align: top; padding-right: 5px; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kepalaPelaksana)}</strong>
            </td>
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kabagAdministrasi)}</strong>
            </td>
          </tr>
        </table>
      `;
    } else if (reportType === 'bulanan') {
      signatureHtml = `
        <table style="width: 100%; margin: 25px auto 0; border: none; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 13px; page-break-inside: avoid; break-inside: avoid;">
          <tr style="border: none;">
            <td style="border: none; width: 33%; padding-right: 5px;"></td>
            <td style="border: none; width: 34%; padding-right: 5px;"></td>
            <td style="border: none; width: 33%; text-align: left; padding-bottom: 8px; white-space: nowrap;">
              Semarang, ${semarangDate}
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; padding-right: 5px;">
              Wakil Ketua IV
            </td>
            <td style="border: none; width: 34%; text-align: left; vertical-align: top; padding-right: 5px;">
              Kepala Pelaksana
            </td>
            <td style="border: none; width: 33%; text-align: left; vertical-align: top;">
              Kepala Bagian<br>
              Administrasi, SDM, dan Umum
            </td>
          </tr>
          <tr style="border: none; height: 60px;">
            <td style="border: none;"></td>
            <td style="border: none;"></td>
            <td style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; padding-right: 5px; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.wakilKetuaIv)}</strong>
            </td>
            <td style="border: none; width: 34%; text-align: left; vertical-align: top; padding-right: 5px; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kepalaPelaksana)}</strong>
            </td>
            <td style="border: none; width: 33%; text-align: left; vertical-align: top; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.kabagAdministrasi)}</strong>
            </td>
          </tr>
          <tr style="border: none; height: 30px;">
            <td colspan="3" style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td colspan="3" style="border: none; text-align: center; vertical-align: top; line-height: 1.3;">
              Mengetahui,<br>
              Ketua BAZNAS Kota Semarang
            </td>
          </tr>
          <tr style="border: none; height: 60px;">
            <td colspan="3" style="border: none;"></td>
          </tr>
          <tr style="border: none;">
            <td colspan="3" style="border: none; text-align: center; vertical-align: top; line-height: 1.3; white-space: nowrap;">
              <strong>${formatSignatureName(signatories.ketua)}</strong>
            </td>
          </tr>
        </table>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela print preview. Pastikan popup tidak diblokir oleh browser.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: ${reportType === 'harian_detail' ? 'A4 landscape' : 'A4 portrait'};
              margin: 10mm 12mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              margin: 0;
              padding: 0;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
          ${signatureHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  React.useEffect(() => {
    axios.get('/api/pilars')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setPilarsList(res.data);
        }
      })
      .catch(console.error);
  }, []);

  const kelurahanOptions = kecamatanKelurahanSemarang.find(
    k => k.kecamatan === selectedKecamatan
  )?.kelurahan ?? [];

  const filteredPilars = pilarsList.map(pilar => {
    const matchingProgs = pilar.programs.filter(prog => 
      prog.code.toLowerCase().includes(programSearchQuery.toLowerCase()) ||
      prog.name.toLowerCase().includes(programSearchQuery.toLowerCase())
    );
    return {
      ...pilar,
      programs: matchingProgs
    };
  }).filter(pilar => pilar.programs.length > 0);

  const selectedProgramName = (() => {
    if (!selectedProgramCode) return 'Pilih Program...';
    for (const pilar of pilarsList) {
      const prog = pilar.programs.find(p => p.code === selectedProgramCode);
      if (prog) return `${prog.code} - ${prog.name}`;
    }
    return selectedProgramCode;
  })();

  // Sorted: terbaru di atas (hanya Jalur Proposal, bukan Jalur Direct)
  const filteredData = data
    .filter(item => {
      if (isDirectProposal(item)) return false;
      if (user?.role === 'Humas') {
        const itemStatus = item.status.toLowerCase().replace(/_/g, ' ');
        if (itemStatus !== 'scan proposal') return false;
      }
      const matchesSearch = item.agendaNo.toString().includes(searchTerm) || 
                           item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.namaInstansi && item.namaInstansi.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    })
    .sort((a, b) => {
      // Sort by tanggalMasuk descending (newest first), fallback to agendaNo
      const dateA = new Date(a.tanggalMasuk).getTime();
      const dateB = new Date(b.tanggalMasuk).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return Number(b.agendaNo) - Number(a.agendaNo);
    });

  // Stat values (hanya Halaman Registrasi Proposal)
  const now = new Date();
  const nonDirectRegistrasiData = data.filter(d => !isDirectProposal(d));
  const proposalBulanIni = nonDirectRegistrasiData.filter(d => {
    const dt = new Date(d.tanggalMasuk);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const menungguScan = nonDirectRegistrasiData.length;
  const memoPimpinan = nonDirectRegistrasiData.filter(d => d.hasMemo).length;

  const handleAddData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (nikCheckStr.length !== 16) {
      alert('NIK / NIK Pimpinan wajib diisi 16 digit.');
      return;
    }
    if (jenisPengajuanState === 'Perorangan' && noKk && noKk.length !== 16) {
      alert('No. KK harus 16 digit jika diisi.');
      return;
    }
    if (jenisPengajuanState === 'Perorangan') {
      if (tanggalLahirInput.length !== 10) {
        alert('Tanggal lahir wajib diisi dengan format DD-MM-YYYY.');
        return;
      }
      const parts = tanggalLahirInput.split('-');
      if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
        alert('Format Tanggal Lahir tidak valid (DD-MM-YYYY). Contoh: 17-08-1945');
        return;
      }
    }
    const fd = new FormData(e.currentTarget);
    const get = (name: string) => String(fd.get(name) ?? '');

    const catatanText = get('catatan') || get('keterangan') || null;

    const payload: Record<string, any> = {
      tanggal_masuk:       get('tanggalMasuk'),
      jam_pengajuan:       get('jamPengajuan'),
      jenis_permohonan:    selectedProgramCode,
      jenis_pengajuan:     jenisPengajuanState,
      nama_instansi:       jenisPengajuanState === 'Lembaga' ? get('namaInstansi') : (get('namaInstansi') || null),
      pimpinan_organisasi: jenisPengajuanState === 'Lembaga' ? get('pimpinanOrganisasi') : (get('pimpinanOrganisasi') || null),
      nama_pemohon:        get('namaPemohon') || (jenisPengajuanState === 'Lembaga' ? '-' : ''),
      nama_anak:           get('namaAnak') || null,
      nik:                 nikCheckStr || get('nik') || null,
      no_kk:               jenisPengajuanState === 'Perorangan' ? (noKk || null) : null,
      tempat_lahir:        jenisPengajuanState === 'Perorangan' ? get('tempat_lahir') : null,
      tanggal_lahir:       jenisPengajuanState === 'Perorangan' ? tanggalLahirInput : null,
      jenis_kelamin:       jenisPengajuanState === 'Perorangan' ? get('jenis_kelamin') : null,
      alamat:              get('alamat') || null,
      kelurahan:           selectedKelurahan || get('kelurahan') || null,
      kecamatan:           selectedKecamatan || get('kecamatan') || null,
      pekerjaan:           jenisPengajuanState === 'Perorangan' ? (selectedPekerjaan || get('pekerjaan') || null) : null,
      no_telpon:           get('telepon') || null,
      email:               get('email') || null,
      catatan:             catatanText,
      keterangan:          catatanText,
      yang_mengajukan:     get('yangMengajukan') || null,
      has_memo:            hasMemoState,
      memo_source:         hasMemoState ? (selectedMemoSource ? `${selectedMemoType} ${selectedMemoSource.replace(/^(memo|dispo|disposisi)\s*[:\-]?\s*/i, '').trim()}` : `${selectedMemoType} Pimpinan`) : null,
      rekomendasi:         get('rekomendasi') || null,
      status:              'Registrasi',
    };

    if (duplicateProposal) {
      const confirmSave = window.confirm(
        `⚠️ Peringatan No. Agenda Terduplikasi:\n\nNo. Agenda ${agendaNoInput} saat ini sudah digunakan oleh proposal lain atas nama:\n• ${duplicateProposal.namaPemohon || duplicateProposal.namaInstansi || 'Mustahik'} (${duplicateProposal.jenisPengajuan || 'Perorangan'})\n\nApakah Anda yakin ingin TETAP MENYIMPAN nomor agenda ini?`
      );
      if (!confirmSave) {
        return;
      }
    }
    const agendaNoVal = get('agendaNo') || agendaNoInput;
    if (agendaNoVal) {
      payload.agenda_no = parseInt(agendaNoVal, 10);
    }

    try {
      const isLembaga = jenisPengajuanState === 'Lembaga';
      if (nikStatus === 'new' && nikCheckStr.length === 16) {
        const res = await axios.post('/api/mustahik/auto-register', {
          nik: nikCheckStr,
          nama: isLembaga ? payload.nama_instansi : payload.nama_pemohon,
          nama_pimpinan: isLembaga ? payload.pimpinan_organisasi : null,
          jenis_lembaga: isLembaga ? get('jenisLembaga') : null,
          jumlah_anggota: isLembaga ? (parseInt(get('jumlahAnggota'), 10) || 0) : 0,
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          jenis_kelamin: payload.jenis_kelamin,
          alamat: payload.alamat || null,
          telepon: payload.no_telpon,
          handphone: isLembaga ? null : payload.no_telpon,
          email: payload.email,
          catatan: payload.catatan || '',
          kategori: jenisPengajuanState,
          pekerjaan: payload.pekerjaan || null,
          provinsi: 'Jawa Tengah',
          kabupaten: isKtpSemarang ? 'Kota Semarang' : 'Luar Kota Semarang',
          kecamatan: selectedKecamatan || null,
          kelurahan: selectedKelurahan || null
        });
        if (res.data.mustahik_id) payload.mustahik_id = res.data.mustahik_id;
      } else if (matchedMustahikId) {
        payload.mustahik_id = matchedMustahikId;
        // Keep the Mustahik record updated with latest details
        await axios.put(`/api/mustahik/${matchedMustahikId}`, {
          nik: nikCheckStr,
          nama: isLembaga ? payload.nama_instansi : payload.nama_pemohon,
          nama_pimpinan: isLembaga ? payload.pimpinan_organisasi : null,
          jenis_lembaga: isLembaga ? get('jenisLembaga') : null,
          jumlah_anggota: isLembaga ? (parseInt(get('jumlahAnggota'), 10) || 0) : 0,
          tempat_lahir: payload.tempat_lahir,
          tanggal_lahir: payload.tanggal_lahir,
          jenis_kelamin: payload.jenis_kelamin,
          alamat: payload.alamat || null,
          telepon: payload.no_telpon,
          handphone: isLembaga ? null : payload.no_telpon,
          email: payload.email,
          kategori: jenisPengajuanState,
          pekerjaan: payload.pekerjaan || null,
          provinsi: 'Jawa Tengah',
          kabupaten: isKtpSemarang ? 'Kota Semarang' : 'Luar Kota Semarang',
          kecamatan: selectedKecamatan || null,
          kelurahan: selectedKelurahan || null
        });
      }

      if (editingProposal) {
        const { status: _, ...updatePayload } = payload;
        await axios.put(`/api/proposals/${editingProposal.id}`, updatePayload);
      } else {
        await axios.post('/api/proposals', payload);
      }
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan ke database');
    }
  };

  const handleCekNik = async () => {
    if (nikCheckStr.length !== 16) return;
    setIsCheckingNik(true);
    setNikMessage('');
    setNikStatus('idle');
    setMatchedMustahikId(null);
    try {
      const res = await axios.get(`/api/mustahik/cek-nik/${nikCheckStr}`);
      const { status, mustahik_id, message } = res.data;
      setNikStatus(status);
      setNikMessage(message);
      if (mustahik_id) setMatchedMustahikId(mustahik_id);
      if (status === 'warning') {
        window.alert(message + '\n\nHarap pertimbangkan ulang validitas proposal ini.');
      }
    } catch (err: any) {
      setNikStatus('idle');
      setNikMessage(err.response?.data?.message || 'Gagal mengecek NIK.');
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleEditClick = (proposal: ProposalMemo) => {
    setEditingProposal(proposal);
    setAgendaNoInput(String(proposal.agendaNo || (proposal as any).agenda_no || ''));
    setSelectedKecamatan(proposal.kecamatan || '');
    setSelectedKelurahan(proposal.kelurahan || '');
    setNikCheckStr(proposal.nik || '');
    setNoKk(proposal.no_kk || '');
    setSelectedProgramCode(proposal.programCode || proposal.jenisPermohonan || '');
    const isMemo = Boolean(proposal.hasMemo || (proposal as any).has_memo);
    setHasMemoState(isMemo);
    const rawMemoSource = proposal.memoSource || (proposal as any).memo_source || '';
    if (rawMemoSource.toLowerCase().startsWith('dispo')) {
      setSelectedMemoType('Dispo');
      const clean = rawMemoSource.replace(/^(disposisi|dispo)\s*[:\-]?\s*/i, '').trim();
      setSelectedMemoSource(clean || rawMemoSource);
    } else if (rawMemoSource.toLowerCase().startsWith('memo')) {
      setSelectedMemoType('Memo');
      const clean = rawMemoSource.replace(/^memo\s*[:\-]?\s*/i, '').trim();
      setSelectedMemoSource(clean || rawMemoSource);
    } else {
      setSelectedMemoType('Memo');
      setSelectedMemoSource(rawMemoSource);
    }
    setSelectedGender(proposal.jenis_kelamin || '');
    setSelectedPekerjaan(proposal.pekerjaan || '');
    let dob = proposal.tanggal_lahir || '';
    if (dob.includes('-')) {
      const parts = dob.split('-');
      if (parts[0].length === 4) {
        dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    setTanggalLahirInput(dob);
    setMatchedMustahikId(proposal.mustahik_id || null);

    let isLembaga = false;
    const jp = (proposal as any).jenis_pengajuan || proposal.jenisPengajuan || (proposal as any).kategori || (proposal as any).kategoriPemohon || (proposal as any).mustahik?.kategori;
    if (jp === 'Perorangan') {
      isLembaga = false;
    } else if (jp === 'Lembaga' || jp === 'Kelompok') {
      isLembaga = true;
    } else {
      isLembaga = Boolean(proposal.namaInstansi && proposal.namaInstansi.trim() && proposal.namaInstansi !== '-');
    }
    setJenisPengajuanState(isLembaga ? 'Lembaga' : 'Perorangan');
    
    const isSemarang = kecamatanKelurahanSemarang.some(k => k.kecamatan === proposal.kecamatan);
    setIsKtpSemarang(isSemarang || !proposal.kecamatan);
    setIsModalOpen(true);
  };

  const handleDetailClick = (proposal: ProposalMemo) => {
    setSelectedProposal(proposal);
    setIsDetailModalOpen(true);
  };

  // Buka scan modal
  const handleOpenScanModal = (proposal: ProposalMemo) => {
    setScanTarget(proposal);
    setScanTabMode('file');
    setScanLinkInput('');
    setScanFile(null);
    setIsScanModalOpen(true);
  };

  // Submit scan (file atau link)
  const handleScanSubmit = async () => {
    if (!scanTarget) return;
    setIsScanning(true);
    try {
      const formData = new FormData();
      if (scanTabMode === 'file' && scanFile) {
        if (scanFile.size > 10 * 1024 * 1024) {
          alert('Ukuran file melebihi batas 10MB. Harap kompres atau pilih file yang lebih kecil.');
          setIsScanning(false);
          return;
        }
        formData.append('file', scanFile);
      } else if (scanTabMode === 'link' && scanLinkInput.trim()) {
        formData.append('gdrive_link', scanLinkInput.trim());
      } else {
        alert(scanTabMode === 'file' ? 'Pilih file terlebih dahulu.' : 'Masukkan link Google Drive.');
        setIsScanning(false);
        return;
      }
      await axios.post(`/api/proposals/${scanTarget.id}/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsScanModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan scan proposal.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteData = async (proposalId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus proposal ini? Tindakan ini tidak dapat dibatalkan.',
      actionType: 'delete_proposal',
      targetId: proposalId
    });
  };

  const handlePrintBajuSurat = (proposal: ProposalMemo) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Detect Kode Program / RKAT Activity Code
    const code = (proposal.programCode || proposal.rkatActivityId || proposal.jenisPermohonan || '').trim();
    const isDikdasmen = code.includes('230101') || code.toLowerCase().includes('dikdasmen') || code.includes('1301') || proposal.jenisPermohonan?.toLowerCase().includes('pendidikan dasar');
    const isDikti = code.includes('230102') || code.toLowerCase().includes('dikti') || code.includes('1302') || proposal.jenisPermohonan?.toLowerCase().includes('pendidikan tinggi');
    const isPendidikan = isDikdasmen || isDikti;

    const instansiRaw = (proposal.namaInstansi || '').trim();
    const isInstansiKosong = !instansiRaw || instansiRaw === '-' || instansiRaw === '0';

    // 1. Logika "Surat Dari"
    let suratDari = '';
    if (isPendidikan) {
      suratDari = proposal.namaPemohon || '-';
    } else if (isInstansiKosong) {
      suratDari = proposal.namaPemohon || '-';
    } else {
      suratDari = proposal.namaInstansi || proposal.pimpinanOrganisasi || proposal.namaPemohon || '-';
    }

    // 2. Logika Baris "a.n." (Atas Nama)
    let anText = '';
    const pemohonTrim = (proposal.namaPemohon || '').trim();
    const instansiTrim = (proposal.namaInstansi || '').trim();
    const pimpinanTrim = (proposal.pimpinanOrganisasi || '').trim();
    const anakTrim = (proposal.namaAnak || '').trim();

    if (anakTrim && anakTrim !== '-' && anakTrim !== '0') {
      anText = `a.n. ${anakTrim}`;
    } else if (!isInstansiKosong && !isPendidikan && pemohonTrim && pemohonTrim !== '-' && pemohonTrim !== '0' && pemohonTrim.toLowerCase() !== suratDari.trim().toLowerCase() && pemohonTrim.toLowerCase() !== instansiTrim.toLowerCase() && pemohonTrim.toLowerCase() !== pimpinanTrim.toLowerCase()) {
      anText = `a.n. ${pemohonTrim}`;
    } else {
      anText = '';
    }

    // 3. Logika "Alamat"
    let alamatTampil = '';
    if (isPendidikan) {
      alamatTampil = proposal.namaInstansi || proposal.alamat || '';
    } else {
      alamatTampil = proposal.alamat || '';
    }

    // 4. Logika "Kelurahan" & "Kecamatan"
    let kelurahanTampil = '';
    let kecamatanTampil = '';
    if (isPendidikan) {
      kelurahanTampil = '';
      kecamatanTampil = '';
    } else {
      kelurahanTampil = proposal.kelurahan || '';
      kecamatanTampil = proposal.kecamatan || '';
    }

    const noAgenda = proposal.agendaNo || '';
    const noSurat = (proposal as any).noSurat || '';
    const tglMasuk = formatTanggalIndo(proposal.tanggalMasuk);
    
    // Kode Kegiatan (Program Code) & Perihal Judul
    const programCodeStr = (proposal.programCode || (proposal as any).rkatActivityId || '').trim();
    const perihalJudul = programCodeStr
      ? `${programCodeStr} || ${proposal.jenisPermohonan || ''}`
      : (proposal.jenisPermohonan || '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Disposisi Proposal - ${noAgenda}</title>
          <style>
              @page {
                  size: A5 landscape;
                  margin: 0.11in 0.4in 0.11in 0.4in;
              }
              
              * {
                  box-sizing: border-box;
              }

              html, body {
                  height: 100%;
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }

              body {
                  font-family: 'Times New Roman', Times, serif;
                  background-color: #ffffff;
                  color: #000000;
                  display: flex;
                  justify-content: center;
              }

              .container {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  background: white;
                  margin: 0 auto;
                  box-sizing: border-box;
              }

              @media print {
                  @page {
                      size: A5 landscape;
                      margin: 0.11in 0.4in 0.11in 0.4in;
                  }
                  html, body {
                      height: 100% !important;
                      max-height: 100vh !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      overflow: hidden !important;
                  }
                  .container {
                      width: 100% !important;
                      height: auto !important;
                      max-height: 100% !important;
                      box-shadow: none !important;
                      overflow: hidden !important;
                      justify-content: flex-start !important;
                      page-break-after: avoid !important;
                      page-break-before: avoid !important;
                      page-break-inside: avoid !important;
                  }
                  table, tr, td, th, div {
                      page-break-after: avoid !important;
                      page-break-before: avoid !important;
                      page-break-inside: avoid !important;
                  }
              }

              .header {
                  text-align: center;
                  margin-bottom: -10px;
                  flex-shrink: 0;
              }
              
              .logo-img {
                  height: 110px;
                  max-width: 100%;
                  object-fit: contain;
              }

              table {
                  width: 100%;
                  border-collapse: collapse;
                  font-family: 'Times New Roman', Times, serif;
                  color: #000000;
              }

              th, td {
                  border: 2px solid #000000 !important;
                  padding: 5px 8px;
                  font-size: 18px;
                  line-height: 1.3;
                  vertical-align: middle;
                  box-sizing: border-box;
              }

              .label-text {
                  font-weight: bold;
                  font-size: 18px;
              }

              .colon-sep {
                  font-weight: bold;
                  text-align: center;
                  width: 12px;
                  padding-left: 0;
                  padding-right: 0;
                  font-size: 18px;
              }

              .value-text {
                  font-weight: bold;
                  font-size: 18px;
              }

              .surat-dari-cell {
                  padding: 6px 10px;
                  height: 52px;
                  min-height: 52px;
                  vertical-align: middle;
              }

              .no-surat-cell {
                  padding: 4px 10px;
                  height: 32px;
                  min-height: 32px;
                  vertical-align: middle;
              }

              .perihal-cell {
                  padding: 8px 12px;
                  vertical-align: middle;
                  height: 135px;
                  min-height: 135px;
              }

              .perihal-wrapper {
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  gap: 8px;
                  height: 100%;
                  min-height: 120px;
                  padding: 4px 0;
                  box-sizing: border-box;
              }

              .perihal-header {
                  display: flex;
                  align-items: flex-start;
                  font-weight: bold;
                  font-size: 18px;
                  line-height: 1.35;
                  width: 100%;
                  margin-bottom: auto;
              }

              .perihal-title-text {
                  width: 65%;
                  padding-right: 12px;
                  word-break: break-word;
                  box-sizing: border-box;
              }

              .perihal-title-text-full {
                  width: 100%;
                  word-break: break-word;
              }

              .an-text {
                  width: 35%;
                  white-space: normal;
                  word-break: break-word;
                  font-weight: bold;
                  font-size: 18px;
                  text-align: left;
                  box-sizing: border-box;
              }

              .perihal-locations {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  font-weight: bold;
                  font-size: 17px;
                  line-height: 1.25;
                  width: 100%;
                  margin-top: auto;
                  padding-top: 6px;
                  gap: 12px;
                  box-sizing: border-box;
              }

              .location-col {
                  box-sizing: border-box;
                  word-break: break-word;
              }

              .location-alamat {
                  flex: 1 1 ${(kelurahanTampil || kecamatanTampil) ? '50%' : '100%'};
                  max-width: ${(kelurahanTampil || kecamatanTampil) ? '52%' : '100%'};
                  text-align: left;
                  white-space: normal;
              }

              .location-kelurahan {
                  flex: 0 0 24%;
                  max-width: 25%;
                  text-align: left;
              }

              .location-kecamatan {
                  flex: 0 0 24%;
                  max-width: 25%;
                  text-align: left;
              }

              .disposisi-table-container {
                  margin-top: 5px;
                  flex-shrink: 0;
              }

              .disposisi-header {
                  text-align: center;
                  font-weight: bold;
                  font-size: 20px;
                  letter-spacing: 0.5px;
                  padding: 4px 0;
                  background-color: #ffffff;
              }

              .disposisi-title {
                  text-align: center;
                  font-weight: bold;
                  font-size: 18px;
                  margin-bottom: 4px;
              }

              .disposisi-box {
                  height: 130px;
                  min-height: 130px;
                  vertical-align: top;
                  padding-top: 6px;
              }
          </style>
      </head>
      <body>

          <div class="container">
              
              <!-- Header Logo -->
              <div class="header">
                  <img class="logo-img" src="${window.location.origin}/LogoBAZNASSMG.png" onerror="this.onerror=null; this.src='${LOGO_BAZNAS_BASE64}';" alt="Logo BAZNAS" />
              </div>

              <!-- Info Proposal Table -->
              <table>
                  <tbody>
                      <tr>
                          <td style="width: 18%;" class="label-text surat-dari-cell">Surat dari</td>
                          <td class="colon-sep surat-dari-cell">:</td>
                          <td style="width: 32%;" class="value-text surat-dari-cell">${suratDari}</td>
                          <td style="width: 22%;" class="label-text surat-dari-cell">Diterima tanggal</td>
                          <td class="colon-sep surat-dari-cell">:</td>
                          <td style="width: 23%;" class="value-text surat-dari-cell">${tglMasuk}</td>
                      </tr>
                      <tr>
                          <td class="label-text no-surat-cell">Nomor Surat</td>
                          <td class="colon-sep no-surat-cell">:</td>
                          <td class="value-text no-surat-cell">${noSurat}</td>
                          <td class="label-text no-surat-cell">No. Agenda</td>
                          <td class="colon-sep no-surat-cell">:</td>
                          <td class="value-text no-surat-cell">${noAgenda}</td>
                      </tr>
                      <tr>
                          <td class="label-text" style="vertical-align: middle;">Perihal</td>
                          <td class="colon-sep" style="vertical-align: middle;">:</td>
                          <td colspan="4" class="perihal-cell">
                              <div class="perihal-wrapper">
                                  <div class="perihal-header">
                                      <div class="${anText ? 'perihal-title-text' : 'perihal-title-text-full'}">${perihalJudul}</div>
                                      ${anText ? `<div class="an-text">${anText}</div>` : ''}
                                  </div>
                                  ${(alamatTampil || kelurahanTampil || kecamatanTampil) ? `
                                  <div class="perihal-locations">
                                      <div class="location-col location-alamat">${(alamatTampil || '').replace(/\r?\n/g, '<br/>')}</div>
                                      ${kelurahanTampil ? `<div class="location-col location-kelurahan">${kelurahanTampil}</div>` : ''}
                                      ${kecamatanTampil ? `<div class="location-col location-kecamatan">${kecamatanTampil}</div>` : ''}
                                  </div>
                                  ` : ''}
                              </div>
                          </td>
                      </tr>
                  </tbody>
              </table>

              <!-- ISI DISPOSISI Table -->
              <div class="disposisi-table-container">
                  <table>
                      <thead>
                          <tr>
                              <th colspan="3" class="disposisi-header">ISI DISPOSISI</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td style="width: 35%;" class="disposisi-box">
                                  <div class="disposisi-title"><u>Ketua</u></div>
                              </td>
                              <td style="width: 45%;" class="disposisi-box">
                                  <div class="disposisi-title"><u>Kepala Pelaksana</u></div>
                              </td>
                              <td style="width: 20%;" class="disposisi-box">
                                  <div class="disposisi-title"><u>Kabag. Administrasi</u></div>
                              </td>
                          </tr>
                      </tbody>
                  </table>
              </div>

          </div>

          <script>
              function triggerPrint() {
                  window.focus();
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
              }
              window.onload = function() {
                  const img = document.querySelector('.logo-img');
                  if (img && !img.complete) {
                      img.onload = triggerPrint;
                      img.onerror = triggerPrint;
                  } else {
                      triggerPrint();
                  }
              };
          </script>

      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Registrasi': return 'bg-slate-100 text-slate-600';
      case 'Scan Proposal':
      case 'Scan_Proposal': return 'bg-blue-100 text-blue-700';
      case 'Review Kabag':
      case 'Review Kabag Admin':
      case 'Review Kabag Administrasi': return 'bg-indigo-100 text-indigo-700';
      case 'Survei & Asessment': return 'bg-amber-100 text-amber-700';
      case 'Review Kepala Pelaksana': return 'bg-blue-100 text-blue-700';
      case 'Persetujuan Pimpinan': return 'bg-purple-100 text-purple-700';
      case 'Penentuan Nominal': return 'bg-pink-100 text-pink-700';
      case 'Pencairan Dana': return 'bg-cyan-100 text-cyan-700';
      case 'Selesai & Arsip': return 'bg-emerald-100 text-emerald-700';
      case 'Ditolak': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 min-h-screen bg-slate-50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Administrasi</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Input Proposal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Input Proposal
        </h2>
        <p className="text-slate-500 font-medium">
          Registrasi dan verifikasi berkas proposal permohonan bantuan secara formal.
        </p>
      </motion.div>

      {/* Stats Cards — 3 card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Proposal Baru"
          value={proposalBulanIni.toString()}
          icon={<Newspaper className="size-5" />}
          color="emerald"
          subtitle="(Bulan Ini)"
          trend="Bulan Ini"
        />
        <StatCard 
          title="Menunggu Scan"
          value={menungguScan.toString()}
          icon={<Clock className="size-5" />}
          color="amber"
        />
        <StatCard 
          title="Memo / Dispo Pimpinan"
          value={memoPimpinan.toString()}
          icon={<History className="size-5" />}
          color="blue"
        />
      </motion.div>

      {/* Table Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Pemohon..."
                className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="text-xs font-bold text-slate-500">Status: Registrasi</span>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
            >
              <ClipboardList className="size-4" />
              Cetak Laporan / Rekap
            </button>
            <button 
              onClick={() => {
                setEditingProposal(null);
                setAgendaNoInput(String(suggestedNextAgenda));
                setNikCheckStr('');
                setNoKk('');
                setNikStatus('idle');
                setNikMessage('');
                setMatchedMustahikId(null);
                setSelectedKecamatan('');
                setSelectedKelurahan('');
                setJenisPengajuanState('Perorangan');
                setIsKtpSemarang(true);
                setSelectedProgramCode('');
                setProgramSearchQuery('');
                setTanggalLahirInput('');
                setHasMemoState(false);
                setSelectedMemoType('Memo');
                setSelectedMemoSource('');
                setSelectedGender('');
                setSelectedPekerjaan('');
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="size-4" />
              Tambah Data Baru
            </button>
            <button
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Upload className="size-4" />
              Migrasi Proposal
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Tanggal Masuk</th>
                <th className="px-6 py-4">Pemohon / Instansi</th>
                <th className="px-6 py-4">Jenis Permohonan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Tidak ada proposal yang menunggu scan</p>
                    <p className="text-xs mt-1">Tambah data baru atau semua sudah discan</p>
                  </td>
                </tr>
              ) : filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                      {item.agendaNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{item.tanggalMasuk}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{item.jamPengajuan}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {item.namaAnak ? item.namaAnak : (item.jenisPengajuan === 'Lembaga' || item.namaInstansi ? (item.namaInstansi || item.namaPemohon) : item.namaPemohon)}
                        </p>
                        {item.hasMemo && (
                          <div className="group/memo relative flex items-center gap-1">
                            <AlertCircle className={cn("size-3 cursor-help", item.memoSource?.toLowerCase().includes('dispo') ? "text-amber-500" : "text-emerald-500")} />
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 rounded leading-tight",
                              item.memoSource?.toLowerCase().includes('dispo')
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            )}>
                              {item.memoSource?.toLowerCase().includes('dispo') ? 'Dispo' : 'Memo'}
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/memo:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg">
                              {item.memoSource || (item.memoSource?.toLowerCase().includes('dispo') ? 'Disposisi Pimpinan' : 'Memo Pimpinan')}
                            </div>
                          </div>
                        )}
                      </div>
                      {item.namaAnak ? (
                        <span className="text-[10px] text-slate-500 font-medium">{item.namaInstansi || item.namaPemohon || 'Anak / Siswa'}</span>
                      ) : item.jenisPengajuan === 'Lembaga' || item.namaInstansi ? (
                        <span className="text-[10px] text-slate-500 font-medium">{item.namaPemohon || 'Lembaga'}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium uppercase">{item.namaInstansi || 'Perorangan'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate font-medium">
                    {item.jenisPermohonan}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-full uppercase whitespace-nowrap",
                      getStatusColor(item.status)
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDetailClick(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" 
                        title="Detail"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button 
                        onClick={() => handlePrintBajuSurat(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors" 
                        title="Print Baju Surat"
                      >
                        <Printer className="size-4" />
                      </button>
                      
                      {/* Tombol Kirim ke Humas — hanya saat status Registrasi dan bukan untuk Humas */}
                      {item.status.toLowerCase().replace(/_/g, ' ') === 'registrasi' && user?.role !== 'Humas' && (
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Kirim ke Humas',
                              message: 'Apakah Anda yakin ingin mengirim proposal ini ke bagian Humas untuk proses Scan?',
                              actionType: 'send_humas',
                              targetId: item.id
                            });
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-xl transition-colors" 
                          title="Kirim ke Humas"
                        >
                          <Send className="size-4" />
                        </button>
                      )}

                      {/* Tombol Scan Proposal — saat status Scan Proposal */}
                      {item.status.toLowerCase().replace(/_/g, ' ') === 'scan proposal' && (
                        <button 
                          onClick={() => handleOpenScanModal(item)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-colors" 
                          title="Scan Proposal"
                        >
                          <FileCheck className="size-4" />
                        </button>
                      )}

                      <button 
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl transition-colors" 
                        title="Edit"
                      >
                        <Edit2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredData.length} dari {data.length} data menunggu scan
          </p>
          <div className="flex gap-1">
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronLeft className="size-4" />
            </button>
            <button className="w-8 h-8 bg-primary text-white rounded-lg font-bold text-xs">1</button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors text-slate-400">
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── Scan Proposal Modal ─── */}
      <AnimatePresence>
        {isScanModalOpen && scanTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isScanning && setIsScanModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <FileCheck className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Scan Proposal</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      No. Agenda: <span className="font-bold text-blue-600">{scanTarget.agendaNo}</span> · {scanTarget.namaPemohon}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => !isScanning && setIsScanModalOpen(false)}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="size-4 text-slate-400" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Info banner */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Setelah scan berhasil, status proposal akan otomatis berubah ke <span className="font-bold">Review Kabag</span> dan hilang dari daftar ini.
                  </p>
                </div>

                {/* Tab switcher */}
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setScanTabMode('file')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      scanTabMode === 'file' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Upload className="size-3.5" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setScanTabMode('link')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                      scanTabMode === 'link' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Link className="size-3.5" />
                    Insert Link
                  </button>
                </div>

                  {/* Live preview saat insert link */}
                  <AnimatePresence mode="wait">
                    {scanTabMode === 'file' ? (
                      <motion.div
                        key="file-tab"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-2"
                      >
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          File Proposal (PDF / Gambar)
                        </label>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                            scanFile 
                              ? "border-blue-300 bg-blue-50" 
                              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
                          )}
                        >
                          {scanFile ? (
                            <>
                              <FileCheck className="size-8 text-blue-500" />
                              <p className="text-xs font-bold text-blue-700 text-center break-all">{scanFile.name}</p>
                              <p className="text-[10px] text-blue-500">{(scanFile.size / 1024).toFixed(1)} KB</p>
                            </>
                          ) : (
                            <>
                              <Upload className="size-8 text-slate-300" />
                              <p className="text-xs font-bold text-slate-500">Klik untuk pilih file</p>
                              <p className="text-[10px] text-slate-400">PDF, JPG, PNG (maks. 10MB)</p>
                            </>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0] || null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              alert('Ukuran file melebihi batas 10MB. Harap kompres atau pilih file yang lebih kecil.');
                              e.target.value = '';
                              return;
                            }
                            setScanFile(f);
                          }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="link-tab"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Link Google Drive
                        </label>
                        <div className="relative">
                          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <input
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none transition-all"
                            value={scanLinkInput}
                            onChange={e => setScanLinkInput(e.target.value)}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Pastikan link sudah di-set "Anyone with the link can view" di Google Drive.
                        </p>
                        {/* Live embed preview */}
                        {toGDriveEmbedUrl(scanLinkInput) && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <Monitor className="size-3 text-blue-500" />
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Preview Dokumen</p>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-blue-200 bg-slate-100" style={{ height: '240px' }}>
                              <iframe
                                src={toGDriveEmbedUrl(scanLinkInput)!}
                                className="w-full h-full"
                                title="Preview dokumen proposal"
                                allow="autoplay"
                              />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={handleScanSubmit}
                  disabled={isScanning || (scanTabMode === 'file' ? !scanFile : !scanLinkInput.trim())}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FileCheck className="size-4" />
                      Simpan & Teruskan
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Detail Modal ─── */}
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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Proposal</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedProposal.agendaNo}</p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                {/* Status Banner */}
                <div className={cn(
                  "p-4 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between border",
                  getStatusColor(selectedProposal.status).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'border-')
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", getStatusColor(selectedProposal.status))}>
                      <ClipboardList className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Saat Ini</p>
                      <p className="font-bold text-slate-900">{selectedProposal.status}</p>
                    </div>
                  </div>
                  <div className="sm:text-right pl-11 sm:pl-0">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tanggal Masuk</p>
                    <p className="font-bold text-slate-900">{selectedProposal.tanggalMasuk}</p>
                  </div>
                </div>

                {/* Embedded file preview jika ada */}
                {selectedProposal.fileGdriveLink && toGDriveEmbedUrl(selectedProposal.fileGdriveLink) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileSearch className="size-4 text-blue-500" />
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Dokumen Proposal</h4>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm" style={{ height: '380px' }}>
                      <iframe
                        src={toGDriveEmbedUrl(selectedProposal.fileGdriveLink)!}
                        className="w-full h-full bg-slate-100"
                        title="Dokumen proposal"
                        allow="autoplay"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {/* Data Pemohon */}
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                    <div className="space-y-4">
                      <DetailItem 
                        label={(selectedProposal.jenisPengajuan === 'Lembaga' || selectedProposal.namaInstansi) ? "Nama Instansi" : "Nama Lengkap"} 
                        value={(selectedProposal.jenisPengajuan === 'Lembaga' || selectedProposal.namaInstansi) ? (selectedProposal.namaInstansi || selectedProposal.namaPemohon) : selectedProposal.namaPemohon} 
                      />
                      <DetailItem label="NIK" value={selectedProposal.nik} />
                      <DetailItem label="No. KK" value={selectedProposal.no_kk || (selectedProposal as any).noKk || '-'} />
                      <DetailItem label="Nama Anak" value={selectedProposal.namaAnak || '-'} />
                      <DetailItem label="Tempat Lahir" value={selectedProposal.tempat_lahir || '-'} />
                      <DetailItem label="Tanggal Lahir" value={selectedProposal.tanggal_lahir || '-'} />
                      <DetailItem label="Jenis Kelamin" value={selectedProposal.jenis_kelamin || '-'} />
                      <DetailItem label="Pekerjaan" value={selectedProposal.pekerjaan || '-'} />
                      <DetailItem label="Handphone" value={selectedProposal.noTelpon || '-'} />
                      <DetailItem label="Email" value={selectedProposal.email || '-'} />
                    </div>
                  </div>

                  {/* Alamat */}
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Alamat</h4>
                    <div className="space-y-4">
                      <DetailItem label="Alamat Lengkap" value={selectedProposal.alamat} />
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Kelurahan" value={selectedProposal.kelurahan} />
                        <DetailItem label="Kecamatan" value={selectedProposal.kecamatan} />
                      </div>
                    </div>
                  </div>

                  {/* Informasi Pengajuan */}
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengajuan</h4>
                    <div className="space-y-4">
                      <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                      <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || '-'} />
                      <DetailItem label="Pimpinan" value={selectedProposal.pimpinanOrganisasi || '-'} />
                      <DetailItem label="Jam Pengajuan" value={selectedProposal.jamPengajuan} />
                      <DetailItem label="Yang Mengajukan" value={selectedProposal.yangMengajukan || '-'} />
                      <DetailItem label="Catatan" value={selectedProposal.catatan || selectedProposal.keterangan || '-'} />
                    </div>
                  </div>

                  {selectedProposal.hasMemo && (
                    <div className={cn(
                      "p-4 rounded-xl border",
                      selectedProposal.memoSource?.toLowerCase().includes('dispo')
                        ? "bg-amber-50/80 border-amber-100"
                        : "bg-emerald-50/80 border-emerald-100"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-2",
                        selectedProposal.memoSource?.toLowerCase().includes('dispo')
                          ? "text-amber-700"
                          : "text-emerald-700"
                      )}>
                        <History className="size-4" />
                        <span className="text-xs font-black uppercase tracking-widest">
                          {selectedProposal.memoSource?.toLowerCase().includes('dispo') ? 'Disposisi Pimpinan' : 'Memo Pimpinan'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">Sumber: {selectedProposal.memoSource || '-'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                {selectedProposal && (
                  <button 
                    onClick={() => handlePrintBajuSurat(selectedProposal)}
                    className="flex-1 px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="size-4" />
                    <span className="hidden md:inline">Baju Surat</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditClick(selectedProposal);
                  }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="size-4" />
                  <span className="hidden md:inline">Edit Data</span>
                </button>
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenScanModal(selectedProposal);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="size-4" />
                  <span className="hidden md:inline">Scan Proposal</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Add / Edit Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProposal(null);
                setAgendaNoInput('');
                setNoKk('');
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">
                  {editingProposal ? 'Edit Proposal' : 'Input Proposal Baru'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProposal(null);
                    setAgendaNoInput('');
                    setNoKk('');
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <form key={editingProposal ? editingProposal.id : 'new'} onSubmit={handleAddData} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Informasi Pengajuan */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Informasi Pengajuan</h4>
                    
                    {/* Input No. Agenda (Untuk Input Baru & Edit) */}
                    <div className="space-y-2 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/90 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Hash className="size-3.5 text-amber-600" />
                          No. Agenda Proposal *
                        </label>
                        <span className="text-[10px] text-amber-700 font-medium">
                          {editingProposal ? 'Ubah jika ada koreksi urutan agenda' : 'Nomor urut otomatis (bisa disesuaikan)'}
                        </span>
                      </div>
                      <input 
                        required 
                        name="agendaNo" 
                        type="number" 
                        min="1"
                        value={agendaNoInput}
                        onChange={(e) => setAgendaNoInput(e.target.value)}
                        className={cn(
                          "w-full bg-white border rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 outline-none transition-all shadow-xs",
                          duplicateProposal 
                            ? "border-amber-400 focus:ring-amber-400 bg-amber-50/20" 
                            : "border-amber-300 focus:ring-amber-400"
                        )}
                        placeholder="e.g. 925"
                      />
                      {duplicateProposal && (
                        <div className="p-3 bg-amber-100/90 border border-amber-300/80 rounded-xl text-xs text-amber-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <AlertCircle className="size-4 text-amber-600 shrink-0" />
                            <span>Perhatian: No. Agenda {agendaNoInput} sudah terdaftar</span>
                          </div>
                          <p className="text-[11px] text-amber-900">
                            Digunakan oleh: <span className="font-bold">{duplicateProposal.namaPemohon || duplicateProposal.namaInstansi || 'Tanpa Nama'}</span> ({duplicateProposal.jenisPengajuan || 'Perorangan'})
                            {duplicateProposal.tanggalMasuk ? ` · Tanggal Masuk: ${duplicateProposal.tanggalMasuk}` : ''}.
                          </p>
                          <p className="text-[10px] text-amber-800 font-semibold italic">
                            * Anda tetap dapat menyimpannya jika nomor agenda ini memang sesuai.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Masuk</label>
                        <input required name="tanggalMasuk" type="date" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingProposal?.tanggalMasuk || new Date().toISOString().split('T')[0]} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jam Pengajuan</label>
                        <input required name="jamPengajuan" type="time" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingProposal?.jamPengajuan || new Date().toTimeString().split(' ')[0].slice(0, 5)} />
                      </div>
                    </div>

                     <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Permohonan (Program) *</label>
                      <div className="relative">
                        <input type="hidden" name="jenisPermohonan" value={selectedProgramCode} required />
                        <button
                          type="button"
                          onClick={() => setIsProgramDropdownOpen(!isProgramDropdownOpen)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center"
                        >
                          <span className={selectedProgramCode ? "text-slate-800 font-medium" : "text-slate-400"}>
                            {selectedProgramName}
                          </span>
                          <span className="text-slate-400">▼</span>
                        </button>

                        {isProgramDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProgramDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                              <input
                                type="text"
                                placeholder="Cari program..."
                                value={programSearchQuery}
                                onChange={(e) => setProgramSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                autoFocus
                              />
                              <div className="max-h-56 overflow-y-auto space-y-2 text-left">
                                {filteredPilars.length > 0 ? (
                                  filteredPilars.map(pilar => (
                                    <div key={pilar.code} className="space-y-1">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-50 rounded">
                                        {pilar.name}
                                      </div>
                                      {pilar.programs.map(prog => (
                                        <button
                                          key={prog.code}
                                          type="button"
                                          onClick={() => {
                                            setSelectedProgramCode(prog.code);
                                            setIsProgramDropdownOpen(false);
                                            setProgramSearchQuery('');
                                          }}
                                          className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex justify-between items-center",
                                            selectedProgramCode === prog.code
                                              ? "bg-primary text-white font-bold"
                                              : "text-slate-700 hover:bg-slate-100"
                                          )}
                                        >
                                          <span>{prog.code} - {prog.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center text-xs text-slate-400 py-4">
                                    Tidak ada program yang cocok
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {jenisPengajuanState === 'Perorangan' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Instansi (Opsional)</label>
                          <input name="namaInstansi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama organisasi/lembaga..." defaultValue={editingProposal?.namaInstansi || ""} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pimpinan Organisasi (Opsional)</label>
                          <input name="pimpinanOrganisasi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pimpinan..." defaultValue={editingProposal?.pimpinanOrganisasi || ""} />
                        </div>
                      </>
                    )}

                    <div className={cn(
                      "p-4 rounded-2xl border transition-all space-y-3",
                      hasMemoState 
                        ? (selectedMemoType === 'Dispo' ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200") 
                        : "bg-slate-50 border-slate-200/80"
                    )}>
                      <div className="flex items-center justify-between">
                        <label 
                          onClick={() => setHasMemoState(!hasMemoState)}
                          className={cn(
                            "text-xs font-bold flex items-center gap-2 cursor-pointer select-none",
                            hasMemoState 
                              ? (selectedMemoType === 'Dispo' ? "text-amber-800" : "text-emerald-800") 
                              : "text-slate-600"
                          )}
                        >
                          <History className="size-4" />
                          Ada Memo / Disposisi Pimpinan?
                        </label>
                        <input 
                          type="checkbox" 
                          name="hasMemo" 
                          checked={hasMemoState} 
                          onChange={(e) => setHasMemoState(e.target.checked)}
                          className="size-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                        />
                      </div>

                      {hasMemoState && (
                        <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Dropdown / Pilihan Tipe: Memo atau Dispo */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Jenis Arahan
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsMemoTypeDropdownOpen(!isMemoTypeDropdownOpen)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center shadow-sm"
                              >
                                <span className="flex items-center gap-1.5 text-slate-800">
                                  <span className={cn("size-2 rounded-full", selectedMemoType === 'Dispo' ? "bg-amber-500" : "bg-emerald-500")} />
                                  {selectedMemoType}
                                </span>
                                <span className="text-slate-400 text-[10px]">▼</span>
                              </button>

                              {isMemoTypeDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsMemoTypeDropdownOpen(false)} />
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-1 text-left">
                                    {[
                                      { value: 'Memo', label: 'Memo', desc: 'Memo Tertulis Pimpinan' },
                                      { value: 'Dispo', label: 'Dispo', desc: 'Disposisi Surat Masuk' }
                                    ].map(opt => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          setSelectedMemoType(opt.value as 'Memo' | 'Dispo');
                                          setIsMemoTypeDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col",
                                          selectedMemoType === opt.value
                                            ? (opt.value === 'Dispo' ? "bg-amber-500 text-white font-bold" : "bg-emerald-600 text-white font-bold")
                                            : "text-slate-700 hover:bg-slate-100"
                                        )}
                                      >
                                        <span className="font-bold">{opt.label}</span>
                                        <span className={cn("text-[10px]", selectedMemoType === opt.value ? "text-white/80" : "text-slate-400")}>{opt.desc}</span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Dropdown: Sumber Memo / Dispo */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Sumber {selectedMemoType}
                            </label>
                            <div className="relative">
                              <input 
                                type="hidden" 
                                name="memoSource" 
                                value={selectedMemoSource ? `${selectedMemoType} ${selectedMemoSource.replace(/^(memo|dispo|disposisi)\s*[:\-]?\s*/i, '').trim()}` : ''} 
                              />
                              <button
                                type="button"
                                onClick={() => setIsMemoDropdownOpen(!isMemoDropdownOpen)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center shadow-sm"
                              >
                                <span className={selectedMemoSource ? "text-slate-800 truncate" : "text-slate-400"}>
                                  {selectedMemoSource.replace(/^(memo|dispo|disposisi)\s*[:\-]?\s*/i, '').trim() || "Pilih Sumber..."}
                                </span>
                                <span className="text-slate-400 text-[10px]">▼</span>
                              </button>

                              {isMemoDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsMemoDropdownOpen(false)} />
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto p-1 space-y-1 custom-scrollbar text-left">
                                    {[
                                      { value: "", label: "Pilih Sumber..." },
                                      { value: "Ketua BAZNAS", label: "Ketua BAZNAS" },
                                      { value: "Wakil Ketua I", label: "Wakil Ketua I" },
                                      { value: "Wakil Ketua II", label: "Wakil Ketua II" },
                                      { value: "Wakil Ketua III", label: "Wakil Ketua III" },
                                      { value: "Wakil Ketua IV", label: "Wakil Ketua IV" },
                                      { value: "Kepala Pelaksana", label: "Kepala Pelaksana" }
                                    ].map(opt => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          setSelectedMemoSource(opt.value);
                                          setIsMemoDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                          selectedMemoSource.replace(/^(memo|dispo|disposisi)\s*[:\-]?\s*/i, '').trim() === opt.value
                                            ? (selectedMemoType === 'Dispo' ? "bg-amber-500 text-white font-bold" : "bg-emerald-600 text-white font-bold")
                                            : "text-slate-700 hover:bg-slate-100"
                                        )}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Data Pemohon */}
                  <div className="space-y-4">
                    {/* NIK + Jenis Pengajuan */}
                    <div className="space-y-2 pb-4 border-b border-primary/5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          {jenisPengajuanState === 'Perorangan' ? 'NIK *' : 'NIK Pimpinan / Ketua *'}
                          <span className="text-amber-500 font-bold lowercase bg-amber-50 px-1 rounded">Cek Riwayat 1 Tahun</span>
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            maxLength={16}
                            placeholder={jenisPengajuanState === 'Perorangan' ? "Masukkan 16 digit NIK..." : "NIK Pimpinan..."}
                            className={cn(
                              'flex-1 rounded-xl px-4 py-2.5 text-sm focus:ring-2 outline-none transition-all font-mono tracking-widest',
                              nikStatus === 'success'     ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 focus:ring-emerald-200' :
                              nikStatus === 'warning'     ? 'bg-amber-50 border border-amber-200 text-amber-900 focus:ring-amber-200' :
                              nikStatus === 'new'         ? 'bg-blue-50 border border-blue-200 text-blue-900 focus:ring-blue-200' :
                              nikStatus === 'pending_nrm' ? 'bg-orange-50 border border-orange-200 text-orange-900 focus:ring-orange-200' :
                              'bg-amber-50 border border-amber-200 text-amber-900 focus:ring-amber-200'
                            )}
                            value={nikCheckStr}
                            onChange={(e) => { setNikCheckStr(e.target.value); setNikStatus('idle'); setNikMessage(''); setMatchedMustahikId(null); }}
                          />
                          <button 
                            type="button" 
                            onClick={handleCekNik}
                            disabled={isCheckingNik || nikCheckStr.length !== 16}
                            className="px-4 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
                          >
                            {isCheckingNik ? 'Mengecek...' : 'Cek NIK'}
                          </button>
                        </div>
                        {matchedMustahikId && <input type="hidden" name="mustahik_id" value={matchedMustahikId} />}
                        {nikMessage && (
                          <p className={cn(
                            'text-[10px] font-bold mt-1 flex items-center gap-1',
                            nikStatus === 'success'     ? 'text-emerald-600' :
                            nikStatus === 'new'         ? 'text-blue-600' :
                            nikStatus === 'pending_nrm' ? 'text-orange-600' :
                            'text-amber-600'
                          )}>
                            {nikMessage}
                          </p>
                        )}
                      </div>

                      {/* No KK (Only for Perorangan) */}
                      {jenisPengajuanState === 'Perorangan' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. KK (Kartu Keluarga)</label>
                          <input
                            type="text"
                            maxLength={16}
                            placeholder="Masukkan 16 digit No KK..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono tracking-widest"
                            value={noKk}
                            onChange={(e) => setNoKk(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Jenis Pengajuan */}
                      <div className="flex items-center gap-3 pt-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Jenis Pengajuan</label>
                        <div className="flex gap-2 items-center">
                          {['Perorangan', 'Lembaga'].map(jenis => (
                            <label key={jenis} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="jenis_pengajuan"
                                value={jenis}
                                checked={jenisPengajuanState === jenis}
                                onChange={() => setJenisPengajuanState(jenis as any)}
                                className="accent-primary"
                              />
                              <span className="text-xs font-semibold text-slate-600">{jenis}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">
                      {jenisPengajuanState === 'Perorangan' ? 'Data Pemohon' : 'Data Lembaga'}
                    </h4>
                    
                    {jenisPengajuanState === 'Perorangan' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nama Pemohon *
                          </label>
                          <input required name="namaPemohon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama lengkap..." defaultValue={editingProposal?.namaPemohon || ""} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anak (Opsional)</label>
                          <input name="namaAnak" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Jika pendidikan..." defaultValue={editingProposal?.namaAnak || ""} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Kelamin *</label>
                          <div className="relative">
                            <input type="hidden" name="jenis_kelamin" value={selectedGender} required />
                            <button
                              type="button"
                              onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center"
                            >
                              <span className={selectedGender ? "text-slate-800 font-medium" : "text-slate-400"}>
                                {selectedGender || "Pilih..."}
                              </span>
                              <span className="text-slate-400">▼</span>
                            </button>

                            {isGenderDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsGenderDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 text-left">
                                  {[
                                    { value: "Pria", label: "Pria" },
                                    { value: "Wanita", label: "Wanita" }
                                  ].map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setSelectedGender(opt.value);
                                        setIsGenderDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                        selectedGender === opt.value
                                          ? "bg-primary text-white font-bold"
                                          : "text-slate-700 hover:bg-slate-100"
                                      )}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempat Lahir</label>
                          <input required name="tempat_lahir" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kota" defaultValue={editingProposal?.tempat_lahir || ""} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Lahir *</label>
                          <input 
                            required 
                            name="tanggal_lahir" 
                            type="text" 
                            placeholder="DD-MM-YYYY"
                            maxLength={10}
                            value={tanggalLahirInput}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, ''); // Keep only digits
                              if (val.length > 8) val = val.slice(0, 8);
                              // Format as DD-MM-YYYY
                              let formatted = val;
                              if (val.length > 4) {
                                formatted = `${val.slice(0, 2)}-${val.slice(2, 4)}-${val.slice(4)}`;
                              } else if (val.length > 2) {
                                formatted = `${val.slice(0, 2)}-${val.slice(2)}`;
                              }
                              setTanggalLahirInput(formatted);
                            }}
                            className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono tracking-wider" 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nama Lembaga *
                          </label>
                          <input required name="namaInstansi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama instansi/lembaga..." defaultValue={editingProposal?.namaInstansi || (editingProposal as any)?.mustahik?.nama || ""} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nama Pimpinan / Ketua *
                          </label>
                          <input required name="pimpinanOrganisasi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pimpinan/ketua..." defaultValue={editingProposal?.pimpinanOrganisasi || (editingProposal as any)?.mustahik?.nama_pimpinan || ""} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nama Pemohon (Opsional)
                          </label>
                          <input name="namaPemohon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pemohon..." defaultValue={editingProposal?.namaPemohon || ""} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Lembaga *</label>
                          <input required name="jenisLembaga" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Yayasan, Masjid, Kelompok, dll..." defaultValue={(editingProposal as any)?.mustahik?.jenis_lembaga || (editingProposal as any)?.jenisLembaga || "Lembaga"} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Anggota (Opsional)</label>
                          <input name="jumlahAnggota" type="number" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Jumlah..." defaultValue={(editingProposal as any)?.mustahik?.jumlah_anggota || (editingProposal as any)?.jumlahAnggota || ""} />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                      <textarea required name="alamat" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat domisili..." defaultValue={editingProposal?.alamat || ""} />
                    </div>

                    <div className="flex">
                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-xl transition-colors w-fit">
                          <input
                            type="checkbox"
                            checked={isKtpSemarang}
                            onChange={(e) => setIsKtpSemarang(e.target.checked)}
                            className="accent-primary rounded size-4"
                          />
                          <span className="text-xs font-bold text-primary">
                            {jenisPengajuanState === 'Perorangan' ? 'KTP Wilayah Kota Semarang' : 'Domisili Wilayah Kota Semarang'}
                          </span>
                        </label>
                      </div>

                      {/* Kecamatan & Kelurahan Dropdown */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                          {isKtpSemarang ? (
                            <div className="relative">
                              <input type="hidden" name="kecamatan" value={selectedKecamatan} required />
                              <button
                                type="button"
                                onClick={() => setIsKecamatanDropdownOpen(!isKecamatanDropdownOpen)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center"
                              >
                                <span className={selectedKecamatan ? "text-slate-800 font-medium" : "text-slate-400"}>
                                  {selectedKecamatan || "Pilih Kecamatan..."}
                                </span>
                                <span className="text-slate-400">▼</span>
                              </button>

                              {isKecamatanDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsKecamatanDropdownOpen(false)} />
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 space-y-2 custom-scrollbar text-left">
                                    <input
                                      type="text"
                                      placeholder="Cari kecamatan..."
                                      value={kecamatanSearchQuery}
                                      onChange={(e) => setKecamatanSearchQuery(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                      autoFocus
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                      {kecamatanKelurahanSemarang
                                        .filter(k => k.kecamatan.toLowerCase().includes(kecamatanSearchQuery.toLowerCase()))
                                        .map(k => (
                                          <button
                                            key={k.kecamatan}
                                            type="button"
                                            onClick={() => {
                                              setSelectedKecamatan(k.kecamatan);
                                              setSelectedKelurahan('');
                                              setIsKecamatanDropdownOpen(false);
                                              setKecamatanSearchQuery('');
                                            }}
                                            className={cn(
                                              "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                              selectedKecamatan === k.kecamatan
                                                ? "bg-primary text-white font-bold"
                                                : "text-slate-700 hover:bg-slate-100"
                                            )}
                                          >
                                            {k.kecamatan}
                                          </button>
                                        ))
                                      }
                                      {kecamatanKelurahanSemarang.filter(k => k.kecamatan.toLowerCase().includes(kecamatanSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="text-center text-xs text-slate-400 py-2">
                                          Tidak ada kecamatan yang cocok
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              name="kecamatan"
                              placeholder="Kecamatan..."
                              className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                              value={selectedKecamatan}
                              onChange={e => {
                                setSelectedKecamatan(e.target.value);
                                setSelectedKelurahan('');
                              }}
                            />
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Kelurahan
                          </label>
                          {isKtpSemarang ? (
                            <div className="relative">
                              <input type="hidden" name="kelurahan" value={selectedKelurahan} required />
                              <button
                                type="button"
                                disabled={!selectedKecamatan}
                                onClick={() => setIsKelurahanDropdownOpen(!isKelurahanDropdownOpen)}
                                className={cn(
                                  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-all text-left flex justify-between items-center",
                                  !selectedKecamatan 
                                    ? "opacity-50 cursor-not-allowed border-slate-200" 
                                    : "focus:ring-2 focus:ring-primary/20"
                                )}
                              >
                                <span className={selectedKelurahan ? "text-slate-800 font-medium" : "text-slate-400"}>
                                  {selectedKelurahan || "Pilih Kelurahan..."}
                                </span>
                                <span className="text-slate-400">▼</span>
                              </button>

                              {selectedKecamatan && isKelurahanDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsKelurahanDropdownOpen(false)} />
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto p-2 space-y-2 custom-scrollbar text-left">
                                    <input
                                      type="text"
                                      placeholder="Cari kelurahan..."
                                      value={kelurahanSearchQuery}
                                      onChange={(e) => setKelurahanSearchQuery(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                      autoFocus
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                      {kelurahanOptions
                                        .filter(kel => kel.toLowerCase().includes(kelurahanSearchQuery.toLowerCase()))
                                        .map(kel => (
                                          <button
                                            key={kel}
                                            type="button"
                                            onClick={() => {
                                              setSelectedKelurahan(kel);
                                              setIsKelurahanDropdownOpen(false);
                                              setKelurahanSearchQuery('');
                                            }}
                                            className={cn(
                                              "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                              selectedKelurahan === kel
                                                ? "bg-primary text-white font-bold"
                                                : "text-slate-700 hover:bg-slate-100"
                                            )}
                                          >
                                            {kel}
                                          </button>
                                        ))
                                      }
                                      {kelurahanOptions.filter(kel => kel.toLowerCase().includes(kelurahanSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="text-center text-xs text-slate-400 py-2">
                                          Tidak ada kelurahan yang cocok
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <input
                              type="text"
                              name="kelurahan"
                              placeholder="Kelurahan..."
                              className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                              value={selectedKelurahan}
                              onChange={e => setSelectedKelurahan(e.target.value)}
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon *</label>
                        <input required name="telepon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="08xxx..." defaultValue={editingProposal?.noTelpon || ""} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Opsional)</label>
                        <input name="email" type="email" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="email@..." defaultValue={editingProposal?.email || ""} />
                      </div>

                      {jenisPengajuanState === 'Perorangan' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan (Opsional)</label>
                          <div className="relative">
                            <input type="hidden" name="pekerjaan" value={selectedPekerjaan} />
                            <button
                              type="button"
                              onClick={() => setIsPekerjaanDropdownOpen(!isPekerjaanDropdownOpen)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center"
                            >
                              <span className={selectedPekerjaan ? "text-slate-800 font-medium" : "text-slate-400"}>
                                {selectedPekerjaan || "Pilih Pekerjaan..."}
                              </span>
                              <span className="text-slate-400">▼</span>
                            </button>

                            {isPekerjaanDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsPekerjaanDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 text-left max-h-56 overflow-y-auto">
                                  {[
                                    "Pedagang",
                                    "Petani",
                                    "Peternak",
                                    "Nelayan",
                                    "Buruh Harian Lepas",
                                    "Penyedia Jasa",
                                    "Sektor Lainnya"
                                  ].map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        setSelectedPekerjaan(opt);
                                        setIsPekerjaanDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                        selectedPekerjaan === opt
                                          ? "bg-primary text-white font-bold"
                                          : "text-slate-700 hover:bg-slate-100"
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yang Mengajukan</label>
                        <input name="yangMengajukan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pengaju..." defaultValue={editingProposal?.yangMengajukan || ""} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan</label>
                        <textarea name="catatan" rows={2} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan tambahan (opsional)..." defaultValue={editingProposal?.catatan || editingProposal?.keterangan || ""} />
                      </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                  {editingProposal && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteData(editingProposal.id)}
                      className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2 md:flex-none"
                    >
                      <Trash2 className="size-4" />
                      Hapus Proposal
                    </button>
                  )}
                  <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                    {editingProposal ? 'Simpan Perubahan' : 'Simpan Pengajuan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Cetak Laporan Modal ─── */}
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
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <ClipboardList className="size-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Cetak Laporan Rekap Proposal</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Modul khusus administrasi untuk rekap harian, mingguan, dan bulanan.
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
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                {/* Tipe Laporan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Laporan</label>
                  <select
                    value={reportType}
                    onChange={(e: any) => setReportType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  >
                    <option value="harian_pilar">Rekap Proposal Harian</option>
                    <option value="harian_detail">Rekap Proposal Harian Detail</option>
                    <option value="mingguan">Rekap Proposal Mingguan</option>
                    <option value="bulanan">Rekap Proposal Bulanan</option>
                  </select>
                </div>

                {/* Filter Waktu */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Waktu & Periode</h4>
                  
                  {(reportType === 'harian_pilar' || reportType === 'harian_detail') && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Pilih Tanggal</label>
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                      />
                    </div>
                  )}

                  {reportType === 'mingguan' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Tahun</label>
                          <input 
                            type="number"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Bulan</label>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
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
                          <label className="text-[11px] font-semibold text-slate-600">Minggu Ke-</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Dari Tanggal</label>
                          <input 
                            type="date"
                            value={selectedWeekStartDate}
                            onChange={(e) => setSelectedWeekStartDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Sampai Tanggal</label>
                          <input 
                            type="date"
                            value={selectedWeekEndDate}
                            onChange={(e) => setSelectedWeekEndDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {reportType === 'bulanan' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Tahun</label>
                        <input 
                          type="number"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Bulan</label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
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
                    </div>
                  )}
                </div>

                {/* Penandatangan (Signatories) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penandatangan Laporan</h4>

                  {/* Kepala Pelaksana */}
                  {(reportType === 'harian_pilar' || reportType === 'mingguan' || reportType === 'bulanan') && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-600">Nama Kepala Pelaksana</label>
                      <div className="flex gap-2">
                        <select
                          className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          onChange={(e) => {
                            if (e.target.value) {
                              setSignatories(prev => ({ ...prev, kepalaPelaksana: e.target.value }));
                            }
                          }}
                          value={users.some(u => u.name === signatories.kepalaPelaksana) ? signatories.kepalaPelaksana : ''}
                        >
                          <option value="">-- Pilih User --</option>
                          {users.filter(u => u.role === 'Kepala_Pelaksana').map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={signatories.kepalaPelaksana}
                          onChange={(e) => setSignatories(prev => ({ ...prev, kepalaPelaksana: e.target.value }))}
                          placeholder="Nama Kepala Pelaksana..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Wakil Ketua IV */}
                  {(reportType === 'mingguan' || reportType === 'bulanan') && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-600">Nama Wakil Ketua IV</label>
                      <div className="flex gap-2">
                        <select
                          className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          onChange={(e) => {
                            if (e.target.value) {
                              setSignatories(prev => ({ ...prev, wakilKetuaIv: e.target.value }));
                            }
                          }}
                          value={users.some(u => u.name === signatories.wakilKetuaIv) ? signatories.wakilKetuaIv : ''}
                        >
                          <option value="">-- Pilih User --</option>
                          {users.filter(u => u.role === 'Wakil_Ketua_IV').map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={signatories.wakilKetuaIv}
                          onChange={(e) => setSignatories(prev => ({ ...prev, wakilKetuaIv: e.target.value }))}
                          placeholder="Nama Wakil Ketua IV..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Kabag Administrasi */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-600">Nama Kabag Administrasi</label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        onChange={(e) => {
                          if (e.target.value) {
                            setSignatories(prev => ({ ...prev, kabagAdministrasi: e.target.value }));
                          }
                        }}
                        value={users.some(u => u.name === signatories.kabagAdministrasi) ? signatories.kabagAdministrasi : ''}
                      >
                        <option value="">-- Pilih User --</option>
                        {users.filter(u => u.role === 'Kabag_Administrasi').map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={signatories.kabagAdministrasi}
                        onChange={(e) => setSignatories(prev => ({ ...prev, kabagAdministrasi: e.target.value }))}
                        placeholder="Nama Kabag Administrasi..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Ketua (Untuk Bulanan) */}
                  {reportType === 'bulanan' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-600">Nama Ketua BAZNAS</label>
                      <div className="flex gap-2">
                        <select
                          className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          onChange={(e) => {
                            if (e.target.value) {
                              setSignatories(prev => ({ ...prev, ketua: e.target.value }));
                            }
                          }}
                          value={users.some(u => u.name === signatories.ketua) ? signatories.ketua : ''}
                        >
                          <option value="">-- Pilih User --</option>
                          {users.filter(u => u.role === 'Ketua').map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={signatories.ketua}
                          onChange={(e) => setSignatories(prev => ({ ...prev, ketua: e.target.value }))}
                          placeholder="Nama Ketua BAZNAS..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Staff Administrasi (Untuk Detail Harian) */}
                  {reportType === 'harian_detail' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-600">Nama Staff Administrasi</label>
                      <div className="flex gap-2">
                        <select
                          className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                          onChange={(e) => {
                            if (e.target.value) {
                              setSignatories(prev => ({ ...prev, stafAdministrasi: e.target.value }));
                            }
                          }}
                          value={users.some(u => u.name === signatories.stafAdministrasi) ? signatories.stafAdministrasi : ''}
                        >
                          <option value="">-- Pilih User --</option>
                          {users.filter(u => u.role === 'Staf_Administrasi').map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={signatories.stafAdministrasi}
                          onChange={(e) => setSignatories(prev => ({ ...prev, stafAdministrasi: e.target.value }))}
                          placeholder="Nama Staff Administrasi..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={handlePrintReport}
                  className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
                >
                  <ClipboardList className="size-4" />
                  Cetak / Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 text-left z-[120]"
            >
              <div className={cn(
                "flex items-center gap-3",
                confirmModal.actionType === 'delete_proposal' ? "text-rose-600" : "text-emerald-600"
              )}>
                {confirmModal.actionType === 'delete_proposal' ? (
                  <Trash2 className="size-6 shrink-0" />
                ) : (
                  <Send className="size-6 shrink-0" />
                )}
                <h4 className="text-lg font-black text-slate-900">{confirmModal.title}</h4>
              </div>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { actionType, targetId } = confirmModal;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (!targetId) return;
                    
                    if (actionType === 'send_humas') {
                      try {
                        await axios.put(`/api/proposals/${targetId}`, { status: 'Scan_Proposal' });
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                        alert('Gagal mengirim proposal ke Humas.');
                      }
                    } else if (actionType === 'delete_proposal') {
                      try {
                        await axios.delete(`/api/proposals/${targetId}`);
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                        alert('Gagal menghapus data');
                      }
                    }
                  }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-black text-white rounded-xl transition-all shadow-lg",
                    confirmModal.actionType === 'delete_proposal' 
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" 
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  )}
                >
                  YA, PROSES
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
                <ClipboardList className="size-4 text-slate-500" />
                Cetak Laporan / Rekap
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Proposal
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setEditingProposal(null);
                  setAgendaNoInput(String(suggestedNextAgenda));
                  setNikCheckStr('');
                  setNoKk('');
                  setNikStatus('idle');
                  setNikMessage('');
                  setMatchedMustahikId(null);
                  setSelectedKecamatan('');
                  setSelectedKelurahan('');
                  setJenisPengajuanState('Perorangan');
                  setIsKtpSemarang(true);
                  setSelectedProgramCode('');
                  setProgramSearchQuery('');
                  setTanggalLahirInput('');
                  setHasMemoState(false);
                  setSelectedMemoType('Memo');
                  setSelectedMemoSource('');
                  setSelectedGender('');
                  setSelectedPekerjaan('');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Tambah Proposal
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
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 font-sans">Migrasi Data Proposal</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900 font-sans">Impor Data Proposal & Mustahik (Excel 2-Sheet)</h4>
                  <p className="text-xs text-slate-500 font-sans leading-relaxed">Gunakan file Excel (.xlsx) dengan 2 Sheet: Sheet 1 (HEADER_PROPOSAL untuk data lembaga, tanggal, nominal global, RKAT & COA) dan Sheet 2 (DETAIL_MUSTAHIK untuk rincian penerima By Name By Address).</p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadProposalTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-primary">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left font-sans">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleProposalFileUpload} 
                      disabled={migrating}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value?: string }) {
  const displayVal = value && value.trim() ? value : '-';
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{displayVal}</p>
    </div>
  );
}

function StatCard({ title, value, trend, icon, color, subtitle }: { 
  title: string, 
  value: string, 
  trend?: string, 
  icon: React.ReactNode,
  color: 'primary' | 'emerald' | 'amber' | 'blue',
  subtitle?: string
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-500',
    blue: 'bg-blue-50 text-blue-500'
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold px-2 py-1 rounded text-emerald-600 bg-emerald-50">
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-2xl font-black text-slate-900">{value}</h3>
          {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
