import { Router } from 'express';
import {
  createPengajuan,
  getPengajuans,
  approvePengajuan,
  rejectPengajuan,
  disbursePengajuan
} from '../controllers/pengajuan-pencairan.controller';

const router = Router();

router.post('/', createPengajuan);
router.get('/', getPengajuans);
router.post('/:id/approve', approvePengajuan);
router.post('/:id/reject', rejectPengajuan);
router.post('/:id/disburse', disbursePengajuan);

export default router;
