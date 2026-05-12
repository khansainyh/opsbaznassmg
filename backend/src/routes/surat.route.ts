import { Router } from 'express';
import multer from 'multer';
import { getSurats, getSuratById, createSurat, updateSurat, deleteSurat, scanSurat } from '../controllers/surat.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Maks 10MB
});
const router = Router();

router.get('/', getSurats);
router.get('/:id', getSuratById);
router.post('/', createSurat);
router.post('/:id/scan', upload.single('file'), scanSurat);
router.put('/:id', updateSurat);
router.delete('/:id', deleteSurat);

export default router;
