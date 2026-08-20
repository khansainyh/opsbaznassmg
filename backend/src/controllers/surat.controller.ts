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

const buildCleanSuratPayload = (body: any, isUpdate = false) => {
  const payload: any = {};

  if (body.tanggal_masuk || body.tanggalMasuk) {
    const d = new Date(body.tanggal_masuk || body.tanggalMasuk);
    if (!isNaN(d.getTime())) {
      payload.tanggal_masuk = d;
    }
  }
  if (!isUpdate && !payload.tanggal_masuk) {
    payload.tanggal_masuk = new Date();
  }

  if (body.tanggal_acara !== undefined || body.tanggalAcara !== undefined) {
    const rawAcara = body.tanggal_acara ?? body.tanggalAcara;
    if (rawAcara && String(rawAcara).trim() !== '' && String(rawAcara) !== 'null') {
      const d = new Date(rawAcara);
      if (!isNaN(d.getTime())) {
        payload.tanggal_acara = d;
      } else {
        payload.tanggal_acara = null;
      }
    } else {
      payload.tanggal_acara = null;
    }
  }

  const rawAgenda = body.agenda_no ?? body.agendaNo ?? body.no_agenda ?? body.nomor_agenda;
  if (rawAgenda !== undefined && rawAgenda !== null && rawAgenda !== '') {
    const num = Number(rawAgenda);
    if (!isNaN(num) && num > 0) {
      payload.agenda_no = num;
    }
  }

  if (body.nama_instansi !== undefined || body.namaInstansi !== undefined) {
    const val = body.nama_instansi ?? body.namaInstansi;
    payload.nama_instansi = val ? String(val).trim() : null;
  }
  if (body.pimpinan_organisasi !== undefined || body.pimpinanOrganisasi !== undefined) {
    const val = body.pimpinan_organisasi ?? body.pimpinanOrganisasi;
    payload.pimpinan_organisasi = val ? String(val).trim() : null;
  }
  if (body.alamat !== undefined) {
    payload.alamat = body.alamat ? String(body.alamat).trim() : null;
  }
  if (body.kelurahan !== undefined) {
    payload.kelurahan = body.kelurahan ? String(body.kelurahan).trim() : null;
  }
  if (body.kecamatan !== undefined) {
    payload.kecamatan = body.kecamatan ? String(body.kecamatan).trim() : null;
  }
  if (body.keperluan !== undefined || body.perihal !== undefined) {
    const val = body.keperluan ?? body.perihal;
    payload.keperluan = val ? String(val).trim() : (isUpdate ? undefined : 'Surat Masuk');
  } else if (!isUpdate) {
    payload.keperluan = 'Surat Masuk';
  }
  if (body.no_telpon !== undefined || body.noTelpon !== undefined) {
    const val = body.no_telpon ?? body.noTelpon;
    payload.no_telpon = val ? String(val).trim() : null;
  }
  if (body.jam_pengajuan !== undefined || body.jamPengajuan !== undefined) {
    const val = body.jam_pengajuan ?? body.jamPengajuan;
    payload.jam_pengajuan = val ? String(val).trim() : null;
  }
  if (body.yang_mengajukan !== undefined || body.yangMengajukan !== undefined) {
    const val = body.yang_mengajukan ?? body.yangMengajukan;
    payload.yang_mengajukan = val ? String(val).trim() : null;
  }
  if (body.arsip !== undefined) {
    payload.arsip = body.arsip ? String(body.arsip).trim() : null;
  }
  if (body.status !== undefined) {
    payload.status = body.status ? String(body.status).trim() : 'Registrasi';
  }
  if (body.file_gdrive_id !== undefined || body.fileGdriveId !== undefined) {
    const val = body.file_gdrive_id ?? body.fileGdriveId;
    payload.file_gdrive_id = val ? String(val).trim() : null;
  }
  if (body.file_gdrive_link !== undefined || body.fileGdriveLink !== undefined || body.link_scan !== undefined) {
    const val = body.file_gdrive_link ?? body.fileGdriveLink ?? body.link_scan;
    payload.file_gdrive_link = val ? String(val).trim() : null;
  }
  if (body.link_surat_keluar !== undefined || body.linkSuratKeluar !== undefined || body.link_balasan !== undefined) {
    const val = body.link_surat_keluar ?? body.linkSuratKeluar ?? body.link_balasan;
    payload.link_surat_keluar = val ? String(val).trim() : null;
  }
  if (body.catatanKepala !== undefined || body.catatan_kepala !== undefined) {
    const val = body.catatanKepala ?? body.catatan_kepala;
    payload.catatanKepala = val ? String(val).trim() : null;
  }
  if (body.catatanPimpinan !== undefined || body.catatan_pimpinan !== undefined) {
    const val = body.catatanPimpinan ?? body.catatan_pimpinan;
    payload.catatanPimpinan = val ? String(val).trim() : null;
  }
  if (body.jam_acara !== undefined || body.jamAcara !== undefined) {
    const val = body.jam_acara ?? body.jamAcara;
    payload.jam_acara = val ? String(val).trim() : null;
  }
  if (body.kategori !== undefined) {
    payload.kategori = body.kategori ? String(body.kategori).trim() : null;
  }
  if (body.assigned_staff !== undefined) {
    payload.assigned_staff = body.assigned_staff;
  }

  return payload;
};

export const createSurat = async (req: Request, res: Response) => {
  try {
    const payload = buildCleanSuratPayload(req.body, false);

    // Auto-calculate next agenda_no if not explicitly provided
    if (!payload.agenda_no) {
      const maxSurat = await prisma.surat.findFirst({
        orderBy: { agenda_no: 'desc' },
        select: { agenda_no: true }
      });
      payload.agenda_no = (maxSurat?.agenda_no || 0) + 1;
      if (payload.agenda_no <= 0) payload.agenda_no = 1;
    } else {
      // Check if target agenda_no is used by another Surat; if so, reassign conflicting Surat to next free number
      const existingConflict = await prisma.surat.findFirst({
        where: { agenda_no: payload.agenda_no }
      });
      if (existingConflict) {
        const maxSurat = await prisma.surat.findFirst({
          orderBy: { agenda_no: 'desc' },
          select: { agenda_no: true }
        });
        const nextFree = (maxSurat?.agenda_no || 0) + 1;
        await prisma.surat.update({
          where: { id: existingConflict.id },
          data: { agenda_no: nextFree }
        });
      }
    }

    const surat = await prisma.surat.create({ data: payload });
    res.status(201).json(surat);
  } catch (error: any) {
    console.error('Error in createSurat:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

export const updateSurat = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existingSurat = await prisma.surat.findUnique({ where: { id } });
    if (!existingSurat) {
      return res.status(404).json({ error: 'Surat not found' });
    }

    const payload = buildCleanSuratPayload(req.body, true);

    // If agenda_no is being updated to a number already held by another Surat, reassign the conflicting Surat
    if (payload.agenda_no && payload.agenda_no !== existingSurat.agenda_no) {
      const existingConflict = await prisma.surat.findFirst({
        where: {
          agenda_no: payload.agenda_no,
          NOT: { id }
        }
      });
      if (existingConflict) {
        const maxSurat = await prisma.surat.findFirst({
          orderBy: { agenda_no: 'desc' },
          select: { agenda_no: true }
        });
        const nextFree = (maxSurat?.agenda_no || 0) + 1;
        await prisma.surat.update({
          where: { id: existingConflict.id },
          data: { agenda_no: nextFree }
        });
      }
    }

    const surat = await prisma.surat.update({
      where: { id },
      data: payload
    });

    // Handle notification to Kepala Pelaksana when Ketua approves Undangan
    if (existingSurat?.kategori === 'Undangan' && payload.status === 'Penugasan_Kepala_Pelaksana') {
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
    if (existingSurat?.kategori === 'Undangan' && payload.assigned_staff && Array.isArray(payload.assigned_staff)) {
      const oldStaff = Array.isArray(existingSurat.assigned_staff) ? existingSurat.assigned_staff as string[] : [];
      const newStaff = payload.assigned_staff as string[];
      
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
