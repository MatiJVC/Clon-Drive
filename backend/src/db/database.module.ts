import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { resolve } from 'node:path';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './schema.js';

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new pg.Pool({
          connectionString:
            process.env.DATABASE_URL ??
            'postgresql://drive:drive@localhost:5432/drive',
        }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DB, PG_POOL],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(PG_POOL) private readonly pool: pg.Pool,
  ) {}

  // Aplica las migraciones pendientes de ./drizzle al arrancar.
  async onModuleInit() {
    const migrationsFolder = resolve(
      process.env.MIGRATIONS_DIR ?? 'drizzle',
    );
    await migrate(this.db, { migrationsFolder });
    this.logger.log('Migraciones de base de datos aplicadas');
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
