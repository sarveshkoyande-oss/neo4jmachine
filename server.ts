import express from 'express';
import neo4j from 'neo4j-driver';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Neo4j Driver setup - Hardcoded for simplicity as requested
  const uri = process.env.NEO4J_URI || 'neo4j+s://b9a5729a.databases.neo4j.io';
  const user = process.env.NEO4J_USER || '9ea23d30';
  const password = process.env.NEO4J_PASSWORD || '2DREbniRzr7FQIV5VNo0N4Zz2BpubRQ_uJxRbkY--fU';

  let driver: any = null;

  function getDriver() {
    if (!driver) {
      if (!uri || user.includes('REPLACE_WITH') || password.includes('REPLACE_WITH')) {
        console.warn('⚠️ Neo4j credentials not fully set in server.ts or environment.');
        return null;
      }
      driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }
    return driver;
  }

  // In-memory log for last 10 requests
  const requestLogs: any[] = [];
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
    if (!currentDriver) {
      addLog('WRITE', 'FAILURE', { error: 'Neo4j driver not configured' });
      return res.status(500).json({ error: 'Neo4j driver not configured. Check environment variables.' });
    }

    const { cypher, params } = req.body;
    if (!cypher) {
      addLog('WRITE', 'FAILURE', { error: 'Missing cypher query' });
      return res.status(400).json({ error: 'Missing cypher query' });
    }

    const session = currentDriver.session();
    try {
      const result = await session.run(cypher, params || {});
      addLog('WRITE', 'SUCCESS', { cypher, params });
      res.json({ 
        success: true, 
        summary: result.summary.counters.updates(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Neo4j Write Error:', error);
      addLog('WRITE', 'FAILURE', { cypher, params, error: error.message });
      res.status(500).json({ 
        error: error.message || 'Database error',
        code: error.code 
      });
    } finally {
      await session.close();
    }
  });

  // Specialized endpoint for Power Automate Email Pipeline
  app.post('/api/ingest', async (req, res) => {
    const currentDriver = getDriver();
    if (!currentDriver) {
      addLog('INGEST', 'FAILURE', { error: 'Database not connected' });
      return res.status(500).json({ error: 'Database not connected' });
    }

    const data = req.body;
    const session = currentDriver.session();

    // Sanitize data and extract primitives/objects as needed
    const toPrimitive = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return val.text || val.description || val.summary || val.name || JSON.stringify(val);
      return String(val);
    };

    const sanitized = {
      email_id: data.email_id,
      subject: data.subject,
      original_text: data.original_text,
      decisions: Array.isArray(data.decisions) ? data.decisions : [],
      action_items: Array.isArray(data.action_items) ? data.action_items : [],
      risks: Array.isArray(data.risks) ? data.risks : [],
      topics: Array.isArray(data.topics) ? data.topics.map(toPrimitive) : [],
      project_names: Array.isArray(data.project_names) ? data.project_names.map(toPrimitive) : [],
      people_mentioned: Array.isArray(data.people_mentioned) ? data.people_mentioned.map(toPrimitive) : [],
      thread_participants: Array.isArray(data.thread_participants) ? data.thread_participants.map(toPrimitive) : []
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
      MERGE (e)-[:HAS_TOPIC]->(t)
      
      WITH DISTINCT e
      UNWIND (CASE WHEN size($project_names) > 0 THEN $project_names ELSE [null] END) AS projectName
      WITH e, projectName WHERE projectName IS NOT NULL
      MERGE (p:Project {name: projectName})
      MERGE (e)-[:RELATED_TO]->(p)
      
      WITH DISTINCT e
      UNWIND (CASE WHEN size($people_mentioned) > 0 THEN $people_mentioned ELSE [null] END) AS personName
      WITH e, personName WHERE personName IS NOT NULL
      MERGE (per:Person {name: personName})
      MERGE (e)-[:MENTIONS]->(per)
      
      WITH DISTINCT e
      UNWIND (CASE WHEN size($decisions) > 0 THEN $decisions ELSE [null] END) AS d
      WITH e, d WHERE d IS NOT NULL
      CREATE (dec:Decision {
        summary: coalesce(d.summary, d.text, ""),
        date: coalesce(d.date, ""),
        status: coalesce(d.status, ""),
        impact: coalesce(d.impact, ""),
        confidence: coalesce(d.confidence, ""),
        made_by: coalesce(d.made_by, ""),
        createdAt: datetime()
      })
      MERGE (e)-[:HAS_DECISION]->(dec)

      WITH DISTINCT e
      UNWIND (CASE WHEN size($action_items) > 0 THEN $action_items ELSE [null] END) AS ai
      WITH e, ai WHERE ai IS NOT NULL
      CREATE (item:ActionItem {
        text: coalesce(ai.text, ""),
        owner: coalesce(ai.owner, ""),
        due_date: coalesce(ai.due_date, ""),
        status: 'Pending',
        createdAt: datetime()
      })
      MERGE (e)-[:HAS_ACTION]->(item)
      
      WITH DISTINCT e
      UNWIND (CASE WHEN size($risks) > 0 THEN $risks ELSE [null] END) AS r
      WITH e, r WHERE r IS NOT NULL
      CREATE (risk:Risk {
        summary: coalesce(r.summary, r.description, ""),
        severity: coalesce(r.severity, ""),
        raised_by: coalesce(r.raised_by, ""),
        discoveredAt: datetime()
      })
      MERGE (e)-[:HAS_RISK]->(risk)

      WITH DISTINCT e
      UNWIND (CASE WHEN size($thread_participants) > 0 THEN $thread_participants ELSE [null] END) AS participant
      WITH e, participant WHERE participant IS NOT NULL
      MERGE (tp:Person {name: participant})
      MERGE (tp)-[:PARTICIPANT_IN]->(e)
      
      RETURN e.id as id
    `;

    try {
      if (!data.email_id) throw new Error('Missing email_id in request body');
      await session.run(cypher, sanitized);
      addLog('INGEST', 'SUCCESS', { email_id: data.email_id, subject: data.subject });
      res.json({ success: true, message: 'Email data ingested and mapped to graph.' });
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
    if (!currentDriver) {
      addLog('QUERY', 'FAILURE', { error: 'Neo4j driver not configured' });
      return res.status(500).json({ error: 'Neo4j driver not configured.' });
    }

    const { cypher, params } = req.body;
    const session = currentDriver.session();
    try {
      const result = await session.run(cypher, params || {});
      const records = result.records.map(record => {
        const obj = record.toObject();
        // Recursively convert Neo4j Integers to standard JS numbers
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
      console.error('Neo4j Query Error:', error);
      addLog('QUERY', 'FAILURE', { cypher, error: error.message });
      res.status(500).json({ error: error.message });
    } finally {
      await session.close();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Neo4j Aura Bridge running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
