import Boom from '@hapi/boom';
import { User } from '@prisma/client';

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) throw Boom.unauthorized();

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET as string) as Pick<User, 'id' | 'name' | 'createdAt'>;
    req.user = decoded;
    next();
  } catch (e) {
    throw Boom.unauthorized(e as Error);
  }
};
