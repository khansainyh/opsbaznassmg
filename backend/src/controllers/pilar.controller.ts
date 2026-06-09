import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPilars = async (req: Request, res: Response) => {
  try {
    const pilars = await prisma.pilar.findMany({
      include: { programs: true }
    });
    res.status(200).json(pilars);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createPilar = async (req: Request, res: Response) => {
  try {
    const { code, name, category, status } = req.body;
    const pilar = await prisma.pilar.create({
      data: { code, name, category, status }
    });
    res.status(201).json(pilar);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updatePilar = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { name, category, status } = req.body;
    const pilar = await prisma.pilar.update({
      where: { code },
      data: { name, category, status }
    });
    res.status(200).json(pilar);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deletePilar = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;

    // Find all programs belonging to this pilar
    const programs = await prisma.program.findMany({
      where: { pilar_code: code }
    });
    const programCodes = programs.map(p => p.code);

    if (programCodes.length > 0) {
      // Set jenis_permohonan to null in proposals referencing these programs
      await prisma.proposal.updateMany({
        where: { jenis_permohonan: { in: programCodes } },
        data: { jenis_permohonan: null }
      });

      // Delete the programs
      await prisma.program.deleteMany({
        where: { code: { in: programCodes } }
      });
    }

    // Delete the pilar
    await prisma.pilar.delete({ where: { code } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
