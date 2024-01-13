import type { NextFunction, Request, RequestHandler, Response } from 'express';

const asyncHandler = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export { asyncHandler };
