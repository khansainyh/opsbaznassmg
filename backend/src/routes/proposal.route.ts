import { Router } from 'express';
import multer from 'multer';
import { getProposals, getProposalById, createProposal, updateProposal, deleteProposal, scanProposal, syncNrmFromMustahik } from '../controllers/proposal.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Maks 5MB
});
const router = Router();

router.get('/', getProposals);
router.post('/sync-nrm-from-mustahik', syncNrmFromMustahik);
router.post('/', upload.single('file'), createProposal);
router.get('/:id', getProposalById);
router.post('/:id/scan', upload.single('file'), scanProposal);
router.put('/:id', upload.any(), updateProposal);
router.delete('/:id', deleteProposal);

export default router;
