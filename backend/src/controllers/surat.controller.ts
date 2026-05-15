import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { uploadToDrive, formatScanFileName } from '../utils/gdrive';
import path from 'path';

export const getSurats = async (req: Request, res: Response) => {
  try {
    const surats = await prisma.surat.findMany();
    res.status(200).json(surats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const getSuratById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const surat = await prisma.surat.findUnique({ where: { id } });
    if (!surat) return res.status(404).json({ error: 'Surat not found' });
    res.status(200).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createSurat = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (data.tanggal_acara) {
      data.tanggal_acara = new Date(data.tanggal_acara);
    }
    const surat = await prisma.surat.create({ data });
    res.status(201).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (data.tanggal_acara) {
      data.tanggal_acara = new Date(data.tanggal_acara);
    }
    const existingSurat = await prisma.surat.findUnique({ where: { id } });

    const surat = await prisma.surat.update({
      where: { id },
      data
    });

    // Handle notifications for assigned staff in 'Undangan'
    if (existingSurat?.kategori === 'Undangan' && data.assigned_staff && Array.isArray(data.assigned_staff)) {
      const oldStaff = Array.isArray(existingSurat.assigned_staff) ? existingSurat.assigned_staff as string[] : [];
      const newStaff = data.assigned_staff as string[];
      
      const addedStaff = newStaff.filter(staffId => !oldStaff.includes(staffId));

      if (addedStaff.length > 0) {
        const notifications = addedStaff.map(userId => ({
          userId,
          title: 'Penugasan Undangan Baru',
          message: `Anda ditugaskan oleh Kepala Pelaksana untuk menghadiri undangan dari ${surat.nama_instansi || 'Instansi Terkait'} pada ${surat.tanggal_acara ? new Date(surat.tanggal_acara).toLocaleDateString('id-ID') : '-'} jam ${surat.jam_acara || '-'}.`,
          link: `/surat/${surat.id}`
        }));

        await prisma.notification.createMany({
          data: notifications
        });
      }
    }

    res.status(200).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.surat.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const scanSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = req.file;
    const { gdrive_link } = req.body;

    let fileLinkToSave: string | null = null;
    let fileIdToSave: string | null = null;

    if (file) {
      const existing = await prisma.surat.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Surat tidak ditemukan.' });

      const ext = path.extname(file.originalname) || '';
      const namaFile = formatScanFileName(
        existing.agenda_no ?? id,
        existing.tanggal_masuk,
        ext
      );

      const gdriveRes = await uploadToDrive(file, namaFile);
      fileLinkToSave = gdriveRes.webViewLink;
      fileIdToSave = gdriveRes.id;
    } else if (gdrive_link && String(gdrive_link).trim() !== '') {
      fileLinkToSave = String(gdrive_link).trim();
    } else {
      return res.status(400).json({ error: 'Harap upload file atau masukkan link Google Drive.' });
    }

    const surat = await prisma.surat.update({
      where: { id },
      data: {
        file_gdrive_link: fileLinkToSave,
        ...(fileIdToSave ? { file_gdrive_id: fileIdToSave } : {}),
        status: 'Review_Kabag_Admin'
      }
    });

    res.status(200).json({ status: 'success', data: surat });
  } catch (error) {
    console.error('Error scanning surat:', error);
    res.status(500).json({ error: String(error) });
  }
};
