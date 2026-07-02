import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const DEFAULT_CATEGORIES = [
  'Operasional Kantor',
  'Alat Tulis Kantor (ATK)',
  'Listrik & Air',
  'Transport & Perjalanan',
  'Kegiatan / Acara',
  'Pemeliharaan Gedung/Inventaris',
  'Lain-lain'
];

export const getKategoriBiaya = async (req: Request, res: Response) => {
  try {
    let count = await prisma.kategoriBiaya.count();
    
    // Seed default categories if empty
    if (count === 0) {
      await prisma.kategoriBiaya.createMany({
        data: DEFAULT_CATEGORIES.map(nama => ({ nama })),
        skipDuplicates: true
      });
    }

    const list = await prisma.kategoriBiaya.findMany({
      orderBy: { created_at: 'asc' }
    });

    res.status(200).json({ status: 'success', data: list });
  } catch (error) {
    console.error('Get Kategori Biaya Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const createKategoriBiaya = async (req: Request, res: Response) => {
  try {
    const { nama } = req.body;

    if (!nama || !nama.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }

    const existing = await prisma.kategoriBiaya.findUnique({
      where: { nama: nama.trim() }
    });

    if (existing) {
      res.status(400).json({ error: 'Kategori biaya dengan nama tersebut sudah ada.' });
      return;
    }

    const created = await prisma.kategoriBiaya.create({
      data: { nama: nama.trim() }
    });

    res.status(201).json({ status: 'success', data: created });
  } catch (error) {
    console.error('Create Kategori Biaya Error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const deleteKategoriBiaya = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.kategoriBiaya.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Kategori biaya tidak ditemukan.' });
      return;
    }

    await prisma.kategoriBiaya.delete({
      where: { id }
    });

    res.status(200).json({ status: 'success', message: 'Kategori biaya berhasil dihapus.' });
  } catch (error) {
    console.error('Delete Kategori Biaya Error:', error);
    res.status(500).json({ error: String(error) });
  }
};
