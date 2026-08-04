import { Router } from 'express';
import { lookupMuzakki, approveBankJateng, getHistory, deleteBatch, updateBatchSimba } from '../controllers/bank-jateng.controller';

const router = Router();

router.get('/history', getHistory);
router.post('/lookup', lookupMuzakki);
router.post('/approve', approveBankJateng);
router.patch('/batch-simba', updateBatchSimba);
router.delete('/batch/:batchName', deleteBatch);

export default router;
