import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getUpz = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await prisma.upz.findMany({
      orderBy: { created_at: 'desc' }
    });

    // Map database records back to the frontend UPZ structure
    const data = records.map(rec => {
      if (rec.metadata && typeof rec.metadata === 'object') {
        const meta = rec.metadata as any;
        return {
          id: rec.id,
          code: meta.code || rec.id,
          name: rec.nama_upz || meta.name || '',
          category: meta.category || 'OPD',
          type: meta.type || 'On-Balance',
          kecamatan: meta.kecamatan || '',
          kelurahan: meta.kelurahan || '',
          activeSKNumber: meta.activeSKNumber || '',
          skStartYear: meta.skStartYear || '',
          skExpiryDate: meta.skExpiryDate || '',
          metadata: meta.metadata || {},
          status: meta.status || 'Aktif',
          resignationDate: meta.resignationDate || undefined,
          resignationReason: meta.resignationReason || undefined,
          totalSetoran: meta.totalSetoran || 0,
          hakSalur: meta.hakSalur || 0
        };
      }
      return {
        id: rec.id,
        code: rec.id,
        name: rec.nama_upz || '',
        category: 'OPD',
        type: 'On-Balance',
        kecamatan: '',
        kelurahan: '',
        activeSKNumber: '',
        skStartYear: '',
        skExpiryDate: '',
        metadata: {},
        status: 'Aktif'
      };
    });

    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error getting UPZ:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const createUpz = async (req: Request, res: Response): Promise<void> => {
  try {
    const upzData = req.body;
    if (!upzData.code || !upzData.name) {
      res.status(400).json({ status: 'error', message: 'Code and Name are required.' });
      return;
    }

    // Map frontend category to KategoriUPZ enum safely
    let dbKategori: 'Masjid' | 'Yayasan_Lembaga' | 'Sekolah' | 'OPD' = 'OPD';
    if (upzData.category === 'Masjid') dbKategori = 'Masjid';
    else if (upzData.category === 'Yayasan' || upzData.category === 'Yayasan_Lembaga') dbKategori = 'Yayasan_Lembaga';
    else if (upzData.category === 'Sekolah') dbKategori = 'Sekolah';

    // Store the entire upzData in metadata JSON field
    const newRecord = await prisma.upz.create({
      data: {
        id: upzData.code, // Use code as ID for consistency
        kategori: dbKategori,
        nama_upz: upzData.name,
        alamat: upzData.metadata?.address || '',
        metadata: upzData as any
      }
    });

    res.status(201).json({ status: 'success', data: newRecord });
  } catch (error) {
    console.error('Error creating UPZ:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const updateUpz = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const upzData = req.body;

    const existing = await prisma.upz.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'UPZ not found.' });
      return;
    }

    let dbKategori: 'Masjid' | 'Yayasan_Lembaga' | 'Sekolah' | 'OPD' = 'OPD';
    if (upzData.category === 'Masjid') dbKategori = 'Masjid';
    else if (upzData.category === 'Yayasan' || upzData.category === 'Yayasan_Lembaga') dbKategori = 'Yayasan_Lembaga';
    else if (upzData.category === 'Sekolah') dbKategori = 'Sekolah';

    const updated = await prisma.upz.update({
      where: { id },
      data: {
        nama_upz: upzData.name || existing.nama_upz,
        kategori: dbKategori,
        alamat: upzData.metadata?.address || existing.alamat,
        metadata: upzData as any
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Error updating UPZ:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const deleteUpz = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.upz.delete({
      where: { id }
    });
    res.status(200).json({ status: 'success', message: 'UPZ deleted successfully.' });
  } catch (error) {
    console.error('Error deleting UPZ:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
