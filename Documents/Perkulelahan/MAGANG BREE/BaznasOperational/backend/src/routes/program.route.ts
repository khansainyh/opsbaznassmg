import { Router } from 'express';
import { getPrograms, createProgram, updateProgram, deleteProgram } from '../controllers/program.controller';

const router = Router();

router.get('/', getPrograms);
router.post('/', createProgram);
router.put('/:code', updateProgram);
router.delete('/:code', deleteProgram);

export default router;
