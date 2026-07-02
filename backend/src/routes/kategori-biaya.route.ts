import { Router } from 'express';
import { 
  getKategoriBiaya, 
  createKategoriBiaya, 
  deleteKategoriBiaya 
} from '../controllers/kategori-biaya.controller';

const router = Router();

router.get('/', getKategoriBiaya);
router.post('/', createKategoriBiaya);
router.delete('/:id', deleteKategoriBiaya);

export default router;
