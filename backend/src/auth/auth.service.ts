import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DB, type Database } from '../db/database.module.js';
import { users } from '../db/schema.js';
import { isUniqueViolation } from '../common/db-errors.js';
import type { AuthUser } from '../common/auth-user.js';
import { hashPassword, verifyPassword } from './password.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async register(username: string, password: string) {
    try {
      const [user] = await this.db
        .insert(users)
        .values({ username, passwordHash: await hashPassword(password) })
        .returning({ id: users.id, username: users.username });
      return this.session(user);
    } catch (e) {
      if (isUniqueViolation(e))
        throw new ConflictException('Ese nombre de usuario ya existe');
      throw e;
    }
  }

  async login(username: string, password: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    return this.session({ id: user.id, username: user.username });
  }

  private async session(user: AuthUser) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });
    return { accessToken, user };
  }
}
