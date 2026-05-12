import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

let drive: any = null;
let serviceAccountEmail: string | null = null;

try {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    // Resolve path relatif terhadap CWD (direktori backend/)
    const absPath = path.resolve(process.cwd(), credPath);

    if (!fs.existsSync(absPath)) {
      console.error(`❌ Service account file TIDAK DITEMUKAN di: ${absPath}`);
      console.error(`   CWD saat ini: ${process.cwd()}`);
      console.error(`   Pastikan file service-account.json ada di folder backend/`);
    } else {
      // Baca email service account untuk keperluan debug
      try {
        const saJson = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
        serviceAccountEmail = saJson.client_email;
        console.log(`✅ Service account ditemukan: ${serviceAccountEmail}`);
      } catch {}

      const auth = new google.auth.GoogleAuth({
        keyFile: absPath,
        // Scope 'drive' diperlukan untuk upload ke folder yang di-share ke service account
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      drive = google.drive({ version: 'v3', auth });
      console.log(`✅ Google Drive API initialized. Target folder: ${process.env.GDRIVE_FOLDER_ID || '(root)'}`);
    }
  } else {
    console.warn("⚠️  GOOGLE_APPLICATION_CREDENTIALS tidak di-set di .env → mode simulasi aktif.");
  }
} catch (e) {
  console.error("❌ Gagal initialize Google Drive:", e);
}

/**
 * Format nama file scan proposal.
 * Contoh output: "429 (16 April 2025).pdf"
 */
export function formatScanFileName(agendaNo: string | number, tanggalMasuk: Date, ext: string): string {
  const tanggal = tanggalMasuk.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return `${agendaNo} (${tanggal})${ext}`;
}

/**
 * Upload file ke Google Drive.
 * @param fileObj   - File dari multer (buffer, originalname, mimetype)
 * @param fileName  - Nama file di Drive (gunakan formatScanFileName)
 * @param folderId  - Override folder ID; default dari GDRIVE_FOLDER_ID di .env
 */
export const uploadToDrive = async (
  fileObj: any,
  fileName?: string,
  folderId?: string
) => {
  const targetFolder = folderId || process.env.GDRIVE_FOLDER_ID || undefined;
  const finalName = fileName || fileObj.originalname;

  if (!drive) {
    // Mode simulasi
    console.log(`[SIMULATED] Upload "${finalName}" → folder ${targetFolder || 'root'}`);
    return {
      id: `simulated-id-${Date.now()}`,
      webViewLink: `https://drive.google.com/file/d/simulated-${Date.now()}/view`
    };
  }

  console.log(`📤 Uploading "${finalName}" ke folder: ${targetFolder || 'root (tidak ada folder ID)'}`);

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObj.buffer);

  const response = await drive.files.create({
    // supportsAllDrives: true diperlukan jika menggunakan Shared Drive
    supportsAllDrives: true,
    requestBody: {
      name: finalName,
      parents: targetFolder ? [targetFolder] : undefined
    },
    media: {
      mimeType: fileObj.mimetype,
      body: bufferStream
    },
    fields: 'id, webViewLink, webContentLink, name, parents'
  });

  console.log(`✅ Upload berhasil! File ID: ${response.data.id}, Nama: ${response.data.name}`);

  // Set permission agar siapapun dengan link bisa lihat
  if (response.data.id) {
    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      console.log(`✅ Permission "anyone with link" berhasil di-set.`);
    } catch (permErr: any) {
      console.warn('⚠️  Gagal set permission file:', permErr?.message || permErr);
    }
  }

  return response.data;
};
