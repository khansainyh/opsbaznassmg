import { useState, useEffect } from 'react';
import Sidebar from '@/src/components/Sidebar';
import InputProposalMemo from '@/src/pages/InputProposalMemo';
import InputSurat, { Surat } from '@/src/pages/InputSurat';
import PilarProgram from '@/src/pages/PilarProgram';
import DataMustahik from '@/src/pages/DataMustahik';
import DataMuzakki from '@/src/pages/DataMuzakki';
import DatabaseUPZ from '@/src/pages/DatabaseUPZ';
import UserManagement from '@/src/pages/UserManagement';
import GantiPassword from '@/src/pages/GantiPassword';
import type { ProposalMemo } from '@/src/data/proposalMemoData';
import axios from 'axios';
import Login from '@/src/pages/Login';
import { useAuth } from '@/src/context/AuthContext';
import ReviewKabag from '@/src/pages/ReviewKabag';
import MonitoringTugas from '@/src/pages/MonitoringTugas';
import TimSurvei from '@/src/pages/TimSurvei';
import PersetujuanKepala from '@/src/pages/PersetujuanKepala';
import ReviewPimpinan from '@/src/pages/ReviewPimpinan';
import PenentuanNominal from '@/src/pages/PenentuanNominal';
import AntreanBantuan from '@/src/pages/AntreanBantuan';
import ExecutiveDashboard from '@/src/pages/ExecutiveDashboard';

function App() {
  const { isAuthenticated } = useAuth();
  const [activeMenu, setActiveMenu] = useState('Input Proposal');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [proposals, setProposals] = useState<ProposalMemo[]>([]);
  const [surats, setSurats] = useState<Surat[]>([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:4000/api/proposals')
      .then(res => {
        const mappedData = res.data.map((item: any) => ({
          id: item.id,
          agendaNo: item.agenda_no,
          tanggalMasuk: new Date(item.tanggal_masuk).toISOString().split('T')[0],
          namaInstansi: item.nama_instansi || '',
          pimpinanOrganisasi: item.pimpinan_organisasi || '',
          namaPemohon: item.nama_pemohon,
          namaAnak: item.nama_anak || '',
          nik: item.nik || '',
          ttl: item.ttl || '',
          alamat: item.alamat || '',
          kelurahan: item.kelurahan || '',
          kecamatan: item.kecamatan || '',
          pekerjaan: item.pekerjaan || '',
          jenisPermohonan: item.program ? item.program.name : item.jenis_permohonan,
          noTelpon: item.no_telpon || '',
          jamPengajuan: item.jam_pengajuan || '',
          yangMengajukan: item.yang_mengajukan || '',
          hasMemo: item.has_memo,
          memoSource: item.memo_source || '',
          status: item.status.replace(/_/g, ' '),
          fileGdriveLink: item.file_gdrive_link || '',
          surveyorName: item.surveyorName || undefined,
          isBeingSurveyed: item.isBeingSurveyed || false,
          urgencyLevel: item.urgencyLevel || undefined,
          score: item.score || 0,
          surveySubmittedAt: item.surveySubmittedAt || undefined,
          survey_data: item.survey_data || undefined,
          catatanKepala: item.catatanKepala || undefined,
          nominal: item.nominal,
          tipeBantuan: item.tipe_bantuan,
          alasanPerubahanNominal: item.alasan_perubahan_nominal
        }));
        setProposals(mappedData);
      })
      .catch(console.error);

    axios.get('http://127.0.0.1:4000/api/surats')
      .then(res => {
        const mappedSurats = res.data.map((item: any) => ({
          id: item.id,
          agendaNo: item.agenda_no,
          tanggalMasuk: new Date(item.tanggal_masuk).toISOString().split('T')[0],
          namaInstansi: item.nama_instansi || '',
          pimpinanOrganisasi: item.pimpinan_organisasi || '',
          alamat: item.alamat || '',
          kelurahan: item.kelurahan || '',
          kecamatan: item.kecamatan || '',
          keperluan: item.keperluan || '',
          noTelpon: item.no_telpon || '',
          jamPengajuan: item.jam_pengajuan || '',
          yangMengajukan: item.yang_mengajukan || '',
          arsip: item.arsip || '',
          status: item.status.replace(/_/g, ' '),
          fileGdriveLink: item.file_gdrive_link || ''
        }));
        setSurats(mappedSurats);
      })
      .catch(console.error);
  }, []);

  const handleUpdateProposals = (newData: ProposalMemo[]) => {
    setProposals(newData);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  // Hanya proposal berstatus Registrasi yang masuk ke tabel Input Proposal
  const registrasiProposals = proposals.filter(p => p.status === 'Registrasi');
  const registrasiSurats = surats.filter(s => s.status === 'Registrasi');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Mobile Header */}
        <header className="xl:hidden bg-white border-b border-primary/10 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">B</div>
            <span className="font-bold text-slate-900">BAZNAS HUB</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-slate-50 text-slate-600 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
        </header>

        {activeMenu === 'Executive' ? (
          <ExecutiveDashboard />
        ) : activeMenu === 'Input Proposal' ? (
          <InputProposalMemo 
            data={registrasiProposals} 
            allData={proposals}
            onUpdate={handleUpdateProposals} 
          />
        ) : activeMenu === 'Input Surat' ? (
          <InputSurat 
            data={registrasiSurats}
            allData={surats}
            onUpdate={setSurats}
          />
        ) : activeMenu === 'Persetujuan Kepala Bagian' ? (
          <ReviewKabag
            data={proposals}
            onUpdate={handleUpdateProposals}
            suratData={surats}
            onUpdateSurat={setSurats}
          />
        ) : activeMenu === 'Monitoring Tugas' ? (
          <MonitoringTugas 
            data={proposals}
            onUpdate={handleUpdateProposals}
          />
        ) : activeMenu === 'Tim Survei' ? (
          <TimSurvei
            data={proposals}
            onUpdate={handleUpdateProposals}
          />
        ) : activeMenu === 'Persetujuan Kepala Pelaksana' ? (
          <PersetujuanKepala
            data={proposals}
            onUpdate={handleUpdateProposals}
            suratData={surats}
            onUpdateSurat={setSurats}
          />
        ) : activeMenu === 'Persetujuan Pimpinan' ? (
          <ReviewPimpinan
            data={proposals}
            onUpdate={handleUpdateProposals}
            suratData={surats}
            onUpdateSurat={setSurats}
          />
        ) : activeMenu === 'Penentuan Nominal' ? (
          <PenentuanNominal
            data={proposals}
            onUpdate={handleUpdateProposals}
          />
        ) : activeMenu === 'Antrean Bantuan' ? (
          <AntreanBantuan
            data={proposals}
            onUpdate={handleUpdateProposals}
          />
        ) : activeMenu === 'Pilar & Program' ? (
          <PilarProgram />
        ) : activeMenu === 'Data Mustahik' ? (
          <DataMustahik />
        ) : activeMenu === 'Data Muzakki' ? (
          <DataMuzakki />
        ) : activeMenu === 'Database UPZ' ? (
          <DatabaseUPZ />
        ) : activeMenu === 'User Management' ? (
          <UserManagement />
        ) : activeMenu === 'Ganti Password' ? (
          <GantiPassword />
        ) : (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Modul {activeMenu}</h2>
            <p className="text-sm">Halaman ini masih dalam tahap pengembangan.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
