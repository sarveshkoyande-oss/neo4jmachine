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

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      configured: !!(uri && user && password),
      timestamp: new Date().toISOString() 
    });
  });

  app.post('/api/write', async (req, res) => {
    const currentDriver = getDriver();
    if (!currentDriver) {
      return res.status(500).json({ error: 'Neo4j driver not configured. Check environment variables.' });
    }

    const { cypher, params } = req.body;
    if (!cypher) {
      return res.status(400).json({ error: 'Missing cypher query' });
    }

    const session = currentDriver.session();
    try {
      const result = await session.run(cypher, params || {});
      res.json({ 
        success: true, 
        summary: result.summary.counters.updates(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Neo4j Write Error:', error);
      res.status(500).json({ 
        error: error.message || 'Database error',
        code: error.code 
      });
    } finally {
      await session.close();
    }
  });

  app.post('/api/query', async (req, res) => {
    const currentDriver = getDriver();
    if (!currentDriver) {
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
      res.json({ success: true, data: records });
    } catch (error: any) {
      console.error('Neo4j Query Error:', error);
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
