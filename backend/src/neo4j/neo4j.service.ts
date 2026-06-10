import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  onModuleInit() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  getReadSession(): Session {
    return this.driver.session({ defaultAccessMode: neo4j.session.READ });
  }

  getWriteSession(): Session {
    return this.driver.session({ defaultAccessMode: neo4j.session.WRITE });
  }

  async runQuery(cypher: string, params: any = {}): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records;
    } finally {
      await session.close();
    }
  }
}
