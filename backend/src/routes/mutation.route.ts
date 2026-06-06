import { Router } from 'express';
import {
  getMutations,
  createMutation,
  reconcileMutation,
  identifyMutationAsPenerimaan,
  deleteMutation
} from '../controllers/mutation.controller';

const router = Router();

router.get('/', getMutations);
router.post('/', createMutation);
router.post('/:id/reconcile', reconcileMutation);
router.post('/:id/identify-penerimaan', identifyMutationAsPenerimaan);
router.delete('/:id', deleteMutation);

export default router;
