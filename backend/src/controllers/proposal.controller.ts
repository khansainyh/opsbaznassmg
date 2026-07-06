import { Request, Response, RequestHandler } from 'express';
import prisma from '../utils/prisma';
import { uploadToDrive, formatScanFileName, createFolderInDrive } from '../utils/gdrive';
import path from 'path';

export const getProposals = async (req: Request, res: Response) => {
  console.log('Fetching proposals...');
  try {
    const proposals = await prisma.proposal.findMany({
      include: { program: true, mustahik: true }
    });
    res.status(200).json(proposals);
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
    res.status(200).json(proposal);
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
      'tanggal_masuk', 'nama_instansi', 'pimpinan_organisasi', 'nama_pemohon',
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

    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (data.jenis_permohonan === '') {
      data.jenis_permohonan = null;
    }
    if (data.mustahik_id === '') {
      data.mustahik_id = null;
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
      'tanggal_masuk', 'nama_instansi', 'pimpinan_organisasi', 'nama_pemohon',
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

    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
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

      const hasSurveyPhotos = files.some(f => surveyPhotoFields.includes(f.fieldname));
      let agendaNo = '';
      let surveyFolderId = '';

      if (hasSurveyPhotos) {
        try {
          const proposalRecord = await prisma.proposal.findUnique({
            where: { id },
            select: { agenda_no: true }
          });
          agendaNo = proposalRecord?.agenda_no ? String(proposalRecord.agenda_no) : id;
          surveyFolderId = await createFolderInDrive(agendaNo, 'gdrive_folder_survei');
        } catch (err) {
          console.error('Error preparing survey folder/agenda number:', err);
        }
      }

      for (const f of files) {
        if (f.fieldname === 'file') {
          const gdriveRes = await uploadToDrive(f, undefined, 'gdrive_folder_proposal');
          data.file_gdrive_link = gdriveRes.webViewLink;
          data.file_gdrive_id = gdriveRes.id;
        } else if (surveyPhotoFields.includes(f.fieldname)) {
          // Survey photo: Upload to custom subfolder with custom name
          const ext = path.extname(f.originalname) || '';
          const customFileName = `${agendaNo}${suffixMap[f.fieldname] || ''}${ext}`;
          
          const gdriveRes = await uploadToDrive(f, customFileName, surveyFolderId || 'gdrive_folder_survei');
          if (!existingSurveyData) {
            existingSurveyData = {};
          }
          existingSurveyData[f.fieldname] = gdriveRes.webViewLink;
          data.survey_data = existingSurveyData;
        } else {
          // Asumsi fieldname lain adalah bukti realisasi / kuitansi
          const folderKey = f.fieldname === 'bukti_foto_realisasi'
            ? 'gdrive_folder_penerimaan'
            : f.fieldname === 'kuitansi_ditandatangani'
              ? 'gdrive_folder_kuitansi'
              : 'gdrive_folder_survei';

          const gdriveRes = await uploadToDrive(f, undefined, folderKey);
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

    res.status(200).json(proposal);
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
    console.log('Syncing NRMs from master Mustahik data...');
    // Find all proposals in status 'Selesai & Arsip'
    const proposals = await prisma.proposal.findMany({
      where: {
        status: 'Selesai & Arsip'
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
      const isByName = proposal.jenis_pengajuan === 'Lembaga' && proposal.penerima_detail && Array.isArray(proposal.penerima_detail) && proposal.penerima_detail.length > 0;
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
        // If not linked yet but has a NIK
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
