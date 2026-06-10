import { Injectable, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class WorkflowsService implements OnModuleInit {
  constructor(private readonly neo4jService: Neo4jService) {}

  onModuleInit() {
    // Render Workflows initialization logic
    // Tasks can be registered durably with Render in production environments.
  }

  // Stage 1: Fetch Sanctions List updates from external registry feeds
  async fetchSanctionListsTask(): Promise<any[]> {
    console.log('[Render Workflow Stage 1] Fetching global OFAC/UN sanction updates...');
    // Simulates an API call to registries
    return [
      { id: 'log_xj', name: 'Xinjiang Logistics Ltd', country: 'China' },
      { id: 'ref_ural', name: 'Ural Metals Refinery', country: 'Russia' },
    ];
  }

  // Stage 2: Run Entity Resolution matching sanction targets to our internal graph
  async entityResolutionTask(sanctions: any[]): Promise<any[]> {
    console.log('[Render Workflow Stage 2] Matching registries with supplier graph database...');
    const matches: any[] = [];
    
    for (const sanction of sanctions) {
      const query = `
        MATCH (c:Company) 
        WHERE c.name =~ $regexName
        RETURN c.id AS id, c.name AS name
      `;
      // Clean up string for safe regex matching
      const cleanName = sanction.name.replace(/[^a-zA-Z0-9 ]/g, '');
      const regexName = `(?i).*${cleanName}.*`;
      
      try {
        const records = await this.neo4jService.runQuery(query, { regexName });
        if (records.length > 0) {
          matches.push({
            sanctionId: sanction.id,
            supplierId: records[0].get('id'),
            supplierName: records[0].get('name'),
          });
        }
      } catch (e) {
        console.warn(`Entity resolution check failed for ${sanction.name}:`, e.message);
      }
    }
    return matches;
  }

  // Stage 3: Merge fresh relations and update risk profiles in Neo4j AuraDB
  async loadToNeo4jTask(matches: any[]): Promise<any> {
    console.log('[Render Workflow Stage 3] Merging new sanction linkages into Neo4j...');
    const results: any[] = [];
    
    for (const match of matches) {
      const query = `
        MATCH (c:Company {id: $supplierId})
        MERGE (s:SanctionList {id: $sanctionId})
        ON CREATE SET s.listName = 'OFAC SDN List', s.threatLevel = 'CRITICAL'
        MERGE (c)-[r:ON_LIST]->(s)
        SET c.riskScore = 100, c.status = 'Sanctioned'
        RETURN c.name AS companyName, s.listName AS listName
      `;
      
      try {
        const records = await this.neo4jService.runQuery(query, {
          supplierId: match.supplierId,
          sanctionId: match.sanctionId,
        });
        if (records.length > 0) {
          results.push({
            company: records[0].get('companyName'),
            linkedList: records[0].get('listName'),
          });
        }
      } catch (e) {
        console.error(`Failed to load link to Neo4j for supplier ${match.supplierId}:`, e.message);
      }
    }
    return { success: true, ingestedLinksCount: results.length, details: results };
  }

  // Orchestrator method to run the entire multi-stage pipeline durably
  async runIngestionWorkflow(): Promise<any> {
    console.log('--- STARTING DURABLE INGESTION WORKFLOW ---');
    const sanctions = await this.fetchSanctionListsTask();
    const matches = await this.entityResolutionTask(sanctions);
    const ingestionResult = await this.loadToNeo4jTask(matches);
    console.log('--- COMPLETED DURABLE INGESTION WORKFLOW ---');
    
    return {
      workflowId: `wf_run_${Date.now()}`,
      workflowName: 'Sanctions_Ingestion_Orchestrator',
      status: 'COMPLETED',
      stages: [
        { stageName: 'Fetch Registry Lists', output: sanctions },
        { stageName: 'Resolve Supplier Matches', output: matches },
        { stageName: 'Ingest Graph Linkages', output: ingestionResult },
      ],
    };
  }
}
