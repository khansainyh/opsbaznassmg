import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getRkatPengumpulan = async (req: Request, res: Response) => {
  try {
    const list = await prisma.rkatPengumpulan.findMany();

    const realizationMap: Record<string, { total: number; monthly: Record<string, number> }> = {};
    
    // Initialize map for each RKAT program
    list.forEach((item: any) => {
      realizationMap[item.id] = {
        total: 0,
        monthly: { jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0 }
      };
    });

    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des'];
    const rkatIds = list.map((item: any) => item.id);

    // 1. Query PenerimaanZis transactions mapped to RKAT programs
    const penerimaanList = await prisma.penerimaanZis.findMany({
      where: {
        rkat_id: { in: rkatIds },
        status_simba: { not: 'FAILED' }
      },
      select: {
        rkat_id: true,
        nominal: true,
        tanggal_pembayaran: true,
        transaksi_id: true
      }
    });

    // Track transaksi_ids accounted for via PenerimaanZis to prevent double counting
    const countedTransaksiIds = new Set<string>();

    penerimaanList.forEach(item => {
      if (item.transaksi_id) {
        countedTransaksiIds.add(item.transaksi_id);
      }
      const rkatId = item.rkat_id;
      if (rkatId && realizationMap[rkatId]) {
        const amount = Number(item.nominal || 0);
        realizationMap[rkatId].total += amount;
        if (item.tanggal_pembayaran) {
          const mIdx = new Date(item.tanggal_pembayaran).getMonth();
          const mKey = monthKeys[mIdx];
          if (mKey) {
            realizationMap[rkatId].monthly[mKey] += amount;
          }
        }
      }
    });

    // 2. Query JournalEntries joined with Realisasi, matching by rkat_id in the Realisasi record
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        kredit: { gt: 0 },
        realisasi: {
          rkat_id: { in: rkatIds }
        }
      },
      include: {
        realisasi: {
          select: { rkat_id: true, tanggal: true }
        }
      }
    });

    journalEntries.forEach(entry => {
      if (entry.realisasi && entry.realisasi.rkat_id) {
        // Prevent double counting: skip if this entry belongs to a transaction already counted via PenerimaanZis
        if (entry.transaksi_id && countedTransaksiIds.has(entry.transaksi_id)) {
          return;
        }

        const rkatId = entry.realisasi.rkat_id;
        const amount = Number(entry.kredit || 0);
        if (realizationMap[rkatId]) {
          realizationMap[rkatId].total += amount;
          if (entry.realisasi.tanggal) {
            const mIdx = new Date(entry.realisasi.tanggal).getMonth();
            const mKey = monthKeys[mIdx];
            if (mKey) {
              realizationMap[rkatId].monthly[mKey] += amount;
            }
          }
        }
      }
    });

    // Now construct the response list with calculated values
    const data = list.map((item: any) => {
      const realization = realizationMap[item.id] || {
        total: 0,
        monthly: { jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0, jul: 0, agt: 0, sep: 0, okt: 0, nov: 0, des: 0 }
      };

      return {
        ...item,
        realisasi_total: realization.total,
        ...realization.monthly
      };
    });

    // Sort strictly by no numerically/naturally
    data.sort((a: any, b: any) => {
      return String(a.no || '').localeCompare(String(b.no || ''), undefined, { numeric: true, sensitivity: 'base' });
    });

    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const createRkatPengumpulan = async (req: Request, res: Response) => {
  try {
    const { 
      no, kategori, nama_program, coa_codes, target_perorangan, target_lembaga, nilai_anggaran,
      target_jan, target_feb, target_mar, target_apr, target_mei, target_jun,
      target_jul, target_agt, target_sep, target_okt, target_nov, target_des
    } = req.body;

    const newItem = await prisma.rkatPengumpulan.create({
      data: {
        no: String(no),
        kategori: String(kategori),
        nama_program: String(nama_program),
        coa_codes: coa_codes !== undefined && coa_codes !== null ? String(coa_codes) : null,
        target_perorangan: target_perorangan ? parseInt(target_perorangan) : null,
        target_lembaga: target_lembaga ? parseInt(target_lembaga) : null,
        nilai_anggaran: nilai_anggaran ? Number(nilai_anggaran) : 0,
        target_jan: target_jan ? Number(target_jan) : null,
        target_feb: target_feb ? Number(target_feb) : null,
        target_mar: target_mar ? Number(target_mar) : null,
        target_apr: target_apr ? Number(target_apr) : null,
        target_mei: target_mei ? Number(target_mei) : null,
        target_jun: target_jun ? Number(target_jun) : null,
        target_jul: target_jul ? Number(target_jul) : null,
        target_agt: target_agt ? Number(target_agt) : null,
        target_sep: target_sep ? Number(target_sep) : null,
        target_okt: target_okt ? Number(target_okt) : null,
        target_nov: target_nov ? Number(target_nov) : null,
        target_des: target_des ? Number(target_des) : null
      }
    });

    res.status(201).json({ status: 'success', data: newItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const updateRkatPengumpulan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { 
      no, kategori, nama_program, coa_codes, target_perorangan, target_lembaga, nilai_anggaran,
      target_jan, target_feb, target_mar, target_apr, target_mei,
      target_jun, target_jul, target_agt, target_sep, target_okt, target_nov, target_des
    } = req.body;

    const updatedItem = await prisma.rkatPengumpulan.update({
      where: { id },
      data: {
        no: no !== undefined ? String(no) : undefined,
        kategori: kategori !== undefined ? String(kategori) : undefined,
        nama_program: nama_program !== undefined ? String(nama_program) : undefined,
        coa_codes: coa_codes !== undefined ? (coa_codes ? String(coa_codes) : null) : undefined,
        target_perorangan: target_perorangan !== undefined ? (target_perorangan ? parseInt(target_perorangan) : null) : undefined,
        target_lembaga: target_lembaga !== undefined ? (target_lembaga ? parseInt(target_lembaga) : null) : undefined,
        nilai_anggaran: nilai_anggaran !== undefined ? Number(nilai_anggaran) : undefined,
        target_jan: target_jan !== undefined ? (target_jan ? Number(target_jan) : null) : undefined,
        target_feb: target_feb !== undefined ? (target_feb ? Number(target_feb) : null) : undefined,
        target_mar: target_mar !== undefined ? (target_mar ? Number(target_mar) : null) : undefined,
        target_apr: target_apr !== undefined ? (target_apr ? Number(target_apr) : null) : undefined,
        target_mei: target_mei !== undefined ? (target_mei ? Number(target_mei) : null) : undefined,
        target_jun: target_jun !== undefined ? (target_jun ? Number(target_jun) : null) : undefined,
        target_jul: target_jul !== undefined ? (target_jul ? Number(target_jul) : null) : undefined,
        target_agt: target_agt !== undefined ? (target_agt ? Number(target_agt) : null) : undefined,
        target_sep: target_sep !== undefined ? (target_sep ? Number(target_sep) : null) : undefined,
        target_okt: textOrNull(req.body.target_okt),
        target_nov: textOrNull(req.body.target_nov),
        target_des: textOrNull(req.body.target_des)
      }
    });

    res.status(200).json({ status: 'success', data: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

const textOrNull = (val: any) => {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  return Number(val);
};

export const deleteRkatPengumpulan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.rkatPengumpulan.delete({
      where: { id }
    });
    res.status(200).json({ status: 'success', message: 'RKAT Pengumpulan program deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

export const importRkatPengumpulan = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload must be an array of objects.' });
      return;
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      const no = String(row.no || '').trim();
      const namaProgram = String(row.nama_program || row['nama program'] || row['program'] || '').trim();
      const kategori = String(row.kategori || row['kategori program'] || 'Zakat').trim();

      if (!namaProgram) continue;

      const coaCodes = String(row.coa_codes || row['coa_codes'] || row['kode coa'] || row['kode_coa'] || row['coa'] || '').trim();
      const targetPerorangan = row.target_perorangan || row['target perorangan'] || row['perorangan'] || null;
      const targetLembaga = row.target_lembaga || row['target lembaga'] || row['lembaga'] || null;
      const nilaiAnggaranStr = String(row.nilai_anggaran || row['nilai anggaran'] || row['anggaran'] || '0').replace(/[^0-9.-]/g, '');
      const nilaiAnggaran = parseFloat(nilaiAnggaranStr) || 0;

      // Extract monthly targets
      const targetJan = parseVal(row.target_jan || row['target jan'] || row['januari']);
      const targetFeb = parseVal(row.target_feb || row['target feb'] || row['februari']);
      const targetMar = parseVal(row.target_mar || row['target mar'] || row['maret']);
      const targetApr = parseVal(row.target_apr || row['target apr'] || row['april']);
      const targetMei = parseVal(row.target_mei || row['target mei'] || row['mei']);
      const targetJun = parseVal(row.target_jun || row['target jun'] || row['juni']);
      const targetJul = parseVal(row.target_jul || row['target jul'] || row['juli']);
      const targetAgt = parseVal(row.target_agt || row['target agt'] || row['agustus']);
      const targetSep = parseVal(row.target_sep || row['target sep'] || row['september']);
      const targetOkt = parseVal(row.target_okt || row['target okt'] || row['oktober']);
      const targetNov = parseVal(row.target_nov || row['target nov'] || row['november']);
      const targetDes = parseVal(row.target_des || row['target des'] || row['desember']);

      // Look for match by no and namaProgram
      const existing = await prisma.rkatPengumpulan.findFirst({
        where: {
          OR: [
            { no: no && no !== "" ? no : undefined },
            { nama_program: namaProgram }
          ]
        }
      });

      const hasAnyImportedTarget = 
        targetJan !== null || targetFeb !== null || targetMar !== null || targetApr !== null || 
        targetMei !== null || targetJun !== null || targetJul !== null || targetAgt !== null || 
        targetSep !== null || targetOkt !== null || targetNov !== null || targetDes !== null;

      let finalJan = targetJan;
      let finalFeb = targetFeb;
      let finalMar = targetMar;
      let finalApr = targetApr;
      let finalMei = targetMei;
      let finalJun = targetJun;
      let finalJul = targetJul;
      let finalAgt = targetAgt;
      let finalSep = targetSep;
      let finalOkt = targetOkt;
      let finalNov = targetNov;
      let finalDes = targetDes;

      if (existing) {
        if (finalJan === null) finalJan = existing.target_jan !== null ? Number(existing.target_jan) : 0;
        if (finalFeb === null) finalFeb = existing.target_feb !== null ? Number(existing.target_feb) : 0;
        if (finalMar === null) finalMar = existing.target_mar !== null ? Number(existing.target_mar) : 0;
        if (finalApr === null) finalApr = existing.target_apr !== null ? Number(existing.target_apr) : 0;
        if (finalMei === null) finalMei = existing.target_mei !== null ? Number(existing.target_mei) : 0;
        if (finalJun === null) finalJun = existing.target_jun !== null ? Number(existing.target_jun) : 0;
        if (finalJul === null) finalJul = existing.target_jul !== null ? Number(existing.target_jul) : 0;
        if (finalAgt === null) finalAgt = existing.target_agt !== null ? Number(existing.target_agt) : 0;
        if (finalSep === null) finalSep = existing.target_sep !== null ? Number(existing.target_sep) : 0;
        if (finalOkt === null) finalOkt = existing.target_okt !== null ? Number(existing.target_okt) : 0;
        if (finalNov === null) finalNov = existing.target_nov !== null ? Number(existing.target_nov) : 0;
        if (finalDes === null) finalDes = existing.target_des !== null ? Number(existing.target_des) : 0;

        if (!hasAnyImportedTarget && nilaiAnggaran > 0) {
          const base = Math.floor(nilaiAnggaran / 12);
          const remainder = nilaiAnggaran - (base * 12);
          finalJan = base; finalFeb = base; finalMar = base; finalApr = base;
          finalMei = base; finalJun = base; finalJul = base; finalAgt = base;
          finalSep = base; finalOkt = base; finalNov = base; finalDes = base + remainder;
        }
      } else {
        const base = Math.floor(nilaiAnggaran / 12);
        const remainder = nilaiAnggaran - (base * 12);
        if (finalJan === null) finalJan = base;
        if (finalFeb === null) finalFeb = base;
        if (finalMar === null) finalMar = base;
        if (finalApr === null) finalApr = base;
        if (finalMei === null) finalMei = base;
        if (finalJun === null) finalJun = base;
        if (finalJul === null) finalJul = base;
        if (finalAgt === null) finalAgt = base;
        if (finalSep === null) finalSep = base;
        if (finalOkt === null) finalOkt = base;
        if (finalNov === null) finalNov = base;
        if (finalDes === null) finalDes = base + remainder;
      }

      if (existing) {
        await prisma.rkatPengumpulan.update({
          where: { id: existing.id },
          data: {
            no: no || existing.no,
            kategori,
            nama_program: namaProgram,
            coa_codes: coaCodes ? coaCodes : null,
            target_perorangan: targetPerorangan !== null ? parseInt(String(targetPerorangan)) : null,
            target_lembaga: targetLembaga !== null ? parseInt(String(targetLembaga)) : null,
            nilai_anggaran: nilaiAnggaran,
            target_jan: finalJan,
            target_feb: finalFeb,
            target_mar: finalMar,
            target_apr: finalApr,
            target_mei: finalMei,
            target_jun: finalJun,
            target_jul: finalJul,
            target_agt: finalAgt,
            target_sep: finalSep,
            target_okt: finalOkt,
            target_nov: finalNov,
            target_des: finalDes
          }
        });
        updatedCount++;
      } else {
        await prisma.rkatPengumpulan.create({
          data: {
            no: no || `P-${Date.now().toString().slice(-4)}`,
            kategori,
            nama_program: namaProgram,
            coa_codes: coaCodes || null,
            target_perorangan: targetPerorangan !== null ? parseInt(String(targetPerorangan)) : null,
            target_lembaga: targetLembaga !== null ? parseInt(String(targetLembaga)) : null,
            nilai_anggaran: nilaiAnggaran,
            target_jan: finalJan,
            target_feb: finalFeb,
            target_mar: finalMar,
            target_apr: finalApr,
            target_mei: finalMei,
            target_jun: finalJun,
            target_jul: finalJul,
            target_agt: finalAgt,
            target_sep: finalSep,
            target_okt: finalOkt,
            target_nov: finalNov,
            target_des: finalDes
          }
        });
        insertedCount++;
      }
    }

    res.status(200).json({ status: 'success', insertedCount, updatedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
};

const parseVal = (v: any) => {
  if (v === undefined || v === null || v === '') return null;
  const num = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
};
