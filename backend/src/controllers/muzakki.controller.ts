import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.muzakki.findMany({
      orderBy: { created_at: 'desc' }
    });
    const lastMigrationParam = await prisma.systemParameter.findUnique({
      where: { key: 'last_muzakki_migration_date' }
    });
    res.status(200).json({ 
      status: 'success', 
      data,
      last_migration_date: lastMigrationParam ? lastMigrationParam.value : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

const cleanString = (val: any): string | null => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === '' || str === 'null' || str === 'undefined') return null;
  return str;
};

export const createMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      kategori, 
      nama, 
      npwp, 
      zakat_per_bulan, 
      keterangan, 
      alamat, 
      telepon, 
      email, 
      status,

      // Perorangan
      nik, 
      tempat_lahir, 
      tanggal_lahir, 
      jenis_kelamin, 
      pekerjaan, 
      upz, 
      alamat_kantor, 
      handphone,
      no_rekening,

      // Lembaga
      no_pengukuhan, 
      tanggal_pengukuhan, 
      website, 
      jenis_lembaga, 
      fax, 
      cp_nama, 
      cp_telepon, 
      cp_email 
    } = req.body;

    const currentKategori = cleanString(kategori) || 'Perorangan';
    const finalNik = currentKategori === 'Perorangan' ? cleanString(nik) : null;
    const finalNpwz = cleanString(req.body.npwz);
    const finalNoRekening = cleanString(no_rekening);

    if (currentKategori === 'Perorangan') {
      if (!nama || !jenis_kelamin || !alamat || !handphone) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama, Jenis Kelamin, Alamat Rumah (Alamat), dan Handphone wajib diisi untuk kategori Perorangan.' 
        });
        return;
      }

      // Check if NIK already exists
      if (finalNik) {
        const existingNik = await prisma.muzakki.findUnique({
          where: { nik: finalNik }
        });
        if (existingNik) {
          res.status(400).json({ status: 'error', message: 'NIK sudah terdaftar.' });
          return;
        }
      }
    } else if (currentKategori === 'Lembaga') {
      if (!nama || !alamat || !telepon || !cp_nama || !cp_telepon) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama Lembaga (Nama), Alamat, Telepon, Nama Contact Person, dan Telepon Contact Person wajib diisi untuk kategori Lembaga.' 
        });
        return;
      }
    }

    // Check if NPWZ already exists
    if (finalNpwz) {
      const existingNpwz = await prisma.muzakki.findUnique({
        where: { npwz: finalNpwz }
      });
      if (existingNpwz) {
        res.status(400).json({ status: 'error', message: 'Nomor Pokok Wajib Zakat (NPWZ) sudah terdaftar.' });
        return;
      }
    }

    // Check if no_rekening already exists
    if (finalNoRekening) {
      const existingNoRekening = await prisma.muzakki.findUnique({
        where: { no_rekening: finalNoRekening }
      });
      if (existingNoRekening) {
        res.status(400).json({ status: 'error', message: 'Nomor Rekening sudah terdaftar.' });
        return;
      }
    }

    const newMuzakki = await prisma.muzakki.create({
      data: {
        npwz: finalNpwz,
        kategori: currentKategori,
        nama: String(nama).trim(),
        npwp: cleanString(npwp),
        zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : null,
        keterangan: cleanString(keterangan),
        alamat: String(alamat).trim(),
        telepon: cleanString(telepon),
        email: cleanString(email),
        status: cleanString(status) || 'Aktif',
        no_rekening: finalNoRekening,

        // Perorangan
        nik: finalNik,
        tempat_lahir: currentKategori === 'Perorangan' ? cleanString(tempat_lahir) : null,
        tanggal_lahir: currentKategori === 'Perorangan' ? cleanString(tanggal_lahir) : null,
        jenis_kelamin: currentKategori === 'Perorangan' ? cleanString(jenis_kelamin) : null,
        pekerjaan: currentKategori === 'Perorangan' ? cleanString(pekerjaan) : null,
        upz: cleanString(upz),
        alamat_kantor: currentKategori === 'Perorangan' ? cleanString(alamat_kantor) : null,
        handphone: currentKategori === 'Perorangan' ? cleanString(handphone) : null,

        // Lembaga
        no_pengukuhan: currentKategori === 'Lembaga' ? cleanString(no_pengukuhan) : null,
        tanggal_pengukuhan: currentKategori === 'Lembaga' ? cleanString(tanggal_pengukuhan) : null,
        website: currentKategori === 'Lembaga' ? cleanString(website) : null,
        jenis_lembaga: currentKategori === 'Lembaga' ? cleanString(jenis_lembaga) : null,
        fax: currentKategori === 'Lembaga' ? cleanString(fax) : null,
        cp_nama: currentKategori === 'Lembaga' ? cleanString(cp_nama) : null,
        cp_telepon: currentKategori === 'Lembaga' ? cleanString(cp_telepon) : null,
        cp_email: currentKategori === 'Lembaga' ? cleanString(cp_email) : null,
      }
    });

    res.status(201).json({ status: 'success', data: newMuzakki });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const updateMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { 
      kategori, 
      nama, 
      npwp, 
      zakat_per_bulan, 
      keterangan, 
      alamat, 
      telepon, 
      email, 
      status,

      // Perorangan
      nik, 
      tempat_lahir, 
      tanggal_lahir, 
      jenis_kelamin, 
      pekerjaan, 
      upz, 
      alamat_kantor, 
      handphone,
      no_rekening,

      // Lembaga
      no_pengukuhan, 
      tanggal_pengukuhan, 
      website, 
      jenis_lembaga, 
      fax, 
      cp_nama, 
      cp_telepon, 
      cp_email 
    } = req.body;

    const existing = await prisma.muzakki.findUnique({
      where: { id }
    });
    
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Data tidak ditemukan.' });
      return;
    }

    const currentKategori = kategori || existing.kategori;

    if (currentKategori === 'Perorangan') {
      const checkNama = nama !== undefined ? nama : existing.nama;
      const checkJenisKelamin = jenis_kelamin !== undefined ? jenis_kelamin : existing.jenis_kelamin;
      const checkAlamat = alamat !== undefined ? alamat : existing.alamat;
      const checkHandphone = handphone !== undefined ? handphone : existing.handphone;

      if (!checkNama || !checkJenisKelamin || !checkAlamat || !checkHandphone) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama, Jenis Kelamin, Alamat Rumah (Alamat), dan Handphone wajib diisi untuk kategori Perorangan.' 
        });
        return;
      }

      if (nik && nik !== existing.nik) {
        const existingNik = await prisma.muzakki.findUnique({
          where: { nik: String(nik) }
        });
        if (existingNik && existingNik.id !== id) {
          res.status(400).json({ status: 'error', message: 'NIK sudah terpakai oleh data lain.' });
          return;
        }
      }
    } else if (currentKategori === 'Lembaga') {
      const checkNama = nama !== undefined ? nama : existing.nama;
      const checkAlamat = alamat !== undefined ? alamat : existing.alamat;
      const checkTelepon = telepon !== undefined ? telepon : existing.telepon;
      const checkCpNama = cp_nama !== undefined ? cp_nama : existing.cp_nama;
      const checkCpTelepon = cp_telepon !== undefined ? cp_telepon : existing.cp_telepon;

      if (!checkNama || !checkAlamat || !checkTelepon || !checkCpNama || !checkCpTelepon) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama Lembaga (Nama), Alamat, Telepon, Nama Contact Person, dan Telepon Contact Person wajib diisi untuk kategori Lembaga.' 
        });
        return;
      }
    }

    if (req.body.npwz && req.body.npwz !== existing.npwz) {
      const existingNpwz = await prisma.muzakki.findUnique({
        where: { npwz: String(req.body.npwz) }
      });
      if (existingNpwz && existingNpwz.id !== id) {
        res.status(400).json({ status: 'error', message: 'Nomor Pokok Wajib Zakat (NPWZ) sudah terpakai oleh data lain.' });
        return;
      }
    }

    if (req.body.no_rekening !== undefined && req.body.no_rekening !== existing.no_rekening) {
      if (req.body.no_rekening) {
        const existingNoRek = await prisma.muzakki.findUnique({
          where: { no_rekening: String(req.body.no_rekening) }
        });
        if (existingNoRek && existingNoRek.id !== id) {
          res.status(400).json({ status: 'error', message: 'Nomor Rekening sudah terpakai oleh data lain.' });
          return;
        }
      }
    }

    const finalNik = currentKategori === 'Perorangan'
      ? (nik !== undefined ? cleanString(nik) : existing.nik)
      : null;
    const finalNpwz = req.body.npwz !== undefined ? cleanString(req.body.npwz) : existing.npwz;
    const finalNoRek = req.body.no_rekening !== undefined ? cleanString(req.body.no_rekening) : existing.no_rekening;

    const updated = await prisma.muzakki.update({
      where: { id },
      data: {
        npwz: finalNpwz,
        kategori: currentKategori,
        nama: nama ? String(nama).trim() : existing.nama,
        npwp: npwp !== undefined ? cleanString(npwp) : existing.npwp,
        zakat_per_bulan: zakat_per_bulan !== undefined ? (zakat_per_bulan ? Number(zakat_per_bulan) : null) : existing.zakat_per_bulan,
        keterangan: keterangan !== undefined ? cleanString(keterangan) : existing.keterangan,
        alamat: alamat ? String(alamat).trim() : existing.alamat,
        telepon: telepon !== undefined ? cleanString(telepon) : existing.telepon,
        email: email !== undefined ? cleanString(email) : existing.email,
        status: status ? cleanString(status) || 'Aktif' : existing.status,
        no_rekening: finalNoRek,

        // Perorangan
        nik: finalNik,
        tempat_lahir: currentKategori === 'Perorangan' ? (tempat_lahir !== undefined ? cleanString(tempat_lahir) : existing.tempat_lahir) : null,
        tanggal_lahir: currentKategori === 'Perorangan' ? (tanggal_lahir !== undefined ? cleanString(tanggal_lahir) : existing.tanggal_lahir) : null,
        jenis_kelamin: currentKategori === 'Perorangan' ? (jenis_kelamin !== undefined ? cleanString(jenis_kelamin) : existing.jenis_kelamin) : null,
        pekerjaan: currentKategori === 'Perorangan' ? (pekerjaan !== undefined ? cleanString(pekerjaan) : existing.pekerjaan) : null,
        upz: upz !== undefined ? cleanString(upz) : existing.upz,
        alamat_kantor: currentKategori === 'Perorangan' ? (alamat_kantor !== undefined ? cleanString(alamat_kantor) : existing.alamat_kantor) : null,
        handphone: currentKategori === 'Perorangan' ? (handphone !== undefined ? cleanString(handphone) : existing.handphone) : null,

        // Lembaga
        no_pengukuhan: currentKategori === 'Lembaga' ? (no_pengukuhan !== undefined ? cleanString(no_pengukuhan) : existing.no_pengukuhan) : null,
        tanggal_pengukuhan: currentKategori === 'Lembaga' ? (tanggal_pengukuhan !== undefined ? cleanString(tanggal_pengukuhan) : existing.tanggal_pengukuhan) : null,
        website: currentKategori === 'Lembaga' ? (website !== undefined ? cleanString(website) : existing.website) : null,
        jenis_lembaga: currentKategori === 'Lembaga' ? (jenis_lembaga !== undefined ? cleanString(jenis_lembaga) : existing.jenis_lembaga) : null,
        fax: currentKategori === 'Lembaga' ? (fax !== undefined ? cleanString(fax) : existing.fax) : null,
        cp_nama: currentKategori === 'Lembaga' ? (cp_nama !== undefined ? cleanString(cp_nama) : existing.cp_nama) : null,
        cp_telepon: currentKategori === 'Lembaga' ? (cp_telepon !== undefined ? cleanString(cp_telepon) : existing.cp_telepon) : null,
        cp_email: currentKategori === 'Lembaga' ? (cp_email !== undefined ? cleanString(cp_email) : existing.cp_email) : null,
      }
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const deleteMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.muzakki.delete({
      where: { id }
    });
    res.status(200).json({ status: 'success', message: 'Data berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const importMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload harus berupa array objek Excel.' });
      return;
    }

    let insertedCount = 0;
    let updatedCount = 0;

    // Load all existing Muzakki in a single query
    const existingMuzakkis = await prisma.muzakki.findMany({
      select: { id: true, nik: true, npwz: true, nama: true, kategori: true }
    });
    
    const nikMap = new Map();
    const npwzMap = new Map();
    const namaMap = new Map();
    
    for (const m of existingMuzakkis) {
      if (m.nik) nikMap.set(m.nik, m);
      if (m.npwz) npwzMap.set(m.npwz, m);
      if (m.kategori === 'Lembaga' && m.nama) {
        namaMap.set(m.nama.toLowerCase(), m);
      }
    }

    const inserts: any[] = [];

    // To prevent duplicate NIKs/NPWZs in the uploaded file itself
    const processedNIKsInUpload = new Set();
    const processedNPWZsInUpload = new Set();
    const processedLembagaNamesInUpload = new Set();

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      const nama = row.nama || row['nama lengkap'] || row['nama lembaga'] || row['name'] || 'Muzakki Tanpa Nama';
      const kategori = (row.kategori || '').toLowerCase() === 'lembaga' ? 'Lembaga' : 'Perorangan';
      const rawNpwzInput = row.npwz || row.nrm || row['no. register'] || row['no register'];
      const invalidNpwzs = ['-', '--', '---', 'none', 'null', 'undefined', 'n/a', 'tidak ada'];
      const npwz = (rawNpwzInput && !invalidNpwzs.includes(String(rawNpwzInput).toLowerCase().trim())) ? String(rawNpwzInput).trim() : null;
      const npwp = row.npwp || null;
      const zakat_per_bulan = row.zakat_per_bulan || row['zakat per bulan'] || null;
      const keterangan = row.keterangan || row.catatan || row.catatan_tambahan || null;
      const alamat = row.alamat || row['alamat rumah'] || row['alamat kantor'] || row.address || 'Tidak ada alamat';
      const telepon = row.telepon || row.telephone || null;
      const email = row.email || null;
      const status = row.status || 'Aktif';
      const no_rekening = row.no_rekening || row['no rekening'] || row['no. rekening'] || null;
      const upz = row.upz || null;

      if (kategori === 'Perorangan') {
        const nik = row.nik ? String(row.nik).trim() : null;
        if (!nik) continue; // NIK is mandatory for Perorangan in import
        
        // Skip duplicate NIKs in the import file itself to prevent database uniqueness errors
        if (processedNIKsInUpload.has(nik)) {
          continue;
        }
        processedNIKsInUpload.add(nik);

        const tempat_lahir = row.tempat_lahir || row['tempat lahir'] || null;
        const tanggal_lahir = row.tanggal_lahir || row['tanggal lahir'] || null;
        const jenis_kelamin = row.jenis_kelamin || row['jenis kelamin'] || 'Pria';
        const pekerjaan = row.pekerjaan || null;
        const alamat_kantor = row.alamat_kantor || row['alamat kantor'] || null;
        const handphone = row.handphone || row['handphone / wa'] || row.phone || null;

        const recordData = {
          kategori,
          npwz,
          nama: String(nama),
          nik,
          npwp: npwp ? String(npwp) : null,
          zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : null,
          keterangan: keterangan ? String(keterangan) : null,
          alamat: String(alamat),
          telepon: telepon ? String(telepon) : null,
          email: email ? String(email) : null,
          status: String(status),
          no_rekening: no_rekening ? String(no_rekening) : null,
          tempat_lahir: tempat_lahir ? String(tempat_lahir) : null,
          tanggal_lahir: tanggal_lahir ? String(tanggal_lahir) : null,
          jenis_kelamin: String(jenis_kelamin),
          pekerjaan: pekerjaan ? String(pekerjaan) : null,
          upz: upz ? String(upz) : null,
          alamat_kantor: alamat_kantor ? String(alamat_kantor) : null,
          handphone: handphone ? String(handphone) : null,
          no_pengukuhan: null,
          tanggal_pengukuhan: null,
          website: null,
          jenis_lembaga: null,
          fax: null,
          cp_nama: null,
          cp_telepon: null,
          cp_email: null,
        };

        const existing = nikMap.get(nik) || (npwz && npwzMap.get(npwz));
        if (existing) {
          continue;
        } else {
          inserts.push(recordData);
        }
      } else {
        // Lembaga
        const cp_nama = row.cp_nama || row['nama cp'] || row['nama contact person'] || row['contact person'] || null;
        const cp_telepon = row.cp_telepon || row['telepon cp'] || row['telepon contact person'] || null;
        const cp_email = row.cp_email || row['email cp'] || row['email contact person'] || null;
        const no_pengukuhan = row.no_pengukuhan || row['no pengukuhan'] || null;
        const tanggal_pengukuhan = row.tanggal_pengukuhan || row['tanggal pengukuhan'] || null;
        const website = row.website || null;
        const jenis_lembaga = row.jenis_lembaga || row['jenis lembaga'] || null;
        const fax = row.fax || null;

        // Skip duplicates in the import file itself
        const cacheKey = `${npwz}_${nama.toLowerCase()}`;
        if (processedLembagaNamesInUpload.has(cacheKey)) {
          continue;
        }
        processedLembagaNamesInUpload.add(cacheKey);

        const recordData = {
          kategori,
          npwz,
          nama: String(nama),
          nik: null,
          npwp: npwp ? String(npwp) : null,
          zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : null,
          keterangan: keterangan ? String(keterangan) : null,
          alamat: String(alamat),
          telepon: telepon ? String(telepon) : null,
          email: email ? String(email) : null,
          status: String(status),
          no_rekening: no_rekening ? String(no_rekening) : null,
          tempat_lahir: null,
          tanggal_lahir: null,
          jenis_kelamin: null,
          pekerjaan: null,
          upz: upz ? String(upz) : null,
          alamat_kantor: null,
          handphone: null,
          no_pengukuhan: no_pengukuhan ? String(no_pengukuhan) : null,
          tanggal_pengukuhan: tanggal_pengukuhan ? String(tanggal_pengukuhan) : null,
          website: website ? String(website) : null,
          jenis_lembaga: jenis_lembaga ? String(jenis_lembaga) : null,
          fax: fax ? String(fax) : null,
          cp_nama: cp_nama ? String(cp_nama) : null,
          cp_telepon: cp_telepon ? String(cp_telepon) : null,
          cp_email: cp_email ? String(cp_email) : null,
        };

        const existing = (npwz && npwzMap.get(npwz)) || namaMap.get(nama.toLowerCase());
        if (existing) {
          continue;
        } else {
          inserts.push(recordData);
        }
      }
    }

    // Execute bulk insertions in chunks to prevent database payload limits
    const chunkSize = 2000;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      await prisma.muzakki.createMany({
        data: chunk,
        skipDuplicates: true
      });
      insertedCount += chunk.length;
    }

    // Save last migration date as current date/time when imported
    const migrationDateStr = new Date().toISOString();
    await prisma.systemParameter.upsert({
      where: { key: 'last_muzakki_migration_date' },
      update: { value: migrationDateStr },
      create: { key: 'last_muzakki_migration_date', value: migrationDateStr, description: 'Tanggal registrasi/migrasi terakhir Data Muzakki' }
    });

    res.status(200).json({
      status: 'success',
      insertedCount,
      updatedCount
    });
  } catch (error) {
    console.error('Error importing Muzakki:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
