import { Router } from 'express';
import { getPilars, createPilar, updatePilar, deletePilar } from '../controllers/pilar.controller';

const router = Router();

router.get('/', getPilars);
router.post('/', createPilar);
router.put('/:code', updatePilar);
router.delete('/:code', deletePilar);

export default router;
