import express from 'express';
import User from '../controller/user/index';

const router = express.Router();

router.post('/login', User.login);
router.post('/register', User.register);
router.get('/list', User.list);

export default router;
