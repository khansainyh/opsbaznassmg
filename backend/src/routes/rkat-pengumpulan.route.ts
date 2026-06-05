import { Router } from 'express';
import { 
  getRkatPengumpulan, 
  createRkatPengumpulan, 
  updateRkatPengumpulan, 
  deleteRkatPengumpulan, 
  importRkatPengumpulan 
} from '../controllers/rkat-pengumpulan.controller';

const router = Router();

router.post('/import', importRkatPengumpulan);
router.get('/', getRkatPengumpulan);
router.post('/', createRkatPengumpulan);
router.put('/:id', updateRkatPengumpulan);
router.delete('/:id', deleteRkatPengumpulan);

export default router;
