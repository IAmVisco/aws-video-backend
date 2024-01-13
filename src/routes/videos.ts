import express from 'express';
import { ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema } from 'express-joi-validation';
import Joi from 'joi';
import { prisma } from '../db';
import { verifyToken } from '../middlewares/token';
import { asyncHandler } from '../utils';

const videosRouter = express.Router();

const validator = createValidator();

const paginationSchema = Joi.object({
  limit: Joi.number().default(25),
  offset: Joi.number().default(0),
});

interface PaginationSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    limit: number;
    offset: number;
  };
}

videosRouter.get(
  '/',
  [verifyToken, validator.query(paginationSchema)],
  // @ts-expect-error Types don't know we convert res.query.limit etc to number
  asyncHandler(async (req: ValidatedRequest<PaginationSchema>, res) => {
    const videos = await prisma.video.findMany({
      where: { authorId: req.user.id },
      skip: req.query.offset,
      take: req.query.limit,
    });

    res.json({ videos });
  }),
);

export { videosRouter };
