import { Router } from 'express';
import { 
  getMuzakkiMunfiqLaporan, 
  getPenyaluranLaporan,
  getPengumpulanLaporan,
  getLaporanKinerjaMappings,
  updateLaporanKinerjaMapping
} from '../controllers/laporan-kinerja.controller';

const router = Router();

router.get('/muzakki-munfiq', getMuzakkiMunfiqLaporan);
router.get('/penyaluran', getPenyaluranLaporan);
router.get('/pengumpulan', getPengumpulanLaporan);
router.get('/mappings', getLaporanKinerjaMappings);
router.post('/mappings', updateLaporanKinerjaMapping);

export default router;
