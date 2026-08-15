import { Router } from 'express';
import { 
  getPenyaluranZis, 
  createDirectPenyaluran, 
  updatePenyaluranZis, 
  bulkMigratePenyaluranZis,
  deletePenyaluranZis
} from '../controllers/penyaluran-zis.controller';

const router = Router();

router.get('/', getPenyaluranZis);
router.post('/direct', createDirectPenyaluran);
router.post('/bulk-migrate', bulkMigratePenyaluranZis);
router.put('/:id', updatePenyaluranZis);
router.delete('/:id', deletePenyaluranZis);

export default router;
