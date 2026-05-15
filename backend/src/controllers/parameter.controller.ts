import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getParameters = async (req: Request, res: Response) => {
  try {
    const params = await prisma.systemParameter.findMany();
    res.status(200).json(params);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
};

export const getParameterByKey = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const param = await prisma.systemParameter.findUnique({
      where: { key }
    });
    if (!param) {
      return res.status(404).json({ error: 'Parameter not found' });
    }
    res.status(200).json(param);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parameter' });
  }
};

export const upsertParameter = async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;
    const param = await prisma.systemParameter.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
    res.status(200).json(param);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save parameter' });
  }
};
