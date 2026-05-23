import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const defaultParams = [
  { key: 'hak_amil_zakat_maal', value: '12.5', description: 'Hak Amil Zakat Maal (%)' },
  { key: 'hak_amil_infak_sedekah', value: '20.0', description: 'Hak Amil Infak/Sedekah (%)' },
  { key: 'hak_amil_zakat_fitrah', value: '0', description: 'Hak Amil Zakat Fitrah (UPZ) (%)' },
  { key: 'bps_garis_kemiskinan', value: '709000', description: 'Garis Kemiskinan BPS (Rupiah per Kapita)' },
  { key: 'upz_hak_salur_persentase', value: '30', description: 'Persentase Hak Salur UPZ (%)' }
];

export const getParameters = async (req: Request, res: Response) => {
  try {
    let params = await prisma.systemParameter.findMany();
    if (params.length === 0) {
      await prisma.systemParameter.createMany({
        data: defaultParams
      });
      params = await prisma.systemParameter.findMany();
    }
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
