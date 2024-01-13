import { User } from '@prisma/client';

declare module 'express-serve-static-core' {
  export interface Request {
    user: Pick<User, 'id' | 'name' | 'createdAt'>;
  }
}
