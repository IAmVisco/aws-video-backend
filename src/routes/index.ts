import express from 'express';
import { userRouter } from './users';

const router = express.Router();

router.use('/users/', userRouter);

router.get('/', function (req, res, next) {
  res.json({ title: 'Express' });
});

export { router };
