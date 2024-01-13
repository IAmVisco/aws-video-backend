import express from 'express';
import { authRouter } from './users';
import { videosRouter } from './videos';

const router = express.Router();

router.use('/auth/', authRouter);
router.use('/videos/', videosRouter);

export { router };
