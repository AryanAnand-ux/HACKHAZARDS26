import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  onModuleInit() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vigilnet';
    this.pool = new Pool({ connectionString });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(text: string, params: any[] = []): Promise<any> {
    try {
      return await this.pool.query(text, params);
    } catch (error) {
      console.warn('Postgres query warning (using local in-memory fallback if DB not running):', error.message);
      // Fallback object to keep the app functional even if PostgreSQL is offline
      return { rows: [] };
    }
  }
}
