import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProposalMemo } from '../data/proposalMemoData';
import axios from 'axios';

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  if (link.includes('drive.google.com')) {
    return link.replace(/\/view.*?(\?|$)/, '/preview$1');
  }
  return link;
}

function getSurveyDeadlineInfo(claimedAtStr?: string | null) {
  if (!claimedAtStr) return null;
  const claimedAt = new Date(claimedAtStr);
  const now = new Date();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const deadline = new Date(claimedAt.getTime() + threeDaysInMs);
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      remainingText: 'KADALUARSA',
      isExpired: true,
      diffMs: 0
    };
  }
  
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  
  let remainingText = '';
  if (diffDays > 0) {
    remainingText = `${diffDays} Hari ${diffHours} Jam`;
  } else if (diffHours > 0) {
    remainingText = `${diffHours} Jam ${diffMinutes} Mnt`;
  } else {
    remainingText = `${diffMinutes} Mnt`;
  }
  
  return {
    remainingText,
    isExpired: false,
    diffMs
  };
}
import {
  MapPin, Phone, Camera, CheckCircle2, FileText, Navigation, ChevronLeft, X, Send, AlertCircle, Search, Map, Eye, Download, Home, History, FileEdit, ExternalLink, Upload, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TimSurveiProps {
  data: ProposalMemo[];
  onUpdate: (data: ProposalMemo[]) => void;
}

export default function TimSurvei({ data, onUpdate }: TimSurveiProps) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<ProposalMemo | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'surveyForm'>('list');
  const [activeTab, setActiveTab] = useState<'tersedia' | 'tugasSaya'>('tersedia');
  const [bottomNav, setBottomNav] = useState<'home' | 'riwayat'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingHistory, setEditingHistory] = useState<ProposalMemo | null>(null);
  const [bpsPovertyLine, setBpsPovertyLine] = useState<number>(709785); // Default value
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [pilars, setPilars] = useState<any[]>([]);

  const [photoInputModes, setPhotoInputModes] = useState<Record<string, 'file' | 'link'>>({
    fotoRumahDepan: 'file',
    fotoRumahDalam: 'file',
    fotoMustahik: 'file',
    fotoKondisiUsaha: 'file',
    fotoProdukBantuan: 'file',
    fotoDokumenLainnya: 'file',
  });
  const [surveyPhotoFiles, setSurveyPhotoFiles] = useState<Record<string, File | null>>({
    fotoRumahDepan: null,
    fotoRumahDalam: null,
    fotoMustahik: null,
    fotoKondisiUsaha: null,
    fotoProdukBantuan: null,
    fotoDokumenLainnya: null,
  });
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string | null>>({
    fotoRumahDepan: null,
    fotoRumahDalam: null,
    fotoMustahik: null,
    fotoKondisiUsaha: null,
    fotoProdukBantuan: null,
    fotoDokumenLainnya: null,
  });

  const programTipeMap = useMemo(() => {
    const map: { [code: string]: string } = {};
    (pilars || []).forEach(pilar => {
      (pilar.programs || []).forEach((prog: any) => {
        map[prog.code] = prog.tipe || 'Konsumtif';
      });
    });
    return map;
  }, [pilars]);

  const defaultLembagaSurveyTemplateFallback = [
    { id: 'berbadanHukum', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Berbadan Hukum', options: [{ val: 3, label: 'Yayasan' }, { val: 2, label: 'Pemerintah' }, { val: 1, label: 'Tidak Berbadan Hukum' }] },
    { id: 'usiaBerdiri', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Usia Berdiri', options: [{ val: 5, label: '8-10 th' }, { val: 4, label: '6-8 th' }, { val: 3, label: '4-6 th' }, { val: 2, label: '2-4 th' }, { val: 1, label: '0-2 th' }] },
    { id: 'bidangGarapan', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Bidang Garapan', options: [{ val: 5, label: 'Pendidikan' }, { val: 4, label: 'Sosial' }, { val: 3, label: 'Jasa' }, { val: 2, label: 'Dakwah' }, { val: 1, label: 'Lainnya' }] },
    { id: 'daerahJangkauan', section: 'A', sectionTitle: 'Bagian A: Profil Lembaga', label: 'Daerah Jangkauan', options: [{ val: 5, label: 'Nasional' }, { val: 4, label: 'Provinsi' }, { val: 3, label: 'Kabupaten/Kota' }, { val: 2, label: 'Kecamatan' }, { val: 1, label: 'Kelurahan' }] },
    { id: 'layakJenisKegiatan', section: 'B', sectionTitle: 'Bagian B: Kelayakan', label: 'Kelayakan Jenis Kegiatan', options: [{ val: 2, label: 'Layak' }, { val: 1, label: 'Tidak Layak' }] },
    { id: 'layakJumlahPenerima', section: 'B', sectionTitle: 'Bagian B: Kelayakan', label: 'Kelayakan Jumlah Penerima Manfaat', options: [{ val: 2, label: 'Layak' }, { val: 1, label: 'Tidak Layak' }] }
  ];

  React.useEffect(() => {
    const fetchParams = async () => {
      try {
        const [bpsRes, pilarsRes] = await Promise.all([
          axios.get('/api/parameters/bps_garis_kemiskinan'),
          axios.get('/api/pilars')
        ]);
        if (bpsRes.data && bpsRes.data.value) {
          setBpsPovertyLine(parseInt(bpsRes.data.value));
        }
        if (pilarsRes.data) {
          setPilars(pilarsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch BPS poverty line or pilars:', err);
      }
    };
    fetchParams();
  }, []);

  React.useEffect(() => {
    if (!selectedTask) {
      setDynamicQuestions([]);
      return;
    }
    
    // Auto populate or clear form
    if (selectedTask.survey_data) {
      setSurveyForm({
        luasBangunan: selectedTask.survey_data.luasBangunan ?? 0,
        jenisLantai: selectedTask.survey_data.jenisLantai ?? 0,
        jenisDinding: selectedTask.survey_data.jenisDinding ?? 0,
        statusTempatTinggal: selectedTask.survey_data.statusTempatTinggal ?? 0,
        fasilitasMck: selectedTask.survey_data.fasilitasMck ?? 0,
        sumberAirMinum: selectedTask.survey_data.sumberAirMinum ?? 0,
        jenisPenerangan: selectedTask.survey_data.jenisPenerangan ?? 0,
        kondisiDapur: selectedTask.survey_data.kondisiDapur ?? 0,
        aset: Array.isArray(selectedTask.survey_data.aset) ? selectedTask.survey_data.aset : [],
        pendidikanKepala: selectedTask.survey_data.pendidikanKepala ?? 0,
        pekerjaanKepala: selectedTask.survey_data.pekerjaanKepala ?? 0,
        pendapatanTotal: selectedTask.survey_data.pendapatanTotal ?? '',
        jumlahTanggungan: selectedTask.survey_data.jumlahTanggungan ?? '',
        frekuensiMakan: selectedTask.survey_data.frekuensiMakan ?? 0,
        kemampuanLauk: selectedTask.survey_data.kemampuanLauk ?? 0,
        kemampuanPakaian: selectedTask.survey_data.kemampuanPakaian ?? 0,
        asumsiBantuan: selectedTask.survey_data.asumsiBantuan ?? 0,
        keadaanFisik: selectedTask.survey_data.keadaanFisik ?? 0,
        tanggunganKategori: selectedTask.survey_data.tanggunganKategori ?? 0,
        hutang: selectedTask.survey_data.hutang ?? 0,
        kesehatan: selectedTask.survey_data.kesehatan ?? 0,
        catatanLapangan: selectedTask.survey_data.catatanLapangan ?? '',
        berbadanHukum: selectedTask.survey_data.berbadanHukum ?? '',
        usiaBerdiri: selectedTask.survey_data.usiaBerdiri ?? '',
        bidangGarapan: selectedTask.survey_data.bidangGarapan ?? '',
        daerahJangkauan: selectedTask.survey_data.daerahJangkauan ?? '',
        layakJenisKegiatan: selectedTask.survey_data.layakJenisKegiatan ?? '',
        layakJumlahPenerima: selectedTask.survey_data.layakJumlahPenerima ?? '',
        fotoRumahDepan: selectedTask.survey_data.fotoRumahDepan ?? '',
        fotoRumahDalam: selectedTask.survey_data.fotoRumahDalam ?? '',
        fotoMustahik: selectedTask.survey_data.fotoMustahik ?? '',
        fotoKondisiUsaha: selectedTask.survey_data.fotoKondisiUsaha ?? '',
        fotoProdukBantuan: selectedTask.survey_data.fotoProdukBantuan ?? '',
        fotoDokumenLainnya: selectedTask.survey_data.fotoDokumenLainnya ?? '',
      });

      const fields = ['fotoRumahDepan', 'fotoRumahDalam', 'fotoMustahik', 'fotoKondisiUsaha', 'fotoProdukBantuan', 'fotoDokumenLainnya'];
      const newModes = { ...photoInputModes };
      fields.forEach(f => {
        if (selectedTask.survey_data?.[f]) {
          newModes[f] = 'link';
        } else {
          newModes[f] = 'file';
        }
      });
      setPhotoInputModes(newModes);
    } else {
      setSurveyForm({
        luasBangunan: 0,
        jenisLantai: 0,
        jenisDinding: 0,
        statusTempatTinggal: 0,
        fasilitasMck: 0,
        sumberAirMinum: 0,
        jenisPenerangan: 0,
        kondisiDapur: 0,
        aset: [],
        pendidikanKepala: 0,
        pekerjaanKepala: 0,
        pendapatanTotal: '',
        jumlahTanggungan: '',
        frekuensiMakan: 0,
        kemampuanLauk: 0,
        kemampuanPakaian: 0,
        asumsiBantuan: 0,
        keadaanFisik: 0,
        tanggunganKategori: 0,
        hutang: 0,
        kesehatan: 0,
        catatanLapangan: '',
        berbadanHukum: '',
        usiaBerdiri: '',
        bidangGarapan: '',
        daerahJangkauan: '',
        layakJenisKegiatan: '',
        layakJumlahPenerima: '',
        fotoRumahDepan: '',
        fotoRumahDalam: '',
        fotoMustahik: '',
        fotoKondisiUsaha: '',
        fotoProdukBantuan: '',
        fotoDokumenLainnya: '',
      });
      setPhotoInputModes({
        fotoRumahDepan: 'file',
        fotoRumahDalam: 'file',
        fotoMustahik: 'file',
        fotoKondisiUsaha: 'file',
        fotoProdukBantuan: 'file',
        fotoDokumenLainnya: 'file',
      });
    }

    setSurveyPhotoFiles({
      fotoRumahDepan: null,
      fotoRumahDalam: null,
      fotoMustahik: null,
      fotoKondisiUsaha: null,
      fotoProdukBantuan: null,
      fotoDokumenLainnya: null,
    });
    setPhotoPreviewUrls({
      fotoRumahDepan: null,
      fotoRumahDalam: null,
      fotoMustahik: null,
      fotoKondisiUsaha: null,
      fotoProdukBantuan: null,
      fotoDokumenLainnya: null,
    });
    
    // Determine the template key dynamically
    const getTemplateKey = () => {
      const isLembaga = selectedTask.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedTask.jenisPengajuan?.toLowerCase().includes('kelompok');
      if (isLembaga) return 'survey_template_lembaga';
      
      const tipe = getProgramTipe(selectedTask);
      if (tipe === 'Produktif') return 'survey_template_perorangan_produktif';
      return 'survey_template_individu';
    };

    const templateKey = getTemplateKey();
    axios.get(`/api/parameters/${templateKey}`)
      .then(res => {
        if (res.data && res.data.value) {
          setDynamicQuestions(JSON.parse(res.data.value));
        }
      })
      .catch(err => {
        console.error(`Failed to fetch survey template (${templateKey}):`, err);
      });
  }, [selectedTask, programTipeMap]);

  // Default fallback questions in case API is not loaded yet
  const defaultSurveyTemplateFallback = [
    { id: 'luasBangunan', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Luas Bangunan', options: [{ val: 3, label: '≤ 8 m² (Sangat sempit)' }, { val: 2, label: '8 m² - 10 m²' }, { val: 1, label: '> 10 m² (Lebih luas)' }] },
    { id: 'jenisLantai', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Lantai Tanah', options: [{ val: 3, label: 'Tanah' }, { val: 2, label: 'Plester / Semen' }, { val: 1, label: 'Keramik' }] },
    { id: 'jenisDinding', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Dinding Rumah', options: [{ val: 3, label: 'Papan / Tripleks / Bambu' }, { val: 2, label: 'Tembok Bata (Belum diplester/diaci)' }, { val: 1, label: 'Tembok Keramik / Tembok dicat rapi' }] },
    { id: 'statusTempatTinggal', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Status Tempat Tinggal', options: [{ val: 4, label: 'Kost' }, { val: 3, label: 'Kontrak / Sewa' }, { val: 2, label: 'Menumpang' }, { val: 1, label: 'Milik Sendiri' }] },
    { id: 'fasilitasMck', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Fasilitas MCK', options: [{ val: 2, label: 'Umum / MCK Bersama' }, { val: 1, label: 'Milik Sendiri (Di dalam rumah)' }] },
    { id: 'sumberAirMinum', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Sumber Air Minum', options: [{ val: 2, label: 'Bukan Air Bersih (Sumur keruh, dll)' }, { val: 1, label: 'Air Bersih (PDAM, sumur bor layak)' }] },
    { id: 'jenisPenerangan', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Jenis Penerangan', options: [{ val: 3, label: 'Lampu Minyak / Non-Listrik' }, { val: 2, label: 'Listrik 450 VA (Subsidi) / Numpang' }, { val: 1, label: 'Listrik ≥ 900 VA' }] },
    { id: 'kondisiDapur', section: 'A', sectionTitle: 'Bagian A: Kondisi Rumah', label: 'Kondisi Dapur', options: [{ val: 4, label: 'Kayu Bakar / Arang' }, { val: 3, label: 'Minyak Tanah' }, { val: 2, label: 'Gas 3 kg LPG (Subsidi)' }, { val: 1, label: 'Gas 12 kg / Bright Gas' }] },
    { id: 'pekerjaanKepala', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Pekerjaan Kepala Rumah Tangga', options: [{ val: 3, label: 'Tidak Bekerja / Pengangguran' }, { val: 2, label: 'Petani Gurem / Nelayan / Buruh Serabutan' }, { val: 1, label: 'Karyawan / Pedagang Mandiri' }] },
    { id: 'pendidikanKepala', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Pendidikan Kepala Rumah Tangga', options: [{ val: 3, label: 'Tidak Pernah Sekolah' }, { val: 2, label: 'SD - SMP' }, { val: 1, label: 'SMA - S1' }] },
    { id: 'frekuensiMakan', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Frekuensi Makan Dalam Sehari', options: [{ val: 3, label: '1 Kali sehari' }, { val: 2, label: '2 Kali sehari' }, { val: 1, label: '3 Kali sehari' }] },
    { id: 'kemampuanLauk', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Kemampuan Beli Lauk Bergizi (Mingguan)', options: [{ val: 3, label: '1 Kali seminggu (atau tidak pernah)' }, { val: 2, label: '2 Kali seminggu' }, { val: 1, label: '≥ 3 Kali seminggu' }] },
    { id: 'kemampuanPakaian', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Kemampuan Beli Pakaian Baru', options: [{ val: 3, label: '1 Kali setahun (hanya sumbangan)' }, { val: 2, label: '2 Kali setahun' }, { val: 1, label: '≥ 3 Kali setahun' }] },
    { id: 'asumsiBantuan', section: 'B', sectionTitle: 'Bagian B: Kondisi Ekonomi', label: 'Asumsi Subsidi / Bantuan Lain', options: [{ val: 4, label: 'Tidak Ada bantuan sama sekali' }, { val: 3, label: 'Ada sumbangan rutin < Rp 50.000/bulan' }, { val: 2, label: 'Ada bantuan dari kerabat > Rp 100.000/bulan' }, { val: 1, label: 'Biaya hidup ditanggung anak mandiri' }] },
    { id: 'keadaanFisik', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Keadaan Fisik', options: [{ val: 4, label: 'Manula dan Sakit (Bedridden)' }, { val: 3, label: 'Manula (Sehat tapi tidak kuat kerja)' }, { val: 2, label: 'Cacat Produktif (Masih bisa aktivitas ringan)' }, { val: 1, label: 'Sehat / Produktif (Usia kerja normal)' }] },
    { id: 'tanggunganKategori', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Tanggungan Khusus', options: [{ val: 3, label: 'Anak Masih Sekolah' }, { val: 2, label: 'Keluarga Lainnya (Orang tua sakit)' }, { val: 1, label: 'Tidak Ada Tanggungan (Lajang/Mandiri)' }] },
    { id: 'hutang', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Kondisi Hutang', options: [{ val: 2, label: 'Terjerat Rentenir / Pinjaman Online' }, { val: 1, label: 'Non Rentenir / Bank Ringan / Tidak Ada' }] },
    { id: 'kesehatan', section: 'C', sectionTitle: 'Bagian C: Kondisi Fisik & Tanggungan', label: 'Kemampuan Penuhi Kebutuhan Kesehatan', options: [{ val: 2, label: 'Tidak Ada Kemampuan (Tidak punya BPJS KIS/PBI)' }, { val: 1, label: 'Ada Kemampuan (BPJS Mandiri / Bayar sendiri)' }] }
  ];

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState<Record<string, any>>({
    // Bagian A
    luasBangunan: 0,
    jenisLantai: 0,
    jenisDinding: 0,
    statusTempatTinggal: 0,
    fasilitasMck: 0,
    sumberAirMinum: 0,
    jenisPenerangan: 0,
    kondisiDapur: 0,
    aset: [] as number[],
    // Bagian B
    pendidikanKepala: 0,
    pekerjaanKepala: 0,
    pendapatanTotal: '',
    jumlahTanggungan: '',
    frekuensiMakan: 0,
    kemampuanLauk: 0,
    kemampuanPakaian: 0,
    asumsiBantuan: 0,
    // Bagian C
    keadaanFisik: 0,
    tanggunganKategori: 0,
    hutang: 0,
    kesehatan: 0,
    // Catatan
    catatanLapangan: '',
    // Form Lembaga
    berbadanHukum: '',
    usiaBerdiri: '',
    bidangGarapan: '',
    daerahJangkauan: '',
    layakJenisKegiatan: '',
    layakJumlahPenerima: '',
    fotoRumahDepan: '',
    fotoRumahDalam: '',
    fotoMustahik: '',
    fotoKondisiUsaha: '',
    fotoProdukBantuan: '',
    fotoDokumenLainnya: '',
  });

  const pendapatanPerKapita = useMemo(() => {
    const total = parseInt(surveyForm.pendapatanTotal?.replace(/\D/g, '') || '0') || 0;
    const tanggungan = parseInt(surveyForm.jumlahTanggungan) || 1;
    return Math.round(total / tanggungan);
  }, [surveyForm.pendapatanTotal, surveyForm.jumlahTanggungan]);

  const pendapatanScore = useMemo(() => {
    if (!surveyForm.pendapatanTotal || !surveyForm.jumlahTanggungan) return 0;
    // BPS Poverty Line + 20% for Rentan Miskin
    const rentanMiskinLimit = Math.round(bpsPovertyLine * 1.2);

    if (pendapatanPerKapita <= bpsPovertyLine) return 3;
    if (pendapatanPerKapita <= rentanMiskinLimit) return 2;
    return 1;
  }, [pendapatanPerKapita, surveyForm.pendapatanTotal, surveyForm.jumlahTanggungan, bpsPovertyLine]);

  const asetScore = useMemo(() => {
    if (!surveyForm.aset || surveyForm.aset.length === 0) return 0;
    return Math.min(...surveyForm.aset);
  }, [surveyForm.aset]);

  const isAsetRedFlag = surveyForm.aset?.includes(1) || false;

  const totalScore = useMemo(() => {
    const questions = dynamicQuestions.length > 0 ? dynamicQuestions : defaultSurveyTemplateFallback;
    let scoreSum = 0;
    questions.forEach(q => {
      const val = surveyForm[q.id];
      if (q.type === 'checkbox') {
        if (Array.isArray(val)) {
          scoreSum += val.reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0);
        }
      } else if (q.type === 'text') {
        // Text inputs do not add to total score
      } else {
        scoreSum += Number(val) || 0;
      }
    });
    scoreSum += asetScore;
    scoreSum += pendapatanScore;
    return scoreSum;
  }, [surveyForm, asetScore, pendapatanScore, dynamicQuestions]);

  const urgencyLevel = useMemo(() => {
    if (totalScore > 45) return 'Sangat Kritis';
    if (totalScore >= 30) return 'Tinggi';
    return 'Rendah';
  }, [totalScore]);


  const getProgramTipe = (task: ProposalMemo) => {
    const code = task.programCode;
    if (!code) return 'Konsumtif';
    const cleanCode = code.trim();
    if (programTipeMap[cleanCode]) return programTipeMap[cleanCode];
    const parts = cleanCode.split('.');
    if (parts.length > 2) {
      const parentCode = `${parts[0]}.${parts[1]}`;
      if (programTipeMap[parentCode]) return programTipeMap[parentCode];
    }
    
    // Fallback 1: Code-based check (Pilar 4 / Ekonomi is Produktif)
    if (cleanCode.startsWith('24') || cleanCode.startsWith('14') || cleanCode.startsWith('2401') || cleanCode.startsWith('1401')) {
      return 'Produktif';
    }
    
    // Fallback 2: Name-based check
    const name = task.jenisPermohonan ? task.jenisPermohonan.toLowerCase() : '';
    const productiveKeywords = [
      'ekonomi', 'usaha', 'produktif', 'dagang', 'modal', 'kewirausahaan', 
      'gerobak', 'ternak', 'tani', 'alat kerja', 'pemberdayaan', 'microfinance'
    ];
    
    if (productiveKeywords.some(keyword => name.includes(keyword))) {
      return 'Produktif';
    }
    
    return 'Konsumtif';
  };

  const baseTasks = useMemo(() => {
    return data.filter(item => {
      if (item.status !== 'Survei Assessment' && item.status !== 'Proses Disposisi') return false;

      const permohonanCode = item.programCode || '';
      const isMonevTask = permohonanCode.startsWith('2101') || permohonanCode.startsWith('2103');

      if (user?.role === 'Tim_Monev') {
        return isMonevTask;
      }
      if (user?.role === 'Relawan' || user?.role === 'Relawan_Sementara') {
        return !isMonevTask;
      }
      return true;
    });
  }, [data, user?.role]);

  const availableTasks = useMemo(() => baseTasks.filter(t => !t.surveyorName), [baseTasks]);
  const myTasks = useMemo(() => baseTasks.filter(t => t.surveyorName === user?.name), [baseTasks, user]);

  const historyTasks = useMemo(() => {
    return data.filter(item => item.surveyorName === user?.name && item.status === 'Survei Selesai');
  }, [data, user]);

  // Cek apakah masih dalam 24 jam untuk edit
  const isEditable = (task: ProposalMemo): boolean => {
    if (!task.surveySubmittedAt) return false;
    const submitted = new Date(task.surveySubmittedAt);
    const now = new Date();
    const diffHours = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const getRemainingEditTime = (task: ProposalMemo): string => {
    if (!task.surveySubmittedAt) return '';
    const submitted = new Date(task.surveySubmittedAt);
    const deadline = new Date(submitted.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return '';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  const displayedTasks = useMemo(() => {
    let tasks = activeTab === 'tersedia' ? availableTasks : myTasks;
    if (searchQuery.trim()) {
      tasks = tasks.filter(t =>
        t.namaPemohon.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.kecamatan?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return tasks;
  }, [activeTab, availableTasks, myTasks, searchQuery]);

  const handleClaimTask = async (task: ProposalMemo) => {
    try {
      const surveyorName = user?.name || 'Relawan';
      const updatedSurveyData = {
        ...(task.survey_data || {}),
        surveyClaimedAt: new Date().toISOString()
      } as any;
      await axios.put(`/api/proposals/${task.id}`, {
        surveyorName,
        survey_data: updatedSurveyData
      });
      const updated = data.map(d => d.id === task.id ? { ...d, surveyorName, survey_data: updatedSurveyData } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, surveyorName, survey_data: updatedSurveyData });
      setActiveTab('tugasSaya');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengambil tugas survei. Tolong REFRESH halaman ini terlebih dahulu (Cmd+R / Ctrl+R) ya!');
    }
  };

  const handleStartSurvey = async (task: ProposalMemo) => {
    try {
      await axios.put(`/api/proposals/${task.id}`, {
        isBeingSurveyed: true
      });
      const updated = data.map(d => d.id === task.id ? { ...d, isBeingSurveyed: true } : d);
      onUpdate(updated);
      setSelectedTask({ ...task, isBeingSurveyed: true });
    } catch (err: any) {
      console.error(err);
      alert('Gagal memulai survei. Tolong REFRESH halaman ini terlebih dahulu ya!');
    }
  };

  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const isLembagaSubmit = selectedTask.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedTask.jenisPengajuan?.toLowerCase().includes('kelompok');

    if (!isLembagaSubmit && totalScore === 0) {
      alert("Harap isi setidaknya satu pertanyaan survei.");
      return;
    }

    // Mandatory fields validation
    const requiredKeys = ['fotoRumahDepan', 'fotoRumahDalam', 'fotoMustahik'];
    const getFieldDisplayLabel = (key: string) => {
      switch (key) {
        case 'fotoRumahDepan': return 'Foto Rumah Tampak Depan';
        case 'fotoRumahDalam': return 'Foto Rumah Tampak Dalam';
        case 'fotoMustahik': return 'Foto Mustahik';
        case 'fotoKondisiUsaha': return 'Foto Kondisi Usaha';
        case 'fotoProdukBantuan': return 'Foto Produk/Bantuan yang Diajukan';
        default: return key;
      }
    };

    const errors: string[] = [];
    for (const key of requiredKeys) {
      const mode = photoInputModes[key] || 'file';
      const hasFile = !!surveyPhotoFiles[key];
      const hasLink = !!surveyForm[key]?.trim();
      const hasExistingLink = !!selectedTask.survey_data?.[key];
      if (mode === 'file' && !hasFile && !hasExistingLink) {
        errors.push(`${getFieldDisplayLabel(key)} wajib diupload.`);
      } else if (mode === 'link' && !hasLink) {
        errors.push(`${getFieldDisplayLabel(key)} wajib diisi link-nya.`);
      }
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('status', 'Survei_Selesai');
      formData.append('urgencyLevel', urgencyLevel);
      formData.append('score', totalScore.toString());

      // Prepare final surveyForm data
      const finalSurveyForm = { ...surveyForm };
      
      const fileKeys = ['fotoRumahDepan', 'fotoRumahDalam', 'fotoMustahik', 'fotoKondisiUsaha', 'fotoProdukBantuan', 'fotoDokumenLainnya'];
      for (const key of fileKeys) {
        const mode = photoInputModes[key];
        if (mode === 'file') {
          const fileObj = surveyPhotoFiles[key];
          if (fileObj) {
            finalSurveyForm[key] = ''; // Will be populated by the backend GDrive link
            formData.append(key, fileObj);
          } else {
            // Keep old link if not overwritten
            finalSurveyForm[key] = selectedTask.survey_data?.[key] || '';
          }
        } else {
          // tab mode link: keep link value already in surveyForm
        }
      }

      formData.append('survey_data', JSON.stringify(finalSurveyForm));

      const response = await axios.put(`/api/proposals/${selectedTask.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const now = new Date().toISOString();
      const updatedSurveyData = response.data.survey_data || finalSurveyForm;

      const updated = data.map(d => d.id === selectedTask.id ? {
        ...d,
        status: 'Survei Selesai' as const,
        urgencyLevel: urgencyLevel as any,
        score: totalScore,
        surveySubmittedAt: now,
        survey_data: updatedSurveyData
      } : d);
      onUpdate(updated);

      // Reset edit mode
      setEditingHistory(null);
      setViewMode('list');
      setSelectedTask(null);
      setBottomNav('riwayat'); // Langsung buka riwayat setelah submit
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim hasil survei');
    }
  };

  const handleEditHistory = (task: ProposalMemo) => {
    // Pre-populate form dengan jawaban yang sudah ada
    if (task.survey_data) {
      setSurveyForm({
        luasBangunan: task.survey_data.luasBangunan ?? 0,
        jenisLantai: task.survey_data.jenisLantai ?? 0,
        jenisDinding: task.survey_data.jenisDinding ?? 0,
        statusTempatTinggal: task.survey_data.statusTempatTinggal ?? 0,
        fasilitasMck: task.survey_data.fasilitasMck ?? 0,
        sumberAirMinum: task.survey_data.sumberAirMinum ?? 0,
        jenisPenerangan: task.survey_data.jenisPenerangan ?? 0,
        kondisiDapur: task.survey_data.kondisiDapur ?? 0,
        aset: Array.isArray(task.survey_data.aset) ? task.survey_data.aset : [],
        pendidikanKepala: task.survey_data.pendidikanKepala ?? 0,
        pekerjaanKepala: task.survey_data.pekerjaanKepala ?? 0,
        pendapatanTotal: task.survey_data.pendapatanTotal ?? '',
        jumlahTanggungan: task.survey_data.jumlahTanggungan ?? '',
        frekuensiMakan: task.survey_data.frekuensiMakan ?? 0,
        kemampuanLauk: task.survey_data.kemampuanLauk ?? 0,
        kemampuanPakaian: task.survey_data.kemampuanPakaian ?? 0,
        asumsiBantuan: task.survey_data.asumsiBantuan ?? 0,
        keadaanFisik: task.survey_data.keadaanFisik ?? 0,
        tanggunganKategori: task.survey_data.tanggunganKategori ?? 0,
        hutang: task.survey_data.hutang ?? 0,
        kesehatan: task.survey_data.kesehatan ?? 0,
        catatanLapangan: task.survey_data.catatanLapangan ?? '',
        berbadanHukum: task.survey_data.berbadanHukum ?? '',
        usiaBerdiri: task.survey_data.usiaBerdiri ?? '',
        bidangGarapan: task.survey_data.bidangGarapan ?? '',
        daerahJangkauan: task.survey_data.daerahJangkauan ?? '',
        layakJenisKegiatan: task.survey_data.layakJenisKegiatan ?? '',
        layakJumlahPenerima: task.survey_data.layakJumlahPenerima ?? '',
        fotoRumahDepan: task.survey_data.fotoRumahDepan ?? '',
        fotoRumahDalam: task.survey_data.fotoRumahDalam ?? '',
        fotoMustahik: task.survey_data.fotoMustahik ?? '',
        fotoKondisiUsaha: task.survey_data.fotoKondisiUsaha ?? '',
        fotoProdukBantuan: task.survey_data.fotoProdukBantuan ?? '',
        fotoDokumenLainnya: task.survey_data.fotoDokumenLainnya ?? '',
      });

      const fields = ['fotoRumahDepan', 'fotoRumahDalam', 'fotoMustahik', 'fotoKondisiUsaha', 'fotoProdukBantuan', 'fotoDokumenLainnya'];
      const newModes = { ...photoInputModes };
      fields.forEach(f => {
        if (task.survey_data?.[f]) {
          newModes[f] = 'link';
        } else {
          newModes[f] = 'file';
        }
      });
      setPhotoInputModes(newModes);
    }

    setSurveyPhotoFiles({
      fotoRumahDepan: null,
      fotoRumahDalam: null,
      fotoMustahik: null,
      fotoKondisiUsaha: null,
      fotoProdukBantuan: null,
      fotoDokumenLainnya: null,
    });
    setPhotoPreviewUrls({
      fotoRumahDepan: null,
      fotoRumahDalam: null,
      fotoMustahik: null,
      fotoKondisiUsaha: null,
      fotoProdukBantuan: null,
      fotoDokumenLainnya: null,
    });

    setEditingHistory(task);
    setSelectedTask(task);
    setViewMode('surveyForm');
  };

  const toggleAset = (val: number) => {
    setSurveyForm(prev => {
      const aset = prev.aset.includes(val)
        ? prev.aset.filter((a: number) => a !== val)
        : [...prev.aset, val];
      return { ...prev, aset };
    });
  };

  const toggleCheckboxQuestion = (questionId: string, val: number) => {
    setSurveyForm(prev => {
      const currentList = prev[questionId] || [];
      const updatedList = currentList.includes(val)
        ? currentList.filter((v: number) => v !== val)
        : [...currentList, val];
      return { ...prev, [questionId]: updatedList };
    });
  };

  const renderCheckbox = (q: any, editMode = false) => {
    const selectedValues = surveyForm[q.id] || [];
    return (
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{q.label}</label>
        <div className="space-y-2">
          {q.options?.map((opt: any) => {
            const isSelected = selectedValues.includes(opt.val);
            return (
              <label key={opt.val} className={cn(
                "flex items-start p-3 border rounded-xl cursor-pointer transition-all",
                isSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              )}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCheckboxQuestion(q.id, opt.val)}
                  disabled={editMode}
                  className="mt-0.5 mr-3 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700 leading-snug">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const renderText = (q: any, editMode = false) => {
    return (
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{q.label}</label>
        <textarea
          value={surveyForm[q.id] || ''}
          onChange={(e) => setSurveyForm(prev => ({ ...prev, [q.id]: e.target.value }))}
          disabled={editMode}
          rows={3}
          placeholder="Tuliskan isian detail di sini..."
          className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-primary focus:border-primary outline-none resize-none leading-relaxed transition-all"
        />
      </div>
    );
  };

  const renderRadio = (name: string, label: string, options: { val: number, label: string }[], editMode = false) => (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="space-y-2">
        {options.map(opt => {
          const isSelected = surveyForm[name] === opt.val;
          return (
            <label key={opt.val} className={cn(
              "flex items-center p-3 border rounded-xl cursor-pointer transition-all",
              isSelected
                ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                : "bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200"
            )}>
              <input
                type="radio"
                name={name}
                value={opt.val}
                checked={isSelected}
                onChange={() => setSurveyForm(prev => ({ ...prev, [name]: opt.val }))}
                className="mr-3 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                required={!editMode && !isSelected ? true : undefined}
              />
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-emerald-800 font-bold" : "text-slate-700"
              )}>{opt.label}</span>
              {isSelected && <span className="ml-auto text-emerald-500 text-xs font-black">✓</span>}
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderQuestionField = (q: any, editMode = false) => {
    if (q.type === 'checkbox') {
      return renderCheckbox(q, editMode);
    }
    if (q.type === 'text') {
      return renderText(q, editMode);
    }
    return renderRadio(q.id, q.label, q.options || [], editMode);
  };

  const formatRupiah = (val: string) => {
    const numberStr = val.replace(/\D/g, '');
    if (!numberStr) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseInt(numberStr));
  };

  const handlePendapatanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setSurveyForm(prev => ({ ...prev, pendapatanTotal: val }));
  };

  const userNameFirstWord = user?.name?.split(' ')[0] || 'Relawan';

  const renderPhotoSlot = (key: string, label: string, isRequired: boolean) => {
    const mode = photoInputModes[key] || 'file';
    const file = surveyPhotoFiles[key];
    const previewUrl = photoPreviewUrls[key];
    const existingUrl = selectedTask?.survey_data?.[key];

    const setMode = (m: 'file' | 'link') => {
      setPhotoInputModes(prev => ({ ...prev, [key]: m }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      if (f) {
        if (f.size > 5 * 1024 * 1024) {
          alert('Ukuran file melebihi batas 5MB. Harap kompres atau pilih file yang lebih kecil.');
          e.target.value = '';
          return;
        }
        setSurveyPhotoFiles(prev => ({ ...prev, [key]: f }));
        const url = URL.createObjectURL(f);
        setPhotoPreviewUrls(prev => ({ ...prev, [key]: url }));
      }
    };

    const handleRemoveFile = () => {
      setSurveyPhotoFiles(prev => ({ ...prev, [key]: null }));
      setPhotoPreviewUrls(prev => ({ ...prev, [key]: null }));
    };

    return (
      <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60" key={key}>
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
            {label} {isRequired && <span className="text-rose-500 font-bold">*</span>}
          </label>
          
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1",
                mode === 'file' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Upload className="size-3" />
              File
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1",
                mode === 'link' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Link className="size-3" />
              Link
            </button>
          </div>
        </div>

        {mode === 'file' ? (
          <div className="space-y-2">
            <div 
              onClick={() => document.getElementById(`file-input-${key}`)?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-white/70 hover:bg-emerald-50/5 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1 min-h-[90px]"
            >
              {file ? (
                <div className="flex flex-col items-center gap-0.5">
                  <FileText className="size-6 text-emerald-600" />
                  <p className="text-[11px] font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-[9px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : existingUrl && !existingUrl.startsWith('blob:') && !existingUrl.startsWith('data:') ? (
                <div className="flex flex-col items-center gap-0.5">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                  <p className="text-[11px] font-bold text-slate-800">Foto sudah terupload</p>
                  <a 
                    href={existingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] text-emerald-600 hover:underline font-bold flex items-center gap-0.5 mt-0.5"
                  >
                    Lihat File Saat Ini <ExternalLink className="size-2.5" />
                  </a>
                </div>
              ) : (
                <>
                  <Upload className="size-6 text-slate-300" />
                  <p className="text-[11px] font-bold text-slate-500">Klik untuk pilih file</p>
                  <p className="text-[9px] text-slate-400">PDF, JPG, PNG (maks. 5MB)</p>
                </>
              )}
            </div>
            
            <input
              id={`file-input-${key}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />

            {previewUrl && file && file.type.startsWith('image/') && (
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                <img 
                  src={previewUrl} 
                  alt={`${label} Preview`} 
                  className="w-full max-h-36 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded hover:bg-rose-700 transition-all shadow-md"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            
            {file && !file.type.startsWith('image/') && (
              <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-4 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none transition-all font-medium"
                value={surveyForm[key] || ''}
                onChange={e => setSurveyForm(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
            <p className="text-[9px] text-slate-400">
              Pastikan link di Google Drive sudah "Anyone with link can view".
            </p>
            
            {surveyForm[key] && toGDriveEmbedUrl(surveyForm[key]) && (
              <div className="mt-2 w-full h-[120px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <iframe
                  src={toGDriveEmbedUrl(surveyForm[key])!}
                  className="w-full h-full border-none"
                  allow="autoplay"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (viewMode === 'detail' && selectedTask) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
        <div className="bg-emerald-600 pt-12 pb-6 px-6 text-white rounded-b-3xl shrink-0 shadow-lg relative z-10">
          <button
            onClick={() => setViewMode('list')}
            className="mb-4 flex items-center gap-2 text-emerald-50 bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition shadow-sm backdrop-blur-sm w-fit font-bold text-sm"
          >
            <ChevronLeft className="size-4" /> Kembali
          </button>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Target Survei</p>
              <h2 className="text-2xl font-black">{selectedTask.namaPemohon}</h2>
              <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1 font-bold">
                <FileText className="size-3" /> {selectedTask.jenisPermohonan}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {selectedTask.survey_data?.surveyClaimedAt && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informasi Batas Waktu</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Diambil</p>
                  <p className="font-extrabold text-slate-700">
                    {new Date(selectedTask.survey_data.surveyClaimedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  {(() => {
                    const dl = getSurveyDeadlineInfo(selectedTask.survey_data.surveyClaimedAt);
                    if (!dl) return null;
                    return (
                      <>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tenggat Waktu</p>
                        <p className={cn("font-black", dl.isExpired ? "text-rose-600 animate-pulse" : "text-amber-600")}>
                          {dl.remainingText} (s.d. {new Date(new Date(selectedTask.survey_data.surveyClaimedAt).getTime() + 3*24*60*60*1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })})
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Lokasi Tujuan</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <MapPin className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-snug">{selectedTask.alamat}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">{selectedTask.kelurahan}, {selectedTask.kecamatan}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Kontak Darurat</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Phone className="size-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedTask.noTelpon || 'Tidak ada nomor'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pemohon Utama</p>
                </div>
              </div>
            </div>
          </div>

          {selectedTask.fileGdriveLink && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dokumen Proposal</h3>
                <a href={selectedTask.fileGdriveLink} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black text-emerald-600 hover:underline flex items-center gap-1">
                  Buka di Drive <ExternalLink className="size-3" />
                </a>
              </div>
              <iframe
                src={selectedTask.fileGdriveLink.replace(/\/view.*?(\?|$)/, '/preview$1')}
                className="w-full h-64 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
                allow="autoplay"
              />
            </div>
          )}
        </div>

        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none flex flex-col justify-end">
          <div className="p-6 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-auto">
            {!selectedTask.surveyorName ? (
              <button
                onClick={() => handleClaimTask(selectedTask)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download className="size-5" /> Ambil Tugas Ini
              </button>
            ) : !selectedTask.isBeingSurveyed ? (
              <button
                onClick={() => handleStartSurvey(selectedTask)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Navigation className="size-5" /> Mulai Perjalanan
              </button>
            ) : (
              <button
                onClick={() => setViewMode('surveyForm')}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl text-base font-black shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Camera className="size-5" /> Mulai Asessment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'surveyForm' && selectedTask) {
    const isEditMode = !!editingHistory;
    const isLembaga = selectedTask.jenisPengajuan?.toLowerCase().includes('lembaga') || selectedTask.jenisPengajuan?.toLowerCase().includes('kelompok');

    return (
      <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col relative shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 shrink-0">
          <button
            onClick={() => {
              if (isEditMode) {
                // Kembali ke riwayat saat edit mode
                setEditingHistory(null);
                setSelectedTask(null);
                setViewMode('list');
                setBottomNav('riwayat');
              } else {
                setViewMode('detail');
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="size-5 text-slate-400" />
          </button>
          <div className="text-center">
            <h3 className="font-black text-slate-800">
              {isEditMode ? 'Edit Hasil Survei' : 'Formulir Asessment'}
            </h3>
            {isEditMode && (
              <p className="text-[10px] text-amber-600 font-bold">Mode Edit Aktif</p>
            )}
          </div>
          {!isLembaga && (
            <div className="size-9 font-bold text-emerald-600 flex items-center justify-center">{totalScore}</div>
          )}
        </div>

        <form id="survey-form" onSubmit={handleSubmitSurvey} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">

          {isLembaga ? (
            <div className="space-y-6">
              {/* BAGIAN A: PROFIL LEMBAGA */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian A: Profil Lembaga</h4>
                {(dynamicQuestions.length > 0 ? dynamicQuestions : defaultLembagaSurveyTemplateFallback)
                  .filter(q => q.section === 'A')
                  .map(q => renderQuestionField(q, isEditMode))
                }
              </div>

              {/* BAGIAN B: KELAYAKAN */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian B: Kelayakan</h4>
                {(dynamicQuestions.length > 0 ? dynamicQuestions : defaultLembagaSurveyTemplateFallback)
                  .filter(q => q.section === 'B')
                  .map(q => renderQuestionField(q, isEditMode))
                }

                <div className="space-y-3 pt-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Catatan Lapangan Tambahan (Opsional)</label>
                  <textarea
                    rows={3}
                    value={surveyForm.catatanLapangan}
                    onChange={e => setSurveyForm(prev => ({ ...prev, catatanLapangan: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                    placeholder="Observasi unik di lapangan yang tidak tercakup dalam form..."
                  ></textarea>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* BAGIAN A: KONDISI RUMAH */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian A: Kondisi Rumah</h4>
                {(dynamicQuestions.length > 0 ? dynamicQuestions : defaultSurveyTemplateFallback)
                  .filter(q => q.section === 'A')
                  .map(q => renderQuestionField(q, isEditMode))
                }

                {/* KEPEMILIKAN ASET (MULTI-SELECT) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    Kepemilikan Aset (Pilih semua yang sesuai)
                  </label>
                  {isAsetRedFlag && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-bold flex items-start gap-2 animate-pulse">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      Peringatan: Mustahik memiliki aset bernilai tinggi (Skor 1). Pertimbangkan kelayakan pemberian bantuan secara lebih ketat!
                    </div>
                  )}
                  <div className="space-y-2">
                    {[
                      { val: 1, label: 'Mobil Pribadi / >2 Motor Baru / HP Flagship / Tabungan > 5Jt / Tanah Kosong' },
                      { val: 2, label: '1-2 Motor Bekas / HP Murah / Tabungan < 1Jt' },
                      { val: 3, label: 'Tidak punya motor / Tidak punya HP / Tidak ada tabungan' }
                    ].map(opt => (
                      <label key={opt.val} className={cn(
                        "flex items-start p-3 border rounded-xl cursor-pointer transition-all",
                        surveyForm.aset?.includes(opt.val)
                          ? (opt.val === 1 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300')
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      )}>
                        <input
                          type="checkbox"
                          checked={surveyForm.aset?.includes(opt.val) || false}
                          onChange={() => toggleAset(opt.val)}
                          className={cn(
                            "mt-0.5 mr-3 w-4 h-4 rounded",
                            opt.val === 1 ? "text-rose-600 focus:ring-rose-500" : "text-emerald-600 focus:ring-emerald-500"
                          )}
                        />
                        <span className="text-sm font-medium text-slate-700 leading-snug">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* BAGIAN B: KONDISI EKONOMI */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian B: Kondisi Ekonomi</h4>
                {(dynamicQuestions.length > 0 ? dynamicQuestions : defaultSurveyTemplateFallback)
                  .filter(q => q.section === 'B')
                  .map(q => renderQuestionField(q, isEditMode))
                }

                {/* PENDAPATAN & TANGGUNGAN */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total Pendapatan (Per Bulan)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                      <input
                        type="text"
                        required
                        value={surveyForm.pendapatanTotal ? formatRupiah(surveyForm.pendapatanTotal).replace('Rp', '').trim() : ''}
                        onChange={handlePendapatanChange}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: 1.500.000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Jumlah Tanggungan (Orang)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={surveyForm.jumlahTanggungan || ''}
                      onChange={e => setSurveyForm(prev => ({ ...prev, jumlahTanggungan: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Jumlah orang yang ditanggung"
                    />
                  </div>

                  {/* Auto Kalkulasi Income */}
                  {surveyForm.pendapatanTotal && surveyForm.jumlahTanggungan && (
                    <div className={cn(
                      "p-3 rounded-xl border flex items-start gap-2 mt-2",
                      pendapatanScore === 3 ? "bg-rose-50 border-rose-200 text-rose-800" :
                        pendapatanScore === 2 ? "bg-amber-50 border-amber-200 text-amber-800" :
                          "bg-emerald-50 border-emerald-200 text-emerald-800"
                    )}>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Pendapatan Per Kapita</p>
                        <p className="text-sm font-bold">{formatRupiah(pendapatanPerKapita.toString())} / orang</p>
                        <p className="text-xs mt-1 font-medium">
                          {pendapatanScore === 3 && "(Di Bawah Garis Kemiskinan)"}
                          {pendapatanScore === 2 && "(Rentan Miskin / Tepat di Garis)"}
                          {pendapatanScore === 1 && "(Mandiri / Di Atas Garis Kemiskinan)"}
                        </p>
                      </div>
                      <div className="text-xl font-black opacity-50 text-right">
                        +{pendapatanScore}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BAGIAN C: FISIK & TANGGUNGAN */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Bagian C: Kondisi Fisik & Tanggungan</h4>
                {(dynamicQuestions.length > 0 ? dynamicQuestions : defaultSurveyTemplateFallback)
                  .filter(q => q.section === 'C')
                  .map(q => renderQuestionField(q, isEditMode))
                }
              </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2">Hasil Evaluasi Akhir</h4>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-600">Total Skor:</span>
                <span className="text-2xl font-black text-emerald-600">{totalScore} Poin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Level Urgensi:</span>
                <span className={cn(
                  "text-sm font-black uppercase px-3 py-1 rounded-full",
                  urgencyLevel === 'Sangat Kritis' ? "bg-rose-100 text-rose-700" :
                    urgencyLevel === 'Tinggi' ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                )}>{urgencyLevel}</span>
              </div>
            </div>

            {!isLembaga && (
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Catatan Lapangan Tambahan (Opsional)</label>
                <textarea
                  rows={3}
                  value={surveyForm.catatanLapangan}
                  onChange={e => setSurveyForm(prev => ({ ...prev, catatanLapangan: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                  placeholder="Observasi unik di lapangan yang tidak tercakup dalam form..."
                ></textarea>
              </div>
            )}
          </div>
            </>
          )}

          {/* BAGIAN D: BUKTI DOKUMENTASI */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h4 className="text-lg font-black text-emerald-700 border-b pb-2 flex items-center gap-2">
              <Camera className="size-5 text-emerald-600" /> Bagian D: Bukti Dokumentasi
            </h4>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Unggah bukti foto survei di bawah ini. Rumah Tampak Depan, Rumah Tampak Dalam, dan Foto Mustahik wajib diisi. Untuk program Produktif, terdapat tambahan foto Kondisi Usaha dan Produk/Bantuan (opsional/add-on).
            </p>

            <div className="space-y-4">
              {renderPhotoSlot('fotoRumahDepan', 'Foto Rumah Tampak Depan', true)}
              {renderPhotoSlot('fotoRumahDalam', 'Foto Rumah Tampak Dalam', true)}
              {renderPhotoSlot('fotoMustahik', 'Foto Mustahik', true)}
              
              {getProgramTipe(selectedTask) === 'Produktif' && (
                <>
                  {renderPhotoSlot('fotoKondisiUsaha', 'Foto Kondisi Usaha (Produktif Add-on)', false)}
                  {renderPhotoSlot('fotoProdukBantuan', 'Foto Produk/Bantuan yang Diajukan (Produktif Add-on)', false)}
                </>
              )}
              
              {renderPhotoSlot('fotoDokumenLainnya', 'Foto/Dokumen Pendukung Lainnya (Add-on)', false)}
            </div>
          </div>
        </form>

        <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0 left-0 right-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-20">
          <button
            type="submit"
            form="survey-form"
            className={cn(
              "w-full py-4 text-white rounded-2xl text-base font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all",
              editingHistory
                ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
            )}
          >
            {editingHistory ? <FileEdit className="size-5" /> : <Send className="size-5" />}
            {editingHistory ? 'Perbarui Hasil Survei' : 'Simpan Hasil Survei'}
          </button>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-slate-50 h-screen flex flex-col relative shadow-xl overflow-hidden pb-16">
      {/* Top App Bar */}
      <div className="flex justify-center items-center px-6 py-4 bg-white z-20 shrink-0">
        <h1 className="text-emerald-600 font-extrabold text-xl tracking-tight">BAZNAS Survei</h1>
      </div>

      {bottomNav === 'home' ? (
        <>
          <div className="px-6 pt-4 pb-4 bg-white shrink-0">
            <h2 className="text-[28px] font-black text-slate-900 leading-tight">Hallo, {userNameFirstWord}!</h2>
            <p className="text-slate-500 font-medium">Siap survei hari ini?</p>
          </div>

          <div className="flex px-4 border-b border-slate-200 bg-white shrink-0">
            <button
              onClick={() => setActiveTab('tersedia')}
              className={cn(
                "flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors",
                activeTab === 'tersedia' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              Tugas Tersedia
            </button>
            <button
              onClick={() => setActiveTab('tugasSaya')}
              className={cn(
                "flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors",
                activeTab === 'tugasSaya' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              Tugas Saya ({myTasks.length})
            </button>
          </div>
        </>
      ) : (
        <div className="px-6 pt-4 pb-4 bg-emerald-600 shrink-0 text-white">
          <h2 className="text-[28px] font-black leading-tight">Riwayat Tugas</h2>
          <p className="font-medium text-emerald-100">Evaluasi survei yang pernah kamu lakukan.</p>
        </div>
      )}

      {/* Content Area with Search & Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="p-4 relative sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 px-5">
          <div className="bg-white rounded-xl border border-slate-200 flex items-center px-4 py-3.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <Search className="size-5 text-emerald-500/70 mr-3" />
            <input
              placeholder="Cari nama / wilayah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium bg-transparent"
            />
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4 shadow-inner min-h-full">
          {bottomNav === 'riwayat' && historyTasks.length === 0 ? (
            <div className="pt-12 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <History className="size-16 opacity-20" />
              <p className="text-sm font-medium">Belum ada riwayat survei yang selesai.</p>
            </div>
          ) : bottomNav === 'riwayat' && historyTasks.length > 0 ? (
            historyTasks.map((task) => {
              const editable = isEditable(task);
              const remaining = getRemainingEditTime(task);
              const urgencyColor =
                task.urgencyLevel === 'Sangat Kritis' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  task.urgencyLevel === 'Tinggi' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-700';
              return (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                      NO AGENDA {task.agendaNo}
                    </div>
                    <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Survei Selesai
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-4">
                    <MapPin className="size-3" />
                    <span className="text-xs font-semibold">Kec. {task.kecamatan}</span>
                  </div>
                  <div className={cn("border rounded-xl p-3 mb-4", urgencyColor)}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Hasil Evaluasi</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black">{task.urgencyLevel || '-'}</p>
                      <span className="text-lg font-black opacity-70">{task.score || 0} Poin</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {task.surveySubmittedAt
                        ? <>Dikirim {new Date(task.surveySubmittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                        : 'Waktu tidak tersedia'}
                    </div>
                    {editable ? (
                      <button
                        onClick={() => handleEditHistory(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition active:scale-95"
                      >
                        <FileEdit className="size-3" /> EDIT ({remaining})
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold">Edit berakhir</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <AnimatePresence>
              {displayedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer block",
                    task.isBeingSurveyed ? "border-amber-400/50 bg-amber-50/30" : "border-slate-100 hover:border-emerald-600/30"
                  )}
                >
                  <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                    <div className="flex flex-wrap gap-1.5">
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                        NO AGENDA {task.agendaNo}
                      </div>
                      {(() => {
                        const tipe = getProgramTipe(task);
                        const isProduktif = tipe === 'Produktif';
                        return (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            isProduktif 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          )}>
                            {tipe}
                          </span>
                        );
                      })()}
                    </div>
                    <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                      <MapPin className="size-3" /> Lokasi
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{task.namaPemohon}</h3>

                  <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                    <Map className="size-[14px]" />
                    <span className="text-xs font-semibold">Kec. {task.kecamatan}</span>
                  </div>

                  <div className="bg-slate-50 border-l-[3px] border-l-emerald-600 rounded-r-lg p-3 mb-4 pl-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Program & Jenis</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{task.jenisPermohonan || 'Pendistribusian Zakat'}</p>
                  </div>

                  {(task.survey_data as any)?.surveyClaimedAt && (
                    <div className="mb-4 text-xs p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                      {(() => {
                        const dl = getSurveyDeadlineInfo((task.survey_data as any).surveyClaimedAt);
                        if (!dl) return null;
                        return (
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sisa Waktu Pengerjaan</span>
                            <span className={cn("font-extrabold", dl.isExpired ? "text-rose-600 animate-pulse font-black" : "text-amber-600")}>
                              {dl.remainingText}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setViewMode('detail');
                      }}
                      className="flex-1 max-w-[120px] py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                      <Eye className="size-[14px]" /> DETAIL
                    </button>
                    {activeTab === 'tersedia' ? (
                      <button
                        onClick={() => handleClaimTask(task)}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                      >
                        <Download className="size-[14px]" /> AMBIL TUGAS INI
                      </button>
                    ) : !task.isBeingSurveyed ? (
                      <button
                        onClick={() => handleStartSurvey(task)}
                        className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-500/20 active:scale-[0.98]"
                      >
                        <Navigation className="size-[14px]" /> MULAI JALAN
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setViewMode('surveyForm');
                        }}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 active:scale-[0.98]"
                      >
                        <Camera className="size-[14px]" /> ISI FORMULIR
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {displayedTasks.length === 0 && (
                <div className="pt-12 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <CheckCircle2 className="size-16 opacity-20" />
                  <p className="text-sm font-medium">Tidak ada tugas yang ditemukan.</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Fixed Navigation Bar */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around py-3 pb-safe z-30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setBottomNav('home')}
          className={cn("flex flex-col items-center gap-1.5 w-20 transition-colors", bottomNav === 'home' ? "text-emerald-600" : "text-slate-300 hover:text-slate-400")}
        >
          <Home className="size-5" />
          <span className="text-[9px] font-black tracking-widest">HOME</span>
        </button>
        <button
          onClick={() => setBottomNav('riwayat')}
          className={cn("flex flex-col items-center gap-1.5 w-20 transition-colors relative", bottomNav === 'riwayat' ? "text-emerald-600" : "text-slate-300 hover:text-slate-400")}
        >
          <History className="size-5" />
          <span className="text-[9px] font-black tracking-widest">RIWAYAT</span>
          {historyTasks.length > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
              {historyTasks.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
