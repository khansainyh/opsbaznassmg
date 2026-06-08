import { Router } from 'express';
import { lookupMuzakki, approveBankJateng, getHistory } from '../controllers/bank-jateng.controller';

const router = Router();

router.get('/history', getHistory);
router.post('/lookup', lookupMuzakki);
router.post('/approve', approveBankJateng);

export default router;
