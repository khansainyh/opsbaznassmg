import { Router } from 'express';
import { importMustahik, getMustahik, createMustahik, updateMustahik, deleteMustahik, importRiwayatBantuan, cekBantuanNik, autoRegisterMustahik } from '../controllers/mustahik.controller';

const router = Router();

router.post('/import', importMustahik);
router.post('/import-riwayat', importRiwayatBantuan);
router.post('/auto-register', autoRegisterMustahik);
router.get('/cek-nik/:nik', cekBantuanNik);
router.get('/', getMustahik);
router.post('/', createMustahik);
router.put('/:id', updateMustahik);
router.delete('/:id', deleteMustahik);

export default router;
