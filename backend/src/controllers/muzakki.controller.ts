import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../data/muzakkis.json');

// Helper to read Muzakkis from JSON file
const readMuzakkis = (): any[] => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      const defaultMuzakkis: any[] = [];
      fs.writeFileSync(filePath, JSON.stringify(defaultMuzakkis, null, 2), 'utf-8');
      return defaultMuzakkis;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (error) {
    console.error('Error reading muzakkis file:', error);
    return [];
  }
};

// Helper to write Muzakkis to JSON file
const writeMuzakkis = (data: any[]) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing muzakkis file:', error);
  }
};

export const getMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = readMuzakkis();
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const createMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nik, nrm, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pekerjaan, alamat, handphone, email, catatan, kategori, status } = req.body;
    
    if (!nik || !nama || !tempat_lahir || !tanggal_lahir || !jenis_kelamin || !alamat || !handphone) {
      res.status(400).json({ status: 'error', message: 'Field NIK, Nama, Tempat Lahir, Tanggal Lahir, Jenis Kelamin, Alamat, dan Handphone wajib diisi.' });
      return;
    }

    const muzakkis = readMuzakkis();
    
    // Check if NIK already exists
    if (muzakkis.some(m => m.nik === String(nik))) {
      res.status(400).json({ status: 'error', message: 'NIK sudah terdaftar.' });
      return;
    }
    
    // Check if NRM already exists
    if (nrm && muzakkis.some(m => m.nrm === String(nrm))) {
      res.status(400).json({ status: 'error', message: 'NRM sudah terdaftar.' });
      return;
    }

    const newMuzakki = {
      id: `muz-${Date.now()}`,
      nik: String(nik),
      nrm: nrm ? String(nrm) : `MZ-${Date.now().toString().slice(-4)}`,
      nama: String(nama),
      tempat_lahir: String(tempat_lahir),
      tanggal_lahir: String(tanggal_lahir),
      jenis_kelamin: String(jenis_kelamin),
      pekerjaan: pekerjaan ? String(pekerjaan) : null,
      alamat: String(alamat),
      handphone: String(handphone),
      email: email ? String(email) : null,
      catatan: catatan ? String(catatan) : '',
      kategori: kategori ? String(kategori) : 'Perorangan',
      status: status ? String(status) : 'Aktif',
      created_at: new Date().toISOString()
    };

    muzakkis.push(newMuzakki);
    writeMuzakkis(muzakkis);

    res.status(201).json({ status: 'success', data: newMuzakki });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const updateMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { nik, nrm, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, pekerjaan, alamat, handphone, email, catatan, kategori, status } = req.body;

    const muzakkis = readMuzakkis();
    const existingIndex = muzakkis.findIndex(m => m.id === id);
    
    if (existingIndex === -1) {
      res.status(404).json({ status: 'error', message: 'Data tidak ditemukan.' });
      return;
    }

    const existing = muzakkis[existingIndex];

    if (nik && nik !== existing.nik) {
      if (muzakkis.some(m => m.nik === String(nik) && m.id !== id)) {
        res.status(400).json({ status: 'error', message: 'NIK sudah terpakai oleh data lain.' });
        return;
      }
    }

    if (nrm && nrm !== existing.nrm) {
      if (muzakkis.some(m => m.nrm === String(nrm) && m.id !== id)) {
        res.status(400).json({ status: 'error', message: 'NRM sudah terpakai oleh data lain.' });
        return;
      }
    }

    const updated = {
      ...existing,
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
      kategori: kategori ? String(kategori) : (existing.kategori || 'Perorangan'),
      status: status ? String(status) : (existing.status || 'Aktif'),
      updated_at: new Date().toISOString()
    };

    muzakkis[existingIndex] = updated;
    writeMuzakkis(muzakkis);

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const deleteMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const muzakkis = readMuzakkis();
    const filtered = muzakkis.filter(m => m.id !== id);
    
    if (muzakkis.length === filtered.length) {
      res.status(404).json({ status: 'error', message: 'Data tidak ditemukan.' });
      return;
    }

    writeMuzakkis(filtered);
    res.status(200).json({ status: 'success', message: 'Data berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: String(error) });
  }
};

export const importMuzakki = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawData: any[] = req.body;
    
    if (!Array.isArray(rawData)) {
      res.status(400).json({ status: 'error', message: 'Payload must be an array of objects.' });
      return;
    }

    const muzakkis = readMuzakkis();
    let insertedCount = 0;
    let duplicatesFound = 0;
    let nrmDuplicates = 0;

    for (const rawRow of rawData) {
      const row: any = {};
      for (const key in rawRow) {
        row[key.trim().toLowerCase()] = rawRow[key];
      }

      if (row.nik === undefined || row.nik === null) continue;
      const nik = String(row.nik).trim();
      if (!nik || nik === '') continue;

      // Duplicate NIK check
      if (muzakkis.some(m => m.nik === nik)) {
        duplicatesFound++;
        continue;
      }

      const nrm = row.nrm || row['no. register muzakki (nrm)'] || row['no. register'] || `MZ-${Date.now().toString().slice(-4)}`;
      if (muzakkis.some(m => m.nrm === nrm)) {
        nrmDuplicates++;
        continue;
      }

      const newMuzakki = {
        id: `muz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nik,
        nrm: String(nrm).trim(),
        nama: row.nama || row.name || 'Tanpa Nama',
        tempat_lahir: row.tempat_lahir || row['tempat lahir'] || 'Tidak Diketahui',
        tanggal_lahir: row.tanggal_lahir || row['tanggal lahir'] || '1970-01-01',
        jenis_kelamin: row.jenis_kelamin || row['jenis kelamin'] || 'Pria',
        pekerjaan: row.pekerjaan || null,
        alamat: row.alamat || row.address || 'Tidak ada alamat',
        handphone: row.handphone || row['no telpon'] || row['no. telpon'] || '0800000000',
        email: row.email || null,
        catatan: row.catatan || '',
        kategori: row.kategori || 'Perorangan',
        status: 'Aktif',
        created_at: new Date().toISOString()
      };

      muzakkis.push(newMuzakki);
      insertedCount++;
    }

    writeMuzakkis(muzakkis);

    res.status(200).json({
      status: 'success',
      insertedCount,
      duplicatesFound,
      nrmDuplicates
    });
  } catch (error) {
    console.error('Error importing Muzakki:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
};
