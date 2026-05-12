import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const importMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload must be an array of objects.' });
      return;
    }

    const groupedByNik: Record<string, any[]> = {};
    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      if (row.nik === undefined || row.nik === null) continue;
      const nikKey = String(row.nik).trim();
      if (!nikKey || nikKey === '') continue;

      if (!groupedByNik[nikKey]) groupedByNik[nikKey] = [];
      groupedByNik[nikKey].push(row);
    }

    const recordsToProcess: any[] = [];
    
    for (const nik of Object.keys(groupedByNik)) {
      const rows = groupedByNik[nik];
      rows.sort((a, b) => {
        const dateA = new Date(a.tanggal || a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.tanggal || b.created_at || b.date || 0).getTime();
        return dateA - dateB;
      });

      const oldestRow = rows[0];
      const selectedNrm = oldestRow.nrm || oldestRow['no. register mustahik (nrm)'] || oldestRow['no. register'];
      
      recordsToProcess.push({
        nik: String(nik),
        nrm: selectedNrm ? String(selectedNrm).trim() : null,
        nama: oldestRow.nama || oldestRow.name || 'Tanpa Nama',
        tempat_lahir: oldestRow.tempat_lahir || oldestRow['tempat lahir'] || 'Tidak Diketahui',
        tanggal_lahir: oldestRow.tanggal_lahir || oldestRow['tanggal lahir'] || '1970-01-01',
        jenis_kelamin: oldestRow.jenis_kelamin || oldestRow['jenis kelamin'] || 'Laki-laki',
        pekerjaan: oldestRow.pekerjaan || null,
        alamat: oldestRow.alamat || oldestRow.address || 'Tidak ada alamat',
        handphone: oldestRow.handphone || oldestRow['no telpon'] || oldestRow['no. telpon'] || '0800000000',
        email: oldestRow.email || 'tanpa_email@example.com',
        catatan: oldestRow.catatan || '',
        status_graduasi: 'Belum'
      });
    }

    // Separate NIKs: existing with null nrm (need UPDATE), truly new NIKs (need INSERT)
    const existingRecords = await prisma.mustahik.findMany({
      where: { nik: { in: recordsToProcess.map((r) => r.nik) } },
      select: { id: true, nik: true, nrm: true }
    });
    const existingNikMap = new Map(existingRecords.map(r => [r.nik, r]));

    // Also check for NRM collisions among truly new records
    const newRecords = recordsToProcess.filter(r => !existingNikMap.has(r.nik) && r.nrm);
    const existingNrms = await prisma.mustahik.findMany({
      where: { nrm: { in: newRecords.map(r => r.nrm as string) } },
      select: { nrm: true }
    });
    const existingNrmSet = new Set(existingNrms.map(r => r.nrm));

    let insertedCount = 0;
    let updatedCount = 0;
    let duplicatesFound = 0;
    let nrmDuplicates = 0;
    const readyToInsert: any[] = [];
    const usedNrms = new Set(existingNrms.map(r => r.nrm));

    for (const r of recordsToProcess) {
      const existing = existingNikMap.get(r.nik);

      if (existing) {
        // NIK already exists
        if (existing.nrm === null && r.nrm) {
          // Auto-registered mustahik (from proposal) → update with SIMBA data
          await prisma.mustahik.update({
            where: { id: existing.id },
            data: {
              nrm: r.nrm,
              nama: r.nama,
              tempat_lahir: r.tempat_lahir,
              tanggal_lahir: r.tanggal_lahir,
              jenis_kelamin: r.jenis_kelamin,
              pekerjaan: r.pekerjaan,
              alamat: r.alamat,
              handphone: r.handphone,
              email: r.email,
              catatan: r.catatan,
              status_graduasi: r.status_graduasi
            }
          });
          updatedCount++;
        } else {
          // NIK exists and already has NRM → skip
          duplicatesFound++;
        }
      } else {
        // Truly new NIK
        if (r.nrm && usedNrms.has(r.nrm)) {
          nrmDuplicates++;
        } else {
          readyToInsert.push(r);
          if (r.nrm) usedNrms.add(r.nrm);
        }
      }
    }

    if (readyToInsert.length > 0) {
      const result = await prisma.mustahik.createMany({
        data: readyToInsert,
        skipDuplicates: true
      });
      insertedCount = result.count;
    }

    res.status(200).json({
      status: 'success',
      insertedCount,
      updatedCount,
      duplicatesFound,
      nrmDuplicates,
      warnings: []
    });
  } catch (error) {
    console.error('Error importing Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const getMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.mustahik.findMany({
      orderBy: { created_at: 'desc' },
      include: { proposals: { include: { program: true } } }
    });
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const updateMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { nik, nrm, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pekerjaan, alamat, handphone, email, catatan, kategori, status_graduasi } = req.body;

    const existing = await prisma.mustahik.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Data tidak ditemukan.' });
      return;
    }

    if (nik && nik !== existing.nik) {
      const checkNik = await prisma.mustahik.findUnique({ where: { nik: String(nik) } });
      if (checkNik) {
        res.status(400).json({ status: 'error', message: 'NIK sudah terpakai oleh data lain.' });
        return;
      }
    }

    if (nrm && nrm !== existing.nrm) {
      const checkNrm = await prisma.mustahik.findUnique({ where: { nrm: String(nrm) } });
      if (checkNrm) {
        res.status(400).json({ status: 'error', message: 'NRM sudah terpakai oleh data lain.' });
        return;
      }
    }

    const updated = await prisma.mustahik.update({
      where: { id },
      data: {
        nik: nik ? String(nik) : existing.nik,
        nrm: nrm ? String(nrm) : existing.nrm,
        nama: nama ? String(nama) : existing.nama,
        tempat_lahir: tempat_lahir ? String(tempat_lahir) : existing.tempat_lahir,
        tanggal_lahir: tanggal_lahir ? String(tanggal_lahir) : existing.tanggal_lahir,
        jenis_kelamin: jenis_kelamin ? String(jenis_kelamin) : existing.jenis_kelamin,
        pekerjaan: pekerjaan !== undefined ? (pekerjaan ? String(pekerjaan) : null) : existing.pekerjaan,
        alamat: alamat !== undefined ? (alamat ? String(alamat) : "") : existing.alamat,
        handphone: handphone ? String(handphone) : existing.handphone,
        email: email !== undefined ? (email ? String(email) : null) : existing.email,
        catatan: catatan !== undefined ? (catatan ? String(catatan) : "") : existing.catatan,
        status_graduasi: status_graduasi ? String(status_graduasi) : existing.status_graduasi
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Error updating Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const deleteMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.mustahik.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Data berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const createMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nik, nrm, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pekerjaan, alamat, handphone, email, catatan, status_graduasi } = req.body;
    
    if (!nik || !nama || !tempat_lahir || !tanggal_lahir || !jenis_kelamin || !alamat || !handphone) {
      res.status(400).json({ status: 'error', message: 'Field NIK, Nama, Tempat Lahir, Tanggal Lahir, Jenis Kelamin, Alamat, dan Handphone wajib diisi.' });
      return;
    }

    const existingNik = await prisma.mustahik.findUnique({ where: { nik: String(nik) } });
    if (existingNik) {
      res.status(400).json({ status: 'error', message: 'NIK sudah terdaftar.' });
      return;
    }
    
    if (nrm) {
      const existingNrm = await prisma.mustahik.findUnique({ where: { nrm: String(nrm) } });
      if (existingNrm) {
        res.status(400).json({ status: 'error', message: 'NRM sudah terdaftar.' });
        return;
      }
    }

    const newData = await prisma.mustahik.create({
      data: {
        nik: String(nik),
        nrm: nrm ? String(nrm) : null,
        nama: String(nama),
        tempat_lahir: String(tempat_lahir),
        tanggal_lahir: String(tanggal_lahir),
        jenis_kelamin: String(jenis_kelamin),
        pekerjaan: pekerjaan ? String(pekerjaan) : null,
        alamat: String(alamat),
        handphone: String(handphone),
        email: email ? String(email) : null,
        catatan: catatan ? String(catatan) : '',
        status_graduasi: status_graduasi ? String(status_graduasi) : 'Belum'
      }
    });

    res.status(201).json({ status: 'success', data: newData });
  } catch (error) {
    console.error('Error creating Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

// Auto-register a new Mustahik from a proposal submission (NIK not yet in DB)
export const autoRegisterMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pekerjaan, alamat, handphone, email, catatan } = req.body;
    if (!nik || !nama || !tempat_lahir || !tanggal_lahir || !jenis_kelamin || !alamat || !handphone) {
      res.status(400).json({ status: 'error', message: 'Field NIK, Nama, Tempat Lahir, Tanggal Lahir, Jenis Kelamin, Alamat, dan Handphone wajib diisi.' });
      return;
    }

    // Check if NIK already exists
    const existing = await prisma.mustahik.findUnique({ where: { nik: String(nik) } });
    if (existing) {
      // Already exists — just return the id (don't duplicate)
      res.status(200).json({ status: 'exists', mustahik_id: existing.id, nama: existing.nama });
      return;
    }

    const newMustahik = await prisma.mustahik.create({
      data: {
        nik: String(nik),
        nrm: null, // Will be assigned after SIMBA processing
        nama: String(nama),
        tempat_lahir: String(tempat_lahir),
        tanggal_lahir: String(tanggal_lahir),
        jenis_kelamin: String(jenis_kelamin),
        pekerjaan: pekerjaan ? String(pekerjaan) : null,
        alamat: String(alamat),
        handphone: String(handphone),
        email: email ? String(email) : null,
        catatan: catatan ? String(catatan) : '',
        status_graduasi: 'Belum'
      }
    });

    res.status(201).json({ status: 'success', mustahik_id: newMustahik.id, nama: newMustahik.nama });
  } catch (error) {
    console.error('Error auto-registering Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const importRiwayatBantuan = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload must be an array.' });
      return;
    }

    let inserted = 0;
    let skipped = 0;

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      if (row.nik === undefined || row.nik === null || String(row.nik).trim() === '') {
        skipped++;
        continue;
      }

      const mustahik = await prisma.mustahik.findUnique({ where: { nik: String(row.nik).trim() } });
      if (!mustahik) {
        skipped++;
        continue;
      }

      await prisma.proposal.create({
        data: {
          mustahik_id: mustahik.id,
          nama_pemohon: mustahik.nama,
          jenis_pengajuan: 'Individu',
          jenis_permohonan: row.kode_program || row.program || null,
          tanggal_masuk: row.tanggal ? new Date(row.tanggal) : new Date(),
          status: 'Selesai',
          keterangan: 'Migrasi Riwayat: ' + (row.keterangan || row.jenis_bantuan || row.jenis || 'Bantuan Historis')
        }
      });
      inserted++;
    }

    res.status(200).json({ status: 'success', insertedCount: inserted, skippedCount: skipped });
  } catch (error) {
    console.error('Error importing Riwayat:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const cekBantuanNik = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nik } = req.params;
    const mustahik = await prisma.mustahik.findUnique({ 
       where: { nik: String(nik) },
       include: {
         proposals: {
           where: { status: { in: ['Selesai', 'Pencairan_Dana'] } },
           orderBy: { updated_at: 'desc' },
           take: 1,
           include: { program: true }
         }
       }
    });

    // Case 1: NIK belum pernah terdaftar sama sekali
    if (!mustahik) {
      res.status(200).json({ 
        status: 'new', 
        message: 'NIK belum terdaftar. Mustahik baru akan didaftarkan otomatis saat proposal disimpan.' 
      });
      return;
    }

    // Case 2: NIK terdaftar tapi NRM masih kosong (dari auto-register proposal sebelumnya)
    if (!mustahik.nrm) {
      res.status(200).json({ 
        status: 'pending_nrm',
        mustahik_id: mustahik.id,
        nama: mustahik.nama,
        message: `NIK terdaftar (${mustahik.nama}) namun belum memiliki NRM — menunggu proses SIMBA.`
      });
      return;
    }

    // Case 3 & 4: NIK ada, NRM ada — cek riwayat bantuan 1 tahun
    if (mustahik.proposals.length > 0) {
       const proposalData = mustahik.proposals[0];
       const lastDate = new Date(proposalData.updated_at);
       const oneYearAgo = new Date();
       oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

       if (lastDate > oneYearAgo) {
          const jenisBantuanLabel = proposalData.program?.name || proposalData.keterangan || 'Bantuan';
          res.status(200).json({ 
            status: 'warning', 
            mustahik_id: mustahik.id,
            nama: mustahik.nama,
            last_bantuan: proposalData,
            message: `Peringatan: ${mustahik.nama} baru menerima bantuan pada ${lastDate.toLocaleDateString('id-ID')} (${jenisBantuanLabel}).` 
          });
          return;
       }
    }

    res.status(200).json({ 
      status: 'success', 
      mustahik_id: mustahik.id,
      nama: mustahik.nama,
      message: 'Aman, belum ada histori bantuan dalam 1 tahun terakhir.' 
    });
  } catch (error) {
    console.error('Error checking NIK:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
