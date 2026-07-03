import { Router } from 'express';
import { getUpz, createUpz, updateUpz, deleteUpz, uploadSkUpz } from '../controllers/upz.controller';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', getUpz);
router.post('/', createUpz);
router.put('/:id', updateUpz);
router.delete('/:id', deleteUpz);
router.post('/:id/upload-sk', upload.single('file'), uploadSkUpz);

export default router;
