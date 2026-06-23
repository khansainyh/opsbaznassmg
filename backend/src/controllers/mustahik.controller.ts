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
    const {
      kategori,
      nik,
      nrm,
      nama,
      nama_pimpinan,
      jenis_lembaga,
      jumlah_anggota,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      pekerjaan,
      alamat,
      telepon,
      handphone,
      email,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      catatan,
      status_graduasi
    } = req.body;

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

    const isLembaga = (kategori || existing.kategori) === 'Lembaga';
    const parsedJumlahAnggota = jumlah_anggota !== undefined ? parseInt(String(jumlah_anggota), 10) : existing.jumlah_anggota;

    const updated = await prisma.mustahik.update({
      where: { id },
      data: {
        kategori: kategori !== undefined ? String(kategori) : existing.kategori,
        nik: nik !== undefined ? (nik ? String(nik) : null) : existing.nik,
        nrm: nrm !== undefined ? (nrm ? String(nrm) : null) : existing.nrm,
        nama: nama !== undefined ? String(nama) : existing.nama,
        nama_pimpinan: nama_pimpinan !== undefined ? (nama_pimpinan ? String(nama_pimpinan) : null) : existing.nama_pimpinan,
        jenis_lembaga: jenis_lembaga !== undefined ? (jenis_lembaga ? String(jenis_lembaga) : null) : existing.jenis_lembaga,
        jumlah_anggota: parsedJumlahAnggota,
        tempat_lahir: tempat_lahir !== undefined ? (tempat_lahir ? String(tempat_lahir) : null) : existing.tempat_lahir,
        tanggal_lahir: tanggal_lahir !== undefined ? (tanggal_lahir ? String(tanggal_lahir) : null) : existing.tanggal_lahir,
        jenis_kelamin: jenis_kelamin !== undefined ? (jenis_kelamin ? String(jenis_kelamin) : null) : existing.jenis_kelamin,
        pekerjaan: pekerjaan !== undefined ? (pekerjaan ? String(pekerjaan) : null) : existing.pekerjaan,
        alamat: alamat !== undefined ? (alamat ? String(alamat) : null) : existing.alamat,
        telepon: telepon !== undefined ? (telepon ? String(telepon) : null) : existing.telepon,
        handphone: handphone !== undefined ? (handphone ? String(handphone) : null) : existing.handphone,
        email: email !== undefined ? (email ? String(email) : null) : existing.email,
        provinsi: provinsi !== undefined ? (provinsi ? String(provinsi) : null) : existing.provinsi,
        kabupaten: kabupaten !== undefined ? (kabupaten ? String(kabupaten) : null) : existing.kabupaten,
        kecamatan: kecamatan !== undefined ? (kecamatan ? String(kecamatan) : null) : existing.kecamatan,
        kelurahan: kelurahan !== undefined ? (kelurahan ? String(kelurahan) : null) : existing.kelurahan,
        catatan: catatan !== undefined ? (catatan ? String(catatan) : "") : existing.catatan,
        status_graduasi: status_graduasi !== undefined ? String(status_graduasi) : existing.status_graduasi
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
    
    await prisma.$transaction(async (tx) => {
      // Disconnect related proposals
      await tx.proposal.updateMany({
        where: { mustahik_id: id },
        data: { mustahik_id: null }
      });

      // Delete mustahik
      await tx.mustahik.delete({ where: { id } });
    });

    res.status(200).json({ status: 'success', message: 'Data berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting Mustahik:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const createMustahik = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      kategori,
      nik,
      nrm,
      nama,
      nama_pimpinan,
      jenis_lembaga,
      jumlah_anggota,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      pekerjaan,
      alamat,
      telepon,
      handphone,
      email,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      catatan,
      status_graduasi
    } = req.body;

    const isLembaga = kategori === 'Lembaga';

    if (isLembaga) {
      if (!nama || !nik || !nama_pimpinan || !jenis_lembaga || !alamat || !telepon) {
        res.status(400).json({ status: 'error', message: 'Field Nama Lembaga, NIK Pimpinan, Nama Pimpinan, Jenis Lembaga, Alamat, dan Telepon wajib diisi.' });
        return;
      }
    } else {
      if (!nama || !nik || !jenis_kelamin || !alamat || !telepon) {
        res.status(400).json({ status: 'error', message: 'Field Nama, NIK, Jenis Kelamin, Alamat, dan Telepon wajib diisi.' });
        return;
      }
    }

    if (nik) {
      const existingNik = await prisma.mustahik.findUnique({ where: { nik: String(nik) } });
      if (existingNik) {
        res.status(400).json({ status: 'error', message: isLembaga ? 'NIK Pimpinan sudah terdaftar.' : 'NIK sudah terdaftar.' });
        return;
      }
    }
    
    if (nrm) {
      const existingNrm = await prisma.mustahik.findUnique({ where: { nrm: String(nrm) } });
      if (existingNrm) {
        res.status(400).json({ status: 'error', message: 'NRM sudah terdaftar.' });
        return;
      }
    }

    const parsedJumlahAnggota = jumlah_anggota ? parseInt(String(jumlah_anggota), 10) : 0;

    const newData = await prisma.mustahik.create({
      data: {
        kategori: kategori || 'Perorangan',
        nik: nik ? String(nik) : null,
        nrm: nrm ? String(nrm) : null,
        nama: String(nama),
        nama_pimpinan: isLembaga ? String(nama_pimpinan) : null,
        jenis_lembaga: isLembaga ? String(jenis_lembaga) : null,
        jumlah_anggota: isLembaga ? parsedJumlahAnggota : 0,
        tempat_lahir: !isLembaga && tempat_lahir ? String(tempat_lahir) : null,
        tanggal_lahir: !isLembaga && tanggal_lahir ? String(tanggal_lahir) : null,
        jenis_kelamin: !isLembaga && jenis_kelamin ? String(jenis_kelamin) : null,
        pekerjaan: !isLembaga && pekerjaan ? String(pekerjaan) : null,
        alamat: alamat ? String(alamat) : null,
        telepon: telepon ? String(telepon) : null,
        handphone: !isLembaga && handphone ? String(handphone) : null,
        email: email ? String(email) : null,
        provinsi: provinsi ? String(provinsi) : null,
        kabupaten: kabupaten ? String(kabupaten) : null,
        kecamatan: kecamatan ? String(kecamatan) : null,
        kelurahan: kelurahan ? String(kelurahan) : null,
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
    const {
      kategori,
      nik,
      nama,
      nama_pimpinan,
      jenis_lembaga,
      jumlah_anggota,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      pekerjaan,
      alamat,
      telepon,
      handphone,
      email,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      catatan
    } = req.body;

    const isLembaga = kategori === 'Lembaga';

    if (isLembaga) {
      if (!nik || !nama || !nama_pimpinan || !jenis_lembaga || !alamat || !telepon) {
        res.status(400).json({ status: 'error', message: 'Field NIK Pimpinan, Nama Lembaga, Nama Pimpinan, Jenis Lembaga, Alamat, dan Telepon wajib diisi.' });
        return;
      }
    } else {
      if (!nik || !nama || !jenis_kelamin || !alamat || !telepon) {
        res.status(400).json({ status: 'error', message: 'Field NIK, Nama, Jenis Kelamin, Alamat, dan Telepon wajib diisi.' });
        return;
      }
    }

    // Check if NIK already exists
    const existing = await prisma.mustahik.findUnique({ where: { nik: String(nik) } });
    if (existing) {
      // Already exists — just return the id (don't duplicate)
      res.status(200).json({ status: 'exists', mustahik_id: existing.id, nama: existing.nama });
      return;
    }

    const parsedJumlahAnggota = jumlah_anggota ? parseInt(String(jumlah_anggota), 10) : 0;

    const newMustahik = await prisma.mustahik.create({
      data: {
        kategori: kategori || 'Perorangan',
        nik: String(nik),
        nrm: null, // Will be assigned after SIMBA processing
        nama: String(nama),
        nama_pimpinan: isLembaga ? String(nama_pimpinan) : null,
        jenis_lembaga: isLembaga ? String(jenis_lembaga) : null,
        jumlah_anggota: isLembaga ? parsedJumlahAnggota : 0,
        tempat_lahir: !isLembaga && tempat_lahir ? String(tempat_lahir) : null,
        tanggal_lahir: !isLembaga && tanggal_lahir ? String(tanggal_lahir) : null,
        jenis_kelamin: !isLembaga && jenis_kelamin ? String(jenis_kelamin) : null,
        pekerjaan: !isLembaga && pekerjaan ? String(pekerjaan) : null,
        alamat: String(alamat),
        telepon: String(telepon),
        handphone: !isLembaga && handphone ? String(handphone) : null,
        email: email ? String(email) : null,
        provinsi: provinsi ? String(provinsi) : null,
        kabupaten: kabupaten ? String(kabupaten) : null,
        kecamatan: kecamatan ? String(kecamatan) : null,
        kelurahan: kelurahan ? String(kelurahan) : null,
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
          jenis_pengajuan: 'Perorangan',
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
      message: 'NIK terverifikasi. Tidak ada riwayat bantuan dalam 1 tahun terakhir.' 
    });
  } catch (error) {
    console.error('Error checking NIK:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
