import { Boom } from '@hapi/boom';
import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: Boom | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  const error =
    err instanceof Boom
      ? err.output.payload
      : {
          message: err.message,
          statusCode: 500,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        };

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error.statusCode = 400;
    if (process.env.NODE_ENV !== 'development')
      // Exposes code by default
      error.message = 'Database Error, check logs';
  }
  res.status(error.statusCode).json(error);
};
