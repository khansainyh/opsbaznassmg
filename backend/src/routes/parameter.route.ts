import { Router } from 'express';
import { getParameters, getParameterByKey, upsertParameter, testGDriveConnection } from '../controllers/parameter.controller';

const router = Router();

router.get('/', getParameters);
router.get('/:key', getParameterByKey);
router.post('/', upsertParameter);
router.post('/test-gdrive', testGDriveConnection);

export default router;
