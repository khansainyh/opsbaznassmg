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
    const { code, pilar_code, name, budget_rkat, rkat_details } = req.body;
    const program = await prisma.program.create({
      data: { 
        code, 
        pilar_code, 
        name, 
        budget_rkat: budget_rkat ? parseInt(budget_rkat) : 0,
        rkat_details: rkat_details || null
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
    const { pilar_code, name, budget_rkat, rkat_details } = req.body;
    const program = await prisma.program.update({
      where: { code },
      data: { 
        pilar_code, 
        name, 
        budget_rkat: budget_rkat !== undefined ? (budget_rkat ? parseInt(budget_rkat) : 0) : undefined,
        rkat_details: rkat_details !== undefined ? rkat_details : undefined
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
