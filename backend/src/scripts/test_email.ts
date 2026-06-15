import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { sendNotificationEmail } from '../utils/email';

async function run() {
  console.log('Testing SMTP with settings:');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '********' : 'undefined');

  const res = await sendNotificationEmail({
    to: 'operational.baznas.smg@gmail.com',
    subject: 'Test Email dari Sistem BAZNAS',
    html: '<h3>Test Berhasil!</h3><p>Ini adalah email uji coba dari BAZNAS Operational Hub.</p>'
  });

  console.log('Hasil Test:', res);
}

run();
