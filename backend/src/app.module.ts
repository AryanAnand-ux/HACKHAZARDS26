import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { AuthModule } from './auth/auth.module';
import { ScannerModule } from './scanner/scanner.module';
import { InterviewModule } from './interview/interview.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    DbModule,
    Neo4jModule,
    AuthModule,
    ScannerModule,
    InterviewModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

