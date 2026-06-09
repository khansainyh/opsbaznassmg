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
  Monitor
} from 'lucide-react';
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
  status: 'Registrasi' | 'Scan Surat' | 'Review Kabag Admin' | 'Review Kepala Pelaksana' | 'Review Pimpinan' | 'Selesai' | 'Arsip' | 'Ditolak';
  fileGdriveId?: string;
  fileGdriveLink?: string;
  catatanKepala?: string;
  catatanPimpinan?: string;
  kategori?: string;
  tanggalAcara?: string;
  jamAcara?: string;
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

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<Surat | null>(null);
  const [scanTabMode, setScanTabMode] = useState<'file' | 'link'>('file');
  const [scanLinkInput, setScanLinkInput] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Administrasi</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Input Surat</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Administrasi: Input Surat
        </h2>
        <p className="text-slate-500 font-medium">
          Registrasi surat dinas dan permohonan umum masuk. Setelah discan, surat diteruskan ke Kabag.
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
          <button 
            onClick={() => {
              setEditingSurat(null);
              setSelectedKategori('');
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="size-4" />
            Tambah Data Baru
          </button>
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
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDetailClick(item)}
                        className="p-1.5 hover:bg-primary/10 text-slate-400 hover:text-primary rounded transition-colors" 
                        title="Detail"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenScanModal(item)}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors" 
                        title="Scan Surat → Review Kabag"
                      >
                        <FileCheck className="size-4" />
                      </button>
                      <button 
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-500 rounded transition-colors" 
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
                  onClick={() => !isScanning && setIsScanModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  disabled={isScanning}
                >
                  Batal
                </button>
                <button
                  onClick={handleScanSubmit}
                  disabled={isScanning || (scanTabMode === 'file' ? !scanFile : !scanLinkInput.trim())}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  "p-4 rounded-xl flex items-center justify-between border",
                  getStatusColor(selectedSurat.status).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'border-')
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", getStatusColor(selectedSurat.status))}>
                      <ClipboardList className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Saat Ini</p>
                      <p className="font-bold text-slate-900">{selectedSurat.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
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
                  </div>

                  <div className="space-y-6">
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
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditClick(selectedSurat);
                  }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="size-4" />
                  Edit Data
                </button>
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenScanModal(selectedSurat);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="size-4" />
                  Scan Surat
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
                      <select 
                        name="kategori" 
                        required
                        value={selectedKategori}
                        onChange={(e) => setSelectedKategori(e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="" disabled>Pilih Kategori...</option>
                        <option value="Undangan">Undangan</option>
                        <option value="Surat Izin Kerja">Surat Izin Kerja</option>
                        <option value="Surat Izin Penelitian/Magang">Surat Izin Penelitian/Magang</option>
                        <option value="Surat Permohonan">Surat Permohonan</option>
                        <option value="Surat Rekomendasi/Pengantar">Surat Rekomendasi/Pengantar</option>
                      </select>
                    </div>

                    {selectedKategori === 'Undangan' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Acara</label>
                          <input name="tanggalAcara" type="date" required className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingSurat?.tanggalAcara ? editingSurat.tanggalAcara.split('T')[0] : ''} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jam Acara</label>
                          <input name="jamAcara" type="time" required className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" defaultValue={editingSurat?.jamAcara || ''} />
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                        <input name="kecamatan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kecamatan (Opsional)..." defaultValue={editingSurat?.kecamatan || ""} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelurahan</label>
                        <input name="kelurahan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Kelurahan (Opsional)..." defaultValue={editingSurat?.kelurahan || ""} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Telpon</label>
                        <input name="noTelpon" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="08xxx (Opsional)..." defaultValue={editingSurat?.noTelpon || ""} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yang Mengajukan</label>
                        <input name="yangMengajukan" type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Nama pengantar (Opsional)..." defaultValue={editingSurat?.yangMengajukan || ""} />
                      </div>
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
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSurat(null);
                      setSelectedKategori('');
                    }} 
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all">
                    {editingSurat ? 'Simpan Perubahan' : 'Simpan Surat'}
                  </button>
                </div>
              </form>
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
