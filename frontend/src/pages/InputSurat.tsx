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
  Calendar,
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
  Download,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';

export interface Surat {
  id: string;
  agendaNo: number;
  tanggalMasuk: string;
  namaInstansi?: string;
  pimpinanOrganisasi?: string;
  alamat?: string;
  kelurahan?: string;
  kecamatan?: string;
  keperluan: string;
  noTelpon?: string;
  jamPengajuan?: string;
  yangMengajukan?: string;
  arsip?: string;
  status: 'Registrasi' | 'Scan Surat' | 'Review Kabag Admin' | 'Review Kepala Pelaksana' | 'Review Pimpinan' | 'Penugasan Kepala Pelaksana' | 'Selesai' | 'Arsip' | 'Ditolak';
  fileGdriveId?: string;
  fileGdriveLink?: string;
  catatanKepala?: string;
  catatanPimpinan?: string;
  kategori?: string;
  tanggalAcara?: string;
  jamAcara?: string;
  assigned_staff?: string[];
}

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

interface InputSuratProps {
  data: Surat[];          // Hanya surat status Registrasi
  allData: Surat[];       // Semua surat
  onUpdate: (data: Surat[]) => void;
}

export default function InputSurat({ data, allData }: InputSuratProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  
  const [editingSurat, setEditingSurat] = useState<Surat | null>(null);
  const [selectedKategori, setSelectedKategori] = useState<string>('');
  const [isKategoriDropdownOpen, setIsKategoriDropdownOpen] = useState(false);
  const [tanggalAcaraInput, setTanggalAcaraInput] = useState('');
  const [jamAcaraInput, setJamAcaraInput] = useState('');

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<Surat | null>(null);
  const [scanTabMode, setScanTabMode] = useState<'file' | 'link'>('file');
  const [scanLinkInput, setScanLinkInput] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const downloadSuratTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        no_agenda: 101,
        tanggal_masuk: '2026-01-15',
        jam_pengajuan: '09:00',
        nama_instansi: 'Masjid Agung',
        pimpinan_organisasi: 'H. Ahmad',
        alamat: 'Jl. Gajah Mada No. 10',
        kelurahan: 'Kembangsari',
        kecamatan: 'Semarang Tengah',
        keperluan: 'Bantuan Dana Pembangunan',
        no_telpon: '08123456789',
        yang_mengajukan: 'Ahmad Fauzi',
        arsip: 'Box A-1',
        kategori: 'Permohonan',
        status: 'Selesai',
        catatan_kepala: 'Disetujui untuk survei lokasi.',
        catatan_pimpinan: 'Bantu Rp 5.000.000,-',
        tanggal_acara: '',
        jam_acara: '',
        link_scan: 'https://drive.google.com/file/d/example_link'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Surat");
    XLSX.writeFile(wb, "Template_Migrasi_Surat_Masuk.xlsx");
  };

  const handleSuratFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
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
          if (!row.tanggal_masuk || !row.keperluan) continue;
          const gdriveLink = row.link_scan ? String(row.link_scan).trim() : (row.file_gdrive_link ? String(row.file_gdrive_link).trim() : null);
          const agendaNo = row.no_agenda ? Number(row.no_agenda) : undefined;
          try {
            await axios.post('/api/surats', {
              agenda_no: agendaNo,
              tanggal_masuk: String(row.tanggal_masuk).trim(),
              jam_pengajuan: row.jam_pengajuan ? String(row.jam_pengajuan).trim() : null,
              nama_instansi: row.nama_instansi ? String(row.nama_instansi).trim() : null,
              pimpinan_organisasi: row.pimpinan_organisasi ? String(row.pimpinan_organisasi).trim() : null,
              keperluan: String(row.keperluan).trim(),
              alamat: row.alamat ? String(row.alamat).trim() : null,
              kelurahan: row.kelurahan ? String(row.kelurahan).trim() : null,
              kecamatan: row.kecamatan ? String(row.kecamatan).trim() : null,
              no_telpon: row.no_telpon ? String(row.no_telpon).trim() : null,
              yang_mengajukan: row.yang_mengajukan ? String(row.yang_mengajukan).trim() : null,
              arsip: row.arsip ? String(row.arsip).trim() : null,
              kategori: row.kategori ? String(row.kategori).trim() : null,
              status: row.status ? String(row.status).trim() : 'Registrasi',
              catatanKepala: row.catatan_kepala ? String(row.catatan_kepala).trim() : null,
              catatanPimpinan: row.catatan_pimpinan ? String(row.catatan_pimpinan).trim() : null,
              tanggal_acara: row.tanggal_acara ? String(row.tanggal_acara).trim() : null,
              jam_acara: row.jam_acara ? String(row.jam_acara).trim() : null,
              file_gdrive_link: gdriveLink
            });
            successCount++;
          } catch (err) {
            failCount++;
          }
        }
        
        alert(`Berhasil mengimpor ${successCount} data surat. Gagal: ${failCount}`);
        setIsMigrationModalOpen(false);
        window.location.reload();
      } catch (err) {
        alert('Gagal memproses file Excel.');
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<any[]>([]);
  const [signatories, setSignatories] = useState({
    kabagAdministrasi: '',
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
      const kabagUser = users.find(u => u.role === 'Kabag_Administrasi');
      const stafUser = users.find(u => u.role === 'Staf_Administrasi') || users.find(u => u.role.startsWith('Staf_'));

      setSignatories({
        kabagAdministrasi: kabagUser ? kabagUser.name : '',
        stafAdministrasi: stafUser ? stafUser.name : ''
      });
    }
  }, [users]);

  const handlePrintReport = () => {
    const filtered = allData.filter(item => item.tanggalMasuk === selectedDate);

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

    const title = `REKAP SURAT MASUK ${formatIndonesianDateStr(selectedDate).toUpperCase()}`;
    const semarangDate = formatIndonesianDateStr(selectedDate);

    const contentHtml = `
      <h2 style="font-size: 18px; text-align: center; font-family: Arial, sans-serif; font-weight: bold; margin-bottom: 30px;">
        ${title}
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #ffffff;">
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 3%;">No</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 5%;">No Agenda</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 8%;">Tanggal Proposal Masuk</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 12%;">Nama Instansi</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 10%;">Pimpinan Organisasi</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 15%;">Alamat</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 8%;">Kelurahan</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 8%;">Kecamatan</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 15%;">Keperluan</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 8%;">No Telpon</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 5%;">Jam Pengajuan</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 8%;">Yang Mengajukan</th>
            <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; width: 5%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr>
              <td colspan="13" style="border: 1px solid #000; padding: 12px; text-align: center; color: #555;">Tidak ada data surat masuk</td>
            </tr>
          ` : filtered.map((item, index) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${index + 1}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.agendaNo}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${formatIndonesianDateStr(item.tanggalMasuk)}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.namaInstansi || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.pimpinanOrganisasi || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.alamat || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.kelurahan || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.kecamatan || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px;">${item.keperluan || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.noTelpon || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.jamPengajuan || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.yangMengajukan || '-'}</td>
              <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.arsip || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const signatureHtml = `
      <table style="width: 100%; border: none; margin-top: 50px; border-collapse: collapse;">
        <tr style="border: none;">
          <td style="border: none; width: 50%; text-align: left; padding: 0;"></td>
          <td style="border: none; width: 50%; text-align: right; padding: 0 10px 0 0; font-family: Arial, sans-serif; font-size: 13px;">
            Semarang, ${semarangDate}<br><br>
          </td>
        </tr>
        <tr style="border: none;">
          <td style="border: none; width: 50%; text-align: center; vertical-align: top; padding: 0; font-family: Arial, sans-serif; font-size: 13px;">
            Plh. Kepala Pelaksana<br>
            Kabag. Administrasi, SDM, dan Umum<br><br><br><br><br>
            <strong>${signatories.kabagAdministrasi || '................................'}</strong>
          </td>
          <td style="border: none; width: 50%; text-align: center; vertical-align: top; padding: 0; font-family: Arial, sans-serif; font-size: 13px;">
            Staff Administrasi, SDM, dan Umum<br><br><br><br><br><br>
            <strong>${signatories.stafAdministrasi || '................................'}</strong>
          </td>
        </tr>
      </table>
    `;

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
              size: A4 landscape;
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 0;
              padding: 10px;
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

  const handlePrintDisposisi = (surat: Surat) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getStepIndex = (status: string): number => {
      const s = status.replace(/ /g, '_');
      if (s === 'Registrasi') return 0;
      if (s === 'Scan_Surat' || s === 'Scan Surat') return 0;
      if (s === 'Review_Kabag_Admin' || s === 'Review Kabag Admin') return 1;
      if (s === 'Review_Kepala_Pelaksana' || s === 'Review Kepala Pelaksana') return 2;
      if (s === 'Review_Pimpinan' || s === 'Review Pimpinan') return 3;
      if (s === 'Penugasan_Kepala_Pelaksana' || s === 'Penugasan Kepala Pelaksana') return 2;
      if (s === 'Selesai') return 4;
      if (s === 'Arsip') return 4;
      return 0;
    };

    const currentIdx = getStepIndex(surat.status);

    const renderNodeHtml = (step: { id: string; label: string; idx: number; short: string }) => {
      let nodeClass = '';
      let circleContent = step.short;

      if (step.idx < currentIdx) {
        nodeClass = 'done';
        circleContent = '✓';
      } else if (step.idx === currentIdx) {
        nodeClass = 'active';
      }

      return `
        <div class="node ${nodeClass}">
          <div class="circle">${circleContent}</div>
          <div class="label">${step.label}</div>
        </div>
      `;
    };

    const nodesHtml = [
      { id: 'ADM', label: 'ADM', idx: 0, short: 'ADM' },
      { id: 'KDM', label: 'KDM', idx: 1, short: 'KD' },
      { id: 'KAPEL', label: 'KAPEL', idx: 2, short: 'KA' },
      { id: 'PIMP', label: 'PIMP', idx: 3, short: 'PI' },
      { id: 'DONE', label: 'DONE', idx: 4, short: '' }
    ].map(renderNodeHtml).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Disposisi Surat - ${surat.agendaNo}</title>
          <style>
              @page {
                  size: A5 landscape;
                  margin: 0;
              }
              
              body {
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  background-color: #f9fafb;
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
              }

              .a5-container {
                  width: 210mm;
                  height: 148mm;
                  background: white;
                  padding: 10mm 12mm;
                  box-sizing: border-box;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
              }

              @media print {
                  body { background: white; height: auto; display: block; }
                  .a5-container { box-shadow: none; width: 100%; height: 100%; padding: 10mm; }
              }

              .header {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding-bottom: 8px;
                  margin-bottom: 10px;
              }
              
              .logo-img {
                  height: 100px;
                  max-width: 100%;
                  object-fit: contain;
              }

              .title {
                  text-align: center;
                  font-weight: 900;
                  font-size: 11px;
                  margin-bottom: 12px;
                  text-decoration: underline;
                  text-transform: uppercase;
              }

              .info-box {
                  border: 1px solid #d1d5db;
                  border-radius: 8px;
                  padding: 10px 12px;
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 8px 15px;
                  margin-bottom: 20px;
                  background-color: #fafafa;
              }

              .info-row {
                  display: flex;
                  font-size: 9px;
              }

              .info-label {
                  width: 110px;
                  font-weight: bold;
                  color: #4b5563;
              }

              .info-value {
                  font-weight: bold;
                  color: #111827;
              }

              .progress-section {
                  position: relative;
                  margin-top: 5px;
              }

              .progress-title {
                  text-align: center;
                  font-weight: 800;
                  font-size: 10px;
                  color: #374151;
                  margin-bottom: 20px;
                  text-transform: uppercase;
              }

              .flow-container {
                  padding: 0 10%;
                  position: relative;
              }

              .flow-track-single {
                  position: absolute;
                  top: 14px; 
                  left: 10%; 
                  right: 10%; 
                  height: 2px;
                  background-color: #e5e7eb;
                  z-index: 1;
              }

              .flow-row-single {
                  display: flex;
                  justify-content: space-between;
                  position: relative;
                  z-index: 2;
              }

              .node {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  background-color: white;
                  padding: 0 8px;
              }

              .circle {
                  width: 26px;
                  height: 26px;
                  border-radius: 50%;
                  border: 2px solid #d1d5db;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 9px;
                  color: #6b7280;
                  margin-bottom: 6px;
                  background-color: white;
                  transition: all 0.3s ease;
              }

              .label {
                  font-size: 8px;
                  font-weight: 800;
                  text-align: center;
                  color: #4b5563;
              }

              .node.done .circle {
                  border-color: #10b981;
                  background-color: #10b981;
                  color: white;
              }
              .node.done .label {
                  color: #10b981;
              }

              .node.active .circle {
                  border-color: #10b981;
                  color: #10b981;
                  border-width: 3px;
              }
              .node.active .label {
                  color: #10b981;
              }
          </style>
      </head>
      <body>

          <div class="a5-container">
              
              <!-- Header -->
              <div class="header">
                  <img class="logo-img" src="/LogoBAZNASSMG.PNG" alt="Logo BAZNAS" />
              </div>

              <!-- Judul -->
              <div class="title">LEMBAR DISPOSISI / KONTROL SURAT MASUK</div>

              <!-- Info Surat -->
              <div class="info-box">
                  <!-- Row 1 -->
                  <div class="info-row">
                      <div class="info-label">NO. AGENDA</div>
                      <div class="info-value">: ${surat.agendaNo}</div>
                  </div>
                  <div class="info-row">
                      <div class="info-label">TANGGAL MASUK</div>
                      <div class="info-value">: ${surat.tanggalMasuk} ${surat.jamPengajuan ? `(${surat.jamPengajuan})` : ''}</div>
                  </div>

                  <!-- Row 2 -->
                  <div class="info-row">
                      <div class="info-label">NAMA INSTANSI</div>
                      <div class="info-value">: ${surat.namaInstansi || '-'}</div>
                  </div>
                  <div class="info-row">
                      <div class="info-label">PIMPINAN / PENGIRIM</div>
                      <div class="info-value">: ${surat.pimpinanOrganisasi || '-'}</div>
                  </div>

                  <!-- Row 3 -->
                  <div class="info-row">
                      <div class="info-label">KATEGORI</div>
                      <div class="info-value">: ${surat.kategori || '-'}</div>
                  </div>
                  <div class="info-row">
                      <div class="info-label">NO. TELPON</div>
                      <div class="info-value">: ${surat.noTelpon || '-'}</div>
                  </div>

                  ${surat.kategori === 'Undangan' ? `
                  <div class="info-row">
                      <div class="info-label">TANGGAL ACARA</div>
                      <div class="info-value">: ${surat.tanggalAcara ? new Date(surat.tanggalAcara).toLocaleDateString('id-ID') : '-'}</div>
                  </div>
                  <div class="info-row">
                      <div class="info-label">JAM ACARA</div>
                      <div class="info-value">: ${surat.jamAcara || '-'}</div>
                  </div>
                  ` : ''}

                  <!-- Row (Full Width) -->
                  <div class="info-row" style="grid-column: 1 / -1;">
                      <div class="info-label">PERIHAL / KEPERLUAN</div>
                      <div class="info-value">: ${surat.keperluan}</div>
                  </div>

                  <!-- Row (Full Width) -->
                  <div class="info-row" style="grid-column: 1 / -1;">
                      <div class="info-label">ALAMAT</div>
                      <div class="info-value">: ${[surat.alamat, surat.kelurahan, surat.kecamatan].filter(Boolean).join(', ') || '-'}</div>
                  </div>
              </div>

              <!-- Progress Alur Dokumen -->
              <div class="progress-section">
                  <div class="progress-title">PROGRESS ALUR SURAT</div>
                  
                  <div class="flow-container">
                      <div class="flow-track-single"></div>

                      <div class="flow-row-single">
                          ${nodesHtml}
                      </div>
                  </div>
              </div>

          </div>

          <script>
              window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
              };
          </script>

      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Sorted: terbaru di atas
  const filteredData = data
    .filter(item => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = item.agendaNo.toString().includes(searchStr) || 
                            (item.namaInstansi && item.namaInstansi.toLowerCase().includes(searchStr)) ||
                            (item.pimpinanOrganisasi && item.pimpinanOrganisasi.toLowerCase().includes(searchStr));
      return matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.tanggalMasuk).getTime();
      const dateB = new Date(b.tanggalMasuk).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return Number(b.agendaNo) - Number(a.agendaNo);
    });

  // Stat values
  const now = new Date();
  const suratBulanIni = allData.filter(d => {
    const dt = new Date(d.tanggalMasuk);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const menungguScan = data.length; // data = hanya Registrasi
  const sudahSelesai = allData.filter(d => d.status === 'Selesai' || d.status === 'Review Kabag Admin').length;

  const handleAddData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (name: string) => String(fd.get(name) ?? '');

    const payload: Record<string, any> = {
      tanggal_masuk:       get('tanggalMasuk'),
      jam_pengajuan:       get('jamPengajuan'),
      nama_instansi:       get('namaInstansi') || null,
      pimpinan_organisasi: get('pimpinanOrganisasi') || null,
      keperluan:           get('keperluan'),
      alamat:              get('alamat') || null,
      kelurahan:           get('kelurahan') || null,
      kecamatan:           get('kecamatan') || null,
      no_telpon:           get('noTelpon') || null,
      yang_mengajukan:     get('yangMengajukan') || null,
      arsip:               get('arsip') || null,
      kategori:            get('kategori') || null,
      tanggal_acara:       get('tanggalAcara') || null,
      jam_acara:           get('jamAcara') || null,
      status:              'Registrasi'
    };

    try {
      if (editingSurat) {
        const { status: _, ...updatePayload } = payload;
        await axios.put(`/api/surats/${editingSurat.id}`, updatePayload);
      } else {
        await axios.post('/api/surats', payload);
      }
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.message || 'Gagal menyimpan ke database');
    }
  };

  const handleEditClick = (surat: Surat) => {
    setEditingSurat(surat);
    setSelectedKategori(surat.kategori || '');
    setTanggalAcaraInput(surat.tanggalAcara ? surat.tanggalAcara.split('T')[0] : '');
    setJamAcaraInput(surat.jamAcara || '');
    setIsModalOpen(true);
  };

  const handleDetailClick = (surat: Surat) => {
    setSelectedSurat(surat);
    setIsDetailModalOpen(true);
  };

  const handleOpenScanModal = (surat: Surat) => {
    setScanTarget(surat);
    setScanTabMode('file');
    setScanLinkInput('');
    setScanFile(null);
    setIsScanModalOpen(true);
  };

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
      await axios.post(`/api/surats/${scanTarget.id}/scan`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsScanModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan scan surat.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteData = async (suratId: string) => {
    if (window.confirm('Yakin ingin menghapus surat ini?')) {
      try {
        await axios.delete(`/api/surats/${suratId}`);
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus data');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Registrasi': return 'bg-slate-100 text-slate-600';
      case 'Review Kabag Admin': return 'bg-indigo-100 text-indigo-700';
      case 'Review Kepala Pelaksana': return 'bg-blue-100 text-blue-700';
      case 'Review Pimpinan': return 'bg-purple-100 text-purple-700';
      case 'Selesai': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 min-h-screen bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Administrasi</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Input Surat</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
          Input Surat
        </h2>
        <p className="text-slate-500 font-medium">
          Registrasi berkas surat masuk, baik berupa surat dinas maupun permohonan umum.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Surat Baru"
          value={suratBulanIni.toString()}
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
          title="Sudah Diproses"
          value={sudahSelesai.toString()}
          icon={<History className="size-5" />}
          color="blue"
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
              <input 
                type="text"
                placeholder="Cari No. Agenda / Instansi / Pimpinan..."
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
              onClick={() => setIsMigrationModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-primary border border-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Upload className="size-4" />
              Migrasi Surat
            </button>
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
            >
              <ClipboardList className="size-4" />
              Cetak Laporan / Rekap
            </button>
            <button 
              onClick={() => {
                setEditingSurat(null);
                setSelectedKategori('');
                setTanggalAcaraInput('');
                setJamAcaraInput('');
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Plus className="size-4" />
              Tambah Data Baru
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Tanggal Masuk</th>
                <th className="px-6 py-4">Instansi / Pimpinan</th>
                <th className="px-6 py-4">Keperluan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="size-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Tidak ada surat yang menunggu scan</p>
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
                    <p className="text-sm font-bold text-slate-900">{item.namaInstansi || '-'}</p>
                    {item.pimpinanOrganisasi && (
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.pimpinanOrganisasi}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate font-medium">
                    {item.keperluan}
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
                        onClick={() => handlePrintDisposisi(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors" 
                        title="Print Disposisi"
                      >
                        <Printer className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenScanModal(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-colors" 
                        title="Scan Surat → Review Kabag"
                      >
                        <FileCheck className="size-4" />
                      </button>
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

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredData.length} dari {data.length} surat menunggu scan
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

      {/* ─── Scan Modal ─── */}
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
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <FileCheck className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Scan Surat</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      No. Agenda: <span className="font-bold text-blue-600">{scanTarget.agendaNo}</span> · {scanTarget.namaInstansi || 'Perorangan'}
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
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Setelah scan berhasil, status surat otomatis berubah ke <span className="font-bold">Review Kabag Admin</span> dan diteruskan.
                  </p>
                </div>

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
                          File Surat (PDF / Gambar)
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
                          Pastikan link sudah di-set "Anyone with the link can view".
                        </p>
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
                                title="Preview dokumen surat"
                                allow="autoplay"
                              />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>

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
        {isDetailModalOpen && selectedSurat && (
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
                  <h3 className="text-xl font-black text-slate-900">Detail Surat</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">No. Agenda: {selectedSurat.agendaNo}</p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                <div className={cn(
                  "p-4 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between border",
                  getStatusColor(selectedSurat.status).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'border-')
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", getStatusColor(selectedSurat.status))}>
                      <ClipboardList className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Saat Ini</p>
                      <p className="font-bold text-slate-900">{selectedSurat.status}</p>
                    </div>
                  </div>
                  <div className="sm:text-right pl-11 sm:pl-0">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tanggal Masuk</p>
                    <p className="font-bold text-slate-900">{selectedSurat.tanggalMasuk}</p>
                  </div>
                </div>

                {selectedSurat.fileGdriveLink && toGDriveEmbedUrl(selectedSurat.fileGdriveLink) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileSearch className="size-4 text-blue-500" />
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Dokumen Surat</h4>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm" style={{ height: '380px' }}>
                      <iframe
                        src={toGDriveEmbedUrl(selectedSurat.fileGdriveLink)!}
                        className="w-full h-full bg-slate-100"
                        title="Dokumen surat"
                        allow="autoplay"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengirim</h4>
                    <div className="space-y-4">
                      <DetailItem label="Nama Instansi" value={selectedSurat.namaInstansi || '-'} />
                      <DetailItem label="Pimpinan" value={selectedSurat.pimpinanOrganisasi || '-'} />
                      <DetailItem label="Kategori" value={selectedSurat.kategori || '-'} />
                      <DetailItem label="No. Telpon" value={selectedSurat.noTelpon || '-'} />
                      <DetailItem label="Yang Mengajukan" value={selectedSurat.yangMengajukan || '-'} />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Lokasi</h4>
                    <div className="space-y-4">
                      <DetailItem label="Alamat Lengkap" value={selectedSurat.alamat || '-'} />
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Kelurahan" value={selectedSurat.kelurahan || '-'} />
                        <DetailItem label="Kecamatan" value={selectedSurat.kecamatan || '-'} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Isi & Keperluan</h4>
                    <div className="space-y-4">
                      <DetailItem label="Keperluan" value={selectedSurat.keperluan} />
                      {selectedSurat.kategori === 'Undangan' && (
                        <div className="grid grid-cols-2 gap-4">
                          <DetailItem label="Tanggal Acara" value={selectedSurat.tanggalAcara ? new Date(selectedSurat.tanggalAcara).toLocaleDateString('id-ID') : '-'} />
                          <DetailItem label="Jam Acara" value={selectedSurat.jamAcara || '-'} />
                        </div>
                      )}
                      <DetailItem label="Jam Pengajuan" value={selectedSurat.jamPengajuan || '-'} />
                      <DetailItem label="Arsip / Catatan" value={selectedSurat.arsip || '-'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                {selectedSurat && (
                  <button 
                    onClick={() => handlePrintDisposisi(selectedSurat)}
                    className="flex-1 px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="size-4" />
                    <span className="hidden md:inline">Print Disposisi</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditClick(selectedSurat);
                  }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="size-4" />
                  <span className="hidden md:inline">Edit Data</span>
                </button>
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenScanModal(selectedSurat);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="size-4" />
                  <span className="hidden md:inline">Scan Surat</span>
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
                setEditingSurat(null);
                setSelectedKategori('');
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
                  {editingSurat ? 'Edit Surat' : 'Input Surat Baru'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSurat(null);
                    setSelectedKategori('');
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddData} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Informasi Surat</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Masuk</label>
                        <input name="tanggalMasuk" type="date" required className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingSurat?.tanggalMasuk || new Date().toISOString().split('T')[0]} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jam Pengajuan</label>
                        <input name="jamPengajuan" type="time" required className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingSurat?.jamPengajuan || new Date().toTimeString().split(' ')[0].slice(0, 5)} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Instansi</label>
                      <input required name="namaInstansi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama instansi..." defaultValue={editingSurat?.namaInstansi || ""} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Surat</label>
                      <div className="relative">
                        <input type="hidden" name="kategori" value={selectedKategori} />
                        <button
                          type="button"
                          onClick={() => setIsKategoriDropdownOpen(!isKategoriDropdownOpen)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-left flex justify-between items-center"
                        >
                          <span className={selectedKategori ? "text-slate-800 font-medium" : "text-slate-400"}>
                            {selectedKategori || 'Pilih Kategori (Opsional)...'}
                          </span>
                          <span className="text-slate-400">▼</span>
                        </button>

                        {isKategoriDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsKategoriDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 border-slate-100">
                              {['-- Kosongkan Kategori --', 'Undangan', 'Surat Izin Kerja', 'Surat Izin Penelitian/Magang', 'Surat Permohonan', 'Laporan'].map(kategori => (
                                <button
                                  key={kategori}
                                  type="button"
                                  onClick={() => {
                                    setSelectedKategori(kategori.startsWith('--') ? '' : kategori);
                                    setIsKategoriDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex justify-between items-center",
                                    (kategori.startsWith('--') ? !selectedKategori : selectedKategori === kategori)
                                      ? "bg-primary text-white font-bold"
                                      : "text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  {kategori}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedKategori === 'Undangan' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Acara</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              name="tanggalAcara" 
                              value={tanggalAcaraInput} 
                              onChange={(e) => setTanggalAcaraInput(e.target.value)} 
                              placeholder="YYYY-MM-DD"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                            <input 
                              type="date" 
                              value={tanggalAcaraInput}
                              onChange={(e) => setTanggalAcaraInput(e.target.value)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 w-6 h-6 cursor-pointer"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 size-4" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jam Acara</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              name="jamAcara" 
                              value={jamAcaraInput} 
                              onChange={(e) => setJamAcaraInput(e.target.value)} 
                              placeholder="HH:MM"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                            <input 
                              type="time" 
                              value={jamAcaraInput}
                              onChange={(e) => setJamAcaraInput(e.target.value)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 w-6 h-6 cursor-pointer"
                            />
                            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 size-4" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pimpinan Organisasi</label>
                      <input name="pimpinanOrganisasi" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pimpinan (Opsional)..." defaultValue={editingSurat?.pimpinanOrganisasi || ""} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keperluan</label>
                      <textarea required name="keperluan" rows={3} className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Isi perihal surat..." defaultValue={editingSurat?.keperluan || ""} />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2">Detail Pengirim & Lokasi</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                      <input name="alamat" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Alamat lengkap (Opsional)..." defaultValue={editingSurat?.alamat || ""} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                      <input name="kecamatan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kecamatan (Opsional)..." defaultValue={editingSurat?.kecamatan || ""} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                      <input name="kelurahan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kelurahan (Opsional)..." defaultValue={editingSurat?.kelurahan || ""} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Telpon</label>
                      <input name="noTelpon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="08xxx (Opsional)..." defaultValue={editingSurat?.noTelpon || ""} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yang Mengajukan</label>
                      <input name="yangMengajukan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pengantar (Opsional)..." defaultValue={editingSurat?.yangMengajukan || ""} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arsip / Catatan</label>
                      <input name="arsip" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Catatan arsip (Opsional)..." defaultValue={editingSurat?.arsip || ""} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                  {editingSurat && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteData(editingSurat.id)}
                      className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2 md:flex-none"
                    >
                      <Trash2 className="size-4" />
                      Hapus Surat
                    </button>
                  )}
                  <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                    {editingSurat ? 'Simpan Perubahan' : 'Simpan Surat'}
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
                    <h3 className="font-black text-slate-900">Cetak Laporan Rekap Surat</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Modul khusus administrasi untuk rekap harian detail surat masuk.
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
                {/* Filter Tanggal */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Waktu & Periode</h4>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Pilih Tanggal</label>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Penandatangan (Signatories) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Penandatangan Laporan</h4>

                  {/* Kabag Administrasi */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-600">Nama Kabag Administrasi (Plh. Kepala Pelaksana)</label>
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

                  {/* Staff Administrasi */}
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
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Surat
              </button>
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
                  setEditingSurat(null);
                  setSelectedKategori('');
                  setTanggalAcaraInput('');
                  setJamAcaraInput('');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Tambah Surat
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
                <h3 className="text-xl font-black text-slate-900">Migrasi Data Surat Masuk</h3>
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
                  <p className="text-xs text-slate-500 font-sans">Gunakan file Excel (.xlsx) dengan kolom tanggal_masuk, jam_pengajuan, nama_instansi, pimpinan_organisasi, keperluan, alamat, kelurahan, kecamatan, no_telpon, yang_mengajukan, arsip, kategori.</p>
                </div>

                <div className="space-y-3">
                  <button onClick={downloadSuratTemplate} className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary font-sans">Download Format Template</p>
                        <p className="text-[10px] text-primary/70 font-medium font-sans">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors font-sans">Upload File Data Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium font-sans">Pilih file .xlsx dari perangkat.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleSuratFileUpload} 
                      disabled={loading}
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

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 leading-relaxed">{value}</p>
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
