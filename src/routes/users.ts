import express from 'express';
import { ContainerTypes, createValidator, ValidatedRequest, ValidatedRequestSchema } from 'express-joi-validation';
import Joi from 'joi';
import { authService } from '../services/authService';
import { asyncHandler } from '../utils';

const authRouter = express.Router();
const validator = createValidator();

const loginRegisterSchema = Joi.object({
  name: Joi.string().required(),
  password: Joi.string().required(),
});

interface LoginRegisterSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    name: string;
    password: string;
  };
}

authRouter.post(
  '/register',
  validator.body(loginRegisterSchema),
  asyncHandler(async (req: ValidatedRequest<LoginRegisterSchema>, res) => {
    const { name, password } = req.body;

    const user = await authService.createUser(name, password);

    res.json({ user });
  }),
);

authRouter.post(
  '/login',
  validator.body(loginRegisterSchema),
  asyncHandler(async (req: ValidatedRequest<LoginRegisterSchema>, res) => {
    const { name, password } = req.body;

    const token = await authService.loginUser(name, password);

    res.json({ token });
  }),
);

export { authRouter };
