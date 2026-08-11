import { Router } from 'express';
import { getPenyaluranZis, createDirectPenyaluran, updatePenyaluranZis } from '../controllers/penyaluran-zis.controller';

const router = Router();

router.get('/', getPenyaluranZis);
router.post('/direct', createDirectPenyaluran);
router.put('/:id', updatePenyaluranZis);

export default router;
