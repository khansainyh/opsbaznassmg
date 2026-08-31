import { Request, Response, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { uploadToDrive, formatScanFileName, createFolderInDrive } from '../utils/gdrive';
import path from 'path';
import { formatDisbursementKeterangan } from '../utils/formatDisbursement';

export const getProposals = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const isPaginated = req.query.paginate === 'true' || req.query.page !== undefined;

    if (!isPaginated && req.query.all === 'true') {
      const proposals = await prisma.proposal.findMany({
        include: { program: true, mustahik: true }
      });
      const proposalIds = proposals.map(p => p.id);
      const realisasiList = await prisma.realisasi.findMany({
        where: { proposal_id: { in: proposalIds } },
        select: { proposal_id: true, tanggal: true },
        orderBy: { tanggal: 'desc' }
      });
      const realisasiMap = new Map<string, Date>();
      for (const r of realisasiList) {
        if (r.proposal_id && !realisasiMap.has(r.proposal_id)) {
          realisasiMap.set(r.proposal_id, r.tanggal);
        }
      }
      const enhanced = proposals.map(p => ({
        ...p,
        tanggal_pencairan_real: realisasiMap.get(p.id) || null,
        tanggal_realisasi: realisasiMap.get(p.id) || null
      }));
      return res.status(200).json(enhanced);
    }

    const [total, proposals] = await prisma.$transaction([
      prisma.proposal.count(),
      prisma.proposal.findMany({
        include: { program: true, mustahik: true },
        orderBy: { agenda_no: 'desc' },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {})
      })
    ]);

    const proposalIds = proposals.map(p => p.id);
    const realisasiList = await prisma.realisasi.findMany({
      where: { proposal_id: { in: proposalIds } },
      select: { proposal_id: true, tanggal: true },
      orderBy: { tanggal: 'desc' }
    });
    const realisasiMap = new Map<string, Date>();
    for (const r of realisasiList) {
      if (r.proposal_id && !realisasiMap.has(r.proposal_id)) {
        realisasiMap.set(r.proposal_id, r.tanggal);
      }
    }
    const enhancedProposals = proposals.map(p => ({
      ...p,
      tanggal_pencairan_real: realisasiMap.get(p.id) || null,
      tanggal_realisasi: realisasiMap.get(p.id) || null
    }));

    if (isPaginated) {
      const totalPages = Math.ceil(total / limit) || 1;
      return res.status(200).json({
        status: 'success',
        data: enhancedProposals,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    }

    res.status(200).json(enhancedProposals);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const getProposalById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { program: true, mustahik: true }
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    const realisasi = await prisma.realisasi.findFirst({
      where: { proposal_id: id },
      select: { tanggal: true },
      orderBy: { tanggal: 'desc' }
    });
    res.status(200).json({
      ...proposal,
      tanggal_pencairan_real: realisasi?.tanggal || null,
      tanggal_realisasi: realisasi?.tanggal || null
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createProposal = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = { ...req.body };
    const file = req.file;

    // Whitelist field yang valid di model Proposal (buang field asing seperti `catatan`)
    const allowedFields = [
      'agenda_no', 'tanggal_masuk', 'nama_instansi', 'pimpinan_organisasi', 'nama_pemohon',
      'nama_anak', 'nik', 'no_kk', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin',
      'alamat', 'kelurahan', 'kecamatan', 'pekerjaan', 'jenis_permohonan',
      'no_telpon', 'email', 'jam_pengajuan', 'yang_mengajukan',
      'has_memo', 'memo_source', 'jenis_pengajuan', 'rekomendasi',
      'keterangan', 'status', 'mustahik_id',
    ];

    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // Support explicit / manual No. Agenda
    const rawAgenda = body.agenda_no ?? body.agendaNo ?? body.no_agenda ?? body.nomor_agenda;
    if (rawAgenda !== undefined && rawAgenda !== null && rawAgenda !== '') {
      const numAgenda = parseInt(String(rawAgenda), 10);
      if (!isNaN(numAgenda) && numAgenda > 0) {
        data.agenda_no = numAgenda;
      }
    }

    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (body.catatan && !data.keterangan) {
      data.keterangan = body.catatan;
    }
    if (data.jenis_permohonan === '') {
      data.jenis_permohonan = null;
    }
    if (data.mustahik_id === '') {
      data.mustahik_id = null;
    }

    const isObs = data.jenis_pengajuan === 'OBS' || String(data.jenis_pengajuan).toUpperCase() === 'OBS';

    if (isObs) {
      // Penomoran khusus OBS: Terpisah dari proposal biasa, urut dari proposal OBS terakhir
      if (!data.agenda_no) {
        const lastObs = await prisma.proposal.findFirst({
          where: { jenis_pengajuan: 'OBS' },
          orderBy: { created_at: 'desc' },
          select: { agenda_no: true }
        });
        data.agenda_no = (lastObs?.agenda_no || 0) + 1;
      }
    } else {
      // Penomoran Proposal Biasa: Mengikuti urutan dari proposal non-OBS terakhir yang baru dibuat/diubah
      if (!data.agenda_no) {
        const lastProposal = await prisma.proposal.findFirst({
          where: {
            NOT: { jenis_pengajuan: 'OBS' },
            status: 'Registrasi'
          },
          orderBy: { created_at: 'desc' },
          select: { agenda_no: true }
        }) || await prisma.proposal.findFirst({
          where: {
            NOT: { jenis_pengajuan: 'OBS' }
          },
          orderBy: { created_at: 'desc' },
          select: { agenda_no: true }
        });

        data.agenda_no = (lastProposal?.agenda_no || 0) + 1;
        if (data.agenda_no <= 0) data.agenda_no = 1;
      }
    }

    let gdriveLink = null;
    let gdriveId = null;

    if (file) {
      const gdriveRes = await uploadToDrive(file, undefined, 'gdrive_folder_proposal');
      gdriveLink = gdriveRes.webViewLink;
      gdriveId = gdriveRes.id;
    }

    const proposal = await prisma.proposal.create({
      data: {
        ...data,
        file_gdrive_id: gdriveId,
        file_gdrive_link: gdriveLink
      } as any
    });
    
    res.status(201).json({ status: 'success', data: proposal });
  } catch (error) {
    console.error("Error creating proposal:", error);
    res.status(500).json({ error: String(error) });
  }
};

export const updateProposal = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body = { ...req.body };
    const files = req.files as Express.Multer.File[] | undefined;
    const file = req.file;

    console.log(`[UPDATE PROPOSAL] ID: ${id}, DATA:`, body);

    const allowedFields = [
      'agenda_no', 'tanggal_masuk', 'nama_instansi', 'pimpinan_organisasi', 'nama_pemohon',
      'nama_anak', 'nik', 'no_kk', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'kelurahan', 'kecamatan',
      'pekerjaan', 'jenis_permohonan', 'no_telpon', 'email', 'jam_pengajuan',
      'yang_mengajukan', 'has_memo', 'memo_source', 'jenis_pengajuan',
      'rekomendasi', 'keterangan', 'status', 'file_gdrive_id',
      'file_gdrive_link', 'mustahik_id', 'surveyorName', 'isBeingSurveyed',
      'urgencyLevel', 'score', 'survey_data', 'surveySubmittedAt', 'catatanKepala', 'catatanPimpinan',
      'nominal', 'tipe_bantuan', 'alasan_perubahan_nominal', 'alasan_perubahan_dana',
      'asnaf', 'rekomendasi_kabag', 'hasil_identifikasi', 'approval_kabag', 'rkat_activity_id',
      'is_rutin', 'frekuensi_berulang', 'tanggal_pencairan', 'butuh_survei', 'penerima_detail',
      'volume', 'rekomendasi_unit_cost'
    ];

    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // Support edit No. Agenda
    const rawAgenda = body.agenda_no ?? body.agendaNo ?? body.no_agenda ?? body.nomor_agenda;
    if (rawAgenda !== undefined && rawAgenda !== null && rawAgenda !== '') {
      const numAgenda = parseInt(String(rawAgenda), 10);
      if (!isNaN(numAgenda) && numAgenda > 0) {
        data.agenda_no = numAgenda;
      }
    }

    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (body.catatan !== undefined && data.keterangan === undefined) {
      data.keterangan = body.catatan;
    }
    if (data.jenis_permohonan === '') {
      data.jenis_permohonan = null;
    }
    if (data.mustahik_id === '') {
      data.mustahik_id = null;
    }

    // Parse survey_data jika dikirim sebagai string (JSON.stringify dari frontend)
    if (data.survey_data && typeof data.survey_data === 'string') {
      try {
        data.survey_data = JSON.parse(data.survey_data);
      } catch {
        // Biarkan apa adanya jika sudah object
      }
    }

    // Parse penerima_detail jika dikirim sebagai string
    if (data.penerima_detail && typeof data.penerima_detail === 'string') {
      try {
        data.penerima_detail = JSON.parse(data.penerima_detail);
      } catch {
        // Biarkan apa adanya jika sudah object
      }
    }

    // Parse score jadi integer jika dikirim sebagai string
    if (data.score !== undefined && data.score !== null) {
      data.score = parseInt(String(data.score), 10);
    }

    if (data.nominal !== undefined && data.nominal !== null) {
      data.nominal = parseInt(String(data.nominal), 10);
    }

    if (data.volume !== undefined && data.volume !== null) {
      data.volume = parseInt(String(data.volume), 10);
    }

    if (data.rekomendasi_unit_cost !== undefined && data.rekomendasi_unit_cost !== null) {
      data.rekomendasi_unit_cost = parseInt(String(data.rekomendasi_unit_cost), 10);
    }

    // Parse isBeingSurveyed jadi boolean
    if (data.isBeingSurveyed !== undefined) {
      data.isBeingSurveyed = data.isBeingSurveyed === true || data.isBeingSurveyed === 'true';
    }

    // Auto-set surveySubmittedAt ketika status diset ke Survei_Selesai
    if (data.status === 'Survei_Selesai' || data.status === 'Survei Selesai') {
      data.surveySubmittedAt = new Date();
      data.status = 'Survei_Selesai';
    }

    if (files && files.length > 0) {
      let existingSurveyData: any = {};
      const needsExistingData = files.some(f => f.fieldname !== 'file') && !data.survey_data;
      if (needsExistingData) {
        const existing = await prisma.proposal.findUnique({
          where: { id },
          select: { survey_data: true }
        });
        if (existing && existing.survey_data) {
          try {
            existingSurveyData = typeof existing.survey_data === 'string'
              ? JSON.parse(existing.survey_data)
              : existing.survey_data;
          } catch {
            existingSurveyData = existing.survey_data;
          }
        }
      } else if (data.survey_data) {
        existingSurveyData = data.survey_data;
      }

      // Pre-fetch agendaNo and create survey subfolder if we have survey photos
      const surveyPhotoFields = ['fotoRumahDepan', 'fotoRumahDalam', 'fotoMustahik', 'fotoKondisiUsaha', 'fotoProdukBantuan', 'fotoDokumenLainnya'];
      const suffixMap: Record<string, string> = {
        fotoRumahDepan: ' - Foto Rumah Tampak Depan',
        fotoRumahDalam: ' - Foto Rumah Tampak Dalam',
        fotoMustahik: ' - Foto Mustahik',
        fotoKondisiUsaha: ' - Foto Kondisi Usaha',
        fotoProdukBantuan: ' - Foto Produk Bantuan',
        fotoDokumenLainnya: ' - Foto Dokumen Lainnya'
      };

      // Fetch proposal record details for dynamic folder & file naming
      let proposalRecord: any = null;
      try {
        proposalRecord = await prisma.proposal.findUnique({
          where: { id },
          select: {
            agenda_no: true,
            nama_pemohon: true,
            nama_instansi: true,
            tanggal_masuk: true,
            created_at: true,
            memo_source: true,
            keterangan: true
          }
        });
      } catch (err) {
        console.error('Error fetching proposal details for file upload:', err);
      }

      const agendaVal = proposalRecord?.agenda_no ? Number(proposalRecord.agenda_no) : 0;
      const isDirect = agendaVal === 0 || proposalRecord?.memo_source === 'DIRECT_PENYALURAN' || (proposalRecord?.keterangan || '').includes('[DIRECT PENYALURAN]');
      const rawNama = (proposalRecord?.nama_pemohon || proposalRecord?.nama_instansi || 'Mustahik').trim();
      const cleanNama = rawNama.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_') || 'Mustahik';
      const rawDate = proposalRecord?.tanggal_masuk || proposalRecord?.created_at || new Date();
      const tglStr = new Date(rawDate).toISOString().split('T')[0];

      // Folder naming:
      // Direct: DIRECT_2026-08-28_Suwarningsih
      // Proposal: Agenda_622_Suwarningsih
      const archiveFolderName = isDirect
        ? `DIRECT_${tglStr}_${cleanNama}`
        : `Agenda_${agendaVal}_${cleanNama}`;

      let archiveFolderId = '';
      try {
        archiveFolderId = await createFolderInDrive(archiveFolderName, 'gdrive_folder_penerimaan');
      } catch (err) {
        console.error('Error creating archive folder in drive:', err);
      }

      for (const f of files) {
        if (f.fieldname === 'file') {
          const gdriveRes = await uploadToDrive(f, undefined, 'gdrive_folder_proposal');
          data.file_gdrive_link = gdriveRes.webViewLink;
          data.file_gdrive_id = gdriveRes.id;
        } else if (surveyPhotoFields.includes(f.fieldname)) {
          const ext = path.extname(f.originalname) || '.jpg';
          const customFileName = isDirect
            ? `Survey_Direct_${cleanNama}_${tglStr}${suffixMap[f.fieldname] || ''}${ext}`
            : `${agendaVal}${suffixMap[f.fieldname] || ''}${ext}`;
          
          const gdriveRes = await uploadToDrive(f, customFileName, archiveFolderId || 'gdrive_folder_survei');
          if (!existingSurveyData) {
            existingSurveyData = {};
          }
          existingSurveyData[f.fieldname] = gdriveRes.webViewLink;
          data.survey_data = existingSurveyData;
        } else if (f.fieldname === 'kuitansi_ditandatangani') {
          const ext = path.extname(f.originalname) || '.pdf';
          const customFileName = isDirect
            ? `Kuitansi_Direct_${cleanNama}_${tglStr}${ext}`
            : `Kuitansi_Agenda_${agendaVal}_${cleanNama}${ext}`;

          const gdriveRes = await uploadToDrive(f, customFileName, 'gdrive_folder_kuitansi');
          if (!existingSurveyData) {
            existingSurveyData = {};
          }
          existingSurveyData[f.fieldname] = gdriveRes.webViewLink;
          data.survey_data = existingSurveyData;
        } else if (f.fieldname === 'bukti_foto_realisasi') {
          const ext = path.extname(f.originalname) || '.jpg';
          const customFileName = isDirect
            ? `FotoRealisasi_Direct_${cleanNama}_${tglStr}${ext}`
            : `FotoRealisasi_Agenda_${agendaVal}_${cleanNama}${ext}`;

          const gdriveRes = await uploadToDrive(f, customFileName, 'gdrive_folder_penerimaan');
          if (!existingSurveyData) {
            existingSurveyData = {};
          }
          existingSurveyData[f.fieldname] = gdriveRes.webViewLink;
          data.survey_data = existingSurveyData;
        } else {
          const gdriveRes = await uploadToDrive(f, undefined, archiveFolderId || 'gdrive_folder_survei');
          if (!existingSurveyData) {
            existingSurveyData = {};
          }
          existingSurveyData[f.fieldname] = gdriveRes.webViewLink;
          data.survey_data = existingSurveyData;
        }
      }
    } else if (file) {
      const gdriveRes = await uploadToDrive(file, undefined, 'gdrive_folder_proposal');
      data.file_gdrive_link = gdriveRes.webViewLink;
      data.file_gdrive_id = gdriveRes.id;
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: data
    });

    // Auto-coordination with Mustahik master table if by-name recipients have NIK
    if (data.penerima_detail && Array.isArray(data.penerima_detail)) {
      for (const item of data.penerima_detail) {
        const nik = item.nik ? String(item.nik).trim() : '';
        if (nik && nik.length === 16) {
          const mustahikData = {
            nama: item.nama_lengkap ? String(item.nama_lengkap).trim() : 'Tanpa Nama',
            nrm: item.nrm ? String(item.nrm).trim() : null,
            jenis_kelamin: item.jenis_kelamin ? String(item.jenis_kelamin).trim() : 'Pria',
            alamat: item.alamat ? String(item.alamat).trim() : 'Tidak ada alamat',
            telepon: item.telepon ? String(item.telepon).trim() : null,
            handphone: item.handphone ? String(item.handphone).trim() : null,
            catatan: item.keterangan ? String(item.keterangan).trim() : '',
            kategori: 'Perorangan'
          };

          const existingMustahik = await prisma.mustahik.findUnique({
            where: { nik }
          });

          if (existingMustahik) {
            await prisma.mustahik.update({
              where: { id: existingMustahik.id },
              data: {
                nrm: mustahikData.nrm || existingMustahik.nrm,
                nama: mustahikData.nama,
                jenis_kelamin: mustahikData.jenis_kelamin,
                alamat: mustahikData.alamat,
                telepon: mustahikData.telepon || existingMustahik.telepon,
                handphone: mustahikData.handphone || existingMustahik.handphone,
                catatan: mustahikData.catatan || existingMustahik.catatan
              }
            });
          } else {
            await prisma.mustahik.create({
              data: {
                nik,
                ...mustahikData
              }
            });
          }
        }
      }
    }

    await syncRealisasiFromProposal(id);

    const fullUpdatedProposal = await prisma.proposal.findUnique({
      where: { id },
      include: { program: true, mustahik: true }
    });

    const realisasi = await prisma.realisasi.findFirst({
      where: { proposal_id: id },
      select: { tanggal: true },
      orderBy: { tanggal: 'desc' }
    });

    res.status(200).json({
      ...(fullUpdatedProposal || proposal),
      tanggal_pencairan_real: realisasi?.tanggal || null,
      tanggal_realisasi: realisasi?.tanggal || null
    });
  } catch (error) {
    console.error('[UPDATE PROPOSAL ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
};


export const deleteProposal = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.$transaction(async (tx) => {
      // Disconnect related Realisasi records
      await tx.realisasi.updateMany({
        where: { proposal_id: id },
        data: { proposal_id: null }
      });

      // Delete the proposal
      await tx.proposal.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Scan Proposal: terima file upload ATAU link GDrive, lalu langsung ubah status ke Review Kabag
export const scanProposal = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = req.file;
    const { gdrive_link } = req.body;

    let fileLinkToSave: string | null = null;
    let fileIdToSave: string | null = null;

    if (file) {
      // Ambil data proposal untuk nama file
      const existing = await prisma.proposal.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Proposal tidak ditemukan.' });

      // Format nama file: "No Agenda (Tanggal Bulan Tahun).ext"
      const ext = path.extname(file.originalname) || '';
      const namaFile = formatScanFileName(
        existing.agenda_no ?? id,
        existing.tanggal_masuk,
        ext
      );

      // Upload ke Google Drive dengan nama + folder dari database parameter
      const gdriveRes = await uploadToDrive(file, namaFile, 'gdrive_folder_proposal');
      fileLinkToSave = gdriveRes.webViewLink;
      fileIdToSave = gdriveRes.id;
    } else if (gdrive_link && String(gdrive_link).trim() !== '') {
      // Simpan link GDrive langsung
      fileLinkToSave = String(gdrive_link).trim();
    } else {
      return res.status(400).json({ error: 'Harap upload file atau masukkan link Google Drive.' });
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        file_gdrive_link: fileLinkToSave,
        ...(fileIdToSave ? { file_gdrive_id: fileIdToSave } : {}),
        status: 'Review_Kabag_Administrasi'
      }
    });

    res.status(200).json({ status: 'success', data: proposal });
  } catch (error) {
    console.error('Error scanning proposal:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const syncNrmFromMustahik = async (req: Request, res: Response) => {
  try {
    console.log('Syncing NRMs and Journal entries for archived proposals...');
    // Find all proposals in status 'Selesai & Arsip' or 'Antrean_Arsip' or 'Antrean Arsip'
    const proposals = await prisma.proposal.findMany({
      where: {
        status: {
          in: ['Selesai & Arsip', 'Antrean_Arsip', 'Antrean Arsip', 'Selesai', 'Arsip']
        }
      },
      include: {
        mustahik: true
      }
    });

    let updatedCount = 0;

    for (const proposal of proposals) {
      let isUpdated = false;
      let updatedPenerimaDetail = proposal.penerima_detail;
      let updatedMustahikId = proposal.mustahik_id;

      // 1. Check by-name list
      const isByName = (proposal.jenis_pengajuan === 'Lembaga' || (proposal.nama_instansi && proposal.nama_instansi.trim() !== '')) && 
                       proposal.penerima_detail && Array.isArray(proposal.penerima_detail) && proposal.penerima_detail.length > 0;
      if (isByName) {
        const list = proposal.penerima_detail as any[];
        const newList = [];
        for (const item of list) {
          const nik = item.nik ? String(item.nik).trim() : '';
          if (nik && nik.length === 16) {
            const mustahikRecord = await prisma.mustahik.findUnique({
              where: { nik }
            });
            if (mustahikRecord && mustahikRecord.nrm && mustahikRecord.nrm !== item.nrm) {
              newList.push({
                ...item,
                nrm: mustahikRecord.nrm
              });
              isUpdated = true;
            } else {
              newList.push(item);
            }
          } else {
            newList.push(item);
          }
        }
        if (isUpdated) {
          updatedPenerimaDetail = newList;
        }
      }

      // 2. Check standard proposal (linked mustahik, or via NIK matching)
      if (!isByName) {
        const pNik = proposal.nik ? String(proposal.nik).trim() : '';
        if (!updatedMustahikId && pNik && pNik.length === 16) {
          const mustahikRecord = await prisma.mustahik.findUnique({
            where: { nik: pNik }
          });
          if (mustahikRecord) {
            updatedMustahikId = mustahikRecord.id;
            isUpdated = true;
          }
        }
      }

      if (isUpdated) {
        await prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            penerima_detail: updatedPenerimaDetail as any,
            mustahik_id: updatedMustahikId
          }
        });
        updatedCount++;
      }

      // Ensure journal replacement/synchronization is executed for every archived proposal
      await syncRealisasiFromProposal(proposal.id);
    }

    // Return the updated list of all proposals
    const allProposals = await prisma.proposal.findMany({
      include: { program: true, mustahik: true }
    });

    res.status(200).json({
      status: 'success',
      message: `Berhasil mensinkronkan ${updatedCount} data proposal dengan Data Mustahik terbaru.`,
      proposals: allProposals
    });
  } catch (error) {
    console.error('[SYNC NRM ERROR]', error);
    res.status(500).json({ error: String(error) });
  }
};

export async function syncRealisasiFromProposal(proposalId: string) {
  try {
    const updatedProposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { program: true, mustahik: true }
    });

    if (!updatedProposal) return;

    const statusNorm = (updatedProposal.status || '').toLowerCase().replace(/_/g, ' ');
    const isArchivedOrCompleted = statusNorm.includes('arsip') || statusNorm.includes('selesai');
    const isByName = updatedProposal.penerima_detail && 
                     Array.isArray(updatedProposal.penerima_detail) && 
                     (updatedProposal.penerima_detail as any[]).length > 0;

    const existingRealisasis = await prisma.realisasi.findMany({
      where: { proposal_id: updatedProposal.id },
      include: { journalEntries: true }
    });

    if (existingRealisasis.length === 0) return;

    // Case 1: Status is now Archived / Completed AND it is a Lembaga with By-Name list
    // Replace the single Global Lembaga journal with individual Perorangan journals
    if (isArchivedOrCompleted && isByName) {
      const byNameList = (updatedProposal.penerima_detail as any[]).filter(x => x && (x.nama_lengkap || x.nama || x.nik));
      if (byNameList.length === 0) return;

      const firstReal = existingRealisasis[0];
      const debitEntry = firstReal.journalEntries.find(j => Number(j.debit) > 0) || 
                         existingRealisasis.flatMap(r => r.journalEntries).find(j => Number(j.debit) > 0);
      const kreditEntry = firstReal.journalEntries.find(j => Number(j.kredit) > 0) || 
                          existingRealisasis.flatMap(r => r.journalEntries).find(j => Number(j.kredit) > 0);

      const debitCoaCode = debitEntry?.coa_code || '519999999';
      const kreditCoaCode = kreditEntry?.coa_code || '11010001';
      const accountId = kreditEntry?.account_id || null;
      const rkatId = firstReal.rkat_id || updatedProposal.rkat_activity_id || updatedProposal.jenis_permohonan || 'GENERAL';
      const tanggal = firstReal.tanggal || new Date();

      const totalNominal = Number(updatedProposal.nominal) || 0;
      const defaultUnitCost = updatedProposal.rekomendasi_unit_cost || (byNameList.length > 0 ? Math.round(totalNominal / byNameList.length) : totalNominal);

      const programName = updatedProposal.program?.name || updatedProposal.jenis_permohonan || 'Bantuan';
      const cleanProgram = programName.replace(/^Bantuan\s+/i, '');
      const lembagaName = (updatedProposal.nama_instansi && updatedProposal.nama_instansi.trim() !== '-' 
        ? updatedProposal.nama_instansi.trim() 
        : updatedProposal.nama_pemohon?.trim()) || 'Lembaga';

      await prisma.$transaction(async (tx) => {
        // Delete all old Realisasi records for this proposal (cascade deletes journal entries)
        for (const real of existingRealisasis) {
          await tx.realisasi.delete({
            where: { transaksi_id: real.transaksi_id }
          });
        }

        let allocatedNominal = 0;
        for (let i = 0; i < byNameList.length; i++) {
          const item = byNameList[i];
          const isLast = i === byNameList.length - 1;
          
          let personNominal = Number(item.nominal) || defaultUnitCost;
          if (isLast && totalNominal > 0) {
            personNominal = totalNominal - allocatedNominal;
          }
          allocatedNominal += personNominal;

          const personName = item.nama_lengkap || item.nama || `Penerima ${i + 1}`;
          const personKeterangan = `Bantuan ${cleanProgram} an. ${personName} (${lembagaName})`;
          const personNrm = item.nrm ? String(item.nrm).trim() : null;

          const newReal = await tx.realisasi.create({
            data: {
              proposal_id: updatedProposal.id,
              rkat_id: rkatId,
              tanggal: tanggal,
              keterangan: personKeterangan,
              nrm: personNrm
            }
          });

          // Debit Journal Entry (Beban Penyaluran)
          await tx.journalEntry.create({
            data: {
              transaksi_id: newReal.transaksi_id,
              coa_code: debitCoaCode,
              debit: new Prisma.Decimal(personNominal),
              kredit: new Prisma.Decimal(0.00),
              account_id: null
            }
          });

          // Kredit Journal Entry (Kas / Bank)
          await tx.journalEntry.create({
            data: {
              transaksi_id: newReal.transaksi_id,
              coa_code: kreditCoaCode,
              debit: new Prisma.Decimal(0.00),
              kredit: new Prisma.Decimal(personNominal),
              account_id: accountId
            }
          });
        }
      });
    } else {
      // Case 2: Standard Proposal or Not Archived yet (keep single global realisasi synced)
      if (existingRealisasis.length === 1) {
        const associatedRealisasi = existingRealisasis[0];
        let updatedNrm = updatedProposal.mustahik?.nrm || null;
        if (isByName) {
          const nrms = (updatedProposal.penerima_detail as any[]).map(p => p.nrm).filter(Boolean);
          if (nrms.length > 0) {
            updatedNrm = nrms.join(', ');
          }
        }
        const formattedKeterangan = formatDisbursementKeterangan(updatedProposal);

        await prisma.realisasi.update({
          where: { transaksi_id: associatedRealisasi.transaksi_id },
          data: {
            nrm: updatedNrm,
            keterangan: formattedKeterangan
          }
        });
      }
    }
  } catch (error) {
    console.error(`[syncRealisasiFromProposal ERROR for ${proposalId}]:`, error);
  }
}
