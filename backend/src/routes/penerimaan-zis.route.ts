import { Router } from 'express';
import { 
  getPenerimaanZis, 
  createPenerimaanZis, 
  updatePenerimaanZis,
  updateSimbaStatus, 
  deletePenerimaanZis 
} from '../controllers/penerimaan-zis.controller';

const router = Router();

router.get('/', getPenerimaanZis);
router.post('/', createPenerimaanZis);
router.put('/:id', updatePenerimaanZis);
router.patch('/:id/simba', updateSimbaStatus);
router.delete('/:id', deletePenerimaanZis);

export default router;
