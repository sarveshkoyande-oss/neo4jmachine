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

// In-memory log for last 10 requests (Note: Vercel is stateless, this lasts as long as the lambda is warm)
let requestLogs: any[] = [];
function addLog(type: string, status: 'SUCCESS' | 'FAILURE', details: any) {
  requestLogs.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    type,
    status,
    details
  });
  if (requestLogs.length > 10) requestLogs.pop();
}

// API Endpoints
app.get('/api/logs', (req, res) => {
  res.json(requestLogs);
});

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
  if (!cypher) {
    addLog('WRITE', 'FAILURE', { error: 'Missing cypher query' });
    return res.status(400).json({ error: 'Missing cypher query' });
  }

  const session = currentDriver.session();
  try {
    const result = await session.run(cypher, params || {});
    addLog('WRITE', 'SUCCESS', { cypher });
    res.json({ 
      success: true, 
      summary: result.summary.counters.updates(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    addLog('WRITE', 'FAILURE', { cypher, error: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Specialized endpoint for Power Automate Email Pipeline
app.post('/api/ingest', async (req, res) => {
  const currentDriver = getDriver();
  const session = currentDriver.session();
  const data = req.body;

  // Sanitize all incoming arrays to ensure they are valid for Cypher UNWIND
  // This handles cases where Power Automate might send null/undefined for empty lists
  const sanitized = {
    ...data,
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
    action_items: Array.isArray(data.action_items) ? data.action_items : [],
    risks: Array.isArray(data.risks) ? data.risks : [],
    topics: Array.isArray(data.topics) ? data.topics : [],
    project_names: Array.isArray(data.project_names) ? data.project_names : [],
    people_mentioned: Array.isArray(data.people_mentioned) ? data.people_mentioned : [],
    thread_participants: Array.isArray(data.thread_participants) ? data.thread_participants : []
  };

  const cypher = `
    MERGE (e:Email {id: $email_id})
    SET e.subject = $subject, 
        e.text = $original_text, 
        e.processedAt = datetime()
    
    WITH e
    UNWIND (CASE WHEN size($topics) > 0 THEN $topics ELSE [null] END) AS topic
    WITH e, topic WHERE topic IS NOT NULL
    MERGE (t:Topic {name: topic})
    MERGE (e)-[:DISCUSSES]->(t)
    
    WITH e
    UNWIND (CASE WHEN size($project_names) > 0 THEN $project_names ELSE [null] END) AS projectName
    WITH e, projectName WHERE projectName IS NOT NULL
    MERGE (p:Project {name: projectName})
    MERGE (e)-[:RELATED_TO_PROJECT]->(p)
    
    WITH e
    UNWIND (CASE WHEN size($people_mentioned) > 0 THEN $people_mentioned ELSE [null] END) AS personName
    WITH e, personName WHERE personName IS NOT NULL
    MERGE (per:Person {name: personName})
    MERGE (e)-[:MENTIONS]->(per)
    
    WITH e
    UNWIND (CASE WHEN size($decisions) > 0 THEN $decisions ELSE [null] END) AS decision
    WITH e, decision WHERE decision IS NOT NULL
    CREATE (d:Decision {text: decision, timestamp: datetime()})
    MERGE (e)-[:RESULTED_IN]->(d)

    WITH e
    UNWIND (CASE WHEN size($action_items) > 0 THEN $action_items ELSE [null] END) AS action
    WITH e, action WHERE action IS NOT NULL
    CREATE (ai:ActionItem {text: action, status: 'Pending', createdAt: datetime()})
    MERGE (e)-[:ASSIGNED_ACTION]->(ai)
    
    WITH e
    UNWIND (CASE WHEN size($risks) > 0 THEN $risks ELSE [null] END) AS risk
    WITH e, risk WHERE risk IS NOT NULL
    CREATE (r:Risk {text: risk, discoveredAt: datetime()})
    MERGE (e)-[:IDENTIFIED_RISK]->(r)

    WITH e
    UNWIND (CASE WHEN size($thread_participants) > 0 THEN $thread_participants ELSE [null] END) AS participant
    WITH e, participant WHERE participant IS NOT NULL
    MERGE (tp:Person {name: participant})
    MERGE (e)-[:PARTICIPANT_IN]->(tp)
    
    RETURN e.id as id
  `;

  try {
    if (!data.email_id) throw new Error('Missing email_id in request body');
    await session.run(cypher, sanitized);
    addLog('INGEST', 'SUCCESS', { email_id: data.email_id, subject: data.subject });
    res.json({ success: true, message: 'Graph updated successfully' });
  } catch (error: any) {
    console.error('Ingest Error:', error);
    addLog('INGEST', 'FAILURE', { payload: data, error: error.message });
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
    addLog('QUERY', 'SUCCESS', { cypher });
    res.json({ success: true, data: records });
  } catch (error: any) {
    addLog('QUERY', 'FAILURE', { cypher, error: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

export default app;
