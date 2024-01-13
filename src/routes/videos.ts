import express from 'express';
import { prisma } from '../db';
import { verifyToken } from '../middlewares/token';
import { asyncHandler } from '../utils';

const videosRouter = express.Router();

videosRouter.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const videos = await prisma.video.findMany({ where: { authorId: req.user.id } });

    res.json({ videos });
  }),
);

export { videosRouter };
