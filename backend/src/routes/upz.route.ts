import { Router } from 'express';
import { getUpz, createUpz, updateUpz, deleteUpz } from '../controllers/upz.controller';

const router = Router();

router.get('/', getUpz);
router.post('/', createUpz);
router.put('/:id', updateUpz);
router.delete('/:id', deleteUpz);

export default router;
