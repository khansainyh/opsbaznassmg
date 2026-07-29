import { Router } from 'express';
import multer from 'multer';
import {
  createPengajuan,
  getPengajuans,
  approvePengajuan,
  rejectPengajuan,
  disbursePengajuan,
  deletePengajuan
} from '../controllers/pengajuan-pencairan.controller';
import { migrateProposalExcel } from '../controllers/migrate-proposal.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/migrate-excel', upload.single('file'), migrateProposalExcel);
router.post('/', createPengajuan);
router.get('/', getPengajuans);
router.post('/:id/approve', approvePengajuan);
router.post('/:id/reject', rejectPengajuan);
router.post('/:id/disburse', disbursePengajuan);
router.delete('/:id', deletePengajuan);

export default router;
