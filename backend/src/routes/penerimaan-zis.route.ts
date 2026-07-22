import { Router } from 'express';
import { 
  getPenerimaanZis, 
  createPenerimaanZis, 
  updatePenerimaanZis,
  updateSimbaStatus, 
  deletePenerimaanZis,
  migratePenerimaanZis
} from '../controllers/penerimaan-zis.controller';

const router = Router();

router.get('/', getPenerimaanZis);
router.post('/', createPenerimaanZis);
router.post('/migrate', migratePenerimaanZis);
router.put('/:id', updatePenerimaanZis);
router.patch('/:id/simba', updateSimbaStatus);
router.delete('/:id', deletePenerimaanZis);

export default router;
