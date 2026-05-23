import { Router } from 'express';
import {
  getMutations,
  createMutation,
  reconcileMutation
} from '../controllers/mutation.controller';

const router = Router();

router.get('/', getMutations);
router.post('/', createMutation);
router.post('/:id/reconcile', reconcileMutation);

export default router;
