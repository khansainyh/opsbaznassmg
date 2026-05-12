import { Router } from 'express';
import { getUsers, createUser, bulkCreateUsers, updateUser, deleteUser, changePassword } from '../controllers/user.controller';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.post('/bulk', bulkCreateUsers);
router.put('/:id/change-password', changePassword);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
