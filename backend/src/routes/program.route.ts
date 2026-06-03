import { Router } from 'express';
import { getPrograms, createProgram, updateProgram, deleteProgram, importPrograms } from '../controllers/program.controller';

const router = Router();

router.post('/import', importPrograms);
router.get('/', getPrograms);
router.post('/', createProgram);
router.put('/:code', updateProgram);
router.delete('/:code', deleteProgram);

export default router;
