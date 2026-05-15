import cron from 'node-cron';
import prisma from './prisma';

export const initCronJobs = () => {
  // Run everyday at 07:00 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('[Cron] Running H-1 Undangan Reminder check...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const surats = await prisma.surat.findMany({
        where: {
          kategori: 'Undangan',
          tanggal_acara: {
            gte: startOfTomorrow,
            lte: endOfTomorrow
          }
        }
      });

      for (const surat of surats) {
        if (surat.assigned_staff && Array.isArray(surat.assigned_staff)) {
          const staffIds = surat.assigned_staff as string[];
          if (staffIds.length > 0) {
            const notifications = staffIds.map(userId => ({
              userId,
              title: 'Pengingat Undangan (H-1)',
              message: `PENGINGAT: Anda ditugaskan menghadiri undangan dari ${surat.nama_instansi || 'Instansi Terkait'} BESOK pada ${surat.tanggal_acara ? new Date(surat.tanggal_acara).toLocaleDateString('id-ID') : '-'} jam ${surat.jam_acara || '-'}.`,
              link: `/surat/${surat.id}`
            }));

            await prisma.notification.createMany({
              data: notifications
            });
            console.log(`[Cron] Created ${notifications.length} reminders for Surat ${surat.agenda_no}`);
          }
        }
      }
    } catch (error) {
      console.error('[Cron] Error running H-1 reminder:', error);
    }
  });

  console.log('[Cron] Cron jobs initialized successfully.');
};
