import { Router } from 'express';
import { 
  getRkatOperasional, 
  createRkatOperasional, 
  updateRkatOperasional, 
  deleteRkatOperasional, 
  importRkatOperasional 
} from '../controllers/rkat-operasional.controller';

const router = Router();

router.post('/import', importRkatOperasional);
router.get('/', getRkatOperasional);
router.post('/', createRkatOperasional);
router.put('/:id', updateRkatOperasional);
router.delete('/:id', deleteRkatOperasional);

export default router;
