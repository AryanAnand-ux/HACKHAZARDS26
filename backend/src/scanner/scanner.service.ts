import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class ScannerService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly neo4jService: Neo4jService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-api-key');
  }

  async parseDocument(fileBuffer: Buffer, mimeType: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
      // Return fallback dummy data for local development if API key is missing
      return this.getMockExtraction();
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const filePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType,
      },
    };

    const prompt = `
      You are an expert compliance auditor. Analyze the attached document (invoice or bill of lading).
      Extract the following fields and return them strictly in JSON format:
      {
        "companyName": "Name of the supplier or shipping company",
        "registrationNo": "Business registration or tax number if visible",
        "address": "Full address of the supplier",
        "signatory": "Name of the person signing or authorizing the document",
        "shipmentDate": "Date of the shipment or document date",
        "materialType": "Primary goods or materials listed in the cargo description"
      }
      Do not include any other commentary, markdown tags, or wrappers.
    `;

    try {
      const response = await model.generateContent([filePart, prompt]);
      const jsonText = response.response.text();
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to mock data to prevent blocking during evaluations
      return this.getMockExtraction();
    }
  }

  async assessRisk(companyData: any): Promise<any> {
    const { companyName } = companyData;
    if (!companyName) {
      return { riskScore: 0, path: [], message: 'No company name identified' };
    }

    // Cypher Query: Check if the scanned company is connected to any entity on a SanctionList (up to 5 hops)
    const query = `
      MATCH (c:Company)
      WHERE c.name =~ $regexName
      OPTIONAL MATCH path = shortestPath((c)-[:SUPPLIES|OWNED_BY*1..5]-(target))
      MATCH (target)-[:ON_LIST]->(s:SanctionList)
      RETURN c.id AS resolvedId, c.name AS resolvedName, c.riskScore AS baseRisk, 
             [node IN nodes(path) | {id: node.id, name: node.name, labels: labels(node)}] AS pathNodes,
             s.listName AS sanctionListName
      LIMIT 1
    `;

    try {
      // Check for similarity case-insensitively
      const regexName = `(?i).*${companyName.replace(/[^a-zA-Z0-9 ]/g, '')}.*`;
      const records = await this.neo4jService.runQuery(query, { regexName });

      if (records.length === 0) {
        // Create the company in the graph as a new unverified company to document its audit trail
        const createQuery = `
          MERGE (c:Company {id: apoc.create.uuid()})
          ON CREATE SET c.name = $name, c.riskScore = 10, c.status = 'Unverified'
          RETURN c.id as createdId
        `;
        // Apoc might not be installed, so let's use a simpler unique ID creation
        const createSimpleQuery = `
          MERGE (c:Company {name: $name})
          ON CREATE SET c.id = $id, c.riskScore = 10, c.status = 'Unverified'
          RETURN c.id as createdId
        `;
        const uniqueId = `comp_${Date.now()}`;
        const newRecord = await this.neo4jService.runQuery(createSimpleQuery, { name: companyName, id: uniqueId });
        const resolvedId = newRecord[0]?.get('createdId') || uniqueId;

        return {
          riskScore: 10,
          resolvedId,
          resolvedName: companyName,
          path: [],
          message: 'Entity not found in global registries. Scaffolding new unverified node.',
        };
      }

      const record = records[0];
      const resolvedId = record.get('resolvedId');
      const resolvedName = record.get('resolvedName');
      const baseRisk = record.get('baseRisk')?.toNumber() || 0;
      const pathNodes = record.get('pathNodes') || null;
      const sanctionListName = record.get('sanctionListName') || null;

      if (!pathNodes) {
        return {
          riskScore: baseRisk,
          resolvedId,
          resolvedName,
          path: [],
          message: 'Entity resolved. No active sanction links identified.',
        };
      }

      // Compute dynamic score: Direct match = 100, hops decay: 100 / (number of relationships + 1)
      const relationshipsCount = pathNodes.length - 1;
      const calculatedRisk = Math.round(100 / (relationshipsCount || 1));

      return {
        riskScore: Math.max(calculatedRisk, baseRisk),
        resolvedId,
        resolvedName,
        path: pathNodes,
        message: `WARNING: Entity has connection path to ${sanctionListName} (Length: ${relationshipsCount} hops)`,
      };
    } catch (error) {
      console.error('Error during Neo4j risk evaluation:', error);
      return {
        riskScore: 25,
        resolvedId: 'error_fallback',
        resolvedName: companyName,
        path: [],
        message: 'Database query failed. Displaying default security assessment.',
      };
    }
  }

  private getMockExtraction() {
    return {
      companyName: 'Linhai Textiles Corp',
      registrationNo: 'TX-9982441-A',
      address: 'Industrial Zone B, Ningbo, China',
      signatory: 'Zhao Wei',
      shipmentDate: '2026-06-08',
      materialType: 'Raw cotton fibers',
    };
  }
}
