import { Router } from 'express';
import { getPenyaluranZis, createDirectPenyaluran, updatePenyaluranZis, bulkMigratePenyaluranZis } from '../controllers/penyaluran-zis.controller';

const router = Router();

router.get('/', getPenyaluranZis);
router.post('/direct', createDirectPenyaluran);
router.post('/bulk-migrate', bulkMigratePenyaluranZis);
router.put('/:id', updatePenyaluranZis);

export default router;
