import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      include: { pilar: true }
    });
    res.status(200).json(programs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createProgram = async (req: Request, res: Response) => {
  try {
    const { code, pilar_code, name, budget_rkat, rkat_details, tipe } = req.body;
    const program = await prisma.program.create({
      data: { 
        code, 
        pilar_code, 
        name, 
        budget_rkat: budget_rkat ? parseInt(budget_rkat) : 0,
        rkat_details: rkat_details || null,
        tipe: tipe || "Konsumtif"
      }
    });
    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateProgram = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { pilar_code, name, budget_rkat, rkat_details, tipe } = req.body;
    const program = await prisma.program.update({
      where: { code },
      data: { 
        pilar_code, 
        name, 
        budget_rkat: budget_rkat !== undefined ? (budget_rkat ? parseInt(budget_rkat) : 0) : undefined,
        rkat_details: rkat_details !== undefined ? rkat_details : undefined,
        tipe: tipe !== undefined ? tipe : undefined
      }
    });
    res.status(200).json(program);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteProgram = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    await prisma.program.delete({ where: { code } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const PILAR_NAME_MAP: Record<string, { name: string; category: string }> = {
  '1100': { name: 'Semarang Peduli', category: 'Kemanusiaan' },
  '1200': { name: 'Semarang Sehat', category: 'Kesehatan' },
  '1300': { name: 'Semarang Cerdas', category: 'Pendidikan' },
  '1400': { name: 'Semarang Taqwa', category: 'Dakwah & Advokasi' },
  '2100': { name: 'Semarang Makmur', category: 'Ekonomi' }
};

export const importPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload must be an array of objects.' });
      return;
    }

    let insertedPilars = 0;
    let insertedPrograms = 0;
    let updatedPrograms = 0;

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      // Check pilar details
      const pilarCode = row.pilar_code || row['kode pilar'] || row['kodepilar'] || row['pilar code'] || row['kode program'] || row['kodeprogram'] || row['program_code'] || row['program code'];
      const pilarName = row.pilar_name || row['nama pilar'] || row['namapilar'] || row['pilar name'] || row['nama program'] || row['namaprogram'] || row['program_name'] || row['program name'];
      const pilarCategory = row.pilar_category || row['kategori pilar'] || row['kategoripilar'] || row['category'] || row['kategori program'] || row['kategoriprogram'] || row['program_category'] || row['program category'];

      if (!pilarCode) continue;

      const pilarCodeStr = String(pilarCode).trim();
      const defaultPilar = PILAR_NAME_MAP[pilarCodeStr] || { name: 'Program Baru', category: 'Kemanusiaan' };
      
      const pilarNameStr = pilarName ? String(pilarName).trim() : defaultPilar.name;
      const pilarCategoryStr = pilarCategory ? String(pilarCategory).trim() : defaultPilar.category;

      // 1. Ensure Pilar exists
      const existingPilar = await prisma.pilar.findUnique({
        where: { code: pilarCodeStr }
      });

      if (!existingPilar) {
        await prisma.pilar.create({
          data: {
            code: pilarCodeStr,
            name: pilarNameStr,
            category: pilarCategoryStr,
            status: 'Aktif'
          }
        });
        insertedPilars++;
      }

      // 2. Check program details
      const programCode = row.program_code || row['kode program'] || row['kodeprogram'] || row['program code'] || row['kode kegiatan'] || row['kodekegiatan'] || row['kegiatan_code'] || row['kegiatan code'];
      const programName = row.program_name || row['nama program'] || row['namaprogram'] || row['program name'] || row['nama kegiatan'] || row['namakegiatan'] || row['kegiatan_name'] || row['kegiatan name'];
      const budgetRkat = row.budget_rkat || row['pagu rkat'] || row['pagurkat'] || row['budget rkat'] || 0;
      const tipeProgram = row.tipe || row['tipe'] || row['klasifikasi'] || row['jenis'] || 'Konsumtif';

      if (!programCode) continue;

      const programCodeStr = String(programCode).trim();
      const programNameStr = programName ? String(programName).trim() : 'Kegiatan Baru';
      const parsedBudget = parseInt(String(budgetRkat).replace(/[^0-9]/g, '')) || 0;
      const tipeProgramStr = tipeProgram && String(tipeProgram).toLowerCase().includes('produktif') ? 'Produktif' : 'Konsumtif';

      // 3. Upsert Program
      const existingProgram = await prisma.program.findUnique({
        where: { code: programCodeStr }
      });

      if (existingProgram) {
        await prisma.program.update({
          where: { code: programCodeStr },
          data: {
            pilar_code: pilarCodeStr,
            name: programNameStr,
            budget_rkat: parsedBudget,
            tipe: tipeProgramStr
          }
        });
        updatedPrograms++;
      } else {
        await prisma.program.create({
          data: {
            code: programCodeStr,
            pilar_code: pilarCodeStr,
            name: programNameStr,
            budget_rkat: parsedBudget,
            tipe: tipeProgramStr
          }
        });
        insertedPrograms++;
      }
    }

    res.status(200).json({
      status: 'success',
      insertedPilars,
      insertedPrograms,
      updatedPrograms
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

