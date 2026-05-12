import { Router } from 'express';
import multer from 'multer';
import { getProposals, getProposalById, createProposal, updateProposal, deleteProposal, scanProposal } from '../controllers/proposal.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Maks 10MB
});
const router = Router();

router.get('/', getProposals);
router.get('/:id', getProposalById);
router.post('/', upload.single('file'), createProposal);
router.post('/:id/scan', upload.single('file'), scanProposal);
router.put('/:id', upload.any(), updateProposal);
router.delete('/:id', deleteProposal);

export default router;
