import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

const defaultMappings = [
  {
    kategori: 'Zakat - Mandiri',
    persentase_amil: new Prisma.Decimal(12.50),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(12.50),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Zakat - UPZ Pengumpulan',
    persentase_amil: new Prisma.Decimal(12.50),
    persentase_upz: new Prisma.Decimal(5.00),
    persentase_baznas: new Prisma.Decimal(7.50),
    persentase_salur_pembantuan: new Prisma.Decimal(30.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Zakat - UPZ Pembantuan',
    persentase_amil: new Prisma.Decimal(3.75),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(3.75),
    persentase_salur_pembantuan: new Prisma.Decimal(70.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak/Sedekah Tidak Terikat - Mandiri',
    persentase_amil: new Prisma.Decimal(20.00),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(20.00),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak/Sedekah Tidak Terikat - UPZ Pengumpulan',
    persentase_amil: new Prisma.Decimal(20.00),
    persentase_upz: new Prisma.Decimal(5.00),
    persentase_baznas: new Prisma.Decimal(15.00),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak/Sedekah Tidak Terikat - UPZ Pembantuan',
    persentase_amil: new Prisma.Decimal(6.00),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(6.00),
    persentase_salur_pembantuan: new Prisma.Decimal(70.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak Terikat - Qurban/CSR/DAM/DSKL',
    persentase_amil: new Prisma.Decimal(10.00),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(10.00),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak Terikat - Palestina',
    persentase_amil: new Prisma.Decimal(5.00),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(5.00),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  },
  {
    kategori: 'Infak Terikat - Non-Amil',
    persentase_amil: new Prisma.Decimal(0.00),
    persentase_upz: new Prisma.Decimal(0.00),
    persentase_baznas: new Prisma.Decimal(0.00),
    persentase_salur_pembantuan: new Prisma.Decimal(0.00),
    coa_debit_beban: '51020101',
    coa_kredit_amil: '43010101',
    coa_kredit_utang: '21040101'
  }
];

export const getPenerimaanMappings = async (req: Request, res: Response) => {
  try {
    let list = await prisma.penerimaanMapping.findMany();
    
    // Check if we have the old mappings
    const hasOldMappings = list.some(item => 
      ['Zakat Maal', 'Zakat Fitrah', 'Infak', 'Sedekah', 'Infak/Sedekah - Mandiri', 'Infak/Sedekah - UPZ'].includes(item.kategori)
    );
    
    // Auto-seed if empty or has old mappings
    if (list.length === 0 || hasOldMappings) {
      await prisma.penerimaanMapping.deleteMany({});
      for (const item of defaultMappings) {
        await prisma.penerimaanMapping.create({ data: item });
      }
      list = await prisma.penerimaanMapping.findMany();
    }
    
    res.json({ status: 'success', data: list });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const createPenerimaanMapping = async (req: Request, res: Response) => {
  try {
    const {
      kategori, persentase_amil, persentase_upz, persentase_baznas,
      persentase_salur_pembantuan, coa_debit_beban, coa_kredit_amil, coa_kredit_utang, coa_codes
    } = req.body;

    const newRule = await prisma.penerimaanMapping.create({
      data: {
        kategori,
        persentase_amil: new Prisma.Decimal(Number(persentase_amil || 0)),
        persentase_upz: new Prisma.Decimal(Number(persentase_upz || 0)),
        persentase_baznas: new Prisma.Decimal(Number(persentase_baznas || 0)),
        persentase_salur_pembantuan: new Prisma.Decimal(Number(persentase_salur_pembantuan || 0)),
        coa_debit_beban,
        coa_kredit_amil,
        coa_kredit_utang,
        coa_codes: coa_codes || null
      }
    });

    res.json({ status: 'success', data: newRule });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const updatePenerimaanMapping = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      kategori, persentase_amil, persentase_upz, persentase_baznas,
      persentase_salur_pembantuan, coa_debit_beban, coa_kredit_amil, coa_kredit_utang, coa_codes
    } = req.body;

    const updated = await prisma.penerimaanMapping.update({
      where: { id },
      data: {
        kategori,
        persentase_amil: new Prisma.Decimal(Number(persentase_amil || 0)),
        persentase_upz: new Prisma.Decimal(Number(persentase_upz || 0)),
        persentase_baznas: new Prisma.Decimal(Number(persentase_baznas || 0)),
        persentase_salur_pembantuan: new Prisma.Decimal(Number(persentase_salur_pembantuan || 0)),
        coa_debit_beban,
        coa_kredit_amil,
        coa_kredit_utang,
        coa_codes: coa_codes || null
      }
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const deletePenerimaanMapping = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.penerimaanMapping.delete({ where: { id } });
    res.json({ status: 'success', message: 'Mapping rule deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};
