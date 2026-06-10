// VigilNet Neo4j Schema & Constraints Definitions

// Constraints for Unique IDs
CREATE CONSTRAINT company_id_unique IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT facility_id_unique IF NOT EXISTS FOR (f:Facility) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT individual_id_unique IF NOT EXISTS FOR (i:Individual) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT sanction_id_unique IF NOT EXISTS FOR (s:SanctionList) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT report_id_unique IF NOT EXISTS FOR (r:AuditReport) REQUIRE r.id IS UNIQUE;

// Indexes for Fast Lookup
CREATE INDEX company_name_idx IF NOT EXISTS FOR (c:Company) ON (c.name);
CREATE INDEX company_reg_idx IF NOT EXISTS FOR (c:Company) ON (c.registrationNo);
CREATE INDEX facility_name_idx IF NOT EXISTS FOR (f:Facility) ON (f.name);
CREATE INDEX individual_name_idx IF NOT EXISTS FOR (i:Individual) ON (i.name);
CREATE INDEX sanction_list_name_idx IF NOT EXISTS FOR (s:SanctionList) ON (s.listName);
