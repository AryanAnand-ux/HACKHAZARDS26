// VigilNet Neo4j Seed Data Script
// Open your Neo4j Aura console or local browser, and execute these queries.

// 1. Clear any existing data (Optional - Use with caution)
// MATCH (n) DETACH DELETE n;

// 2. Create Sanctions Lists
CREATE (s:SanctionList {
  id: 'sanction_ofac',
  listName: 'OFAC SDN List',
  countrySource: 'USA',
  threatLevel: 'CRITICAL'
});

// 3. Create Sanctioned Entities
CREATE (xj:Company {
  id: 'log_xj',
  name: 'Xinjiang Logistics Ltd',
  registrationNo: 'XJ-LOG-8891',
  country: 'China',
  riskScore: 100,
  status: 'Sanctioned'
});

CREATE (refinery:Company {
  id: 'ref_ural',
  name: 'Ural Metals Refinery',
  registrationNo: 'RU-MET-5542',
  country: 'Russia',
  riskScore: 100,
  status: 'Sanctioned'
});

// Link sanctioned companies to list
CREATE (xj)-[:ON_LIST]->(s);
CREATE (refinery)-[:ON_LIST]->(s);

// 4. Create Tier-3 Supplier (Scanned Match)
CREATE (linhai:Company {
  id: 'comp_linhai',
  name: 'Linhai Textiles Corp',
  registrationNo: 'TX-9982441-A',
  country: 'China',
  riskScore: 80,
  status: 'High-Risk'
});

// Create relationship: Sanctioned company owns part of Linhai
CREATE (xj)-[:OWNED_BY {percentage: 60}]->(linhai);

// 5. Create Tier-2 Spinning Mill
CREATE (pacific:Company {
  id: 'comp_pacific',
  name: 'Pacific Cotton Mills',
  registrationNo: 'PC-MILL-110',
  country: 'Vietnam',
  riskScore: 50,
  status: 'Active'
});

// Linhai supplies yarn to Pacific Cotton Mills
CREATE (linhai)-[:SUPPLIES {materialType: 'Yarn', volume: '500 Tons/year'}]->(pacific);

// 6. Create Tier-1 Manufacturer
CREATE (global:Company {
  id: 'comp_global',
  name: 'Global Apparel Sourcing',
  registrationNo: 'GA-SOURCING',
  country: 'India',
  riskScore: 20,
  status: 'Active'
});

// Pacific Cotton Mills supplies fabric to Global Apparel Sourcing
CREATE (pacific)-[:SUPPLIES {materialType: 'Fabric', volume: '100k Units/year'}]->(global);
