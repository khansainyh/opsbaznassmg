import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { uploadToDrive, formatScanFileName } from '../utils/gdrive';
import path from 'path';
import { sendNotificationEmail } from '../utils/email';

export const getSurats = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const isPaginated = req.query.paginate === 'true' || req.query.page !== undefined;

    if (!isPaginated && req.query.all === 'true') {
      const surats = await prisma.surat.findMany();
      return res.status(200).json(surats);
    }

    const [total, surats] = await prisma.$transaction([
      prisma.surat.count(),
      prisma.surat.findMany({
        orderBy: { agenda_no: 'desc' },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {})
      })
    ]);

    if (isPaginated) {
      const totalPages = Math.ceil(total / limit) || 1;
      return res.status(200).json({
        status: 'success',
        data: surats,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    }

    res.status(200).json(surats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const getSuratById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const surat = await prisma.surat.findUnique({ where: { id } });
    if (!surat) return res.status(404).json({ error: 'Surat not found' });
    res.status(200).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const createSurat = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (data.tanggal_acara) {
      data.tanggal_acara = new Date(data.tanggal_acara);
    }
    const surat = await prisma.surat.create({ data });
    res.status(201).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const updateSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    if (data.tanggal_masuk) {
      data.tanggal_masuk = new Date(data.tanggal_masuk);
    }
    if (data.tanggal_acara) {
      data.tanggal_acara = new Date(data.tanggal_acara);
    }
    const existingSurat = await prisma.surat.findUnique({ where: { id } });

    const surat = await prisma.surat.update({
      where: { id },
      data
    });

    // Handle notification to Kepala Pelaksana when Ketua approves Undangan
    if (existingSurat?.kategori === 'Undangan' && data.status === 'Penugasan_Kepala_Pelaksana') {
      const kapels = await prisma.user.findMany({
        where: { role: 'Kepala_Pelaksana' },
        select: { id: true, name: true, email: true }
      });

      if (kapels.length > 0) {
        const notifications = kapels.map(kapel => ({
          userId: kapel.id,
          title: 'Butuh Penugasan Undangan',
          message: `Ketua telah menyetujui surat undangan dari ${surat.nama_instansi || 'Instansi Terkait'}. Silakan lakukan penugasan staf.`,
          link: '/persetujuan-kepala'
        }));

        await prisma.notification.createMany({
          data: notifications
        });

        for (const kapel of kapels) {
          if (kapel.email) {
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #16a34a; margin: 0; font-size: 22px;">BAZNAS Operational Hub</h2>
                  <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Butuh Penugasan Undangan</p>
                </div>
                
                <div style="color: #334155; line-height: 1.6; font-size: 14px;">
                  <p>Halo <strong>${kapel.name}</strong>,</p>
                  <p>Ketua telah memberikan arahan/persetujuan untuk surat undangan berikut:</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #475569;">Pengirim:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${surat.nama_instansi || 'Instansi Terkait'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #475569;">Keperluan:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${surat.keperluan || '-'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #475569;">Catatan Ketua:</td>
                        <td style="padding: 4px 0; color: #1e293b; font-style: italic;">"${surat.catatanPimpinan || '-'}"</td>
                      </tr>
                    </table>
                  </div>
 
                  <p>Silakan masuk ke dasbor Kepala Pelaksana untuk menentukan staf yang ditugaskan berdasarkan arahan Ketua.</p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Masuk ke Aplikasi</a>
                  </div>
                </div>
 
                <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
                  <p>Ini adalah email otomatis dari BAZNAS Operational Hub. Harap tidak membalas email ini.</p>
                  <p>&copy; ${new Date().getFullYear()} BAZNAS Kota Semarang. All rights reserved.</p>
                </div>
              </div>
            `;

            sendNotificationEmail({
              to: kapel.email,
              subject: `📢 Butuh Penugasan Undangan: ${surat.nama_instansi || 'Instansi Terkait'}`,
              html: htmlContent
            }).catch(err => {
              console.error(`Gagal mengirim email penugasan ke ${kapel.email}:`, err);
            });
          }
        }
      }
    }

    // Handle notifications for assigned staff in 'Undangan'
    if (existingSurat?.kategori === 'Undangan' && data.assigned_staff && Array.isArray(data.assigned_staff)) {
      const oldStaff = Array.isArray(existingSurat.assigned_staff) ? existingSurat.assigned_staff as string[] : [];
      const newStaff = data.assigned_staff as string[];
      
      const addedStaff = newStaff.filter(staffId => !oldStaff.includes(staffId));

      if (addedStaff.length > 0) {
        const notifications = addedStaff.map(userId => ({
          userId,
          title: 'Penugasan Undangan Baru',
          message: `Anda ditugaskan oleh Kepala Pelaksana untuk menghadiri undangan dari ${surat.nama_instansi || 'Instansi Terkait'} pada ${surat.tanggal_acara ? new Date(surat.tanggal_acara).toLocaleDateString('id-ID') : '-'} jam ${surat.jam_acara || '-'}.`,
          link: `/surat/${surat.id}`
        }));

        await prisma.notification.createMany({
          data: notifications
        });

        // Send Email Notifications
        const users = await prisma.user.findMany({
          where: { id: { in: addedStaff } },
          select: { name: true, email: true }
        });

        for (const staffUser of users) {
          if (staffUser.email) {
            const tanggalAcaraStr = surat.tanggal_acara 
              ? new Date(surat.tanggal_acara).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : '-';
            const jamAcaraStr = surat.jam_acara || '-';
            
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #16a34a; margin: 0; font-size: 22px;">BAZNAS Operational Hub</h2>
                  <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Penugasan Undangan Baru</p>
                </div>
                
                <div style="color: #334155; line-height: 1.6; font-size: 14px;">
                  <p>Halo <strong>${staffUser.name}</strong>,</p>
                  <p>Anda telah ditugaskan oleh <strong>Kepala Pelaksana</strong> untuk menghadiri undangan resmi berikut:</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #475569;">Instansi Pengundang:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${surat.nama_instansi || 'Instansi Terkait'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #475569;">Agenda Acara:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${surat.keperluan || '-'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #475569;">Hari, Tanggal:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${tanggalAcaraStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #475569;">Waktu Acara:</td>
                        <td style="padding: 4px 0; color: #1e293b;">${jamAcaraStr} WIB</td>
                      </tr>
                    </table>
                  </div>

                  <p>Silakan masuk ke dasbor BAZNAS Operational Hub untuk detail lebih lanjut dan menindaklanjuti undangan ini.</p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tracking-surat" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Lihat Undangan</a>
                  </div>
                </div>

                <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
                  <p>Ini adalah email otomatis dari BAZNAS Operational Hub. Harap tidak membalas email ini.</p>
                  <p>&copy; ${new Date().getFullYear()} BAZNAS Kota Semarang. All rights reserved.</p>
                </div>
              </div>
            `;

            sendNotificationEmail({
              to: staffUser.email,
              subject: `📢 Penugasan Undangan Baru: ${surat.nama_instansi || 'Instansi Terkait'}`,
              html: htmlContent
            }).catch(err => {
              console.error(`Gagal mengirim email penugasan ke ${staffUser.email}:`, err);
            });
          }
        }
      }
    }

    res.status(200).json(surat);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const deleteSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.surat.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

export const scanSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const file = req.file;
    const { gdrive_link } = req.body;

    let fileLinkToSave: string | null = null;
    let fileIdToSave: string | null = null;

    if (file) {
      const existing = await prisma.surat.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Surat tidak ditemukan.' });

      const ext = path.extname(file.originalname) || '';
      const namaFile = formatScanFileName(
        existing.agenda_no ?? id,
        existing.tanggal_masuk,
        ext
      );

      const gdriveRes = await uploadToDrive(file, namaFile, 'gdrive_folder_surat');
      fileLinkToSave = gdriveRes.webViewLink;
      fileIdToSave = gdriveRes.id;
    } else if (gdrive_link && String(gdrive_link).trim() !== '') {
      fileLinkToSave = String(gdrive_link).trim();
    } else {
      return res.status(400).json({ error: 'Harap upload file atau masukkan link Google Drive.' });
    }

    const surat = await prisma.surat.update({
      where: { id },
      data: {
        file_gdrive_link: fileLinkToSave,
        ...(fileIdToSave ? { file_gdrive_id: fileIdToSave } : {}),
        status: 'Review_Kabag_Admin'
      }
    });

    res.status(200).json({ status: 'success', data: surat });
  } catch (error) {
    console.error('Error scanning surat:', error);
    res.status(500).json({ error: String(error) });
  }
};
