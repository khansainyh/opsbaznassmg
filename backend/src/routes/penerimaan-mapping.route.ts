import { Router } from 'express';
import { 
  getPenerimaanMappings, 
  createPenerimaanMapping, 
  updatePenerimaanMapping, 
  deletePenerimaanMapping 
} from '../controllers/penerimaan-mapping.controller';

const router = Router();

router.get('/', getPenerimaanMappings);
router.post('/', createPenerimaanMapping);
router.put('/:id', updatePenerimaanMapping);
router.delete('/:id', deletePenerimaanMapping);

export default router;
