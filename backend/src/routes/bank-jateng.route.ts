import { Router } from 'express';
import { lookupMuzakki, approveBankJateng, getHistory, deleteBatch } from '../controllers/bank-jateng.controller';

const router = Router();

router.get('/history', getHistory);
router.post('/lookup', lookupMuzakki);
router.post('/approve', approveBankJateng);
router.delete('/batch/:batchName', deleteBatch);

export default router;
