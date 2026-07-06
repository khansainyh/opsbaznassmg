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
  AlertCircle,
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
  Trash2,
  Coins,
  FileText,
  FileCheck,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import axios from 'axios';
import { skHistoryData as initialSkHistoryData } from '@/src/data/upzData';
import { UPZ, SKHistory } from '@/src/types/upz';
import { getNextRenewalSKNumber, getNextBaseSKNumber, isSKPembentukan, parseSKNumber } from '@/src/utils/skUtils';
import { kecamatanKelurahanSemarang } from '../data/kecamatanKelurahan';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


function getEmbedLink(url?: string): string {
  if (!url) return '';
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }
  return url;
}

export default function DatabaseUPZ() {
  const [data, setData] = useState<UPZ[]>([]);

  const fetchUPZList = async () => {
    try {
      const res = await axios.get('/api/upz');
      if (res.data.status === 'success') {
        const fetchedData = res.data.data;
        setData(fetchedData);
        
        // Extract and sync skHistory from database
        const dbHistories: SKHistory[] = [];
        fetchedData.forEach((upz: any) => {
          if (upz.metadata?.skHistory && Array.isArray(upz.metadata.skHistory)) {
            dbHistories.push(...upz.metadata.skHistory);
          }
        });
        
        if (dbHistories.length > 0) {
          setSkHistory(prev => {
            const merged = [...prev];
            dbHistories.forEach(h => {
              if (!merged.some(m => m.id === h.id)) {
                merged.push(h);
              } else {
                const idx = merged.findIndex(m => m.id === h.id);
                merged[idx] = h;
              }
            });
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching UPZ list:', err);
    }
  };

  const getUPZAccumulation = (item: UPZ) => {
    if (item.type !== 'On-Balance') return { total: 0, hak: 0, hakAmil: 0, pct: 0, pctAmil: 0, gagalPotong: 0, totalBankJateng: 0, totalZis: 0 };
    const isPembantuan = item.metadata?.onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan';
    const pctVal = isPembantuan ? upzHakPembantuan : upzHakPengumpulan;
    const pct = pctVal / 100;

    const pctAmilVal = isPembantuan ? 0 : upzHakAmilPengumpulan;
    const pctAmil = pctAmilVal / 100;

    const upzName = item.name;
    const targetUpz = upzName.toLowerCase().trim();
    const cleanTargetUpz = targetUpz.replace(/^upz\s+/i, '');
    const upzCode = item.code?.toLowerCase().trim();

    const upzZisHistory = zisHistory.filter(tx => {
      if (!tx) return false;
      const muzakkiUpz = tx.muzakki?.upz?.toLowerCase().trim();
      if (upzCode && muzakkiUpz === upzCode) return true;
      if (muzakkiUpz === targetUpz) return true;
      const cleanMuzakkiUpz = muzakkiUpz?.replace(/^upz\s+/i, '');
      if (cleanMuzakkiUpz === cleanTargetUpz) return true;
      const keterangan = tx.keterangan?.toLowerCase() || '';

      if (tx.status_simba === 'FAILED' && tx.keterangan) {
        try {
          const parsed = JSON.parse(tx.keterangan);
          if (parsed && parsed.type === 'failed_deduction') {
            const parsedOpd = (parsed.opd || '').toLowerCase().trim();
            const cleanParsedOpd = parsedOpd.replace(/^upz\s+/i, '');
            if (parsedOpd === targetUpz || cleanParsedOpd === cleanTargetUpz || (upzCode && parsedOpd.includes(upzCode))) {
              return true;
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      if (upzCode && (keterangan.includes(`(${upzCode})`) || keterangan.includes(`(upz ${upzCode})`) || keterangan.includes(upzCode))) return true;
      if (keterangan.includes(`(${targetUpz})`) || keterangan.includes(`(upz ${targetUpz})`)) return true;
      return false;
    });

    const bankJatengRecords = upzZisHistory.filter(tx => 
      tx.no_kuitansi?.startsWith('BSZ-JTG-') || 
      tx.no_kuitansi?.startsWith('Penerimaan Bank Jateng (')
    );
    const manualZisRecords = upzZisHistory.filter(tx => 
      !tx.no_kuitansi?.startsWith('BSZ-JTG-') && 
      !tx.no_kuitansi?.startsWith('Penerimaan Bank Jateng (')
    );

    const successJtg = bankJatengRecords.filter(tx => tx.status_simba !== 'FAILED');
    const failedJtg = bankJatengRecords.filter(tx => tx.status_simba === 'FAILED');
    const successZis = manualZisRecords.filter(tx => tx.status_simba !== 'FAILED');
    const failedZis = manualZisRecords.filter(tx => tx.status_simba === 'FAILED');

    const totalBankJateng = successJtg.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
    const totalZis = successZis.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
    const total = totalBankJateng + totalZis;
    const gagalPotong = failedJtg.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0) + failedZis.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);

    const hak = total * pct;
    const hakAmil = total * pctAmil;
    return { total, hak, hakAmil, pct: pctVal, pctAmil: pctAmilVal, gagalPotong, totalBankJateng, totalZis };
  };


  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [kecamatanFilter, setKecamatanFilter] = useState('Semua');
  const [selectedUPZ, setSelectedUPZ] = useState<UPZ | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [zisHistory, setZisHistory] = useState<any[]>([]);
  const [upzHakPengumpulan, setUpzHakPengumpulan] = useState(30);
  const [upzHakPembantuan, setUpzHakPembantuan] = useState(70);
  const [upzHakAmilPengumpulan, setUpzHakAmilPengumpulan] = useState(5);

  const [isDownloadRecapModalOpen, setIsDownloadRecapModalOpen] = useState(false);
  const [selectedRecapYear, setSelectedRecapYear] = useState<number>(() => new Date().getFullYear());
  const [isFabOpen, setIsFabOpen] = useState(false);

  const recapYears = useMemo(() => {
    const years = new Set<number>();
    if (Array.isArray(zisHistory)) {
      zisHistory.forEach(tx => {
        if (tx && tx.tanggal_pembayaran) {
          const y = new Date(tx.tanggal_pembayaran).getFullYear();
          if (!isNaN(y)) {
            years.add(y);
          }
        }
      });
    }
    // Add current year if empty
    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [zisHistory]);

  const getUPZAccumulationForYear = (item: UPZ, year: number) => {
    if (item.type !== 'On-Balance') return { total: 0, hak: 0, hakAmil: 0, pct: 0, pctAmil: 0, gagalPotong: 0 };
    const isPembantuan = item.metadata?.onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan';
    const pctVal = isPembantuan ? upzHakPembantuan : upzHakPengumpulan;
    const pct = pctVal / 100;

    const pctAmilVal = isPembantuan ? 0 : upzHakAmilPengumpulan;
    const pctAmil = pctAmilVal / 100;

    const upzName = item.name;
    const targetUpz = upzName.toLowerCase().trim();
    const cleanTargetUpz = targetUpz.replace(/^upz\s+/i, '');
    const upzCode = item.code?.toLowerCase().trim();

    const upzZisHistory = zisHistory.filter(tx => {
      if (!tx) return false;
      
      if (tx.tanggal_pembayaran) {
        const txYear = new Date(tx.tanggal_pembayaran).getFullYear();
        if (txYear !== year) return false;
      } else {
        return false;
      }

      const muzakkiUpz = tx.muzakki?.upz?.toLowerCase().trim();
      if (upzCode && muzakkiUpz === upzCode) return true;
      if (muzakkiUpz === targetUpz) return true;
      const cleanMuzakkiUpz = muzakkiUpz?.replace(/^upz\s+/i, '');
      if (cleanMuzakkiUpz === cleanTargetUpz) return true;
      const keterangan = tx.keterangan?.toLowerCase() || '';

      if (tx.status_simba === 'FAILED' && tx.keterangan) {
        try {
          const parsed = JSON.parse(tx.keterangan);
          if (parsed && parsed.type === 'failed_deduction') {
            const parsedOpd = (parsed.opd || '').toLowerCase().trim();
            const cleanParsedOpd = parsedOpd.replace(/^upz\s+/i, '');
            if (parsedOpd === targetUpz || cleanParsedOpd === cleanTargetUpz || (upzCode && parsedOpd.includes(upzCode))) {
              return true;
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      if (upzCode && (keterangan.includes(`(${upzCode})`) || keterangan.includes(`(upz ${upzCode})`) || keterangan.includes(upzCode))) return true;
      if (keterangan.includes(`(${targetUpz})`) || keterangan.includes(`(upz ${targetUpz})`)) return true;
      return false;
    });

    const bankJatengRecords = upzZisHistory.filter(tx => 
      tx.no_kuitansi?.startsWith('BSZ-JTG-') || 
      tx.no_kuitansi?.startsWith('Penerimaan Bank Jateng (')
    );
    const manualZisRecords = upzZisHistory.filter(tx => 
      !tx.no_kuitansi?.startsWith('BSZ-JTG-') && 
      !tx.no_kuitansi?.startsWith('Penerimaan Bank Jateng (')
    );

    const successJtg = bankJatengRecords.filter(tx => tx.status_simba !== 'FAILED');
    const failedJtg = bankJatengRecords.filter(tx => tx.status_simba === 'FAILED');
    const successZis = manualZisRecords.filter(tx => tx.status_simba !== 'FAILED');
    const failedZis = manualZisRecords.filter(tx => tx.status_simba === 'FAILED');

    const totalBankJateng = successJtg.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
    const totalZis = successZis.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);
    const total = totalBankJateng + totalZis;
    const gagalPotong = failedJtg.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0) + failedZis.reduce((sum, tx) => sum + Number(tx.nominal || 0), 0);

    const hak = total * pct;
    const hakAmil = total * pctAmil;
    return { total, hak, hakAmil, pct: pctVal, pctAmil: pctAmilVal, gagalPotong };
  };

  const getRecapDataForYear = (year: number) => {
    const onBalanceUpzs = data.filter(item => item.type === 'On-Balance');

    const groupPenyaluran: { name: string; hak: number; hakAmil: number }[] = [];
    const groupPembantuan: { name: string; hak: number; hakAmil: number }[] = [];

    onBalanceUpzs.forEach(item => {
      const { hak, hakAmil } = getUPZAccumulationForYear(item, year);
      const isPembantuan = item.metadata?.onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan';
      
      if (isPembantuan) {
        groupPembantuan.push({ name: item.name, hak, hakAmil: 0 });
      } else {
        groupPenyaluran.push({ name: item.name, hak, hakAmil });
      }
    });

    return {
      penyaluran: groupPenyaluran,
      pembantuan: groupPembantuan,
      totalPenyaluran: groupPenyaluran.reduce((sum, item) => sum + item.hak, 0),
      totalPenyaluranAmil: groupPenyaluran.reduce((sum, item) => sum + item.hakAmil, 0),
      totalPembantuan: groupPembantuan.reduce((sum, item) => sum + item.hak, 0),
    };
  };

  const handleExportExcelRecap = (year: number) => {
    const { penyaluran, pembantuan, totalPenyaluran, totalPenyaluranAmil, totalPembantuan } = getRecapDataForYear(year);
    
    const rows: any[] = [];
    
    // Header information
    rows.push({ 'Nama UPZ': `REKAPAN HAK TASARUF & HAK AMIL UPZ - TAHUN ${year}`, 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' });
    rows.push({ 'Nama UPZ': 'BAZNAS KOTA SEMARANG', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' });
    rows.push({ 'Nama UPZ': `Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' });
    rows.push({ 'Nama UPZ': '', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' }); // Blank row
    
    // Table Headers
    rows.push({ 'Nama UPZ': 'Nama UPZ', 'Hak Tasaruf (IDR)': 'Hak Tasaruf (IDR)', 'Hak Amil UPZ (IDR)': 'Hak Amil UPZ (IDR)' });
    
    // Group 1: UPZ Pengumpulan
    rows.push({ 'Nama UPZ': 'UPZ PENGUMPULAN', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' });
    penyaluran.forEach((item, index) => {
      rows.push({
        'Nama UPZ': `${index + 1}. ${item.name}`,
        'Hak Tasaruf (IDR)': item.hak,
        'Hak Amil UPZ (IDR)': item.hakAmil
      });
    });
    rows.push({
      'Nama UPZ': 'Subtotal UPZ Pengumpulan',
      'Hak Tasaruf (IDR)': totalPenyaluran,
      'Hak Amil UPZ (IDR)': totalPenyaluranAmil
    });
    rows.push({ 'Nama UPZ': '', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' }); // Blank row
    
    // Group 2: UPZ Pembantuan Pendistribusian & Pendayagunaan
    rows.push({ 'Nama UPZ': 'UPZ PEMBANTUAN PENDISTRIBUSIAN DAN PENDAYAGUNAAN', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' });
    pembantuan.forEach((item, index) => {
      rows.push({
        'Nama UPZ': `${index + 1}. ${item.name}`,
        'Hak Tasaruf (IDR)': item.hak,
        'Hak Amil UPZ (IDR)': 0
      });
    });
    rows.push({
      'Nama UPZ': 'Subtotal UPZ Pembantuan Pendistribusian dan Pendayagunaan',
      'Hak Tasaruf (IDR)': totalPembantuan,
      'Hak Amil UPZ (IDR)': 0
    });
    rows.push({ 'Nama UPZ': '', 'Hak Tasaruf (IDR)': '', 'Hak Amil UPZ (IDR)': '' }); // Blank row
    
    // Grand Total Accumulation
    rows.push({
      'Nama UPZ': 'TOTAL AKUMULASI HAK TASARUF & HAK AMIL UPZ',
      'Hak Tasaruf (IDR)': totalPenyaluran + totalPembantuan,
      'Hak Amil UPZ (IDR)': totalPenyaluranAmil
    });
    
    // Generate worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
    
    // Auto-fit column widths
    const max_len = Math.max(...rows.map(r => String(r['Nama UPZ'] || '').length));
    worksheet['!cols'] = [
      { wch: Math.max(max_len + 5, 30) },
      { wch: 20 },
      { wch: 20 }
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekapan Hak Tasaruf');
    XLSX.writeFile(workbook, `Rekapan_Hak_Tasaruf_UPZ_${year}.xlsx`);
  };
 
  const handleExportPDFRecap = (year: number) => {
    const { penyaluran, pembantuan, totalPenyaluran, totalPenyaluranAmil, totalPembantuan } = getRecapDataForYear(year);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BAZNAS KOTA SEMARANG', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`REKAPAN HAK TASARUF & HAK AMIL UPZ - TAHUN ${year}`, 105, 21, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 105, 26, { align: 'center' });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 29, 195, 29);
    
    const tableBody: any[] = [];
    
    tableBody.push([
      { content: 'UPZ PENGUMPULAN', colSpan: 3, styles: { fillColor: [220, 235, 252], fontStyle: 'bold' } }
    ]);
    
    penyaluran.forEach((item, index) => {
      tableBody.push([
        `${index + 1}. ${item.name}`,
        `Rp ${item.hak.toLocaleString('id-ID')}`,
        `Rp ${item.hakAmil.toLocaleString('id-ID')}`
      ]);
    });
    
    tableBody.push([
      { content: 'Subtotal UPZ Pengumpulan', styles: { fontStyle: 'bold', halign: 'left' } },
      { content: `Rp ${totalPenyaluran.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `Rp ${totalPenyaluranAmil.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right' } }
    ]);
    
    tableBody.push([
      { content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }
    ]);
    
    tableBody.push([
      { content: 'UPZ PEMBANTUAN PENDISTRIBUSIAN DAN PENDAYAGUNAAN', colSpan: 3, styles: { fillColor: [220, 245, 230], fontStyle: 'bold' } }
    ]);
    
    pembantuan.forEach((item, index) => {
      tableBody.push([
        `${index + 1}. ${item.name}`,
        `Rp ${item.hak.toLocaleString('id-ID')}`,
        'Rp 0'
      ]);
    });
    
    tableBody.push([
      { content: 'Subtotal UPZ Pembantuan Pendistribusian dan Pendayagunaan', styles: { fontStyle: 'bold', halign: 'left' } },
      { content: `Rp ${totalPembantuan.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: 'Rp 0', styles: { fontStyle: 'bold', halign: 'right' } }
    ]);
    
    tableBody.push([
      { content: '', colSpan: 3, styles: { cellPadding: 1, fillColor: [255, 255, 255] } }
    ]);
    
    tableBody.push([
      { content: 'TOTAL AKUMULASI HAK TASARUF & HAK AMIL UPZ', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: `Rp ${(totalPenyaluran + totalPembantuan).toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: `Rp ${totalPenyaluranAmil.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ]);
    
    autoTable(doc, {
      startY: 32,
      head: [['Nama UPZ', 'Hak Tasaruf', 'Hak Amil UPZ']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      margin: { left: 15, right: 15 }
    });
    
    doc.save(`Rekapan_Hak_Tasaruf_&_Amil_UPZ_${year}.pdf`);
  };



  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const [resZis, resMappings] = await Promise.all([
          axios.get('/api/penerimaan-zis'),
          axios.get('/api/penerimaan-mapping').catch(() => null)
        ]);
        if (resZis.data.status === 'success') {
          setZisHistory(resZis.data.data);
        }
        if (resMappings && resMappings.data && resMappings.data.status === 'success') {
          const mappings = resMappings.data.data;
          const pengumpulanRule = mappings.find((m: any) => m.kategori === 'Zakat - UPZ Pengumpulan');
          const pembantuanRule = mappings.find((m: any) => m.kategori === 'Zakat - UPZ Pembantuan');
          if (pengumpulanRule) {
            setUpzHakPengumpulan(Number(pengumpulanRule.persentase_salur_pembantuan));
            setUpzHakAmilPengumpulan(Number(pengumpulanRule.persentase_upz));
          }
          if (pembantuanRule) {
            setUpzHakPembantuan(Number(pembantuanRule.persentase_salur_pembantuan));
          }
        }
      } catch (err) {
        console.error('Error fetching history data:', err);
      }
    };
    fetchHistories();
    fetchUPZList();
  }, []);


  // Print Date Modal states
  const [isPrintDateModalOpen, setIsPrintDateModalOpen] = useState(false);
  const [printDateValue, setPrintDateValue] = useState('');
  const [printRequestDateValue, setPrintRequestDateValue] = useState('');
  const [printHistoryTarget, setPrintHistoryTarget] = useState<SKHistory | null>(null);
  const [printActionType, setPrintActionType] = useState<'print' | 'download' | null>(null);

  const openPrintDateModal = (history: SKHistory, action: 'print' | 'download') => {
    setPrintHistoryTarget(history);
    setPrintActionType(action);
    const isFormatValid = history.startDate && /^\d{4}-\d{2}-\d{2}$/.test(history.startDate);
    if (isFormatValid) {
      setPrintDateValue(history.startDate);
      // Default request date is 7 days before start date
      const d = new Date(history.startDate);
      d.setDate(d.getDate() - 7);
      setPrintRequestDateValue(d.toISOString().split('T')[0]);
    } else {
      setPrintDateValue('');
      setPrintRequestDateValue('');
    }
    setIsPrintDateModalOpen(true);
  };

  const handleConfirmPrintDate = () => {
    if (!printHistoryTarget || !printActionType) return;
    setIsPrintDateModalOpen(false);
    if (printActionType === 'print') {
      handlePrintSK(printHistoryTarget, printDateValue, printRequestDateValue);
    } else {
      handleDownloadSKDoc(printHistoryTarget, printDateValue, printRequestDateValue);
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
  const [renewalForm, setRenewalForm] = useState({ skNumber: '', startYear: '', endYear: '', pimpinanName: '', keterangan: '', scanLink: '' });
  const [formScanLink, setFormScanLink] = useState('');
  const [activeMigrationTab, setActiveMigrationTab] = useState<'upz' | 'sk'>('upz');
  const [activeSkPreview, setActiveSkPreview] = useState<SKHistory | null>(null);
  const [editScanSkTarget, setEditScanSkTarget] = useState<SKHistory | null>(null);
  const [formEditScanLink, setFormEditScanLink] = useState('');
  const [uploadingSk, setUploadingSk] = useState(false);

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
    setFormScanLink('');
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
    setFormScanLink(upz.metadata?.scanLink || '');
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
      keterangan: '',
      scanLink: upz.metadata?.scanLink || ''
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

  const handleConfirmResignation = async () => {
    if (!resignUPZ) return;
    const updatedUpz: UPZ = {
      ...resignUPZ,
      status: 'Mengundurkan Diri',
      resignationDate: resignDate,
      resignationReason: resignReason
    };

    try {
      await axios.put(`/api/upz/${resignUPZ.id}`, updatedUpz);
      await fetchUPZList();
      setSelectedUPZ(prev => prev && prev.id === resignUPZ.id ? updatedUpz : prev);
      setIsResignModalOpen(false);
      setResignUPZ(null);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status pengunduran diri UPZ.');
    }
  };

  const handleReactivateUPZ = async (upz: UPZ) => {
    if (window.confirm(`Apakah Anda yakin ingin mengaktifkan kembali UPZ "${upz.name}"?`)) {
      const updatedUpz: UPZ = {
        ...upz,
        status: 'Aktif',
        resignationDate: undefined,
        resignationReason: undefined
      };

      try {
        await axios.put(`/api/upz/${upz.id}`, updatedUpz);
        await fetchUPZList();
        setSelectedUPZ(prev => prev && prev.id === upz.id ? updatedUpz : prev);
      } catch (err) {
        console.error(err);
        alert('Gagal mengaktifkan kembali UPZ.');
      }
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
  const nextBaseSK = getNextBaseSKNumber(skHistory, data, formCategory);

  const handleRenewalSK = async () => {
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
      skType: 'Pembaruan',
      scanLink: renewalForm.scanLink
    };
    
    setSkHistory(prev => [
      ...prev.map(h => h.upzId === selectedUPZ.id && h.status === 'Aktif' ? { ...h, status: 'Tidak Aktif' as const } : h),
      newEntry,
    ]);

    const updatedHistoryList = [
      ...(selectedUPZ.metadata?.skHistory || []).map((h: any) => ({ ...h, status: 'Tidak Aktif' })),
      newEntry
    ];

    const updatedUpz = { 
      ...selectedUPZ, 
      activeSKNumber: renewalForm.skNumber,
      skExpiryDate: `${renewalForm.endYear}-12-31`,
      metadata: { 
        ...selectedUPZ.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        scanLink: renewalForm.scanLink,
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        },
        skHistory: updatedHistoryList
      } 
    };

    try {
      await axios.put(`/api/upz/${selectedUPZ.id}`, updatedUpz);
      await fetchUPZList();
      setSelectedUPZ(updatedUpz);
      setRenewalForm({ skNumber: '', startYear: '', endYear: '', pimpinanName: '', keterangan: '', scanLink: '' });
      setHistoryView('list');
      alert(`✅ SK Pembaruan ${renewalForm.skNumber} berhasil disimpan dengan struktur pengurus baru!`);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui SK UPZ.');
    }
  };

  const handlePerubahanSK = async () => {
    if (!selectedUPZ || !formPengurus.penasehat.nama) {
      alert('Harap isi minimal Nama Penasehat/Ketua.');
      return;
    }

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
      skType: 'Perubahan',
      scanLink: currentSK?.scanLink || ''
    };

    setSkHistory(prev => [
      ...prev.map(h => h.upzId === selectedUPZ.id && h.status === 'Aktif' ? { ...h, status: 'Tidak Aktif' as const } : h),
      newEntry,
    ]);

    const updatedHistoryList = [
      ...(selectedUPZ.metadata?.skHistory || []).map((h: any) => ({ ...h, status: 'Tidak Aktif' })),
      newEntry
    ];

    const updatedUpz = { 
      ...selectedUPZ, 
      metadata: { 
        ...selectedUPZ.metadata, 
        pimpinanName: formPengurus.penasehat.nama,
        scanLink: currentSK?.scanLink || '',
        pengurus: {
          ...formPengurus,
          anggotaTambahan: anggotaTambahan
        },
        skHistory: updatedHistoryList
      } 
    };

    try {
      await axios.put(`/api/upz/${selectedUPZ.id}`, updatedUpz);
      await fetchUPZList();
      setSelectedUPZ(updatedUpz);
      setHistoryView('list');
      alert(`✅ Perubahan pengurus berhasil disimpan. No. SK tetap ${sameSKNumber}. Masa berlaku tetap.`);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan SK.');
    }
  };

  const handleSaveScanLink = async () => {
    if (!selectedUPZ || !editScanSkTarget) return;

    const updatedHistoryList = (selectedUPZ.metadata?.skHistory || []).map((h: SKHistory) => 
      h.id === editScanSkTarget.id ? { ...h, scanLink: formEditScanLink } : h
    );

    setSkHistory(prev => prev.map(h => h.id === editScanSkTarget.id ? { ...h, scanLink: formEditScanLink } : h));

    const isActiveSK = editScanSkTarget.status === 'Aktif' || editScanSkTarget.skNumber === selectedUPZ.activeSKNumber;
    const updatedMetadata = {
      ...selectedUPZ.metadata,
      scanLink: isActiveSK ? formEditScanLink : selectedUPZ.metadata?.scanLink,
      skHistory: updatedHistoryList
    };

    const updatedUpz = {
      ...selectedUPZ,
      metadata: updatedMetadata
    };

    try {
      await axios.put(`/api/upz/${selectedUPZ.id}`, updatedUpz);
      await fetchUPZList();
      setSelectedUPZ(updatedUpz);
      setEditScanSkTarget(null);
      setFormEditScanLink('');
      alert('✅ Link Scan SK berhasil diperbarui.');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui Link Scan SK.');
    }
  };

  const handleUploadSk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUPZ) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 5MB.');
      return;
    }

    setUploadingSk(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`/api/upz/${selectedUPZ.id}/upload-sk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.status === 'success' && res.data.webViewLink) {
        setFormEditScanLink(res.data.webViewLink);
        alert('✅ File berhasil diunggah ke Google Drive dan link telah otomatis terisi!');
      } else {
        alert('Gagal mengunggah file.');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Gagal menghubungi server untuk upload file.';
      alert(errMsg);
    } finally {
      setUploadingSk(false);
      e.target.value = '';
    }
  };


  const generateSKHtml = (upz: UPZ, history: SKHistory, customTglDitetapkan?: string, customTglPermohonan?: string) => {
    const isPembentukan = history.skType === 'Baru' || isSKPembentukan(history.skNumber);
    
    let tipePerubahanTeks = "";
    let aksiBentukAtauUsul = "membentuk";
    
    if (!isPembentukan) {
      const { version } = parseSKNumber(history.skNumber);
      const numbersInWords = ["Pertama", "Kedua", "Ketiga", "Keempat", "Kelima", "Keenam"];
      const versionWord = version > 0 && version <= numbersInWords.length ? numbersInWords[version - 1] : `Ke-${version}`;
      tipePerubahanTeks = `Perubahan ${versionWord}`;
      aksiBentukAtauUsul = `mengusulkan Perubahan ${versionWord.charAt(0) + versionWord.slice(1).toLowerCase()}`;
    }

    const tipePerubahan = tipePerubahanTeks ? tipePerubahanTeks.toUpperCase() : "";
    
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
    
    let tglSuratMasuk = formatIndoDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    if (customTglPermohonan) {
      const parts = customTglPermohonan.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        tglSuratMasuk = formatIndoDate(new Date(year, month, day));
      }
    }
    
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

    if (['Perusahaan Swasta', 'Organisasi Profesi', 'Yayasan'].includes(upz.category)) {
      const upzTitleName = upz.name.toUpperCase();
      const upzTextName = upz.name;
      const usulanPimpinan = ['Perusahaan Swasta'].includes(upz.category) ? `Pimpinan ${upz.name}` : `Ketua ${upz.name}`;
      const tingkatText = "Tingkat Kota Semarang";

      return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Template SK BAZNAS - ${upz.category}</title>
    <style>
        @page {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
        }
        @page Section1 {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
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
            line-height: 1.3;
            mso-line-height-rule: exactly;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
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
            margin-top: 12px;
            vertical-align: top;
        }
        .layout-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .col-title { width: 110px; font-weight: bold; }
        .col-colon { width: 15px; text-align: center; font-weight: bold; }
        .col-content { width: calc(100% - 125px); text-align: justify; }

        /* Tabel Susunan Pengurus */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .data-table th, .data-table td {
            border: 1px solid black;
            padding: 8px 10px;
            text-align: left;
            font-size: 11pt;
            line-height: 1.3;
        }
        .data-table th { text-align: center; font-weight: bold; }

        ol, ul {
            padding-left: 15px;
        }
        li {
            line-height: 1.3;
            text-align: justify;
            margin-bottom: 6px;
        }

        .tembusan, .tembusan * {
            line-height: 1.2 !important;
        }
        .page-break {
            page-break-before: always;
            clear: both;
        }
    </style>
</head>
<body>
<div class="Section1">

    <div style="border-top: 2px solid #000; margin-bottom: 15px; width: 100%;"></div>

    <!-- HALAMAN 1: SURAT KEPUTUSAN -->
    <div class="text-center uppercase" style="line-height: 1.3; margin-bottom: 18px;">
        <span class="bold">KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>
        NOMOR ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>

        <div style="margin: 8px 0;">TENTANG</div>

        <span class="bold">PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ) ${upzTitleName}</span><br>
        <span class="bold">BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>

        <div style="margin: 12px 0; font-weight: bold;">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG,</div>
    </div>

    <!-- KONSIDERAN: MENIMBANG & MENGINGAT -->
    <table class="layout-table">
        <tr>
            <td class="col-title">Menimbang</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Bahwa untuk meningkatkan pengumpulan zakat, infak dan sedekah, maka dipandang perlu untuk ${aksiBentukAtauUsul} Unit Pengumpul Zakat (UPZ) ${tingkatText};</li>
                    <li style="margin-bottom: 6px;">Usulan ${usulanPimpinan} tanggal ${tglSuratMasuk} tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus UPZ ${upzTextName} Periode ${periodeTahun};</li>
                    <li style="margin-bottom: 6px;">Bahwa berdasarkan huruf a, dan huruf b, maka perlu diterbitkan Keputusan Ketua BAZNAS Kota Semarang tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} Periode ${periodeTahun}.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">Mengingat</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Undang-Undang RI Nomor 23 Tahun 2011 tentang Pengelolaan Zakat (Lembaran Negara Republik Indonesia Tahun 2011 Nomor 115, Tambahan Lembaran Negara Republik Indonesia Nomor 5255);</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 14 Tahun 2014 tentang Pelaksanaan Undang-undang Nomor 23 Tahun 2011 tentang Pengelolaan Zakat;</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 60 Tahun 2010 tentang Zakat atau Sumbangan Keagamaan yang sifatnya wajib yang boleh dikurangkan dari penghasilan Bruto;</li>
                    <li style="margin-bottom: 6px;">Instruksi Presiden Nomor 3 Tahun 2014 tentang Optimalisasi Pengumpulan Zakat di Kementerian/Lembaga, Sekretaris Jendral Lembaga Negara, Sekretariat Jendral Komisi Negara, Pemerintah Daerah, BUMN dan BUMD melalui Badan Amil Zakat Nasional;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 3 Tahun 2014 tentang Organisasi dan Tata Kerja Badan Amil Zakat Nasional Provinsi dan Badan Amil Zakat Nasional Kabupaten/Kota;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 2 Tahun 2016 tentang Pembentukan dan Tata Kerja Unit Pengumpul Zakat;</li>
                    <li style="margin-bottom: 6px;">Surat Keputusan Walikota Semarang Nomor 450/662 Tahun 2022 tentang Pengangkatan Pimpinan Badan Amil Zakat Nasional (BAZNAS) Kota Semarang Periode 2022-2027;</li>
                    <li style="margin-bottom: 6px;">Instruksi Walikota Semarang Nomor : 451.12/5594 tanggal 22 November 2016 tentang Pembayaran Zakat, Infak dan Sedekah bagi PNS dilingkungan Pemkot Semarang.</li>
                </ol>
            </td>
        </tr>
    </table>

    <!-- DIKTUM KEPUTUSAN (HALAMAN 2) -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
    <div class="text-center bold" style="margin-top: 15px; margin-bottom: 15px; font-size: 11pt;">MEMUTUSKAN</div>

    <table class="layout-table">
        <tr>
            <td class="col-title">Menetapkan</td>
            <td class="col-colon">:</td>
            <td class="col-content bold uppercase">
                KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG TENTANG PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ) ${upzTitleName} PERIODE ${periodeTahun}.
            </td>
        </tr>
        <tr>
            <td class="col-title">PERTAMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} Periode ${periodeTahun} dengan susunan pengurus sebagaimana tercantum dalam lampiran surat keputusan ini.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEDUA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengurus sebagaimana dimaksud pada DIKTUM PERTAMA memiliki tugas dan kewajiban sebagai berikut:
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Sosialisasi dan edukasi zakat, infak dan sedekah pada institusi UPZ ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Mengumpulkan Dana Zakat, Infak dan Sedekah di lingkungan ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Seluruh hasil pengumpulan dana UPZ wajib disetorkan kepada BAZNAS Kota Semarang;</li>
                    <li style="margin-bottom: 6px;">Pendataan dan layanan muzakki pada masing-masing institusi UPZ ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Penyerahan Nomor Pokok Wajib Zakat (NPWZ) dan Bukti Setor Zakat (BSZ) yang diterbitkan oleh BAZNAS Kota Semarang kepada muzakki;</li>
                    <li style="margin-bottom: 6px;">Penyusunan laporan kegiatan pengumpulan zakat, infak dan sedekah BAZNAS Kota Semarang.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">KETIGA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Masa Kerja Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} sebagaimana dimaksud Diktum KESATU adalah selama 5 (Lima) Tahun.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEEMPAT</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Segala biaya yang ditimbulkan akibat diterbitkannya Surat Keputusan ini dibebankan pada Anggaran Badan Amil Zakat Nasional (BAZNAS) Kota Semarang melalui operasional Amil sebesar 5 % (Lima persen) dari Perolehan yang dihimpun atau sumber dana lain yang halal.
            </td>
        </tr>
        <tr>
            <td class="col-title">KELIMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Surat Keputusan ini mulai berlaku sejak tanggal ini ditetapkan dan akan ditinjau kembali jika ada kekeliruan didalamnya.
            </td>
        </tr>
    </table>

    <!-- TANDA TANGAN -->
    <div style="clear: both; margin-top: 40px; width: 100%; page-break-inside: avoid;">
        <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
            <tr>
                <td style="width: 100px; border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Ditetapkan di</td>
                <td style="width: 15px; border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Semarang</td>
            </tr>
            <tr>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Pada tanggal</td>
                <td style="border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">${tglDitetapkan}</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-top: 15px; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
            </tr>
        </table>
        <div style="clear: both;"></div>
    </div>

    <!-- TEMBUSAN -->
    <div class="tembusan" style="margin-top: 30px; font-size: 9pt; line-height: 1.3; font-family: Arial, sans-serif; color: #000; page-break-inside: avoid; text-align: left;">
        <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Salinan disampaikan kepada Yth.:</div>
        <ol style="margin: 0; padding-left: 15px; list-style-type: decimal;">
            <li style="margin-bottom: 3px;">Walikota Semarang (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Ketua BAZNAS Provinsi Jawa Tengah (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Kepala Kantor Kementerian Agama Kota Semarang;</li>
            <li style="margin-bottom: 3px;">Pengurus UPZ ${upzTextName} dimaksud.</li>
        </ol>
    </div>

    <!-- HALAMAN 3: LAMPIRAN -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;">
        <table style="width: 100%; font-size: 11pt; font-family: Arial, sans-serif; border-collapse: collapse; border: none; vertical-align: top;">
            <tr>
                <td style="width: 110px; border: none; padding: 1px 0; font-weight: bold; vertical-align: top;">LAMPIRAN</td>
                <td style="width: 15px; border: none; padding: 1px 0; font-weight: bold; text-align: center; vertical-align: top;">:</td>
                <td style="border: none; padding: 1px 0; vertical-align: top; text-align: justify; line-height: 1.3;">
                    Keputusan Ketua BAZNAS Kota Semarang<br>
                    Nomor : ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>
                    Tentang<br>
                    PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)<br>
                    ${upzTitleName} PERIODE ${periodeTahun}
                </td>
            </tr>
        </table>

        <div class="text-center bold uppercase" style="margin-top: 30px; margin-bottom: 20px; line-height: 1.3;">
            SUSUNAN PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)<br>
            ${upzTitleName}<br>
            PERIODE ${periodeTahun}
        </div>

        <!-- TABEL PENGURUS -->
        <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
            <thead>
                <tr>
                    <th style="width: 8%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NO</th>
                    <th style="width: 32%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NAMA</th>
                    <th style="width: 30%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">ALAMAT</th>
                    <th style="width: 30%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">JABATAN DALAM UPZ</th>
                </tr>
            </thead>
            <tbody>
                ${pengurusList.map((item, idx) => `
                <tr>
                    <td style="border: 1px solid black; padding: 8px; text-align: center;">${idx + 1}.</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.nama}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.alamat || '-'}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.jabatan}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- TANDA TANGAN LAMPIRAN -->
        <div style="clear: both; margin-top: 30px; width: 100%; page-break-inside: avoid;">
            <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
                </tr>
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>
    </div>

</div>
</body>
</html>`;
    }

    if (['Univ/PT/Pendidikan Menengah', 'Pendidikan Dasar'].includes(upz.category)) {
      const upzTitleName = upz.name.toUpperCase();
      const upzTextName = upz.name;
      const usulanPimpinan = `Kepala ${upz.name}`;

      return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Template SK BAZNAS - ${upz.category}</title>
    <style>
        @page {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
        }
        @page Section1 {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
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
            line-height: 1.3;
            mso-line-height-rule: exactly;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
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
            margin-top: 12px;
            vertical-align: top;
        }
        .layout-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .col-title { width: 110px; font-weight: bold; }
        .col-colon { width: 15px; text-align: center; font-weight: bold; }
        .col-content { width: calc(100% - 125px); text-align: justify; }

        /* Tabel Susunan Pengurus */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .data-table th, .data-table td {
            border: 1px solid black;
            padding: 8px 10px;
            text-align: left;
            font-size: 11pt;
            line-height: 1.3;
        }
        .data-table th { text-align: center; font-weight: bold; }

        ol, ul {
            padding-left: 15px;
        }
        li {
            line-height: 1.3;
            text-align: justify;
            margin-bottom: 6px;
        }

        .tembusan, .tembusan * {
            line-height: 1.2 !important;
        }
        .page-break {
            page-break-before: always;
            clear: both;
        }
    </style>
</head>
<body>
<div class="Section1">

    <div style="border-top: 2px solid #000; margin-bottom: 15px; width: 100%;"></div>

    <!-- HALAMAN 1: SURAT KEPUTUSAN -->
    <div class="text-center uppercase" style="line-height: 1.3; margin-bottom: 18px;">
        <span class="bold">KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>
        NOMOR ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>

        <div style="margin: 8px 0;">TENTANG</div>

        <span class="bold">PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)</span><br>
        <span class="bold">${upzTitleName} PERIODE ${periodeTahun}</span><br>

        <div style="margin: 12px 0; font-weight: bold;">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG,</div>
    </div>

    <!-- KONSIDERAN: MENIMBANG & MENGINGAT -->
    <table class="layout-table">
        <tr>
            <td class="col-title">Menimbang</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Bahwa untuk meningkatkan pengumpulan zakat, infak dan sedekah, maka dipandang perlu untuk ${aksiBentukAtauUsul} Unit Pengumpul Zakat (UPZ) ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Usulan ${usulanPimpinan} tanggal ${tglSuratMasuk} tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus UPZ ${upzTextName} Periode ${periodeTahun};</li>
                    <li style="margin-bottom: 6px;">Bahwa berdasarkan huruf a dan huruf b, maka perlu diterbitkan Keputusan Ketua BAZNAS Kota Semarang tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus UPZ ${upzTextName} Periode ${periodeTahun}.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">Mengingat</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Undang-Undang RI Nomor 23 Tahun 2011 tentang Pengelolaan Zakat (Lembaran Negara Republik Indonesia Tahun 2011 Nomor 115, Tambahan Lembaran Negara Republik Indonesia Nomor 5255);</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 14 Tahun 2014 tentang Pelaksanaan Undang-undang Nomor 23 Tahun 2011 tentang Pengelolaan Zakat;</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 60 Tahun 2010 tentang Zakat atau Sumbangan Keagamaan yang sifatnya wajib yang boleh dikurangkan dari penghasilan Bruto;</li>
                    <li style="margin-bottom: 6px;">Instruksi Presiden Nomor 3 Tahun 2014 tentang Optimalisasi Pengumpulan Zakat di Kementerian/Lembaga, Sekretaris Jendral Lembaga Negara, Sekretariat Jendral Komisi Negara, Pemerintah Daerah, BUMN dan BUMD melalui Badan Amil Zakat Nasional;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 3 Tahun 2014 tentang Organisasi dan Tata Kerja Badan Amil Zakat Nasional Provinsi dan Badan Amil Zakat Nasional Kabupaten/Kota;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 2 Tahun 2016 tentang Pembentukan dan Tata Kerja Unit Pengumpul Zakat;</li>
                    <li style="margin-bottom: 6px;">Surat Keputusan Walikota Semarang Nomor 450/662 Tahun 2022 tentang Pengangkatan Pimpinan Badan Amil Zakat Nasional (BAZNAS) Kota Semarang Periode 2022-2027.</li>
                </ol>
            </td>
        </tr>
    </table>

    <!-- DIKTUM KEPUTUSAN (HALAMAN 2) -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
    <div class="text-center bold" style="margin-top: 15px; margin-bottom: 15px; font-size: 11pt;">MEMUTUSKAN</div>

    <table class="layout-table">
        <tr>
            <td class="col-title">Menetapkan</td>
            <td class="col-colon">:</td>
            <td class="col-content bold uppercase">
                KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG TENTANG PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UPZ ${upzTitleName} PERIODE ${periodeTahun}.
            </td>
        </tr>
        <tr>
            <td class="col-title">PERTAMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus UPZ ${upzTextName} Periode ${periodeTahun} dengan susunan pengurus sebagaimana tercantum dalam lampiran surat keputusan ini.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEDUA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengurus sebagaimana dimaksud pada DIKTUM PERTAMA memiliki tugas dan kewajiban sebagai berikut:
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Sosialisasi dan edukasi zakat, infak dan sedekah pada institusi UPZ ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Mengumpulkan Dana Zakat, Infak dan Sedekah di lingkungan ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Seluruh hasil pengumpulan dana UPZ wajib disetorkan kepada BAZNAS Kota Semarang;</li>
                    <li style="margin-bottom: 6px;">Pendataan dan layanan muzakki pada masing-masing institusi UPZ ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Penyerahan Nomor Pokok Wajib Zakat (NPWZ) dan Bukti Setor Zakat (BSZ) yang diterbitkan oleh BAZNAS Kota Semarang kepada muzakki;</li>
                    <li style="margin-bottom: 6px;">Penyusunan laporan kegiatan pengumpulan zakat, infak dan sedekah BAZNAS Kota Semarang.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">KETIGA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Masa Kerja Pengurus Unit Pengumpul Zakat UPZ ${upzTextName} sebagaimana dimaksud Diktum KESATU adalah selama 5 (Lima) Tahun.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEEMPAT</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Segala biaya yang ditimbulkan akibat diterbitkannya Surat Keputusan ini dibebankan pada Anggaran Badan Amil Zakat Nasional (BAZNAS) Kota Semarang melalui Amil sebesar 5 % (Lima persen) dari Perolehan yang dihimpun.
            </td>
        </tr>
        <tr>
            <td class="col-title">KELIMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Surat Keputusan ini mulai berlaku sejak tanggal ini ditetapkan dan akan ditinjau kembali jika ada kekeliruan didalamnya.
            </td>
        </tr>
    </table>

    <!-- TANDA TANGAN -->
    <div style="clear: both; margin-top: 40px; width: 100%; page-break-inside: avoid;">
        <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
            <tr>
                <td style="width: 100px; border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Ditetapkan di</td>
                <td style="width: 15px; border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Semarang</td>
            </tr>
            <tr>
                <td style="border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">Pada tanggal</td>
                <td style="border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">${tglDitetapkan}</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-top: 15px; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
            </tr>
        </table>
        <div style="clear: both;"></div>
    </div>

    <!-- TEMBUSAN -->
    <div class="tembusan" style="margin-top: 30px; font-size: 9pt; line-height: 1.3; font-family: Arial, sans-serif; color: #000; page-break-inside: avoid; text-align: left;">
        <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Salinan disampaikan kepada Yth.:</div>
        <ol style="margin: 0; padding-left: 15px; list-style-type: decimal;">
            <li style="margin-bottom: 3px;">Walikota Semarang (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Ketua BAZNAS Provinsi Jawa Tengah (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Kepala Kantor Kementerian Agama Kota Semarang;</li>
            <li style="margin-bottom: 3px;">Pengurus UPZ ${upzTextName} dimaksud.</li>
        </ol>
    </div>

    <!-- HALAMAN 3: LAMPIRAN -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;">
        <table style="width: 100%; font-size: 11pt; font-family: Arial, sans-serif; border-collapse: collapse; border: none; vertical-align: top;">
            <tr>
                <td style="width: 110px; border: none; padding: 1px 0; font-weight: bold; vertical-align: top;">LAMPIRAN</td>
                <td style="width: 15px; border: none; padding: 1px 0; font-weight: bold; text-align: center; vertical-align: top;">:</td>
                <td style="border: none; padding: 1px 0; vertical-align: top; text-align: justify; line-height: 1.3;">
                    Keputusan Ketua BAZNAS Kota Semarang<br>
                    Nomor : ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>
                    Tentang<br>
                    PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)<br>
                    ${upzTitleName} PERIODE ${periodeTahun}
                </td>
            </tr>
        </table>

        <div class="text-center bold uppercase" style="margin-top: 30px; margin-bottom: 20px; line-height: 1.3;">
            SUSUNAN PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)<br>
            ${upzTitleName}<br>
            PERIODE ${periodeTahun}
        </div>

        <!-- TABEL PENGURUS -->
        <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
            <thead>
                <tr>
                    <th style="width: 10%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NO</th>
                    <th style="width: 55%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NAMA</th>
                    <th style="width: 35%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">JABATAN DALAM UPZ</th>
                </tr>
            </thead>
            <tbody>
                ${pengurusList.map((item, idx) => `
                <tr>
                    <td style="border: 1px solid black; padding: 8px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.nama}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.jabatan}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- TANDA TANGAN LAMPIRAN -->
        <div style="clear: both; margin-top: 30px; width: 100%; page-break-inside: avoid;">
            <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
                </tr>
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>
    </div>

</div>
</body>
</html>`;
    }

    if (upz.category === 'Instansi Vertikal' || upz.category === 'OPD' || upz.category === 'BUMD' || upz.category === 'Kecamatan' || upz.category === 'Pemerintah Kecamatan') {
      const isKecamatan = upz.category === 'Kecamatan' || upz.category === 'Pemerintah Kecamatan';
      const upzTitleName = isKecamatan ? `KECAMATAN ${upz.kecamatan.toUpperCase()}` : upz.name.toUpperCase();
      const upzTextName = isKecamatan ? `Kecamatan ${upz.kecamatan}` : upz.name;
      const usulanPimpinan = isKecamatan ? `Camat ${upz.kecamatan}` : `Kepala ${upz.name}`;
      const tingkatText = isKecamatan ? "Tingkat Kecamatan se-Kota Semarang" : "Tingkat Kota Semarang";

      return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Template SK BAZNAS - OPD/Instansi</title>
    <style>
        @page {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
        }
        @page Section1 {
            size: 8.5in 14.0in; /* US Legal size */
            margin-top: 1.8in;
            margin-bottom: 1.0in;
            margin-left: 0.8in;
            margin-right: 0.9in;
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
            line-height: 1.3;
            mso-line-height-rule: exactly;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
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
            margin-top: 12px;
            vertical-align: top;
        }
        .layout-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .col-title { width: 110px; font-weight: bold; }
        .col-colon { width: 15px; text-align: center; font-weight: bold; }
        .col-content { width: calc(100% - 125px); text-align: justify; }

        /* Tabel Susunan Pengurus */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .data-table th, .data-table td {
            border: 1px solid black;
            padding: 8px 10px;
            text-align: left;
            font-size: 11pt;
            line-height: 1.3;
        }
        .data-table th { text-align: center; font-weight: bold; }

        ol, ul {
            padding-left: 15px;
        }
        li {
            line-height: 1.3;
            text-align: justify;
            margin-bottom: 6px;
        }

        .tembusan, .tembusan * {
            line-height: 1.2 !important;
        }
        .page-break {
            page-break-before: always;
            clear: both;
        }
    </style>
</head>
<body>
<div class="Section1">

    <div style="border-top: 2px solid #000; margin-bottom: 15px; width: 100%;"></div>

    <!-- HALAMAN 1: SURAT KEPUTUSAN -->
    <div class="text-center uppercase" style="line-height: 1.3; margin-bottom: 18px;">
        <span class="bold">KEPUTUSAN</span><br>
        <span class="bold">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>
        NOMOR ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>

        <div style="margin: 8px 0;">TENTANG</div>

        <span class="bold">PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)</span><br>
        <span class="bold">${upzTitleName} KOTA SEMARANG</span><br>
        <span class="bold">BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG</span><br>

        <div style="margin: 12px 0; font-weight: bold;">KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG,</div>
    </div>

    <!-- KONSIDERAN: MENIMBANG & MENGINGAT -->
    <table class="layout-table">
        <tr>
            <td class="col-title">Menimbang</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Bahwa untuk meningkatkan pengumpulan zakat, infak dan sedekah, maka dipandang perlu untuk ${aksiBentukAtauUsul} Unit Pengumpul Zakat (UPZ) ${tingkatText};</li>
                    <li style="margin-bottom: 6px;">Usulan ${usulanPimpinan} tanggal ${tglSuratMasuk} tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus UPZ ${upzTextName} Periode ${periodeTahun};</li>
                    <li style="margin-bottom: 6px;">bahwa berdasarkan huruf a, dan huruf b, maka perlu diterbitkan Keputusan Ketua BAZNAS Kota Semarang tentang Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} Periode ${periodeTahun}.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">Mengingat</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                <ol style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Undang-Undang RI Nomor 23 Tahun 2011 tentang Pengelolaan Zakat (Lembaran Negara Republik Indonesia Tahun 2011 Nomor 115, Tambahan Lembaran Negara Republik Indonesia Nomor 5255);</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 14 Tahun 2014 tentang Pelaksanaan Undang-undang Nomor 23 Tahun 2011 tentang Pengelolaan Zakat;</li>
                    <li style="margin-bottom: 6px;">Peraturan Pemerintah Nomor 60 Tahun 2010 tentang Zakat atau Sumbangan Keagamaan yang sifatnya wajib yang boleh dikurangkan dari penghasilan Bruto;</li>
                    <li style="margin-bottom: 6px;">Instruksi Presiden Nomor 3 Tahun 2014 tentang Optimalisasi Pengumpulan Zakat di Kementerian/Lembaga, Sekretaris Jendral Lembaga Negara, Sekretariat Jendral Komisi Negara, Pemerintah Daerah, BUMN dan BUMD melalui Badan Amil Zakat Nasional;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 3 Tahun 2014 tentang Organisasi dan Tata Kerja Badan Amil Zakat Nasional Provinsi dan Badan Amil Zakat Nasional Kabupaten/Kota;</li>
                    <li style="margin-bottom: 6px;">Peraturan BAZNAS Nomor 2 Tahun 2016 tentang Pembentukan dan Tata Kerja Unit Pengumpul Zakat;</li>
                    <li style="margin-bottom: 6px;">Surat Keputusan Walikota Semarang Nomor 450/662 Tahun 2022 tentang Pengangkatan Pimpinan Badan Amil Zakat Nasional (BAZNAS) Kota Semarang Periode 2022-2027;</li>
                    <li style="margin-bottom: 6px;">Instruksi Walikota Semarang Nomor : 451.12/5594 tanggal 22 November 2016 tentang Pembayaran Zakat, Infak dan Sedekah bagi PNS dilingkungan Pemkot Semarang.</li>
                </ol>
            </td>
        </tr>
    </table>

    <!-- DIKTUM KEPUTUSAN (HALAMAN 2) -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;"></div>
    <div class="text-center bold" style="margin-top: 15px; margin-bottom: 15px; font-size: 11pt;">MEMUTUSKAN</div>

    <table class="layout-table">
        <tr>
            <td class="col-title">Menetapkan</td>
            <td class="col-colon">:</td>
            <td class="col-content bold uppercase">
                KEPUTUSAN KETUA BADAN AMIL ZAKAT NASIONAL (BAZNAS) KOTA SEMARANG TENTANG PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ) ${upzTitleName} PERIODE ${periodeTahun}.
            </td>
        </tr>
        <tr>
            <td class="col-title">PERTAMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} Periode ${periodeTahun} dengan susunan pengurus sebagaimana tercantum dalam lampiran surat keputusan ini.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEDUA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Pengurus sebagaimana dimaksud pada DIKTUM PERTAMA memiliki tugas dan kewajiban sebagai berikut:
                <ol type="a" style="margin: 0; padding-left: 15px;">
                    <li style="margin-bottom: 6px;">Sosialisasi dan edukasi zakat, infak dan sedekah pada institusi UPZ ${upzTextName} Kota Semarang;</li>
                    <li style="margin-bottom: 6px;">Mengumpulkan Dana Zakat, Infak dan Sedekah di ${isKecamatan ? 'Wilayah' : 'lingkungan'} ${upzTextName} Kota Semarang;</li>
                    <li style="margin-bottom: 6px;">Seluruh hasil pengumpulan dana UPZ wajib disetorkan kepada BAZNAS Kota Semarang;</li>
                    <li style="margin-bottom: 6px;">Pendataan dan layanan muzakki pada masing-masing institusi UPZ ${upzTextName};</li>
                    <li style="margin-bottom: 6px;">Penyerahan Nomor Pokok Wajib Zakat (NPWZ) dan Bukti Setor Zakat (BSZ) yang diterbitkan oleh BAZNAS Kota Semarang kepada muzakki;</li>
                    <li style="margin-bottom: 6px;">Penyusunan laporan kegiatan pengumpulan zakat, infak dan sedekah BAZNAS Kota Semarang.</li>
                </ol>
            </td>
        </tr>
        <tr>
            <td class="col-title">KETIGA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Masa Kerja Pengurus Unit Pengumpul Zakat (UPZ) ${upzTextName} Kota Semarang sebagaimana dimaksud Diktum KESATU adalah selama 5 (Lima) Tahun.
            </td>
        </tr>
        <tr>
            <td class="col-title">KEEMPAT</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Segala biaya yang ditimbulkan akibat diterbitkannya Surat Keputusan ini dibebankan pada Anggaran Badan Amil Zakat Nasional (BAZNAS) Kota Semarang melalui Amil sebesar 5 % (Lima persen) dari Perolehan yang dihimpun dimasing-masing UPZ ${upzTextName}.
            </td>
        </tr>
        <tr>
            <td class="col-title">KELIMA</td>
            <td class="col-colon">:</td>
            <td class="col-content">
                Surat Keputusan ini mulai berlaku sejak tanggal ini ditetapkan and akan ditinjau kembali jika ada kekeliruan didalamnya.
            </td>
        </tr>
    </table>

    <!-- TANDA TANGAN -->
    <div style="clear: both; margin-top: 40px; width: 100%; page-break-inside: avoid;">
        <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
            <tr>
                <td style="width: 100px; border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Ditetapkan di</td>
                <td style="width: 15px; border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Semarang</td>
            </tr>
            <tr>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">Pada tanggal</td>
                <td style="border: none; padding: 2px 0; text-align: center; font-size: 11pt; font-family: Arial, sans-serif;">:</td>
                <td style="border: none; padding: 2px 0; font-size: 11pt; font-family: Arial, sans-serif;">${tglDitetapkan}</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-top: 15px; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
            </tr>
            <tr>
                <td colspan="3" style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
            </tr>
        </table>
        <div style="clear: both;"></div>
    </div>

    <!-- TEMBUSAN -->
    <div class="tembusan" style="margin-top: 30px; font-size: 9pt; line-height: 1.3; font-family: Arial, sans-serif; color: #000; page-break-inside: avoid; text-align: left;">
        <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Salinan disampaikan kepada Yth.:</div>
        <ol style="margin: 0; padding-left: 15px; list-style-type: decimal;">
            <li style="margin-bottom: 3px;">Walikota Semarang (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Ketua BAZNAS Provinsi Jawa Tengah (sebagai laporan);</li>
            <li style="margin-bottom: 3px;">Kepala Kantor Kementerian Agama Kota Semarang;</li>
            <li style="margin-bottom: 3px;">Pengurus UPZ ${upzTextName} Kota Semarang dimaksud.</li>
        </ol>
    </div>

    <!-- HALAMAN 3: LAMPIRAN -->
    <div class="page-break" style="page-break-before: always; clear: both; padding-top: 20px;">
        <table style="width: 100%; font-size: 11pt; font-family: Arial, sans-serif; border-collapse: collapse; border: none; vertical-align: top;">
            <tr>
                <td style="width: 110px; border: none; padding: 1px 0; font-weight: bold; vertical-align: top;">LAMPIRAN</td>
                <td style="width: 15px; border: none; padding: 1px 0; font-weight: bold; text-align: center; vertical-align: top;">:</td>
                <td style="border: none; padding: 1px 0; vertical-align: top; text-align: justify; line-height: 1.3;">
                    Keputusan Ketua BAZNAS Kota Semarang<br>
                    Nomor : ${history.skNumber} -SK / A.1 / BAZNAS - SMG / ${getRomanMonth(chosenDate.getMonth() + 1)} / ${chosenDate.getFullYear()}<br>
                    Tentang<br>
                    PENGANGKATAN ${tipePerubahan ? tipePerubahan + ' ' : ''}PENGURUS UNIT PENGUMPUL ZAKAT (UPZ)<br>
                    ${upzTitleName} KOTA SEMARANG PERIODE ${periodeTahun}
                </td>
            </tr>
        </table>

        <div class="text-center bold uppercase" style="margin-top: 30px; margin-bottom: 20px; line-height: 1.3;">
            SUSUNAN PENGURUS<br>
            UNIT PENGUMPUL ZAKAT (UPZ)<br>
            ${upzTitleName} KOTA SEMARANG<br>
            PERIODE ${periodeTahun}
        </div>

        <!-- TABEL PENGURUS -->
        <table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;">
            <thead>
                <tr>
                    <th style="width: 8%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NO</th>
                    <th style="width: 32%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">NAMA</th>
                    <th style="width: 30%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">JABATAN DALAM INSTANSI</th>
                    <th style="width: 30%; border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">JABATAN DALAM UPZ</th>
                </tr>
            </thead>
            <tbody>
                ${pengurusList.map((item, idx) => `
                <tr>
                    <td style="border: 1px solid black; padding: 8px; text-align: center;">${idx + 1}.</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.nama}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.alamat || '-'}</td>
                    <td style="border: 1px solid black; padding: 8px;">${item.jabatan}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- TANDA TANGAN LAMPIRAN -->
        <div style="clear: both; margin-top: 30px; width: 100%; page-break-inside: avoid;">
            <table align="right" style="width: 350px; margin-left: auto; margin-right: 30px; border-collapse: collapse; border: none; text-align: left;">
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif; padding-bottom: 85px;">KETUA BAZNAS KOTA SEMARANG,</td>
                </tr>
                <tr>
                    <td style="border: none; padding: 0; text-align: left; font-weight: bold; font-size: 11pt; font-family: Arial, sans-serif;">H. ARNAZ AGUNG ANDRARASMARA, S.E., M.M</td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>
    </div>

</div>
</body>
</html>`;
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
                    <li style="margin-bottom: 0px;">Surat dari ${upz.name} tanggal ${tglSuratMasuk} tentang Permohonan ${isPembentukan ? 'pembentukan' : `pengangkatan ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}`}pengurus UPZ ${upz.name} BAZNAS Kota Semarang Masa Bhakti ${periodeTahun};</li>
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
                Mengangkat ${tipePerubahanTeks ? tipePerubahanTeks + ' ' : ''}Pengurus Unit Pengumpul Zakat (UPZ) ${upz.name} Masa Bhakti ${periodeTahun} dengan susunan pengurus sebagai berikut:
                
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

  const handlePrintSK = (history: SKHistory, customTglDitetapkan?: string, customTglPermohonan?: string) => {
    if (!selectedUPZ) return;
    const htmlContent = generateSKHtml(selectedUPZ, history, customTglDitetapkan, customTglPermohonan);
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

  const handleDownloadSKDoc = (history: SKHistory, customTglDitetapkan?: string, customTglPermohonan?: string) => {
    if (!selectedUPZ) return;
    const htmlContent = generateSKHtml(selectedUPZ, history, customTglDitetapkan, customTglPermohonan);
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

  const handleDownloadUPZTemplate = () => {
    const headers = [
      'Nama UPZ', 
      'Kategori UPZ', 
      'Tipe Dana', 
      'Tipe On-Balance (Jika On-Balance)', 
      'Kecamatan', 
      'Kelurahan', 
      'Alamat Lengkap', 
      'No Telepon'
    ];
    const sampleData = [
      {
        'Nama UPZ': 'UPZ Masjid Al-Istiqomah',
        'Kategori UPZ': 'Masjid & Mushola',
        'Tipe Dana': 'On-Balance',
        'Tipe On-Balance (Jika On-Balance)': 'Pengumpulan',
        'Kecamatan': 'Semarang Tengah',
        'Kelurahan': 'Sekayu',
        'Alamat Lengkap': 'Jl. Pemuda No. 12',
        'No Telepon': '081234567890'
      },
      {
        'Nama UPZ': 'UPZ Dinas Kesehatan',
        'Kategori UPZ': 'OPD',
        'Tipe Dana': 'Off-Balance',
        'Tipe On-Balance (Jika On-Balance)': '',
        'Kecamatan': 'Semarang Selatan',
        'Kelurahan': 'Mugasari',
        'Alamat Lengkap': 'Jl. Pandanaran No. 24',
        'No Telepon': '089876543210'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data UPZ');
    XLSX.writeFile(workbook, 'Template_Migrasi_Data_UPZ.xlsx');
  };

  const handleDownloadSKTemplate = () => {
    const headers = [
      'Kode UPZ', 
      'No SK', 
      'Tahun Mulai', 
      'Tahun Berakhir', 
      'Nama Pimpinan (Penasehat)', 
      'Penasehat (Nama)', 
      'Penasehat (Jabatan/Alamat)', 
      'Ketua (Nama)', 
      'Ketua (Jabatan/Alamat)', 
      'Sekretaris (Nama)', 
      'Sekretaris (Jabatan/Alamat)', 
      'Bendahara (Nama)', 
      'Bendahara (Jabatan/Alamat)', 
      'Anggota 1 (Nama)', 
      'Anggota 1 (Jabatan/Alamat)', 
      'Anggota 2 (Nama)', 
      'Anggota 2 (Jabatan/Alamat)', 
      'Link Scan SK GDrive'
    ];
    
    const sampleData = data.slice(0, 3).map(upz => ({
      'Kode UPZ': upz.code,
      'No SK': '800/' + Math.floor(100 + Math.random() * 900) + '/2024',
      'Tahun Mulai': '2024',
      'Tahun Berakhir': '2029',
      'Nama Pimpinan (Penasehat)': upz.metadata?.pimpinanName || 'H. Ahmad Syarif',
      'Penasehat (Nama)': upz.metadata?.pengurus?.penasehat?.nama || 'H. Ahmad Syarif',
      'Penasehat (Jabatan/Alamat)': upz.metadata?.pengurus?.penasehat?.alamat || 'Penasehat',
      'Ketua (Nama)': upz.metadata?.pengurus?.ketua?.nama || 'Budi Utomo',
      'Ketua (Jabatan/Alamat)': upz.metadata?.pengurus?.ketua?.alamat || 'Ketua',
      'Sekretaris (Nama)': upz.metadata?.pengurus?.sekretaris?.nama || 'Siti Aminah',
      'Sekretaris (Jabatan/Alamat)': upz.metadata?.pengurus?.sekretaris?.alamat || 'Sekretaris',
      'Bendahara (Nama)': upz.metadata?.pengurus?.bendahara?.nama || 'H. Joko Widodo',
      'Bendahara (Jabatan/Alamat)': upz.metadata?.pengurus?.bendahara?.alamat || 'Bendahara',
      'Anggota 1 (Nama)': upz.metadata?.pengurus?.anggota1?.nama || 'Rian',
      'Anggota 1 (Jabatan/Alamat)': upz.metadata?.pengurus?.anggota1?.alamat || 'Anggota',
      'Anggota 2 (Nama)': upz.metadata?.pengurus?.anggota2?.nama || 'Dani',
      'Anggota 2 (Jabatan/Alamat)': upz.metadata?.pengurus?.anggota2?.alamat || 'Anggota',
      'Link Scan SK GDrive': 'https://drive.google.com/file/d/1234567890/view'
    }));

    if (sampleData.length === 0) {
      sampleData.push({
        'Kode UPZ': 'UPZ-1',
        'No SK': '800/123/2024',
        'Tahun Mulai': '2024',
        'Tahun Berakhir': '2029',
        'Nama Pimpinan (Penasehat)': 'H. Ahmad Syarif',
        'Penasehat (Nama)': 'H. Ahmad Syarif',
        'Penasehat (Jabatan/Alamat)': 'Penasehat',
        'Ketua (Nama)': 'Budi Utomo',
        'Ketua (Jabatan/Alamat)': 'Ketua',
        'Sekretaris (Nama)': 'Siti Aminah',
        'Sekretaris (Jabatan/Alamat)': 'Sekretaris',
        'Bendahara (Nama)': 'H. Joko Widodo',
        'Bendahara (Jabatan/Alamat)': 'Bendahara',
        'Anggota 1 (Nama)': 'Rian',
        'Anggota 1 (Jabatan/Alamat)': 'Anggota',
        'Anggota 2 (Nama)': 'Dani',
        'Anggota 2 (Jabatan/Alamat)': 'Anggota',
        'Link Scan SK GDrive': 'https://drive.google.com/file/d/1234567890/view'
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data SK UPZ');
    XLSX.writeFile(workbook, 'Template_Migrasi_Data_SK.xlsx');
  };

  const processUPZMigration = async (rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      alert('File Excel kosong atau tidak valid.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    
    let currentMaxIndex = 0;
    data.forEach(u => {
      const match = u.code.match(/^UPZ-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > currentMaxIndex) currentMaxIndex = val;
      }
    });

    for (const row of rows) {
      const namaUpz = row['Nama UPZ'] || row['nama_upz'];
      const category = row['Kategori UPZ'] || row['kategori_upz'] || 'Masjid & Mushola';
      const type = row['Tipe Dana'] || row['tipe_dana'] || 'Off-Balance';
      const onBalanceType = row['Tipe On-Balance (Jika On-Balance)'] || row['on_balance_type'];
      const kecamatan = row['Kecamatan'] || row['kecamatan'] || '-';
      const kelurahan = row['Kelurahan'] || row['kelurahan'] || '-';
      const alamat = row['Alamat Lengkap'] || row['alamat'] || '';
      const noTelepon = row['No Telepon'] || row['no_telepon'] || '';

      if (!namaUpz) {
        failCount++;
        continue;
      }

      currentMaxIndex++;
      const nextCode = `UPZ-${currentMaxIndex}`;

      const newUpz: UPZ = {
        id: nextCode,
        code: nextCode,
        name: namaUpz,
        category: category,
        type: type as 'On-Balance' | 'Off-Balance',
        kecamatan: kecamatan,
        kelurahan: kelurahan,
        activeSKNumber: '-',
        skStartYear: '',
        skExpiryDate: '',
        status: 'Aktif',
        metadata: {
          address: alamat,
          upzPhone: noTelepon,
          onBalanceType: type === 'On-Balance' ? onBalanceType : undefined,
          pengurus: {
            penasehat: { nama: '', alamat: '' },
            ketua: { nama: '', alamat: '' },
            sekretaris: { nama: '', alamat: '' },
            bendahara: { nama: '', alamat: '' },
            anggota1: { nama: '', alamat: '' },
            anggota2: { nama: '', alamat: '' },
            anggotaTambahan: []
          },
          skHistory: []
        }
      };

      try {
        await axios.post('/api/upz', newUpz);
        successCount++;
      } catch (err) {
        console.error('Failed to import row:', row, err);
        failCount++;
      }
    }

    await fetchUPZList();
    alert(`Impor UPZ selesai. Sukses: ${successCount}, Gagal/Dilewati: ${failCount}`);
    setIsMigrationModalOpen(false);
  };

  const processSKMigration = async (rows: any[]) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      alert('File Excel kosong atau tidak valid.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of rows) {
      let identifier = row['Kode UPZ'] || row['kode_upz'] || row['Identifier'] || row['identifier'];
      const skNumber = row['No SK'] || row['no_sk'] || row['Nomor SK'] || row['nomor_sk'];
      const startYear = row['Tahun Mulai'] || row['tahun_mulai'] || row['Mulai'] || row['mulai'];
      const endYear = row['Tahun Berakhir'] || row['tahun_berakhir'] || row['Berakhir'] || row['berakhir'];
      const pimpinanName = row['Nama Pimpinan (Penasehat)'] || row['Nama Pimpinan'] || row['pimpinan_name'] || '';
      
      const penasehatNama = row['Penasehat (Nama)'] || '';
      const penasehatAlamat = row['Penasehat (Jabatan/Alamat)'] || '';
      const ketuaNama = row['Ketua (Nama)'] || '';
      const ketuaAlamat = row['Ketua (Jabatan/Alamat)'] || '';
      const sekretarisNama = row['Sekretaris (Nama)'] || '';
      const sekretarisAlamat = row['Sekretaris (Jabatan/Alamat)'] || '';
      const bendaharaNama = row['Bendahara (Nama)'] || '';
      const bendaharaAlamat = row['Bendahara (Jabatan/Alamat)'] || '';
      const anggota1Nama = row['Anggota 1 (Nama)'] || '';
      const anggota1Alamat = row['Anggota 1 (Jabatan/Alamat)'] || '';
      const anggota2Nama = row['Anggota 2 (Nama)'] || '';
      const anggota2Alamat = row['Anggota 2 (Jabatan/Alamat)'] || '';
      const scanLink = row['Link Scan SK GDrive'] || row['scan_link'] || row['Link Scan SK'] || '';

      if (!identifier || !skNumber) {
        failCount++;
        continue;
      }

      let targetCode = String(identifier).trim();
      if (/^\d+$/.test(targetCode)) {
        targetCode = `UPZ-${targetCode}`;
      }

      const targetUPZ = data.find(u => 
        u.code.toLowerCase() === targetCode.toLowerCase() ||
        u.name.toLowerCase() === targetCode.toLowerCase()
      );

      if (!targetUPZ) {
        console.warn(`UPZ dengan identifier "${targetCode}" tidak ditemukan.`);
        failCount++;
        continue;
      }

      const newSkHistoryEntry: SKHistory = {
        id: `SK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        upzId: targetUPZ.id,
        skNumber: skNumber,
        startDate: startYear ? `${startYear}-01-01` : `${new Date().getFullYear()}-01-01`,
        endDate: endYear ? `${endYear}-12-31` : `${new Date().getFullYear() + 5}-12-31`,
        pimpinanName: ketuaNama || pimpinanName || '-',
        status: 'Aktif',
        skType: 'Pembaruan',
        scanLink: scanLink
      };

      const updatedSkHistory = (targetUPZ.metadata?.skHistory || []).map((h: any) => ({
        ...h,
        status: 'Tidak Aktif'
      }));

      const mergedSkHistory = [newSkHistoryEntry, ...updatedSkHistory];

      const updatedUpz: UPZ = {
        ...targetUPZ,
        activeSKNumber: skNumber,
        skStartYear: startYear ? String(startYear) : targetUPZ.skStartYear,
        skExpiryDate: endYear ? `${endYear}-12-31` : targetUPZ.skExpiryDate,
        metadata: {
          ...targetUPZ.metadata,
          pimpinanName: ketuaNama || pimpinanName || targetUPZ.metadata.pimpinanName,
          scanLink: scanLink || targetUPZ.metadata?.scanLink,
          pengurus: {
            penasehat: { nama: penasehatNama || targetUPZ.metadata.pengurus?.penasehat?.nama || '', alamat: penasehatAlamat || targetUPZ.metadata.pengurus?.penasehat?.alamat || '' },
            ketua: { nama: ketuaNama || targetUPZ.metadata.pengurus?.ketua?.nama || '', alamat: ketuaAlamat || targetUPZ.metadata.pengurus?.ketua?.alamat || '' },
            sekretaris: { nama: sekretarisNama || targetUPZ.metadata.pengurus?.sekretaris?.nama || '', alamat: sekretarisAlamat || targetUPZ.metadata.pengurus?.sekretaris?.alamat || '' },
            bendahara: { nama: bendaharaNama || targetUPZ.metadata.pengurus?.bendahara?.nama || '', alamat: bendaharaAlamat || targetUPZ.metadata.pengurus?.bendahara?.alamat || '' },
            anggota1: { nama: anggota1Nama || targetUPZ.metadata.pengurus?.anggota1?.nama || '', alamat: anggota1Alamat || targetUPZ.metadata.pengurus?.anggota1?.alamat || '' },
            anggota2: { nama: anggota2Nama || targetUPZ.metadata.pengurus?.anggota2?.nama || '', alamat: anggota2Alamat || targetUPZ.metadata.pengurus?.anggota2?.alamat || '' },
            anggotaTambahan: targetUPZ.metadata.pengurus?.anggotaTambahan || []
          },
          skHistory: mergedSkHistory
        }
      };

      try {
        await axios.put(`/api/upz/${targetUPZ.id}`, updatedUpz);
        successCount++;
      } catch (err) {
        console.error(`Failed to update SK for UPZ ${targetUPZ.id}:`, err);
        failCount++;
      }
    }

    await fetchUPZList();
    const res = await axios.get('/api/upz');
    if (res.data?.status === 'success') {
      const allHistories: SKHistory[] = [];
      res.data.data.forEach((u: any) => {
        if (u.metadata?.skHistory) {
          allHistories.push(...u.metadata.skHistory);
        }
      });
      setSkHistory(allHistories);
    }
    
    alert(`Impor SK selesai. Sukses: ${successCount}, Gagal/Dilewati: ${failCount}`);
    setIsMigrationModalOpen(false);
  };

  const handleUploadMigrationFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataArr = evt.target?.result;
        const workbook = XLSX.read(dataArr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet);

        if (activeMigrationTab === 'upz') {
          await processUPZMigration(rawJson);
        } else {
          await processSKMigration(rawJson);
        }
      } catch (err: any) {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      {/* Breadcrumbs & Title */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <nav className="flex text-sm gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="text-slate-400 shrink-0">Master Data</span>
          <ChevronRight className="size-4 text-slate-300 shrink-0" />
          <span className="text-primary font-bold shrink-0">Database UPZ</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-x-auto scrollbar-none py-1">
              Database & Legalitas UPZ
            </h2>
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
      <div className="p-4 bg-white rounded-xl border border-primary/10 shadow-sm flex flex-wrap gap-4 items-center justify-between no-print">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              type="text"
              placeholder="Cari Nama UPZ / Kelurahan..."
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-10 py-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary outline-none cursor-pointer text-slate-600 transition-all"
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
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary outline-none cursor-pointer text-slate-600 transition-all"
            value={kecamatanFilter}
            onChange={(e) => setKecamatanFilter(e.target.value)}
          >
            <option value="Semua">Semua Kecamatan</option>
            {kecamatanKelurahanSemarang.map(k => (
              <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>
            ))}
          </select>
        </div>
        <div className="hidden md:flex gap-3">
          <button 
            onClick={() => setIsDownloadRecapModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-slate-200 shadow-sm"
          >
            <Download className="size-4 shrink-0 text-slate-400" />
            Rekapan Hak Tasaruf
          </button>
          <button 
            onClick={() => setIsMigrationModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-slate-200 shadow-sm"
          >
            <Upload className="size-4 shrink-0 text-slate-400" />
            Migrasi Data
          </button>
          <button 
            onClick={openAddModal}
            className="bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="size-4 shrink-0" />
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
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">Kode Sistem</th>
                <th className="px-6 py-4">Nama UPZ</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Wilayah (Kec/Kel)</th>
                <th className="px-6 py-4 text-right">Total Setoran</th>
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
                  <td className="px-6 py-4 text-right font-mono">
                    {item.type === 'On-Balance' ? (
                      <p className="text-xs font-bold text-slate-900">
                        Rp {getUPZAccumulation(item).total.toLocaleString('id-ID')}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">-</span>
                    )}
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
                    <h3 className="text-base md:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">
                      {historyView === 'list' ? 'Riwayat SK dan Kepengurusan' :
                       historyView === 'perubahan' ? 'Perubahan Kepengurusan' : 'Pembaruan SK'}
                    </h3>
                    <p className="text-xs text-primary font-bold flex items-center gap-1 mt-1">
                      <Building2 className="size-3 shrink-0" />{selectedUPZ.name} ({selectedUPZ.code})
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 shrink-0" />{selectedUPZ.kelurahan}, {selectedUPZ.kecamatan}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* ── VIEW: LIST ── */}
              {historyView === 'list' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col min-h-0">
                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 md:border-0 md:pb-0">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Daftar Rekam Jejak SK</h4>
                    {(selectedUPZ.status || 'Aktif') !== 'Aktif' ? (
                      <span className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg uppercase tracking-wider text-center w-full sm:w-auto">
                        Aksi Dinonaktifkan (UPZ {selectedUPZ.status || 'Aktif'})
                      </span>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button onClick={() => setHistoryView('perubahan')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 w-full sm:w-auto cursor-pointer">
                          <Edit2 className="size-4" />Perubahan Pengurus
                        </button>
                        <button onClick={() => { setRenewalForm({ skNumber: '', startYear:'', endYear:'', pimpinanName:'', keterangan:'', scanLink: '' }); setHistoryView('pembaruan'); }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto cursor-pointer">
                          <PlusCircle className="size-4" />Pembaruan SK
                        </button>
                      </div>
                    )}
                  </div>

                    {/* Desktop Table Container */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                              <th className="px-6 py-4">No. SK</th>
                              <th className="px-6 py-4">Masa Berlaku</th>
                              <th className="px-6 py-4">Pengurus Utama</th>
                              <th className="px-6 py-4 text-center">Status</th>
                              <th className="px-6 py-4 text-center">Scan SK</th>
                              {['Masjid & Mushola', 'Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) && (
                                <th className="px-6 py-4 text-right">Draft SK</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {getHistoryForUPZ(selectedUPZ.id).map((history: SKHistory) => (
                              <tr 
                                key={history.id} 
                                className="hover:bg-slate-50/70 transition-colors"
                              >
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
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    {history.scanLink ? (
                                      <>
                                        <button
                                          onClick={() => setActiveSkPreview(history)}
                                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-emerald-200 shadow-sm"
                                        >
                                          <FileText className="size-3.5 text-emerald-600" /> Dokumen SK
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditScanSkTarget(history);
                                            setFormEditScanLink(history.scanLink || '');
                                          }}
                                          className="p-1 text-slate-400 hover:text-primary hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded transition-all"
                                          title="Ubah Link SK"
                                        >
                                          <Edit2 className="size-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditScanSkTarget(history);
                                          setFormEditScanLink('');
                                        }}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded transition-all"
                                        title="Upload/Scan SK"
                                      >
                                        <FileCheck className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                {['Masjid & Mushola', 'Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) && (
                                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
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
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="block md:hidden space-y-4">
                        {getHistoryForUPZ(selectedUPZ.id).map((history: SKHistory) => (
                          <div key={history.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                                  isSKPembentukan(history.skNumber) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                )}>
                                  {isSKPembentukan(history.skNumber) ? '📋 Pembentukan' : '🔄 Pembaruan'}
                                </span>
                                <p className="text-xs font-mono font-bold text-slate-700 mt-2 break-all">{history.skNumber}</p>
                              </div>
                              <span className={cn('px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0',
                                (history.status === 'Aktif' && (selectedUPZ.status || 'Aktif') === 'Aktif') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                                {(selectedUPZ.status || 'Aktif') === 'Aktif' ? history.status : 'Tidak Aktif'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Masa Berlaku</p>
                                <p className="font-bold text-slate-700 mt-0.5">{new Date(history.startDate).getFullYear()} – {new Date(history.endDate).getFullYear()}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pengurus Utama</p>
                                <p className="font-bold text-slate-700 mt-0.5">{history.pimpinanName}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200" onClick={e => e.stopPropagation()}>
                              {history.scanLink ? (
                                <>
                                  <button
                                    onClick={() => setActiveSkPreview(history)}
                                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 border border-emerald-200 shadow-sm"
                                  >
                                    <FileText className="size-3.5 text-emerald-600" /> Dokumen SK
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditScanSkTarget(history);
                                      setFormEditScanLink(history.scanLink || '');
                                    }}
                                    className="px-3 py-2 text-slate-450 hover:text-primary hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center justify-center"
                                    title="Ubah Link SK"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditScanSkTarget(history);
                                    setFormEditScanLink('');
                                  }}
                                  className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1.5 border border-blue-200"
                                >
                                  <FileCheck className="size-3.5" /> Upload SK
                                </button>
                              )}
                              {['Masjid & Mushola', 'Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) && (
                                <div className="flex gap-2 w-full mt-1">
                                  <button
                                    onClick={() => openPrintDateModal(history, 'print')}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-center border border-slate-200"
                                  >
                                    Cetak
                                  </button>
                                  <button
                                    onClick={() => openPrintDateModal(history, 'download')}
                                    className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-center border border-primary/20"
                                  >
                                    Docx
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-medium leading-relaxed mt-4">
                      <span className="font-black text-slate-700">Perubahan</span> = pergantian pengurus, No. SK tetap, masa berlaku tetap. &nbsp;
                      <span className="font-black text-slate-700">Pembaruan</span> = masa berlaku SK habis, No. SK baru diisi manual, masa berlaku baru (5 thn).
                    </div>
                </div>
              )}

              {/* ── VIEW: PERUBAHAN ── */}
              {historyView === 'perubahan' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Nomor SK (Tetap)</p>
                      <p className="text-2xl font-black text-amber-800">{selectedUPZ.activeSKNumber}</p>
                      <p className="text-[10px] text-amber-600 font-medium">Masa berlaku tetap mengikuti SK aktif saat ini.</p>
                    </div>
                  </div>

                  {/* Pengurus Form */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <User className="size-4" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Update Struktur Kepengurusan</h4>
                    </div>
                    {(['penasehat', 'ketua', 'sekretaris', 'bendahara', 'anggota1', 'anggota2'] as const).map(jabatan => (
                      <div key={jabatan} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                          <input type="text" value={formPengurus[jabatan].nama} onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan di Instansi' : 'Alamat'}
                          </label>
                          <input type="text" value={formPengurus[jabatan].alamat} onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)} placeholder={selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan...' : 'Alamat...'} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
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
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} placeholder="Nama..." className="bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder={selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan...' : 'Alamat...'} className="flex-1 bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div key={jabatan} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {jabatan === 'anggota1' ? 'Anggota 1' : jabatan === 'anggota2' ? 'Anggota 2' : jabatan.charAt(0).toUpperCase() + jabatan.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</label>
                          <input type="text" value={formPengurus[jabatan].nama} onChange={e => updatePengurusField(jabatan, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan di Instansi' : 'Alamat'}
                          </label>
                          <input type="text" value={formPengurus[jabatan].alamat} onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)} placeholder={selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan...' : 'Alamat...'} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
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
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} placeholder="Nama..." className="bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder={selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan...' : 'Alamat...'} className="flex-1 bg-white border-slate-200 rounded-lg px-3 py-2 text-sm" />
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
                      className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-all px-4 py-2 cursor-pointer">
                      ← Kembali
                    </button>
                    <button
                      onClick={historyView === 'perubahan' ? handlePerubahanSK : handleRenewalSK}
                      className={cn('px-8 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer',
                        historyView === 'perubahan'
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                          : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                      )}>
                      {historyView === 'perubahan' ? 'Simpan Perubahan' : `Simpan SK ${nextRenewalSK}`}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsHistoryModalOpen(false)}
                    className="ml-auto px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all cursor-pointer">
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
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Parameter Tanggal SK</h3>
                <button onClick={() => setIsPrintDateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Silakan masukkan tanggal permohonan dan tanggal penetapan SK yang akan tercantum pada dokumen sebelum di-print/unduh.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Permohonan</label>
                    <input 
                      type="date"
                      value={printRequestDateValue}
                      onChange={(e) => setPrintRequestDateValue(e.target.value)}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
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

      {/* Download Recap Modal */}
      <AnimatePresence>
        {isDownloadRecapModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDownloadRecapModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Unduh Rekapan Hak Tasaruf</h3>
                <button onClick={() => setIsDownloadRecapModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <Coins className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Rekapan Hak Tasaruf UPZ</h4>
                  <p className="text-xs text-slate-500">
                    Unduh rekapan Hak Tasaruf UPZ On-Balance (UPZ Pengumpulan & UPZ Pembantuan Pendistribusian & Pendayagunaan) dalam format PDF atau Excel.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> Pilih Tahun Anggaran
                    </label>
                    <select
                      value={selectedRecapYear}
                      onChange={(e) => setSelectedRecapYear(Number(e.target.value))}
                      className="w-full text-xs font-bold bg-slate-50 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      {recapYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => {
                        handleExportExcelRecap(selectedRecapYear);
                        setIsDownloadRecapModalOpen(false);
                      }}
                      className="w-full flex flex-col items-center justify-center p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl group hover:bg-emerald-100/50 transition-all cursor-pointer gap-2"
                    >
                      <FileSpreadsheet className="size-6 text-emerald-600" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-emerald-700">Format Excel</p>
                        <p className="text-[9px] text-emerald-600/70 font-semibold uppercase tracking-wider">.xlsx</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        handleExportPDFRecap(selectedRecapYear);
                        setIsDownloadRecapModalOpen(false);
                      }}
                      className="w-full flex flex-col items-center justify-center p-4 border border-rose-200 bg-rose-50/50 rounded-xl group hover:bg-rose-100/50 transition-all cursor-pointer gap-2"
                    >
                      <Download className="size-6 text-rose-600" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-rose-700">Format PDF</p>
                        <p className="text-[9px] text-rose-600/70 font-semibold uppercase tracking-wider">.pdf</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-[10px]">i</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      Laporan ini akan mengelompokkan UPZ Pengumpulan (On-Balance) dan UPZ Pembantuan, serta menampilkan jumlah total hak tasaruf masing-masing di akhir laporan.
                    </p>
                  </div>
                </div>
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
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Migrasi Database UPZ</h3>
                <button onClick={() => setIsMigrationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="size-5 text-slate-400" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveMigrationTab('upz')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
                    activeMigrationTab === 'upz' 
                      ? "border-primary text-primary bg-white" 
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  )}
                >
                  Migrasi Data UPZ
                </button>
                <button
                  onClick={() => setActiveMigrationTab('sk')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
                    activeMigrationTab === 'sk' 
                      ? "border-primary text-primary bg-white" 
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  )}
                >
                  Migrasi Data SK
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <FileSpreadsheet className="size-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">
                    {activeMigrationTab === 'upz' ? 'Impor Data UPZ via Excel' : 'Impor Data SK via Excel'}
                  </h4>
                  <p className="text-xs text-slate-500">Gunakan template yang tersedia untuk memastikan format data sesuai dengan sistem.</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={activeMigrationTab === 'upz' ? handleDownloadUPZTemplate : handleDownloadSKTemplate}
                    className="w-full flex items-center justify-between p-4 border border-primary/20 bg-primary/5 rounded-xl group hover:bg-primary/10 transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="size-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">Download Template</p>
                        <p className="text-[10px] text-primary/70 font-medium">Format: .xlsx (Excel)</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <label className="w-full flex items-center justify-between p-4 border border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3">
                      <Upload className="size-5 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Upload File Data</p>
                        <p className="text-[10px] text-slate-400 font-medium">Maksimal file 10MB</p>
                      </div>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUploadMigrationFile} />
                  </label>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <div className="size-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 font-bold text-[10px]">!</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      {activeMigrationTab === 'upz' 
                        ? 'Pastikan nama UPZ, kategori, dan tipe dana diisi dengan benar. Kode UPZ baru akan digenerate otomatis oleh sistem secara berurutan.'
                        : 'Pastikan kolom Kode UPZ (angka saja/kode lengkap) atau Nama UPZ terisi dan sesuai dengan UPZ yang terdaftar di sistem agar SK dan Kepengurusan terhubung dengan tepat.'
                      }
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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
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
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {selectedUPZ && ['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(selectedUPZ.category) ? 'Jabatan Penasehat' : 'Alamat Penasehat'}
                            </p>
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

                {(() => {
                  if (selectedUPZ.type !== 'On-Balance') {
                    return null;
                  }

                  const onBalanceType = selectedUPZ.metadata.onBalanceType || 'Pengumpulan';
                  if (onBalanceType !== 'Pengumpulan' && onBalanceType !== 'Pembantuan Pendistribusian dan Pendayagunaan') {
                    return null;
                  }

                  const isPembantuan = onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan';
                  const pctVal = isPembantuan ? upzHakPembantuan : upzHakPengumpulan;
                  const pct = pctVal / 100;
                  const pctLabel = isPembantuan ? `${pctVal}% Pembantuan` : `${pctVal}% Pengumpulan`;
                  const badgeLabel = `Hak ${pctVal}%`;

                  // Call the single source of truth helper
                  const { total: totalPengumpulan, hak: hakVal, gagalPotong, totalBankJateng, totalZis } = getUPZAccumulation(selectedUPZ);

                  return (
                    <>
                      {/* Card 1: Hak Penyaluran UPZ */}
                      <div className="p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Coins className="size-5 text-emerald-600" />
                            <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Informasi Hak Penyaluran UPZ ({pctLabel})</h4>
                          </div>
                          <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                            {badgeLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pengumpulan Terakumulasi (Berhasil)</p>
                            <p className="text-lg font-black text-slate-900">
                              Rp {totalPengumpulan.toLocaleString('id-ID')}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                              Bank Jateng: Rp {totalBankJateng.toLocaleString('id-ID')} | ZIS: Rp {totalZis.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Hak Usulan Penyaluran UPZ ({Math.round(pct * 100)}%)</p>
                            <p className="text-lg font-black text-emerald-600">
                              Rp {hakVal.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-white/60 border border-slate-100 rounded-xl">
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            * Data di atas diakumulasikan secara real-time dari riwayat transaksi payroll Bank Jateng yang berhasil direkonsiliasi untuk UPZ ini. Nilai ini bersifat administratif/informasi pagu usulan penyaluran bantuan dan tidak memotong saldo kas utama BAZNAS.
                          </p>
                        </div>
                      </div>

                      {/* Card 1.5: Hak Amil UPZ (Only for Pengumpulan) */}
                      {!isPembantuan && (
                        <div className="p-6 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Coins className="size-5 text-indigo-600" />
                              <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest">Informasi Hak Amil UPZ Pengumpulan</h4>
                            </div>
                            <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                              Hak Amil {upzHakAmilPengumpulan}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pengumpulan Terakumulasi</p>
                              <p className="text-lg font-black text-slate-900">
                                Rp {totalPengumpulan.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Hak Amil UPZ ({upzHakAmilPengumpulan}%)</p>
                              <p className="text-lg font-black text-indigo-600">
                                Rp {getUPZAccumulation(selectedUPZ).hakAmil.toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-white/60 border border-indigo-50 rounded-xl">
                            <p className="text-[10px] text-indigo-700/80 leading-relaxed">
                              * Porsi Hak Amil UPZ Pengumpulan ini dihitung dari total setoran zakat/infak yang berhasil direkonsiliasi. Hak Amil digunakan untuk menunjang kebutuhan operasional UPZ.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card 2: Gagal Potong UPZ (Pending) */}
                      <div className="p-6 bg-rose-50/40 rounded-2xl border border-rose-100/80 space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="size-5 text-rose-600" />
                            <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Informasi Gagal Potong UPZ (Pending)</h4>
                          </div>
                          <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full border border-rose-200 bg-rose-50 text-rose-600 uppercase tracking-wider">
                            Pending
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Total Nominal Gagal Potong Terakumulasi</p>
                          <p className="text-lg font-black text-rose-600">
                            Rp {gagalPotong.toLocaleString('id-ID')}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Belum terdaftar atau terdapat ketidakcocokan data di SIMBA
                          </p>
                        </div>

                        <div className="p-3 bg-white/60 border border-rose-50 rounded-xl">
                          <p className="text-[10px] text-rose-700/80 leading-relaxed">
                            * Data nominal ini merupakan akumulasi transaksi gagal potong yang terdeteksi di sistem. Dana ini belum masuk ke kas hak tasaruf UPZ dan membutuhkan pendaftaran muzakki/NPWZ di SIMBA agar dapat direkonsiliasi ulang.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
                {(selectedUPZ.status || 'Aktif') !== 'Aktif' ? (
                  <button 
                    onClick={() => handleReactivateUPZ(selectedUPZ)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-all text-center cursor-pointer"
                  >
                    Aktifkan UPZ Kembali
                  </button>
                ) : (
                  <button 
                    onClick={() => handleTriggerResignation(selectedUPZ)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-sm font-bold transition-all text-center cursor-pointer"
                  >
                    Mengundurkan Diri
                  </button>
                )}
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full sm:w-auto px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all text-center cursor-pointer"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100/80">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div key={jabatan} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">
                          {['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan di Instansi' : 'Alamat'}
                        </label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder={['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan...' : 'Alamat...'}
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
                        <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start w-full">
                          <div className="w-full md:col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="w-full md:col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan di Instansi' : 'Alamat'}
                            </label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder={['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan...' : 'Alamat...'} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="w-full md:col-span-1 flex items-end justify-end mt-1 md:mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-400 hover:bg-rose-55 rounded-lg transition-all w-full md:w-auto flex justify-center border border-rose-200 md:border-0">
                              <X className="size-5 md:block hidden" />
                              <span className="md:hidden text-xs font-black uppercase text-rose-600">Hapus Anggota</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
                <button 
                  type="button" 
                  onClick={async () => {
                    if (window.confirm(`Apakah Anda yakin ingin menghapus UPZ "${selectedUPZ.name}"?`)) {
                      try {
                        await axios.delete(`/api/upz/${selectedUPZ.id}`);
                        await fetchUPZList();
                        setIsEditModalOpen(false);
                        alert('Data UPZ berhasil dihapus.');
                      } catch (err) {
                        console.error(err);
                        alert('Gagal menghapus UPZ.');
                      }
                    }
                  }}
                  className="shrink-0 px-3.5 sm:px-4 py-3 text-sm font-bold text-rose-500 border border-rose-200 rounded-xl hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                  <span>Hapus<span className="hidden sm:inline"> UPZ</span></span>
                </button>
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!formNamaUpz.trim()) {
                        alert('Nama UPZ tidak boleh kosong.');
                        return;
                      }
                      const updatedSkHistory = (selectedUPZ.metadata?.skHistory || []).map((h: any) => {
                        if (h.skNumber === formNoSKPenetapan && h.status === 'Aktif') {
                          return { ...h, scanLink: formScanLink };
                        }
                        return h;
                      });

                      const updatedUpz = {
                        ...selectedUPZ,
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
                          ...selectedUPZ.metadata,
                          address: formAlamatLengkap,
                          upzPhone: formNoTelepon,
                          onBalanceType: formType === 'On-Balance' ? formOnBalanceType : undefined,
                          pimpinanName: formPengurus.ketua.nama || formPengurus.penasehat.nama || '',
                          scanLink: formScanLink,
                          pengurus: {
                            ...formPengurus,
                            anggotaTambahan: anggotaTambahan
                          },
                          skHistory: updatedSkHistory
                        }
                      };
                      try {
                        await axios.put(`/api/upz/${selectedUPZ.id}`, updatedUpz);
                        setSkHistory(prev => {
                          return prev.map(h => {
                            if (h.upzId === selectedUPZ.id && h.skNumber === formNoSKPenetapan && h.status === 'Aktif') {
                              return { ...h, scanLink: formScanLink };
                            }
                            return h;
                          });
                        });
                        await fetchUPZList();
                        alert('Data UPZ berhasil diperbarui.');
                        setIsEditModalOpen(false);
                      } catch (err) {
                        console.error(err);
                        alert('Gagal memperbarui data UPZ.');
                      }
                    }}
                    className="flex-1 sm:flex-initial px-4 sm:px-10 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="size-4" />
                    <span>Simpan<span className="hidden sm:inline"> Perubahan</span></span>
                  </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Scan SK (Google Drive)</label>
                    <input 
                      type="text" 
                      value={formScanLink}
                      onChange={e => setFormScanLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
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
                    <div key={jabatan} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">
                          {['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan di Instansi' : 'Alamat'}
                        </label>
                        <input
                          type="text"
                          value={formPengurus[jabatan].alamat}
                          onChange={e => updatePengurusField(jabatan, 'alamat', e.target.value)}
                          placeholder={['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan...' : 'Alamat...'}
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
                        <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start w-full">
                          <div className="w-full md:col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Anggota {idx + 3}</label>
                            <input type="text" value={a.nama} onChange={e => updateAnggotaTambahan(idx, 'nama', e.target.value)} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="w-full md:col-span-6 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan di Instansi' : 'Alamat'}
                            </label>
                            <input type="text" value={a.alamat} onChange={e => updateAnggotaTambahan(idx, 'alamat', e.target.value)} placeholder={['Instansi Vertikal', 'OPD', 'BUMD', 'Kecamatan', 'Pemerintah Kecamatan'].includes(formCategory) ? 'Jabatan...' : 'Alamat...'} className="w-full bg-white border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                          </div>
                          <div className="w-full md:col-span-1 flex items-end justify-end mt-1 md:mt-5">
                            <button type="button" onClick={() => removeAnggotaTambahan(idx)} className="p-2 text-rose-450 hover:bg-rose-50 rounded-lg transition-all w-full md:w-auto flex justify-center border border-rose-200 md:border-0">
                              <X className="size-5 md:block hidden" />
                              <span className="md:hidden text-xs font-black uppercase text-rose-600">Hapus Anggota</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center">
                <button 
                  type="button"
                  onClick={async () => {
                    if (!formNamaUpz.trim()) {
                      alert('Nama UPZ harus diisi.');
                      return;
                    }

                    let nextIndex = 1;
                    if (data && data.length > 0) {
                      const indices = data
                        .map(u => {
                          const match = u.code.match(/^UPZ-(\d+)$/);
                          return match ? parseInt(match[1], 10) : 0;
                        })
                        .filter(Boolean);
                      if (indices.length > 0) {
                        nextIndex = Math.max(...indices) + 1;
                      } else {
                        nextIndex = data.length + 1;
                      }
                    }
                    const nextCode = `UPZ-${nextIndex}`;
                    const skPenetapan = formNoSKPenetapan || nextBaseSK.toString();

                    const newSkHistoryEntry: SKHistory = {
                      id: `SK-${Date.now()}`,
                      upzId: nextCode,
                      skNumber: skPenetapan,
                      startDate: formTahunMulai ? `${formTahunMulai}-01-01` : `${new Date().getFullYear()}-01-01`,
                      endDate: formTahunBerakhir ? `${formTahunBerakhir}-12-31` : `${new Date().getFullYear() + 5}-12-31`,
                      pimpinanName: formPengurus.ketua.nama || '-',
                      status: 'Aktif',
                      skType: 'Baru',
                      scanLink: formScanLink
                    };

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
                        scanLink: formScanLink,
                        pengurus: {
                          penasehat: { nama: formPengurus.penasehat.nama, alamat: formPengurus.penasehat.alamat || '' },
                          ketua: { nama: formPengurus.ketua.nama, alamat: formPengurus.ketua.alamat || '' },
                          sekretaris: { nama: formPengurus.sekretaris.nama, alamat: formPengurus.sekretaris.alamat || '' },
                          bendahara: { nama: formPengurus.bendahara.nama, alamat: formPengurus.bendahara.alamat || '' },
                          anggota1: { nama: formPengurus.anggota1.nama, alamat: formPengurus.anggota1.alamat || '' },
                          anggota2: { nama: formPengurus.anggota2.nama, alamat: formPengurus.anggota2.alamat || '' },
                          anggotaTambahan: anggotaTambahan
                        },
                        skHistory: [newSkHistoryEntry]
                      }
                    };

                    try {
                      await axios.post('/api/upz', newUpz);
                      await fetchUPZList();
                      setSkHistory(prev => [newSkHistoryEntry, ...prev]);
                      setIsAddModalOpen(false);
                      alert('UPZ berhasil didaftarkan.');
                    } catch (err) {
                      console.error(err);
                      alert('Gagal mendaftarkan UPZ.');
                      return;
                    }



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
                  className="w-full sm:w-auto px-4 sm:px-10 py-2.5 sm:py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="size-4" />
                  <span>Daftarkan<span className="hidden sm:inline"> UPZ</span></span>
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
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmResignation}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-colors cursor-pointer"
                >
                  Simpan Status
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Preview Lightbox Modal */}
      <AnimatePresence>
        {activeSkPreview && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSkPreview(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Pratinjau Dokumen SK</h4>
                  <p className="text-xs text-primary font-bold mt-0.5">No. SK: {activeSkPreview.skNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  {activeSkPreview.scanLink && (
                    <a 
                      href={activeSkPreview.scanLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
                    >
                      Buka Tab Baru ↗
                    </a>
                  )}
                  <button 
                    onClick={() => setActiveSkPreview(null)} 
                    className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="size-5 text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 bg-slate-100 flex flex-col justify-center items-center h-full min-h-[400px]">
                {activeSkPreview.scanLink ? (
                  <iframe 
                    src={getEmbedLink(activeSkPreview.scanLink)} 
                    className="w-full h-full border border-slate-200 rounded-xl bg-white shadow-sm"
                    allow="autoplay"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3 max-w-sm">
                    <div className="size-16 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                      <FileText className="size-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-750">Tidak ada Scan SK terlampir</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Scan Link Modal */}
      <AnimatePresence>
        {editScanSkTarget && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditScanSkTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Isi / Ubah Link Scan SK</h4>
                  <p className="text-xs text-primary font-bold mt-0.5">No. SK: {editScanSkTarget.skNumber}</p>
                </div>
                <button 
                  onClick={() => setEditScanSkTarget(null)} 
                  className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="size-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Scan SK (Google Drive)</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/file/d/.../view" 
                    value={formEditScanLink} 
                    onChange={e => setFormEditScanLink(e.target.value)} 
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Masukkan link Google Drive file hasil scan SK. Pastikan hak akses file diset ke <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong> agar dapat dipratinjau dengan benar.
                  </p>
                </div>

                {/* Upload File Option */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Atau Upload File Baru</label>
                  <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      onChange={handleUploadSk}
                      disabled={uploadingSk}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    {uploadingSk ? (
                      <>
                        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-xs font-bold text-slate-500 animate-pulse">Sedang mengunggah ke Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-8 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-xs font-bold text-slate-650 group-hover:text-primary transition-colors">Pilih File (PDF atau Gambar)</span>
                        <span className="text-[10px] text-slate-400">Maksimal ukuran file: 5MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setEditScanSkTarget(null)} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveScanLink}
                  className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/95 shadow-lg shadow-primary/20 transition-all"
                >
                  Simpan Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden flex flex-col items-end gap-3 no-print">
        {/* FAB Options */}
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
                  setIsDownloadRecapModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Download className="size-4 text-slate-500" />
                Rekapan Hak Tasaruf
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  setIsMigrationModalOpen(true);
                }}
                className="flex items-center gap-2.5 bg-white text-slate-700 px-4 py-3 rounded-xl shadow-xl border border-slate-100 text-xs font-bold whitespace-nowrap"
              >
                <Upload className="size-4 text-slate-500" />
                Migrasi Data
              </button>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  openAddModal();
                }}
                className="flex items-center gap-2.5 bg-primary text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold whitespace-nowrap"
              >
                <Plus className="size-4" />
                Registrasi UPZ Baru
              </button>
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
    </div>
  );
}
