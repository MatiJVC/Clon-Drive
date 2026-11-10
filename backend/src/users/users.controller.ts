import { Controller, Get, Inject, Query } from '@nestjs/common';
import { and, asc, ilike, ne } from 'drizzle-orm';
import { CurrentUser, type AuthUser } from '../common/auth-user.js';
import { DB, type Database } from '../db/database.module.js';
import { users } from '../db/schema.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(DB) private readonly db: Database) {}

  // GET /users/search?q=ab -> autocompletar al compartir
  @Get('search')
  search(@CurrentUser() user: AuthUser, @Query('q') q = '') {
    const prefix = q.trim().replace(/[%_\\]/g, '\\$&');
    if (!prefix) return [];
    return this.db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(ilike(users.username, `${prefix}%`), ne(users.id, user.id)))
      .orderBy(asc(users.username))
      .limit(10);
  }
}
