import Boom from '@hapi/boom';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const SALT_ROUNDS = 10;

class AuthService {
  async createUser(name: string, password: string): Promise<Omit<User, 'passwordHash'>> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, passwordHash },
      select: { id: true, name: true, createdAt: true },
    });

    return user;
  }

  async loginUser(name: string, password: string): Promise<string> {
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

    return token;
  }
}

export const authService = new AuthService();
