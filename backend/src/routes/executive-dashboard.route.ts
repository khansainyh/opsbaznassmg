import { Router } from 'express';
import { getExecutiveDashboardData } from '../controllers/executive-dashboard.controller';

const router = Router();

router.get('/', getExecutiveDashboardData);

export default router;
