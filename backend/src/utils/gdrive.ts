import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import prisma from './prisma';
dotenv.config();

let drive: any = null;
let serviceAccountEmail: string | null = null;

try {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    // Mode OAuth2 Client (Akun Personal @gmail.com)
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log(`✅ Google Drive API initialized via OAuth2 Client (Personal Account).`);
  } else if (credPath) {
    // Mode Service Account
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
      console.log(`✅ Google Drive API initialized via Service Account. Target folder: ${process.env.GDRIVE_FOLDER_ID || '(root)'}`);
    }
  } else {
    console.warn("⚠️  Google Drive credentials tidak di-set di .env (perlu GOOGLE_APPLICATION_CREDENTIALS atau GDRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN) → mode simulasi aktif.");
  }
} catch (e) {
  console.error("❌ Gagal initialize Google Drive:", e);
}

/**
 * Mengekstrak Google Drive Folder ID dari URL jika berupa URL penuh.
 */
export function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Match standard folders URL: /folders/ID
  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (foldersMatch && foldersMatch[1]) {
    return foldersMatch[1];
  }
  
  // Match query parameter: ?id=ID or &id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Fallback: return input as is (assuming it's a raw ID)
  return trimmed;
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
 * @param fileObj       - File dari multer (buffer, originalname, mimetype)
 * @param fileName      - Nama file di Drive (gunakan formatScanFileName)
 * @param folderIdOrKey - Override folder ID atau key dari SystemParameter (misal: 'gdrive_folder_proposal')
 */
export const uploadToDrive = async (
  fileObj: any,
  fileName?: string,
  folderIdOrKey?: string
) => {
  let targetFolder = folderIdOrKey || undefined;

  // Jika targetFolder dikirimkan sebagai key SystemParameter, ambil nilainya dari database
  if (targetFolder && targetFolder.startsWith('gdrive_folder_')) {
    try {
      const param = await prisma.systemParameter.findUnique({
        where: { key: targetFolder }
      });
      if (param && param.value && param.value.trim() !== '') {
        targetFolder = param.value.trim();
        console.log(`ℹ️ Menggunakan Folder ID dari parameter [${folderIdOrKey}]: ${targetFolder}`);
      } else {
        targetFolder = undefined;
        console.log(`⚠️ Parameter [${folderIdOrKey}] kosong di database, menggunakan default/fallback.`);
      }
    } catch (e) {
      console.error(`❌ Gagal mengambil parameter folder ${folderIdOrKey} dari DB:`, e);
      targetFolder = undefined;
    }
  }

  // Fallback ke env jika folder ID tidak didapatkan dari parameter
  if (!targetFolder) {
    targetFolder = process.env.GDRIVE_FOLDER_ID || undefined;
  }

  if (targetFolder) {
    targetFolder = extractFolderId(targetFolder);
  }

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

  // Cari apakah file dengan nama ini sudah ada di folder target untuk di-overwrite (hindari duplikasi)
  let existingFileId: string | undefined = undefined;
  if (targetFolder) {
    try {
      const listResponse = await drive.files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        q: `name = '${finalName.replace(/'/g, "\\'")}' and '${targetFolder}' in parents and trashed = false`,
        fields: 'files(id)'
      });
      if (listResponse.data.files && listResponse.data.files.length > 0) {
        existingFileId = listResponse.data.files[0].id;
        console.log(`ℹ️ File "${finalName}" sudah ada di GDrive dengan ID: ${existingFileId}. Akan di-update (overwrite).`);
      }
    } catch (e) {
      console.warn(`⚠️ Gagal memeriksa keberadaan file "${finalName}":`, e);
    }
  }

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObj.buffer);

  let response;
  if (existingFileId) {
    response = await drive.files.update({
      fileId: existingFileId,
      supportsAllDrives: true,
      media: {
        mimeType: fileObj.mimetype,
        body: bufferStream
      },
      fields: 'id, webViewLink, webContentLink, name, parents'
    });
    console.log(`✅ File "${finalName}" berhasil di-overwrite (ID: ${existingFileId}).`);
  } else {
    response = await drive.files.create({
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
    console.log(`✅ File "${finalName}" berhasil di-upload.`);
  }

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

/**
 * Test koneksi ke folder Google Drive.
 * Mengembalikan metadata folder jika sukses, atau melempar error jika gagal/tidak ditemukan/tidak ada akses.
 */
export const testDriveConnection = async (rawFolderId: string) => {
  const folderId = extractFolderId(rawFolderId);
  if (!drive) {
    console.log(`[SIMULATED] Test connection to folder: ${folderId}`);
    return {
      id: folderId,
      name: 'Simulasi Folder (Google Drive Non-Aktif/Simulasi)',
      mimeType: 'application/vnd.google-apps.folder',
      simulated: true
    };
  }

  console.log(`🔍 Menguji koneksi ke folder Google Drive dengan ID: ${folderId}`);
  const response = await drive.files.get({
    fileId: folderId,
    supportsAllDrives: true,
    fields: 'id, name, mimeType'
  });

  return response.data;
};

/**
 * Membuat folder baru di Google Drive jika belum ada.
 */
export const createFolderInDrive = async (folderName: string, parentFolderIdOrKey: string): Promise<string> => {
  let parentFolderId = parentFolderIdOrKey;
  if (parentFolderId && parentFolderId.startsWith('gdrive_folder_')) {
    try {
      const param = await prisma.systemParameter.findUnique({
        where: { key: parentFolderId }
      });
      if (param && param.value && param.value.trim() !== '') {
        parentFolderId = param.value.trim();
      } else {
        parentFolderId = '';
      }
    } catch (e) {
      console.error(`❌ Gagal mengambil parameter folder ${parentFolderIdOrKey} dari DB:`, e);
      parentFolderId = '';
    }
  }

  if (!parentFolderId) {
    parentFolderId = process.env.GDRIVE_FOLDER_ID || '';
  }

  if (parentFolderId) {
    parentFolderId = extractFolderId(parentFolderId);
  }

  if (!drive) {
    // Mode simulasi
    console.log(`[SIMULATED] Create folder "${folderName}" inside parent "${parentFolderId}"`);
    return `simulated-folder-id-${Date.now()}`;
  }

  // Cari apakah folder dengan nama ini sudah ada di parent folder ini untuk menghindari duplikasi
  try {
    const listResponse = await drive.files.list({
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id)'
    });
    if (listResponse.data.files && listResponse.data.files.length > 0) {
      const existingId = listResponse.data.files[0].id;
      console.log(`ℹ️ Folder "${folderName}" sudah ada dengan ID: ${existingId}`);
      return existingId;
    }
  } catch (e) {
    console.warn(`⚠️ Gagal memeriksa keberadaan folder:`, e);
  }

  console.log(`📁 Creating folder "${folderName}" inside parent: ${parentFolderId || 'root'}`);
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    },
    fields: 'id'
  });

  // Set permission agar siapapun dengan link bisa lihat
  if (response.data.id) {
    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      console.log(`✅ Folder Permission "anyone with link" berhasil di-set.`);
    } catch (permErr: any) {
      console.warn('⚠️ Gagal set permission folder:', permErr?.message || permErr);
    }
  }

  return response.data.id!;
};
