import { Router } from 'express';
import { getParameters, getParameterByKey, upsertParameter } from '../controllers/parameter.controller';

const router = Router();

router.get('/', getParameters);
router.get('/:key', getParameterByKey);
router.post('/', upsertParameter);

export default router;
