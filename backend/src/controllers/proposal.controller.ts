import { Request, Response, RequestHandler } from 'express';
import prisma from '../utils/prisma';
import { uploadToDrive, formatScanFileName } from '../utils/gdrive';
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
      'nama_anak', 'nik', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin',
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
      const gdriveRes = await uploadToDrive(file);
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
      'nama_anak', 'nik', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'kelurahan', 'kecamatan',
      'pekerjaan', 'jenis_permohonan', 'no_telpon', 'email', 'jam_pengajuan',
      'yang_mengajukan', 'has_memo', 'memo_source', 'jenis_pengajuan',
      'rekomendasi', 'keterangan', 'status', 'file_gdrive_id',
      'file_gdrive_link', 'mustahik_id', 'surveyorName', 'isBeingSurveyed',
      'urgencyLevel', 'score', 'survey_data', 'surveySubmittedAt', 'catatanKepala', 'catatanPimpinan',
      'nominal', 'tipe_bantuan', 'alasan_perubahan_nominal',
      'asnaf', 'rekomendasi_kabag', 'hasil_identifikasi', 'approval_kabag', 'rkat_activity_id'
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

    // Parse score jadi integer jika dikirim sebagai string
    if (data.score !== undefined && data.score !== null) {
      data.score = parseInt(String(data.score), 10);
    }

    if (data.nominal !== undefined && data.nominal !== null) {
      data.nominal = parseInt(String(data.nominal), 10);
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
      for (const f of files) {
        if (f.fieldname === 'file') {
          const gdriveRes = await uploadToDrive(f);
          data.file_gdrive_link = gdriveRes.webViewLink;
          data.file_gdrive_id = gdriveRes.id;
        } else {
          // Asumsi fieldname lain adalah foto dokumentasi (fotoDepan, fotoDalam, dll)
          const gdriveRes = await uploadToDrive(f);
          if (!data.survey_data) {
            data.survey_data = {};
          }
          data.survey_data[f.fieldname] = gdriveRes.webViewLink;
        }
      }
    } else if (file) {
      const gdriveRes = await uploadToDrive(file);
      data.file_gdrive_link = gdriveRes.webViewLink;
      data.file_gdrive_id = gdriveRes.id;
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: data
    });

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

      // Upload ke Google Drive dengan nama + folder dari env
      const gdriveRes = await uploadToDrive(file, namaFile);
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
