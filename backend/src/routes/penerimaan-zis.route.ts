import { Router } from 'express';
import { 
  getPenerimaanZis, 
  createPenerimaanZis, 
  updatePenerimaanZis,
  updateSimbaStatus, 
  bulkUpdateSimbaStatus,
  deletePenerimaanZis,
  migratePenerimaanZis,
  getRekapitulasiBulananZis,
  getZisSummaryForUpz
} from '../controllers/penerimaan-zis.controller';

const router = Router();

router.get('/', getPenerimaanZis);
router.get('/rekap-bulanan', getRekapitulasiBulananZis);
router.get('/rekap-upz-totals', getZisSummaryForUpz);
router.post('/', createPenerimaanZis);
router.post('/migrate', migratePenerimaanZis);
router.patch('/bulk-simba', bulkUpdateSimbaStatus);
router.put('/:id', updatePenerimaanZis);
router.patch('/:id/simba', updateSimbaStatus);
router.delete('/:id', deletePenerimaanZis);

export default router;
