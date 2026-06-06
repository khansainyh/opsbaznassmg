import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.muzakki.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
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

    const currentKategori = kategori || 'Perorangan';

    if (currentKategori === 'Perorangan') {
      if (!nama || !nik || !jenis_kelamin || !alamat || !handphone) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama, NIK, Jenis Kelamin, Alamat Rumah (Alamat), dan Handphone wajib diisi untuk kategori Perorangan.' 
        });
        return;
      }

      // Check if NIK already exists
      const existingNik = await prisma.muzakki.findUnique({
        where: { nik: String(nik) }
      });
      if (existingNik) {
        res.status(400).json({ status: 'error', message: 'NIK sudah terdaftar.' });
        return;
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

    const finalNpwz = req.body.npwz ? String(req.body.npwz) : null;
    
    // Check if NPWZ already exists if custom one is provided
    if (finalNpwz) {
      const existingNpwz = await prisma.muzakki.findUnique({
        where: { npwz: finalNpwz }
      });
      if (existingNpwz) {
        res.status(400).json({ status: 'error', message: 'Nomor Pokok Wajib Zakat (NPWZ) sudah terdaftar.' });
        return;
      }
    }

    const newMuzakki = await prisma.muzakki.create({
      data: {
        npwz: finalNpwz,
        kategori: currentKategori,
        nama: String(nama),
        npwp: npwp ? String(npwp) : null,
        zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : null,
        keterangan: keterangan ? String(keterangan) : null,
        alamat: String(alamat),
        telepon: telepon ? String(telepon) : null,
        email: email ? String(email) : null,
        status: status ? String(status) : 'Aktif',

        // Perorangan
        nik: currentKategori === 'Perorangan' ? String(nik) : null,
        tempat_lahir: currentKategori === 'Perorangan' && tempat_lahir ? String(tempat_lahir) : null,
        tanggal_lahir: currentKategori === 'Perorangan' && tanggal_lahir ? String(tanggal_lahir) : null,
        jenis_kelamin: currentKategori === 'Perorangan' && jenis_kelamin ? String(jenis_kelamin) : null,
        pekerjaan: currentKategori === 'Perorangan' && pekerjaan ? String(pekerjaan) : null,
        upz: currentKategori === 'Perorangan' && upz ? String(upz) : null,
        alamat_kantor: currentKategori === 'Perorangan' && alamat_kantor ? String(alamat_kantor) : null,
        handphone: currentKategori === 'Perorangan' && handphone ? String(handphone) : null,

        // Lembaga
        no_pengukuhan: currentKategori === 'Lembaga' && no_pengukuhan ? String(no_pengukuhan) : null,
        tanggal_pengukuhan: currentKategori === 'Lembaga' && tanggal_pengukuhan ? String(tanggal_pengukuhan) : null,
        website: currentKategori === 'Lembaga' && website ? String(website) : null,
        jenis_lembaga: currentKategori === 'Lembaga' && jenis_lembaga ? String(jenis_lembaga) : null,
        fax: currentKategori === 'Lembaga' && fax ? String(fax) : null,
        cp_nama: currentKategori === 'Lembaga' && cp_nama ? String(cp_nama) : null,
        cp_telepon: currentKategori === 'Lembaga' && cp_telepon ? String(cp_telepon) : null,
        cp_email: currentKategori === 'Lembaga' && cp_email ? String(cp_email) : null,
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
      const checkNik = nik !== undefined ? nik : existing.nik;
      const checkJenisKelamin = jenis_kelamin !== undefined ? jenis_kelamin : existing.jenis_kelamin;
      const checkAlamat = alamat !== undefined ? alamat : existing.alamat;
      const checkHandphone = handphone !== undefined ? handphone : existing.handphone;

      if (!checkNama || !checkNik || !checkJenisKelamin || !checkAlamat || !checkHandphone) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Nama, NIK, Jenis Kelamin, Alamat Rumah (Alamat), dan Handphone wajib diisi untuk kategori Perorangan.' 
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

    const updated = await prisma.muzakki.update({
      where: { id },
      data: {
        npwz: req.body.npwz || existing.npwz,
        kategori: currentKategori,
        nama: nama ? String(nama) : existing.nama,
        npwp: npwp !== undefined ? (npwp ? String(npwp) : null) : existing.npwp,
        zakat_per_bulan: zakat_per_bulan !== undefined ? (zakat_per_bulan ? Number(zakat_per_bulan) : null) : existing.zakat_per_bulan,
        keterangan: keterangan !== undefined ? (keterangan ? String(keterangan) : null) : existing.keterangan,
        alamat: alamat ? String(alamat) : existing.alamat,
        telepon: telepon !== undefined ? (telepon ? String(telepon) : null) : existing.telepon,
        email: email !== undefined ? (email ? String(email) : null) : existing.email,
        status: status ? String(status) : existing.status,

        // Perorangan
        nik: currentKategori === 'Perorangan' ? (nik ? String(nik) : existing.nik) : null,
        tempat_lahir: currentKategori === 'Perorangan' ? (tempat_lahir !== undefined ? (tempat_lahir ? String(tempat_lahir) : null) : existing.tempat_lahir) : null,
        tanggal_lahir: currentKategori === 'Perorangan' ? (tanggal_lahir !== undefined ? (tanggal_lahir ? String(tanggal_lahir) : null) : existing.tanggal_lahir) : null,
        jenis_kelamin: currentKategori === 'Perorangan' ? (jenis_kelamin !== undefined ? (jenis_kelamin ? String(jenis_kelamin) : null) : existing.jenis_kelamin) : null,
        pekerjaan: currentKategori === 'Perorangan' ? (pekerjaan !== undefined ? (pekerjaan ? String(pekerjaan) : null) : existing.pekerjaan) : null,
        upz: currentKategori === 'Perorangan' ? (upz !== undefined ? (upz ? String(upz) : null) : existing.upz) : null,
        alamat_kantor: currentKategori === 'Perorangan' ? (alamat_kantor !== undefined ? (alamat_kantor ? String(alamat_kantor) : null) : existing.alamat_kantor) : null,
        handphone: currentKategori === 'Perorangan' ? (handphone ? String(handphone) : existing.handphone) : null,

        // Lembaga
        no_pengukuhan: currentKategori === 'Lembaga' ? (no_pengukuhan !== undefined ? (no_pengukuhan ? String(no_pengukuhan) : null) : existing.no_pengukuhan) : null,
        tanggal_pengukuhan: currentKategori === 'Lembaga' ? (tanggal_pengukuhan !== undefined ? (tanggal_pengukuhan ? String(tanggal_pengukuhan) : null) : existing.tanggal_pengukuhan) : null,
        website: currentKategori === 'Lembaga' ? (website !== undefined ? (website ? String(website) : null) : existing.website) : null,
        jenis_lembaga: currentKategori === 'Lembaga' ? (jenis_lembaga !== undefined ? (jenis_lembaga ? String(jenis_lembaga) : null) : existing.jenis_lembaga) : null,
        fax: currentKategori === 'Lembaga' ? (fax !== undefined ? (fax ? String(fax) : null) : existing.fax) : null,
        cp_nama: currentKategori === 'Lembaga' ? (cp_nama !== undefined ? (cp_nama ? String(cp_nama) : null) : existing.cp_nama) : null,
        cp_telepon: currentKategori === 'Lembaga' ? (cp_telepon !== undefined ? (cp_telepon ? String(cp_telepon) : null) : existing.cp_telepon) : null,
        cp_email: currentKategori === 'Lembaga' ? (cp_email !== undefined ? (cp_email ? String(cp_email) : null) : existing.cp_email) : null,
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

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      const nama = row.nama || row['nama lengkap'] || row['nama lembaga'] || row['name'] || 'Muzakki Tanpa Nama';
      const kategori = (row.kategori || '').toLowerCase() === 'lembaga' ? 'Lembaga' : 'Perorangan';
      const npwz = row.npwz || row.nrm || row['no. register'] || row['no register'] || `WZ-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
      const npwp = row.npwp || null;
      const zakat_per_bulan = row.zakat_per_bulan || row['zakat per bulan'] || null;
      const keterangan = row.keterangan || row.catatan || row.catatan_tambahan || null;
      const alamat = row.alamat || row['alamat rumah'] || row['alamat kantor'] || row.address || 'Tidak ada alamat';
      const telepon = row.telepon || row.telephone || null;
      const email = row.email || null;
      const status = row.status || 'Aktif';

      if (kategori === 'Perorangan') {
        const nik = row.nik ? String(row.nik).trim() : null;
        if (!nik) continue; // NIK is mandatory for Perorangan in import

        const tempat_lahir = row.tempat_lahir || row['tempat lahir'] || null;
        const tanggal_lahir = row.tanggal_lahir || row['tanggal lahir'] || null;
        const jenis_kelamin = row.jenis_kelamin || row['jenis kelamin'] || 'Pria';
        const pekerjaan = row.pekerjaan || null;
        const upz = row.upz || null;
        const alamat_kantor = row.alamat_kantor || row['alamat kantor'] || null;
        const handphone = row.handphone || row['handphone / wa'] || row.phone || null;

        await prisma.muzakki.upsert({
          where: { nik },
          update: {
            npwz,
            nama: String(nama),
            npwp: npwp ? String(npwp) : undefined,
            zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : undefined,
            keterangan: keterangan ? String(keterangan) : undefined,
            alamat: String(alamat),
            telepon: telepon ? String(telepon) : undefined,
            email: email ? String(email) : undefined,
            status: String(status),
            tempat_lahir: tempat_lahir ? String(tempat_lahir) : undefined,
            tanggal_lahir: tanggal_lahir ? String(tanggal_lahir) : undefined,
            jenis_kelamin: String(jenis_kelamin),
            pekerjaan: pekerjaan ? String(pekerjaan) : undefined,
            upz: upz ? String(upz) : undefined,
            alamat_kantor: alamat_kantor ? String(alamat_kantor) : undefined,
            handphone: handphone ? String(handphone) : undefined,
          },
          create: {
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
            tempat_lahir: tempat_lahir ? String(tempat_lahir) : null,
            tanggal_lahir: tanggal_lahir ? String(tanggal_lahir) : null,
            jenis_kelamin: String(jenis_kelamin),
            pekerjaan: pekerjaan ? String(pekerjaan) : null,
            upz: upz ? String(upz) : null,
            alamat_kantor: alamat_kantor ? String(alamat_kantor) : null,
            handphone: handphone ? String(handphone) : null,
          }
        });
        insertedCount++;
      } else {
        // Lembaga: upsert by NPWZ or Name
        const cp_nama = row.cp_nama || row['nama cp'] || row['nama contact person'] || row['contact person'] || null;
        const cp_telepon = row.cp_telepon || row['telepon cp'] || row['telepon contact person'] || null;
        const cp_email = row.cp_email || row['email cp'] || row['email contact person'] || null;
        const no_pengukuhan = row.no_pengukuhan || row['no pengukuhan'] || null;
        const tanggal_pengukuhan = row.tanggal_pengukuhan || row['tanggal pengukuhan'] || null;
        const website = row.website || null;
        const jenis_lembaga = row.jenis_lembaga || row['jenis lembaga'] || null;
        const fax = row.fax || null;

        // Try to check by NPWZ or Name
        const existingLembaga = await prisma.muzakki.findFirst({
          where: {
            OR: [
              { npwz },
              { nama: String(nama) }
            ]
          }
        });

        if (existingLembaga) {
          await prisma.muzakki.update({
            where: { id: existingLembaga.id },
            data: {
              npwp: npwp ? String(npwp) : undefined,
              zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : undefined,
              keterangan: keterangan ? String(keterangan) : undefined,
              alamat: String(alamat),
              telepon: telepon ? String(telepon) : undefined,
              email: email ? String(email) : undefined,
              status: String(status),
              no_pengukuhan: no_pengukuhan ? String(no_pengukuhan) : undefined,
              tanggal_pengukuhan: tanggal_pengukuhan ? String(tanggal_pengukuhan) : undefined,
              website: website ? String(website) : undefined,
              jenis_lembaga: jenis_lembaga ? String(jenis_lembaga) : undefined,
              fax: fax ? String(fax) : undefined,
              cp_nama: cp_nama ? String(cp_nama) : undefined,
              cp_telepon: cp_telepon ? String(cp_telepon) : undefined,
              cp_email: cp_email ? String(cp_email) : undefined,
            }
          });
          updatedCount++;
        } else {
          await prisma.muzakki.create({
            data: {
              kategori,
              npwz,
              nama: String(nama),
              npwp: npwp ? String(npwp) : null,
              zakat_per_bulan: zakat_per_bulan ? Number(zakat_per_bulan) : null,
              keterangan: keterangan ? String(keterangan) : null,
              alamat: String(alamat),
              telepon: telepon ? String(telepon) : null,
              email: email ? String(email) : null,
              status: String(status),
              no_pengukuhan: no_pengukuhan ? String(no_pengukuhan) : null,
              tanggal_pengukuhan: tanggal_pengukuhan ? String(tanggal_pengukuhan) : null,
              website: website ? String(website) : null,
              jenis_lembaga: jenis_lembaga ? String(jenis_lembaga) : null,
              fax: fax ? String(fax) : null,
              cp_nama: cp_nama ? String(cp_nama) : null,
              cp_telepon: cp_telepon ? String(cp_telepon) : null,
              cp_email: cp_email ? String(cp_email) : null,
            }
          });
          insertedCount++;
        }
      }
    }

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
