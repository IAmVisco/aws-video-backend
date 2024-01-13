import Boom from '@hapi/boom';
import express from 'express';
import { UploadedFile } from 'express-fileupload';
import { ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema } from 'express-joi-validation';
import Joi from 'joi';
import { verifyToken } from '../middlewares/token';
import { videosService } from '../services/videosService';
import { asyncHandler } from '../utils';

const ALLOWED_MIME_TYPES = ['video/mp4', 'video/mpeg', 'video/webm'];

const videosRouter = express.Router();
const validator = createValidator();

const paginationSchema = Joi.object({
  limit: Joi.number().default(25),
  offset: Joi.number().default(0),
});

const idSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

interface PaginationSchema extends ValidatedRequestSchema {
  [ContainerTypes.Query]: {
    limit: number;
    offset: number;
  };
}

interface IdSchema extends ValidatedRequestSchema {
  [ContainerTypes.Params]: {
    id: string;
  };
}

videosRouter.get(
  '/',
  [verifyToken, validator.query(paginationSchema)],
  // @ts-expect-error Types don't know we convert res.query.limit etc to number
  asyncHandler(async (req: ValidatedRequest<PaginationSchema>, res) => {
    const result = await videosService.getVideosList(req.user.id, { ...req.query });

    res.json(result);
  }),
);

videosRouter.get(
  '/:id',
  [verifyToken, validator.params(idSchema)],
  // @ts-expect-error
  asyncHandler(async (req: ValidatedRequest<IdSchema>, res) => {
    const result = await videosService.getVideo(req.params.id, req.user.id);

    res.json(result);
  }),
);

videosRouter.post(
  '/upload',
  verifyToken,
  asyncHandler(async (req: express.Request, res) => {
    const { title, description } = req.body;
    const file = req.files!.video as UploadedFile;

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw Boom.badData(`Only ${ALLOWED_MIME_TYPES.join(', ')} files allowed`);
    }

    videosService.uploadVideo(file, req.user.id, { title, description });

    res.json({ result: `Upload started` });
  }),
);

videosRouter.delete(
  '/:id',
  [verifyToken, validator.params(idSchema)],
  // @ts-expect-error
  asyncHandler(async (req: ValidatedRequest<IdSchema>, res) => {
    await videosService.deleteVideo(req.params.id, req.user.id);

    res.status(204).send();
  }),
);

export { videosRouter };
