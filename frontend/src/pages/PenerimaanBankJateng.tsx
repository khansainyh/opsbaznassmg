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
  Check,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UPZ } from '@/src/types/upz';

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
  originalOpd?: string;
  selected: boolean;
}

export default function PenerimaanBankJateng() {
  const [activeTab, setActiveTab] = useState<'berhasil' | 'gagal' | 'opd'>('berhasil');
  const [fileData, setFileData] = useState<ProcessedTransaction[]>([]);
  const [failedData, setFailedData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // API Data
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  
  // Selections
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
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
  const [registerTanpaNik, setRegisterTanpaNik] = useState(false);
  const [registerNpwz, setRegisterNpwz] = useState('');
  const [registerAddress, setRegisterAddress] = useState('Kota Semarang');
  const [registerPhone, setRegisterPhone] = useState('-');
  const [registerGender, setRegisterGender] = useState('Pria');
  const [registerUpz, setRegisterUpz] = useState('');
  const [registerUpzSearchQuery, setRegisterUpzSearchQuery] = useState('');
  const [isRegisterUpzDropdownOpen, setIsRegisterUpzDropdownOpen] = useState(false);

  const [expandedGroupDetails, setExpandedGroupDetails] = useState<Record<string, boolean>>({});

  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [batchActiveTab, setBatchActiveTab] = useState<Record<string, 'upz' | 'pegawai' | 'gagal'>>({});
  const [historyUpzSearch, setHistoryUpzSearch] = useState<Record<string, string>>({});

  const toggleBatchExpand = (batchName: string) => {
    setExpandedBatches(prev => ({
      ...prev,
      [batchName]: !prev[batchName]
    }));
  };

  const [opdMapping, setOpdMapping] = useState<Record<string, string>>({});
  const [openSearchDropdown, setOpenSearchDropdown] = useState<string | null>(null);
  const [upzSearchQuery, setUpzSearchQuery] = useState('');

  const [upzList, setUpzList] = useState<UPZ[]>([]);

  useEffect(() => {
    const fetchUpzList = async () => {
      try {
        const res = await axios.get('/api/upz');
        if (res.data.status === 'success') {
          setUpzList(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching UPZ list:', err);
      }
    };
    fetchUpzList();
  }, []);


  const findMatchingUpzName = (rawOpd: string) => {
    const cleanRaw = rawOpd.toLowerCase().replace(/upz/gi, '').trim();
    
    // 1. Exact match
    const exactMatch = upzList.find(u => u.name.toLowerCase() === rawOpd.toLowerCase());
    if (exactMatch) return exactMatch.name;

    // 2. Contains or starts with match
    const partialMatch = upzList.find(u => {
      const cleanUName = u.name.toLowerCase().replace(/upz/gi, '').trim();
      return cleanUName.includes(cleanRaw) || cleanRaw.includes(cleanUName);
    });
    if (partialMatch) return partialMatch.name;

    return '';
  };

  const handleMapOpd = (rawOpd: string, targetUpzName: string) => {
    setOpdMapping(prev => ({
      ...prev,
      [rawOpd]: targetUpzName
    }));

    setFileData(prevData => prevData.map(item => {
      const isMatch = (item.originalOpd || item.opd) === rawOpd;
      if (isMatch) {
        return {
          ...item,
          opd: targetUpzName,
          originalOpd: rawOpd
        };
      }
      return item;
    }));
  };

  const getBatchName = (noKuitansi: string) => {
    if (noKuitansi && noKuitansi.includes(' / ')) {
      return noKuitansi.split(' / ')[0];
    }
    return noKuitansi;
  };

  const getDisplayBatchName = (batchName: string) => {
    const match = batchName.match(/\(([^)]+)\)\s*-\s*(\d+)/);
    if (match) {
      const monthYear = match[1]; // "Juni 2026"
      const index = match[2]; // "1"
      const month = monthYear.split(' ')[0]; // "Juni"
      return `${month} - ${index}`;
    }
    return batchName;
  };

  const handleDeleteBatch = async (batchName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus batch "${getDisplayBatchName(batchName)}" beserta seluruh transaksi di dalamnya?`)) {
      return;
    }

    try {
      const res = await axios.delete(`/api/bank-jateng/batch/${encodeURIComponent(batchName)}`);
      if (res.data.status === 'success') {
        setMessages([{ type: 'success', text: `Batch ${getDisplayBatchName(batchName)} berhasil dihapus!` }]);
        fetchHistory();
      }
    } catch (err: any) {
      console.error('Error deleting batch:', err);
      setMessages([{ type: 'error', text: err.response?.data?.error || 'Gagal menghapus batch.' }]);
    }
  };

  const groupedHistory = useMemo(() => {
    const groups: {
      [batchId: string]: {
        batchName: string;
        tanggal_pembayaran: string;
        bankAccountName: string;
        bankAccountNumber: string;
        totalNominal: number;
        items: any[];
        failedItems: any[];
      }
    } = {};

    historyData.forEach(item => {
      const batchName = getBatchName(item.no_kuitansi);
      if (!groups[batchName]) {
        groups[batchName] = {
          batchName,
          tanggal_pembayaran: item.tanggal_pembayaran,
          bankAccountName: item.bankAccount?.nama_akun || '-',
          bankAccountNumber: item.bankAccount?.no_rekening || item.bankAccount?.nomor_rekening || '-',
          totalNominal: 0,
          items: [],
          failedItems: []
        };
      }

      const isFailed = item.status_simba === 'FAILED';
      if (isFailed) {
        let parsedFailedItem: any = null;
        if (item.keterangan) {
          try {
            const parsed = JSON.parse(item.keterangan);
            if (parsed && parsed.type === 'failed_deduction') {
              parsedFailedItem = parsed;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        const details = parsedFailedItem || {
          nama: item.muzakki?.nama || '-',
          opd: 'Lainnya',
          no_rekening: '-',
          keterangan: item.keterangan || 'Gagal Potong'
        };

        groups[batchName].failedItems.push({
          id: item.id,
          nama: details.nama,
          opd: details.opd,
          no_rekening: details.no_rekening,
          nominal: Number(item.nominal),
          keterangan: details.keterangan
        });
      } else {
        groups[batchName].totalNominal += Number(item.nominal);
        groups[batchName].items.push(item);
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.tanggal_pembayaran).getTime() - new Date(a.tanggal_pembayaran).getTime());
  }, [historyData]);

  const exportHistoryToSimba = (items: any[], batchName: string) => {
    if (!items || items.length === 0) return;

    const exportRows = items.map((item, idx) => {
      const isZakat = Number(item.nominal) >= 100000;
      let zakatVal = '';
      let infakVal = '';

      if (isZakat) {
        zakatVal = String(item.nominal);
      } else {
        infakVal = String(item.nominal);
      }

      // Build Keterangan
      const labelTipe = isZakat ? 'Zakat Maal' : 'Infak';
      const namaMuzakki = item.muzakki?.nama || '-';
      const keteranganVal = item.keterangan || `Terima ${labelTipe} a.n ${namaMuzakki}`;

      // Date format: DD/MM/YYYY
      const pDate = new Date(item.tanggal_pembayaran);
      const formattedDate = `${String(pDate.getDate()).padStart(2, '0')}/${String(pDate.getMonth() + 1).padStart(2, '0')}/${pDate.getFullYear()}`;

      return {
        'No': idx + 1,
        'tgl_transaksi': formattedDate,
        'NPWZ': item.muzakki?.npwz || '-',
        'nama': namaMuzakki,
        'zakat': zakatVal ? Number(zakatVal) : '',
        'zakat fitrah': '',
        'infak': infakVal ? Number(infakVal) : '',
        'titipan': '',
        'Keterangan': keteranganVal
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SIMBA Template');
    
    const docName = `${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_SIMBA.xlsx`;
    XLSX.writeFile(workbook, docName);
  };

  const generateFailedPdf = (itemsToExport: any[], docTitle: string, subtitle: string, fileSource?: string) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [16, 185, 129]; // Emerald 500
    const secondaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

    // Helper to find UPZ object
    const findUpzObject = (opdName: string) => {
      if (!opdName) return null;
      const cleanRaw = opdName.toLowerCase().replace(/upz/gi, '').trim();
      
      const exactMatch = upzList.find(u => u.name.toLowerCase() === opdName.toLowerCase());
      if (exactMatch) return exactMatch;
      
      const partialMatch = upzList.find(u => {
        const cleanUName = u.name.toLowerCase().replace(/upz/gi, '').trim();
        return cleanUName === cleanRaw || cleanUName.includes(cleanRaw) || cleanRaw.includes(cleanUName);
      });
      return partialMatch || null;
    };

    // Group items by UPZ
    const groupedData: Record<string, { upz: any; items: any[]; total: number }> = {};
    itemsToExport.forEach(item => {
      const upzObj = findUpzObject(item.opd || '');
      const upzName = upzObj ? upzObj.name : (item.opd || 'Lain-lain');
      
      if (!groupedData[upzName]) {
        groupedData[upzName] = {
          upz: upzObj || { name: upzName, metadata: { onBalanceType: 'Pengumpulan' } },
          items: [],
          total: 0
        };
      }
      
      groupedData[upzName].items.push(item);
      groupedData[upzName].total += Number(item.nominal || 0);
    });

    // Partition groups
    const pengumpulanGroups: typeof groupedData = {};
    const pembantuanGroups: typeof groupedData = {};
    
    Object.keys(groupedData).forEach(upzName => {
      const group = groupedData[upzName];
      const isPembantuan = group.upz?.metadata?.onBalanceType === 'Pembantuan Pendistribusian dan Pendayagunaan';
      if (isPembantuan) {
        pembantuanGroups[upzName] = group;
      } else {
        pengumpulanGroups[upzName] = group;
      }
    });

    const totalPengumpulan = Object.values(pengumpulanGroups).reduce((sum, g) => sum + g.total, 0);
    const totalPembantuan = Object.values(pembantuanGroups).reduce((sum, g) => sum + g.total, 0);
    const grandTotal = itemsToExport.reduce((sum, item) => sum + Number(item.nominal || 0), 0);

    // Draw main header (Page 1)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('BAZNAS KOTA SEMARANG', 14, 20);

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text(docTitle, 14, 26);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 32);
    if (fileSource) {
      doc.text(fileSource, 14, 36);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 39, 196, 39);

    let currentY = 44;

    const checkPageSpace = (neededSpace: number) => {
      if (currentY + neededSpace > 260) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // SECTION 1: UPZ PENGUMPULAN
    checkPageSpace(15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`UPZ Pengumpulan: Rp ${totalPengumpulan.toLocaleString('id-ID')}`, 14, currentY);
    currentY += 6;

    if (Object.keys(pengumpulanGroups).length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Tidak ada data gagal potong.', 14, currentY);
      currentY += 10;
    } else {
      Object.keys(pengumpulanGroups).forEach(upzName => {
        const group = pengumpulanGroups[upzName];
        checkPageSpace(35);

        // Header for specific UPZ
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${upzName}: Rp ${group.total.toLocaleString('id-ID')}`, 14, currentY);
        currentY += 4;

        const tableBody = group.items.map((item, index) => [
          index + 1,
          item.nama,
          item.opd,
          item.no_rekening,
          `Rp ${Number(item.nominal).toLocaleString('id-ID')}`,
          item.keterangan || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['No', 'Nama Pegawai', 'OPD / Dinas', 'No. Rekening', 'Nominal', 'Keterangan']],
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 45 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 27 },
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
          },
          margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      });
      currentY += 4;
    }

    // SECTION 2: UPZ PEMBANTUAN PENDISTRIBUSIAN DAN PENDAYAGUNAAN
    checkPageSpace(15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`UPZ Pembantuan Pendistribusian dan Pendayagunaan: Rp ${totalPembantuan.toLocaleString('id-ID')}`, 14, currentY);
    currentY += 6;

    if (Object.keys(pembantuanGroups).length === 0) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Tidak ada data gagal potong.', 14, currentY);
      currentY += 10;
    } else {
      Object.keys(pembantuanGroups).forEach(upzName => {
        const group = pembantuanGroups[upzName];
        checkPageSpace(35);

        // Header for specific UPZ
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${upzName}: Rp ${group.total.toLocaleString('id-ID')}`, 14, currentY);
        currentY += 4;

        const tableBody = group.items.map((item, index) => [
          index + 1,
          item.nama,
          item.opd,
          item.no_rekening,
          `Rp ${Number(item.nominal).toLocaleString('id-ID')}`,
          item.keterangan || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['No', 'Nama Pegawai', 'OPD / Dinas', 'No. Rekening', 'Nominal', 'Keterangan']],
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246], // Blue 500
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 45 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 27 },
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
          },
          margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      });
      currentY += 4;
    }

    // SECTION 3: GRAND TOTAL
    checkPageSpace(15);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);
    currentY += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(`Total Akumulasi: Rp ${grandTotal.toLocaleString('id-ID')}`, 14, currentY);

    // Multi-page footers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const str = `Halaman ${i} dari ${pageCount}`;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196 - doc.getTextWidth(str), 287);
    }

    return doc;
  };

  const handleExportPDFFailed = () => {
    if (failedData.length === 0) {
      alert('Tidak ada data gagal potong untuk diexport');
      return;
    }

    const now = new Date();
    const formattedPrintDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const doc = generateFailedPdf(
      failedData,
      'Laporan Rekapitulasi Gagal Potong Gaji - Bank Jateng',
      `Tanggal Cetak: ${formattedPrintDate}`,
      fileName ? `Sumber File: ${fileName}` : undefined
    );

    const docName = `Rekap_Gagal_Potong_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(docName);
  };

  const handleExportHistoryPDFFailed = (failedItems: any[], batchName: string) => {
    if (!failedItems || failedItems.length === 0) {
      alert('Tidak ada data gagal potong untuk diexport');
      return;
    }

    const doc = generateFailedPdf(
      failedItems,
      'Laporan Rekapitulasi Gagal Potong Gaji - Bank Jateng',
      `Batch: ${getDisplayBatchName(batchName)}`
    );

    const docName = `Rekap_Gagal_Potong_${batchName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(docName);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      ["BAZNAS KOTA SEMARANG"],
      ["FORMAT REALISASI GAJI BANK JATENG"],
      [],
      [
        "NO", 
        "NAMA", 
        "OPD", 
        "NO REKENING", 
        "TOTAL", 
        "", 
        "NO", 
        "NAMA", 
        "NO REK", 
        "DINAS", 
        "TOTAL", 
        "KETERANGAN"
      ],
      [
        1, 
        "M. Luthfi Eko Nugroho", 
        "Bagian Perekonomian", 
        "3021072132", 
        145000, 
        "", 
        1, 
        "Purwoko, Sh", 
        "(UPZ SATPOL)", 
        "3090032711", 
        118013, 
        "NO REK TDK ADA DI SIPD"
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Realisasi Gaji');

    XLSX.writeFile(workbook, 'Format_Realisasi_Gaji_Bank_Jateng.xlsx');
  };

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
      const bankRes = await axios.get('/api/finance/accounts');
      const bankData = bankRes.data?.status === 'success' ? bankRes.data.data : bankRes.data;
      if (Array.isArray(bankData)) {
        const banksOnly = bankData.filter((acc: any) => acc.tipe_kas === 'BANK');
        setBankAccounts(banksOnly);
        if (banksOnly.length > 0) {
          setSelectedBankAccountId(banksOnly[0].account_id);
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
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
      
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: "" });

      if (rawRows.length === 0) {
        throw new Error('File excel kosong');
      }

      const items: ProcessedTransaction[] = [];
      const failedItems: any[] = [];

      // Check if there is data in column H (which indicates dual table format)
      // ignoring the header rows (index < 4)
      const hasDualTable = rawRows.some((row, idx) => {
        if (idx < 3) return false;
        const hVal = String(row['H'] || '').trim();
        return hVal !== '' && hVal.toLowerCase() !== 'nama' && hVal.toLowerCase() !== 'nama lengkap';
      });

      if (hasDualTable) {
        rawRows.forEach((row, index) => {
          // Left Table (Berhasil)
          const bVal = String(row['B'] || '').trim();
          const dVal = String(row['D'] || '').trim();
          const eVal = row['E'];

          // Right Table (Gagal)
          const hVal = String(row['H'] || '').trim();
          const jVal = String(row['J'] || '').trim();
          const kVal = row['K'];
          const lVal = String(row['L'] || '').trim();

          if (index >= 3) {
            // Process Left (Berhasil)
            if (bVal && bVal.toLowerCase() !== 'nama' && bVal.toLowerCase() !== 'nama lengkap') {
              const no = Number(row['A']) || (items.length + 1);
              const nama = bVal;
              const opd = String(row['C'] || 'Lainnya').trim();
              const no_rekening = dVal;
              const nominal = Number(String(eVal).replace(/[^0-9]/g, '')) || 0;

              if (nama && no_rekening && nominal > 0) {
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
              }
            }

            // Process Right (Gagal)
            if (hVal && hVal.toLowerCase() !== 'nama' && hVal.toLowerCase() !== 'nama lengkap') {
              const no = Number(row['G']) || (failedItems.length + 1);
              const nama = hVal;
              const opd = String(row['I'] || 'Lainnya').trim();
              const no_rekening = jVal;
              const nominal = Number(String(kVal).replace(/[^0-9]/g, '')) || 0;
              const keterangan = lVal || 'Gagal Potong';

              if (nama && no_rekening && nominal > 0) {
                failedItems.push({
                  no,
                  nama,
                  opd,
                  no_rekening,
                  nominal,
                  keterangan
                });
              }
            }
          }
        });
      } else {
        // Legacy single-table parser fallback
        rawRows.forEach((row, index) => {
          const bVal = String(row['B'] || '').trim();
          const dVal = String(row['D'] || '').trim();
          const eVal = row['E'];

          if (index >= 3 && bVal && bVal.toLowerCase() !== 'nama' && bVal.toLowerCase() !== 'nama lengkap') {
            const no = Number(row['A']) || (items.length + 1);
            const nama = bVal;
            const opd = String(row['C'] || 'Lainnya').trim();
            const no_rekening = dVal;
            const nominal = Number(String(eVal).replace(/[^0-9]/g, '')) || 0;

            if (nama && no_rekening && nominal > 0) {
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
            }
          }
        });
      }

      setFailedData(failedItems);

      if (items.length === 0 && failedItems.length > 0) {
        setFileData([]);
        setMessages([
          { 
            type: 'success', 
            text: `Berhasil memetakan data. Ditemukan ${failedItems.length} transaksi gagal potong.` 
          }
        ]);
        setActiveTab('gagal');
        return;
      }

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
        const lookedUp = res.data.data.map((item: any, idx: number) => {
          const originalItem = items[idx];
          return {
            ...item,
            originalOpd: originalItem ? originalItem.opd : item.opd,
            selected: !!item.matched // default select matched rows
          };
        });

        // Automatically attempt to match each unique raw OPD to Database UPZ
        const initialMappings: Record<string, string> = {};
        const uniqueRawOpds = Array.from(new Set(lookedUp.map((item: any) => (item.originalOpd || item.opd) as string))) as string[];
        
        uniqueRawOpds.forEach((raw: string) => {
          const matchedUpzName = findMatchingUpzName(raw);
          if (matchedUpzName) {
            initialMappings[raw] = matchedUpzName;
          }
        });

        // Update the items with the automatically matched UPZ names
        const matchedItems = lookedUp.map((item: any) => {
          const matchedName = initialMappings[item.originalOpd || item.opd];
          return {
            ...item,
            opd: matchedName || item.opd
          };
        });

        setOpdMapping(initialMappings);
        setFileData(matchedItems);
        
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
    setRegisterTanpaNik(false);
    setRegisterNpwz('');
    setRegisterAddress('Kota Semarang');
    setRegisterPhone('-');
    setRegisterGender('Pria');
    
    // Auto-map or clean UPZ name from the OPD in row
    const matchedUpzName = findMatchingUpzName(row.opd || '');
    setRegisterUpz(matchedUpzName || row.opd || '');
    setRegisterUpzSearchQuery('');
    setIsRegisterUpzDropdownOpen(false);
    
    setIsRegisterModalOpen(true);
  };

  // Submit new Muzakki registration
  const handleRegisterMuzakki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRowToRegister) return;

    if (!registerTanpaNik && (!registerNik || registerNik.length !== 16)) {
      alert('NIK harus 16 digit angka.');
      return;
    }

    if (!registerNpwz) {
      alert('NPWZ wajib diisi sesuai data di SIMBA.');
      return;
    }

    try {
      const payload = {
        kategori: 'Perorangan',
        nama: selectedRowToRegister.nama,
        nik: registerTanpaNik ? '' : registerNik,
        npwz: registerNpwz,
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
        setMessages([{ type: 'success', text: `Muzakki ${selectedRowToRegister.nama} berhasil didaftarkan dengan NPWZ: ${res.data.data.npwz}!` }]);
        
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

    if (!selectedBankAccountId) {
      setMessages([{ type: 'error', text: 'Silakan pilih rekening penerima terlebih dahulu.' }]);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        transactions: selectedTx.map(t => ({
          muzakki_id: t.muzakki_id,
          nominal: t.nominal,
          no_rekening: t.no_rekening,
          opd: t.opd,
          keterangan: `Penerimaan payroll Bank Jateng OPD ${t.opd} - Rekening ${t.no_rekening}`
        })),
        failedTransactions: failedData.map(fd => ({
          nama: fd.nama,
          opd: fd.opd,
          no_rekening: fd.no_rekening,
          nominal: fd.nominal,
          keterangan: fd.keterangan || 'Gagal Potong'
        })),
        bank_account_id: selectedBankAccountId,
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

  // Group by OPD for display and downloads (combining success and failed data)
  const opdGroups = useMemo(() => {
    const groups: { 
      [key: string]: { 
        name: string; 
        successCount: number; 
        successTotal: number; 
        failedCount: number; 
        failedTotal: number; 
        items: { nama: string; no_rekening: string; nominal: number; status_potongan: 'Berhasil' | 'Gagal'; keterangan?: string }[] 
      } 
    } = {};
    
    // Process successful transactions
    fileData.forEach(item => {
      const key = item.originalOpd || item.opd || 'Lainnya';
      if (!groups[key]) {
        groups[key] = { name: key, successCount: 0, successTotal: 0, failedCount: 0, failedTotal: 0, items: [] };
      }
      groups[key].successCount += 1;
      groups[key].successTotal += item.nominal;
      groups[key].items.push({
        nama: item.nama,
        no_rekening: item.no_rekening,
        nominal: item.nominal,
        status_potongan: 'Berhasil'
      });
    });

    // Process failed transactions
    failedData.forEach(item => {
      const key = item.opd || 'Lainnya';
      if (!groups[key]) {
        groups[key] = { name: key, successCount: 0, successTotal: 0, failedCount: 0, failedTotal: 0, items: [] };
      }
      groups[key].failedCount += 1;
      groups[key].failedTotal += item.nominal;
      groups[key].items.push({
        nama: item.nama,
        no_rekening: item.no_rekening,
        nominal: item.nominal,
        status_potongan: 'Gagal',
        keterangan: item.keterangan
      });
    });

    return Object.values(groups).sort((a, b) => 
      (b.successTotal + b.failedTotal) - (a.successTotal + a.failedTotal)
    );
  }, [fileData, failedData]);

  // Export to SIMBA format for specific OPD or all
  const exportToSimba = (groupName?: string) => {
    let itemsToExport = fileData;
    if (groupName) {
      itemsToExport = fileData.filter(item => (item.originalOpd || item.opd) === groupName);
    }

    if (itemsToExport.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const exportRows = itemsToExport.map((item, idx) => {
      const isZakat = item.nominal >= 100000;
      
      let zakatVal = '';
      let infakVal = '';

      if (isZakat) {
        zakatVal = String(item.nominal);
      } else {
        infakVal = String(item.nominal);
      }

      // Build Keterangan
      const labelTipe = isZakat ? 'Zakat Maal' : 'Infak';

      const namaMuzakki = item.nama_muzakki || item.nama;
      const cleanOpd = item.opd ? (String(item.opd).startsWith('UPZ') ? String(item.opd) : `UPZ ${String(item.opd)}`) : 'UPZ';
      const keteranganVal = `Terima ${labelTipe} a.n ${namaMuzakki} (${cleanOpd})`;

      // Date format: DD/MM/YYYY
      const dateParts = tanggalPembayaran.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : tanggalPembayaran;

      return {
        'No': idx + 1,
        'tgl_transaksi': formattedDate,
        'NPWZ': item.npwz || '-',
        'nama': namaMuzakki,
        'zakat': zakatVal ? Number(zakatVal) : '',
        'zakat fitrah': '',
        'infak': infakVal ? Number(infakVal) : '',
        'titipan': '',
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
          <span className="text-primary font-bold">Penerimaan Bank Jateng</span>
        </nav>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <Building className="size-8 text-primary" />
          Penerimaan Bank Jateng
        </h2>
        <p className="text-slate-500 font-medium max-w-3xl">
          Modul otomasi rekonsiliasi data penerimaan Bank Jateng (OPD, instansi, potong gaji, payroll). Upload file Excel rekapitulasi, mapping NPWZ secara real-time, dan lakukan posting jurnal pembukuan instan.
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
      {fileData.length === 0 && failedData.length === 0 && (
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
          <h3 className="text-lg font-bold text-slate-900 mb-2">Upload File Realisasi Gaji Bank Jateng</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
            Drag &amp; drop file laporan di sini, atau klik untuk memilih file. Harap sesuaikan dengan format laporan yang telah ditentukan.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadTemplate();
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="size-4 text-primary" />
            Unduh Format Laporan
          </button>
        </motion.div>
      )}

      {/* After File Uploaded */}
      {(fileData.length > 0 || failedData.length > 0) && (
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
                  Berhasil Potong ({fileData.length})
                </button>
                <button
                  onClick={() => setActiveTab('gagal')}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2",
                    activeTab === 'gagal' ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <AlertCircle className="size-4" />
                  Gagal Potong ({failedData.length})
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

              {/* Reset/Download Actions */}
              <div className="flex items-center gap-3">
                {fileName && (
                  <span className="text-xs text-slate-550 font-medium max-w-[200px] truncate">
                    File: <span className="text-slate-750 font-bold">{fileName}</span>
                  </span>
                )}
                {activeTab === 'gagal' && (
                  <button
                    onClick={handleExportPDFFailed}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    Cetak PDF Gagal Potong
                  </button>
                )}
                {activeTab === 'berhasil' && (
                  <button
                    onClick={() => exportToSimba()}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    Format SIMBA (Semua)
                  </button>
                )}
                <button 
                  onClick={() => { setFileData([]); setFailedData([]); setFileName(''); }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50/50 transition-colors cursor-pointer"
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
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer"
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
                      <tr className="bg-slate-50 text-slate-550 uppercase text-[11px] font-bold tracking-wider border-b border-slate-150">
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
                        <th className="px-4 py-3 text-center">Jenis Dana</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                        <th className="px-4 py-3 text-center">Status Mapping</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredFileData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
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
                            <td className="px-4 py-3 text-center">
                              {row.nominal >= 100000 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                  Zakat
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                  Infak
                                </span>
                              )}
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
                                  className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-2.5 py-1 rounded text-[10px] font-bold border border-primary/20 transition-all cursor-pointer"
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

              {/* Table rendering for Gagal Potong */}
              {activeTab === 'gagal' && (
                <div className="overflow-x-auto min-h-[300px]">
                   <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-550 uppercase text-[11px] font-bold tracking-wider border-b border-slate-150">
                        <th className="px-6 py-4 text-center w-12">No</th>
                        <th className="px-6 py-4">Nama Pegawai</th>
                        <th className="px-6 py-4">No. Rekening</th>
                        <th className="px-6 py-4">OPD / Dinas</th>
                        <th className="px-6 py-4 text-right">Nominal</th>
                        <th className="px-6 py-4">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {failedData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            Tidak ada data gagal potong.
                          </td>
                        </tr>
                      ) : (
                        failedData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {row.nama}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500">
                              {row.no_rekening}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">
                              {row.opd}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-rose-600">
                              Rp {row.nominal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">
                                {row.keterangan || 'Gagal Potong'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  
                  {/* Footer Stats summary */}
                  <div className="p-6 bg-slate-50/50 border-t border-slate-150 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">
                      Menampilkan {failedData.length} transaksi gagal potong
                    </span>
                    <span className="text-rose-600 font-black text-sm">
                      Total Akumulasi Gagal Potong: Rp {failedData.reduce((sum, item) => sum + item.nominal, 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'opd' && (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Data Realisasi Dikelompokkan Per OPD</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {opdGroups.map((group, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col hover:border-slate-350 transition-colors relative space-y-4">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-slate-800 text-sm">{group.name}</h4>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                              Total: {group.successCount + group.failedCount} Orang
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Berhasil Potong</span>
                              <div className="flex justify-between items-baseline mt-1">
                                <span className="text-[10px] text-slate-500 font-semibold">{group.successCount} Pegawai</span>
                                <span className="text-xs font-bold text-emerald-600">Rp {group.successTotal.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                            
                            <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                              <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block">Gagal Potong</span>
                              <div className="flex justify-between items-baseline mt-1">
                                <span className="text-[10px] text-slate-500 font-semibold">{group.failedCount} Pegawai</span>
                                <span className="text-xs font-bold text-rose-600">Rp {group.failedTotal.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Searchable UPZ Database Matcher */}
                          <div className="mt-3.5 space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Mencocokan dengan Database UPZ:
                            </label>
                            
                            {openSearchDropdown === group.name ? (
                              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                <input
                                  type="text"
                                  autoFocus
                                  value={upzSearchQuery}
                                  onChange={(e) => setUpzSearchQuery(e.target.value)}
                                  placeholder="Cari nama UPZ..."
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                                />
                                <div className="space-y-1">
                                  <button
                                    onClick={() => {
                                      handleMapOpd(group.name, '');
                                      setOpenSearchDropdown(null);
                                      setUpzSearchQuery('');
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-xs text-rose-600 font-semibold"
                                  >
                                    -- Putuskan Hubungan --
                                  </button>
                                  {upzList
                                    .filter(upz => upz.name.toLowerCase().includes(upzSearchQuery.toLowerCase()))
                                    .map(upz => (
                                      <button
                                        key={upz.id}
                                        onClick={() => {
                                          handleMapOpd(group.name, upz.name);
                                          setOpenSearchDropdown(null);
                                          setUpzSearchQuery('');
                                        }}
                                        className={cn(
                                          "w-full text-left px-2 py-1.5 rounded hover:bg-slate-150 text-xs transition-colors",
                                          opdMapping[group.name] === upz.name ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                        )}
                                      >
                                        {upz.name} <span className="text-[9px] text-slate-400">({upz.category})</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenSearchDropdown(openSearchDropdown === group.name ? null : group.name);
                                setUpzSearchQuery('');
                              }}
                              className="w-full text-left text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-700 font-semibold flex justify-between items-center"
                            >
                              <span className={opdMapping[group.name] ? "text-primary font-bold" : "text-slate-400 font-normal"}>
                                {opdMapping[group.name] || 'Pilih UPZ Database...'}
                              </span>
                              <ChevronRight className="size-3.5 text-slate-400 rotate-90" />
                            </button>
                          </div>
                          
                          {/* Expanded detail by name */}
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedGroupDetails(prev => ({ ...prev, [group.name]: !prev[group.name] }));
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-750 flex items-center gap-1"
                            >
                              <span>{expandedGroupDetails[group.name] ? 'Sembunyikan Detail Pegawai' : 'Tampilkan Detail Pegawai'}</span>
                              <ChevronRight className={cn("size-3.5 transition-transform text-slate-400", expandedGroupDetails[group.name] && "rotate-90")} />
                            </button>
                            
                            {expandedGroupDetails[group.name] && (
                              <div className="mt-2.5 space-y-2 max-h-52 overflow-y-auto custom-scrollbar bg-white p-2.5 rounded-lg border border-slate-200">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                                      <th className="pb-1.5">Nama</th>
                                      <th className="pb-1.5">No. Rekening</th>
                                      <th className="pb-1.5 text-right">Nominal</th>
                                      <th className="pb-1.5 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item, idx2) => (
                                      <tr key={idx2} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                        <td className="py-2 text-slate-700 font-semibold">{item.nama}</td>
                                        <td className="py-2 text-slate-500 font-mono">{item.no_rekening}</td>
                                        <td className="py-2 text-slate-700 text-right font-bold">
                                          Rp {item.nominal.toLocaleString('id-ID')}
                                        </td>
                                        <td className="py-2 text-center">
                                          {item.status_potongan === 'Berhasil' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                              Berhasil
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 cursor-help" title={item.keterangan}>
                                              Gagal
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {group.successCount > 0 && (
                          <div className="pt-3 border-t border-slate-200 flex justify-end">
                            <button
                              onClick={() => exportToSimba(group.name)}
                              className="bg-primary/20 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            >
                              <FileSpreadsheet className="size-3.5" />
                              Format SIMBA
                            </button>
                          </div>
                        )}
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
                <h3 className="text-lg font-black text-slate-900">Pengaturan Pembukuan</h3>
                <p className="text-xs text-slate-550 mt-1">Konfigurasikan rekening penerima dan tanggal pembukuan Bank Jateng.</p>
              </div>

              {/* Meta Config Form */}
              <div className="space-y-4">
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
                    Simpan ke Penerimaan
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
                <th className="px-4 py-3">Batch Penerimaan</th>
                <th className="px-4 py-3">Rekening Penerima</th>
                <th className="px-4 py-3 text-right">Total Nominal</th>
                <th className="px-4 py-3 text-center">Jumlah Pegawai</th>
                <th className="px-4 py-3 text-center">Tanggal Potong</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
              {groupedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                    Belum ada riwayat transaksi terimpor di database.
                  </td>
                </tr>
              ) : (
                groupedHistory.map((batch, idx) => {
                  const isExpanded = !!expandedBatches[batch.batchName];
                  return (
                    <React.Fragment key={batch.batchName}>
                      <tr className="hover:bg-slate-50/20 transition-colors border-b border-slate-100">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">
                          <button 
                            onClick={() => toggleBatchExpand(batch.batchName)}
                            className="flex items-center gap-2 text-slate-800 hover:text-primary transition-colors focus:outline-none"
                          >
                            <ChevronRight className={cn("size-4 text-slate-400 transition-transform duration-200", isExpanded && "rotate-90")} />
                            <span>{getDisplayBatchName(batch.batchName)}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-700">{batch.bankAccountName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.bankAccountNumber}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                          Rp {batch.totalNominal.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {batch.items.length} pegawai
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-500">
                          {new Date(batch.tanggal_pembayaran).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => exportHistoryToSimba(batch.items, batch.batchName)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Unduh SIMBA Excel"
                            >
                              <FileSpreadsheet className="size-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch.batchName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus Batch"
                            >
                              <Trash2 className="size-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (() => {
                        const currentTab = batchActiveTab[batch.batchName] || 'upz';
                        
                        // Group items by UPZ/OPD name
                        const upzMap: Record<string, { upzName: string; count: number; total: number; items: any[] }> = {};
                        batch.items.forEach((item: any) => {
                          let opdName = 'Umum / Tanpa UPZ';
                          if (item.keterangan) {
                            const match = item.keterangan.match(/\(([^)]+)\)$/) || item.keterangan.match(/\(([^)]+)\)[^()]*$/);
                            if (match) {
                              opdName = match[1].trim();
                            } else {
                              const parts = item.keterangan.split('OPD');
                              if (parts.length > 1) {
                                opdName = parts[1].split('-')[0].trim();
                              }
                            }
                          }
                          if (!upzMap[opdName]) {
                            upzMap[opdName] = { upzName: opdName, count: 0, total: 0, items: [] };
                          }
                          upzMap[opdName].count += 1;
                          upzMap[opdName].total += Number(item.nominal);
                          upzMap[opdName].items.push(item);
                        });
                        const batchUpzList = Object.values(upzMap).sort((a, b) => b.total - a.total);
                        const searchVal = historyUpzSearch[batch.batchName] || '';
                        const filteredUpzList = batchUpzList.filter((upz: any) => 
                          upz.upzName.toLowerCase().includes(searchVal.toLowerCase())
                        );

                        return (
                          <tr className="bg-slate-50/30">
                            <td colSpan={7} className="px-8 py-4 border-b border-slate-150">
                              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in space-y-4 p-4">
                                
                                {/* Tab Header */}
                                <div className="flex border-b border-slate-150 pb-2 gap-4">
                                  <button
                                    onClick={() => setBatchActiveTab(prev => ({ ...prev, [batch.batchName]: 'upz' }))}
                                    className={cn(
                                      "pb-2 text-xs font-bold transition-all border-b-2 px-1 focus:outline-none",
                                      currentTab === 'upz' 
                                        ? "text-primary border-primary" 
                                        : "text-slate-400 border-transparent hover:text-slate-700"
                                    )}
                                  >
                                    Rekapitulasi per UPZ ({batchUpzList.length})
                                  </button>
                                  <button
                                    onClick={() => setBatchActiveTab(prev => ({ ...prev, [batch.batchName]: 'pegawai' }))}
                                    className={cn(
                                      "pb-2 text-xs font-bold transition-all border-b-2 px-1 focus:outline-none",
                                      currentTab === 'pegawai' 
                                        ? "text-primary border-primary" 
                                        : "text-slate-400 border-transparent hover:text-slate-700"
                                    )}
                                  >
                                    Detail Rincian Pegawai ({batch.items.length})
                                  </button>
                                  <button
                                    onClick={() => setBatchActiveTab(prev => ({ ...prev, [batch.batchName]: 'gagal' }))}
                                    className={cn(
                                      "pb-2 text-xs font-bold transition-all border-b-2 px-1 focus:outline-none",
                                      currentTab === 'gagal' 
                                        ? "text-rose-600 border-rose-600" 
                                        : "text-slate-400 border-transparent hover:text-slate-700"
                                    )}
                                  >
                                    Rekap Gagal Potong ({batch.failedItems?.length || 0})
                                  </button>
                                </div>

                                {currentTab === 'upz' && (
                                  /* Rekap per UPZ Table */
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center gap-4">
                                      <div className="relative flex-1 max-w-xs">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                                        <input
                                          type="text"
                                          placeholder="Cari UPZ / OPD..."
                                          value={searchVal}
                                          onChange={(e) => setHistoryUpzSearch(prev => ({
                                            ...prev,
                                            [batch.batchName]: e.target.value
                                          }))}
                                          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                                        />
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-bold">
                                        Menampilkan {filteredUpzList.length} dari {batchUpzList.length} UPZ
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-550 uppercase text-[9px] font-bold tracking-wider border-b border-slate-150">
                                            <th className="px-4 py-2 text-center w-12">No</th>
                                            <th className="px-4 py-2">Nama UPZ / OPD</th>
                                            <th className="px-4 py-2 text-center">Jumlah Pegawai</th>
                                            <th className="px-4 py-2 text-right">Total Nominal</th>
                                            <th className="px-4 py-2 text-center w-32">Aksi</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
                                          {filteredUpzList.length === 0 ? (
                                            <tr>
                                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                                                Tidak ada UPZ yang cocok dengan pencarian.
                                              </td>
                                            </tr>
                                          ) : (
                                            filteredUpzList.map((upz, upzIdx) => (
                                              <tr key={upz.upzName} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-4 py-2.5 text-center font-medium text-slate-400">{upzIdx + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-slate-800">{upz.upzName}</td>
                                                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{upz.count} orang</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                                                  Rp {upz.total.toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                  <button
                                                    onClick={() => exportHistoryToSimba(upz.items, `${batch.batchName}_${upz.upzName}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-55 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-lg text-[10px] font-black transition-all active:scale-95 shadow-sm"
                                                    title={`Unduh Template SIMBA untuk ${upz.upzName}`}
                                                  >
                                                    <FileSpreadsheet className="size-3.5" />
                                                    Format SIMBA
                                                  </button>
                                                </td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {currentTab === 'pegawai' && (
                                  /* Rincian Pegawai Table */
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-550 uppercase text-[9px] font-bold tracking-wider border-b border-slate-150">
                                          <th className="px-4 py-2 text-center w-12">No</th>
                                          <th className="px-4 py-2">Muzakki (NPWZ)</th>
                                          <th className="px-4 py-2">Dinas / OPD</th>
                                          <th className="px-4 py-2 text-center">Jenis Dana</th>
                                          <th className="px-4 py-2 text-right">Nominal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
                                        {batch.items.map((item: any, itemIdx: number) => {
                                          const isZakat = Number(item.nominal) >= 100000;
                                          
                                          // Extract OPD from keterangan
                                          let opdName = '-';
                                          if (item.keterangan) {
                                            const match = item.keterangan.match(/\(([^)]+)\)$/) || item.keterangan.match(/\(([^)]+)\)[^()]*$/);
                                            if (match) {
                                              opdName = match[1].trim();
                                            } else {
                                              const parts = item.keterangan.split('OPD');
                                              if (parts.length > 1) {
                                                opdName = parts[1].split('-')[0].trim();
                                              }
                                            }
                                          }
                                          
                                          return (
                                            <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                              <td className="px-4 py-2 text-center font-medium text-slate-400">{itemIdx + 1}</td>
                                              <td className="px-4 py-2">
                                                <p className="font-bold text-slate-900">{item.muzakki?.nama || '-'}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.muzakki?.npwz || '-'}</p>
                                              </td>
                                              <td className="px-4 py-2">
                                                <p className="font-medium text-slate-750">{opdName}</p>
                                              </td>
                                              <td className="px-4 py-2 text-center">
                                                {isZakat ? (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                                    Zakat
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                                    Infak
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                                                Rp {Number(item.nominal).toLocaleString('id-ID')}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {currentTab === 'gagal' && (
                                  /* Rekap Gagal Potong Table */
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                                      <div>
                                        <p className="text-xs text-rose-700 font-bold">Total Akumulasi Gagal Potong</p>
                                        <p className="text-xl font-black text-rose-600 mt-1">
                                          Rp {batch.failedItems.reduce((sum: number, it: any) => sum + it.nominal, 0).toLocaleString('id-ID')}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleExportHistoryPDFFailed(batch.failedItems, batch.batchName)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                                      >
                                        <Download className="size-4" />
                                        Unduh Rekap Gagal Potong PDF
                                      </button>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-100 rounded-lg">
                                      <table className="w-full text-left">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-550 uppercase text-[9px] font-bold tracking-wider border-b border-slate-150">
                                            <th className="px-4 py-2.5 text-center w-12">No</th>
                                            <th className="px-4 py-2.5">Nama Pegawai</th>
                                            <th className="px-4 py-2.5">Dinas / OPD</th>
                                            <th className="px-4 py-2.5">No. Rekening</th>
                                            <th className="px-4 py-2.5 text-right">Nominal</th>
                                            <th className="px-4 py-2.5">Keterangan Gagal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                                          {batch.failedItems.length === 0 ? (
                                            <tr>
                                              <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                                Tidak ada transaksi gagal potong pada batch ini.
                                              </td>
                                            </tr>
                                          ) : (
                                            batch.failedItems.map((item: any, itemIdx: number) => (
                                              <tr key={item.id || itemIdx} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-4 py-2 text-center font-medium text-slate-400">{itemIdx + 1}</td>
                                                <td className="px-4 py-2 font-bold text-slate-900">{item.nama}</td>
                                                <td className="px-4 py-2 font-medium text-slate-700">{item.opd}</td>
                                                <td className="px-4 py-2 font-mono text-slate-500">{item.no_rekening}</td>
                                                <td className="px-4 py-2 text-right font-bold text-rose-600">
                                                  Rp {Number(item.nominal).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-rose-500 font-semibold">{item.keterangan}</td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    NPWZ (dari SIMBA) *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={registerNpwz}
                    onChange={(e) => setRegisterNpwz(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 font-semibold" 
                    placeholder="Contoh: WZ-2026-10293..." 
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      NIK Muzakki (16 Digit) {!registerTanpaNik && "*"}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={registerTanpaNik}
                        onChange={(e) => {
                          setRegisterTanpaNik(e.target.checked);
                          if (e.target.checked) setRegisterNik('');
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary/20 size-3.5 cursor-pointer"
                      />
                      <span>Tanpa NIK</span>
                    </label>
                  </div>
                  <input 
                    required={!registerTanpaNik}
                    disabled={registerTanpaNik}
                    type="text" 
                    maxLength={16}
                    value={registerNik}
                    onChange={(e) => setRegisterNik(e.target.value.replace(/[^0-9]/g, ''))}
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800",
                      registerTanpaNik 
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                        : "bg-white border-slate-200"
                    )}
                    placeholder={registerTanpaNik ? "Muzakki didaftarkan tanpa NIK" : "Masukkan NIK 16 digit..."} 
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
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">UPZ / Dinas / OPD *</label>
                    {isRegisterUpzDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        <input
                          type="text"
                          autoFocus
                          value={registerUpzSearchQuery}
                          onChange={(e) => setRegisterUpzSearchQuery(e.target.value)}
                          placeholder="Cari nama UPZ..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                        />
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {upzList
                            .filter(upz => upz.name.toLowerCase().includes(registerUpzSearchQuery.toLowerCase()))
                            .map(upz => (
                              <button
                                type="button"
                                key={upz.id}
                                onClick={() => {
                                  setRegisterUpz(upz.name);
                                  setIsRegisterUpzDropdownOpen(false);
                                  setRegisterUpzSearchQuery('');
                                }}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 text-xs transition-colors",
                                  registerUpz === upz.name ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                                )}
                              >
                                {upz.name} <span className="text-[9px] text-slate-400">({upz.category})</span>
                              </button>
                            ))}
                          {upzList.filter(upz => upz.name.toLowerCase().includes(registerUpzSearchQuery.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-slate-400 italic p-2 text-center">Tidak ada UPZ yang cocok</p>
                          )}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterUpzDropdownOpen(!isRegisterUpzDropdownOpen);
                        setRegisterUpzSearchQuery('');
                      }}
                      className="w-full text-left text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 font-semibold flex justify-between items-center"
                    >
                      <span className={registerUpz ? "text-slate-800 font-semibold truncate" : "text-slate-400 font-normal"}>
                        {registerUpz || 'Pilih UPZ...'}
                      </span>
                      <ChevronRight className="size-4 text-slate-400 rotate-90 shrink-0" />
                    </button>
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
