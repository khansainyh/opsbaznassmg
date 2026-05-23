import { Router } from 'express';
import { getMuzakki, createMuzakki, updateMuzakki, deleteMuzakki, importMuzakki } from '../controllers/muzakki.controller';

const router = Router();

router.get('/', getMuzakki);
router.post('/', createMuzakki);
router.put('/:id', updateMuzakki);
router.delete('/:id', deleteMuzakki);
router.post('/import', importMuzakki);

export default router;
