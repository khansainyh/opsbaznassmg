import { Router } from 'express';
import {
  getMutations,
  createMutation,
  bulkCreateMutations,
  reconcileMutation,
  identifyMutationAsPenerimaan,
  deleteMutation,
  updateMutation
} from '../controllers/mutation.controller';

const router = Router();

router.get('/', getMutations);
router.post('/', createMutation);
router.post('/bulk', bulkCreateMutations);
router.put('/:id', updateMutation);
router.post('/:id/reconcile', reconcileMutation);
router.post('/:id/identify-penerimaan', identifyMutationAsPenerimaan);
router.delete('/:id', deleteMutation);

export default router;
