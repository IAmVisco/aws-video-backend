import Boom from '@hapi/boom';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { asyncHandler } from '../utils';

const SALT_ROUNDS = 10;
const authRouter = express.Router();

authRouter.post(
  '/register',
  asyncHandler(async (req: express.Request<any, { name: string; password: string }>, res) => {
    const { name, password } = req.body;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, passwordHash },
      select: { id: true, name: true, createdAt: true },
    });
    res.json({ user });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req: express.Request<any, { name: string; password: string }>, res) => {
    const { name, password } = req.body;
    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) {
      throw Boom.notFound('User not found');
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw Boom.badRequest('Incorrect password');
    }

    const token = jwt.sign({ id: user.id, name: user.name }, process.env.TOKEN_SECRET as string, {
      expiresIn: '30d',
    });

    res.json({ token });
  }),
);

export { authRouter };
