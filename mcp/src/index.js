#!/usr/bin/env node
import { createAvatarServer } from './server.js';

const transportMode = (process.env.MCP_TRANSPORT || (process.env.PORT ? 'http' : 'stdio')).toLowerCase();

async function startStdio() {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const server = createAvatarServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Reicon Avatars MCP server running on stdio');
}

async function startHttp() {
  const [{ default: cors }, { StreamableHTTPServerTransport }, { createMcpExpressApp }] =
    await Promise.all([
      import('cors'),
      import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
      import('@modelcontextprotocol/sdk/server/express.js')
    ]);

  const host = process.env.HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.PORT || process.env.MCP_PORT || '3000', 10);
  const app = createMcpExpressApp({ host });

  app.use(cors({ exposedHeaders: ['Mcp-Session-Id'] }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'reicon-avatars', transport: 'http' });
  });

  app.post('/mcp', async (req, res) => {
    const server = createAvatarServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP HTTP request failed:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  });

  app.get('/mcp', (req, res) => {
    res.set('Allow', 'POST').status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
      id: null
    });
  });

  app.delete('/mcp', (req, res) => {
    res.set('Allow', 'POST').status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
      id: null
    });
  });

  const httpServer = app.listen(port, host, () => {
    console.error(`Reicon Avatars MCP server running on http://${host}:${port}/mcp`);
  });

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (transportMode === 'http') {
  startHttp().catch((error) => {
    console.error('Failed to start HTTP MCP server:', error);
    process.exit(1);
  });
} else if (transportMode === 'stdio') {
  startStdio().catch((error) => {
    console.error('Failed to start stdio MCP server:', error);
    process.exit(1);
  });
} else {
  console.error(`Unknown MCP_TRANSPORT "${transportMode}". Use "stdio" or "http".`);
  process.exit(1);
}
