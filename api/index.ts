import express from 'express';
import neo4j from 'neo4j-driver';

const app = express();
app.use(express.json());

// Neo4j Driver setup - Hardcoded as requested
const uri = process.env.NEO4J_URI || 'neo4j+s://b9a5729a.databases.neo4j.io';
const user = process.env.NEO4J_USER || '9ea23d30';
const password = process.env.NEO4J_PASSWORD || '2DREbniRzr7FQIV5VNo0N4Zz2BpubRQ_uJxRbkY--fU';

let driver: any = null;

function getDriver() {
  if (!driver) {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    configured: true,
    timestamp: new Date().toISOString() 
  });
});

app.post('/api/write', async (req, res) => {
  const currentDriver = getDriver();
  const { cypher, params } = req.body;
  if (!cypher) return res.status(400).json({ error: 'Missing cypher query' });

  const session = currentDriver.session();
  try {
    const result = await session.run(cypher, params || {});
    res.json({ 
      success: true, 
      summary: result.summary.counters.updates(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post('/api/ingest', async (req, res) => {
  const currentDriver = getDriver();
  const session = currentDriver.session();
  const data = req.body;

  const cypher = `
    MERGE (e:Email {id: $email_id})
    SET e.subject = $subject, e.text = $original_text, e.processedAt = datetime()
    WITH e
    UNWIND $topics AS topic
    MERGE (t:Topic {name: topic})
    MERGE (e)-[:DISCUSSES]->(t)
    WITH e
    UNWIND $project_names AS projectName
    MERGE (p:Project {name: projectName})
    MERGE (e)-[:RELATED_TO_PROJECT]->(p)
    WITH e
    UNWIND $people_mentioned AS personName
    MERGE (per:Person {name: personName})
    MERGE (e)-[:MENTIONS]->(per)
    WITH e
    UNWIND $decisions AS decision
    CREATE (d:Decision {text: decision, timestamp: datetime()})
    MERGE (e)-[:RESULTED_IN]->(d)
    WITH e
    UNWIND $risks AS risk
    CREATE (r:Risk {text: risk})
    MERGE (e)-[:IDENTIFIED_RISK]->(r)
    RETURN e.id as id
  `;

  try {
    await session.run(cypher, data);
    res.json({ success: true, message: 'Graph updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post('/api/query', async (req, res) => {
  const currentDriver = getDriver();
  const { cypher, params } = req.body;
  const session = currentDriver.session();
  try {
    const result = await session.run(cypher, params || {});
    const records = result.records.map(record => {
      const obj = record.toObject();
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
          return neo4j.integer.toNumber(value);
        }
        return value;
      }));
    });
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

export default app;
