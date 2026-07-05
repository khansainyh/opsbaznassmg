import React, { useState, useRef } from 'react';
import { 
  Eye, 
  FileCheck, 
  X, 
  AlertCircle, 
  Upload, 
  Link, 
  ExternalLink, 
  Search,
  ChevronRight,
  Newspaper,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { ProposalMemo } from '../data/proposalMemoData';

interface UploadProposalHumasProps {
  data: ProposalMemo[];
  allData?: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

/**
 * Konversi link Google Drive apa pun ke URL embed (iframe preview)
 */
function toGDriveEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
      <div className="text-sm font-bold text-slate-900 leading-relaxed">{value}</div>
    </div>
  );
}

export default function UploadProposalHumas({ data, allData, onUpdate: _onUpdate }: UploadProposalHumasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalMemo | null>(null);

  // Scan modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<ProposalMemo | null>(null);
  const [scanTabMode, setScanTabMode] = useState<'file' | 'link'>('file');
  const [scanLinkInput, setScanLinkInput] = useState('');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stat values
  const now = new Date();
  const proposalBulanIni = (allData || data).filter(d => {
    const dt = new Date(d.tanggalMasuk);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const menungguScan = data.filter(item => {
    const itemStatus = item.status.toLowerCase().replace(/_/g, ' ');
    return itemStatus === 'scan proposal';
  }).length;
  const memoPimpinan = data.filter(item => {
    const itemStatus = item.status.toLowerCase().replace(/_/g, ' ');
    return itemStatus === 'scan proposal' && item.hasMemo;
  }).length;

  // Filter only Scan Proposal status
  const filteredData = data
    .filter(item => {
      const itemStatus = item.status.toLowerCase().replace(/_/g, ' ');
      if (itemStatus !== 'scan proposal') return false;

      const matchesSearch = item.agendaNo.toString().includes(searchTerm) || 
                           item.namaPemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.namaInstansi && item.namaInstansi.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.tanggalMasuk).getTime();
      const dateB = new Date(b.tanggalMasuk).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return Number(b.agendaNo) - Number(a.agendaNo);
    });

  const handleDetailClick = (proposal: ProposalMemo) => {
    setSelectedProposal(proposal);
    setIsDetailModalOpen(true);
  };

  const handleOpenScanModal = (proposal: ProposalMemo) => {
    setScanTarget(proposal);
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 min-h-screen bg-slate-50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Humas</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Upload Proposal</span>
        </nav>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Upload Proposal
        </h2>
        <p className="text-slate-500 font-medium">
          Pemindaian dan pengunggahan berkas digital proposal permohonan bantuan.
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
          title="Proposal Masuk"
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
          title="Memo Pimpinan"
          value={memoPimpinan.toString()}
          icon={<AlertCircle className="size-5" />}
          color="blue"
        />
      </motion.div>

      {/* Table Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-primary/10 shadow-sm overflow-hidden flex flex-col"
      >
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Pemohon / Agenda / Instansi..." 
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">No. Agenda</th>
                <th className="px-6 py-4">Tanggal Masuk</th>
                <th className="px-6 py-4">Pemohon</th>
                <th className="px-6 py-4">Permohonan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada proposal yang menunggu scan/upload
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{item.namaPemohon}</p>
                    </div>
                    {item.namaInstansi && (
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.namaInstansi}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate font-medium">
                    {item.jenisPermohonan}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase whitespace-nowrap bg-blue-100 text-blue-700">
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
                        onClick={() => handleOpenScanModal(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-colors" 
                        title="Upload Scan"
                      >
                        <FileCheck className="size-4" />
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
            Menampilkan {filteredData.length} data menunggu scan
          </p>
        </div>
      </motion.div>

      {/* ─── Detail Proposal Modal ─── */}
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
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detail Proposal</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">No. Agenda: <span className="font-bold text-primary">{selectedProposal.agendaNo}</span></p>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Applicant Info */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Data Pemohon</h4>
                      <div className="space-y-4">
                        <DetailItem label="Nama Lengkap" value={selectedProposal.namaPemohon} />
                        <DetailItem label="NIK" value={selectedProposal.nik} />
                        {selectedProposal.no_kk && (
                          <DetailItem label="No. KK" value={selectedProposal.no_kk} />
                        )}
                        <DetailItem label="Nama Anak" value={selectedProposal.namaAnak} />
                        <DetailItem label="Tempat Lahir" value={selectedProposal.tempat_lahir || '-'} />
                        <DetailItem label="Tanggal Lahir" value={selectedProposal.tanggal_lahir || '-'} />
                        <DetailItem label="Jenis Kelamin" value={selectedProposal.jenis_kelamin || '-'} />
                        <DetailItem label="Pekerjaan" value={selectedProposal.pekerjaan || '-'} />
                        <DetailItem label="Handphone" value={selectedProposal.noTelpon || '-'} />
                        <DetailItem label="Email" value={selectedProposal.email || '-'} />
                      </div>
                    </div>
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
                  </div>

                  {/* Right: Proposal Info */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-primary uppercase tracking-widest border-b border-primary/10 pb-2 mb-4">Informasi Pengajuan</h4>
                      <div className="space-y-4">
                        <DetailItem label="Jenis Permohonan" value={selectedProposal.jenisPermohonan} />
                        <DetailItem label="Nama Instansi" value={selectedProposal.namaInstansi || '-'} />
                        <DetailItem label="Pimpinan" value={selectedProposal.pimpinanOrganisasi || '-'} />
                        <DetailItem label="Jam Pengajuan" value={selectedProposal.jamPengajuan} />
                        <DetailItem label="Yang Mengajukan" value={selectedProposal.yangMengajukan || '-'} />
                      </div>
                    </div>
                    {selectedProposal.hasMemo && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <span className="text-xs font-black uppercase tracking-widest">Memo Pimpinan</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">Sumber: {selectedProposal.memoSource}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                <div className="flex-1" />
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenScanModal(selectedProposal);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="size-4" />
                  Upload Scan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                {/* Tab Contents */}
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
                      {toGDriveEmbedUrl(scanLinkInput) && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Preview Link Valid</span>
                          </div>
                          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '140px' }}>
                            <iframe
                              src={toGDriveEmbedUrl(scanLinkInput)!}
                              className="w-full h-full bg-slate-100"
                              title="GDrive Preview"
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  type="button"
                  disabled={isScanning || (scanTabMode === 'file' ? !scanFile : !scanLinkInput.trim())}
                  onClick={handleScanSubmit}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isScanning ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
