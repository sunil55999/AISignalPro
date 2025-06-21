import express from "express";
import { loadConfig, getConfig } from "../shared/config.js";
import { createServer } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes.js";
import { storage } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

const MemoryStoreSession = MemoryStore(session);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-trading-signal-parser-secret',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false,
    httpOnly: true
  }
}));

function log(message: string) {
  console.log(`[server] ${message}`);
}

(async () => {
  // Initialize database
  try {
    await storage.initialize();
    log("Database initialized successfully");
  } catch (error) {
    log(`Database initialization failed: ${error}`);
  }

  // Add basic health check route before other routes
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Register API routes
  await registerRoutes(app);

  // Setup frontend serving
  if (process.env.NODE_ENV === "development") {
    try {
      const { createServer } = await import("vite");
      
      const vite = await createServer({
        server: { 
          middlewareMode: true,
          host: "0.0.0.0",
          port: 5173
        },
        appType: "spa",
        root: path.resolve(__dirname, "../client"),
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "../client/src"),
            "@shared": path.resolve(__dirname, "../shared"),
          }
        },
        plugins: [
          (await import("@vitejs/plugin-react")).default()
        ]
      });

      app.use(vite.ssrFixStacktrace);
      app.use(vite.middlewares);
      log("Vite development server configured successfully");
    } catch (error) {
      log(`Vite setup failed: ${error}`);
      // Fallback to simple static serving
      app.use(express.static(path.resolve(__dirname, "../client")));
      app.get("*", (_req, res) => {
        res.sendFile(path.resolve(__dirname, "../client/index.html"));
      });
      log("Using fallback static file serving");
    }
  } else {
    // Serve static files in production
    const clientPath = path.resolve(__dirname, "../dist/public");
    app.use(express.static(clientPath));
    
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  // Setup WebSocket server for parser updates
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/parser'
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const terminalId = url.searchParams.get('terminalId');
    
    log(`Terminal ${terminalId} connected for parser updates`);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received from ${terminalId}:`, message.type);
      } catch (error) {
        log(`WebSocket message error: ${error}`);
      }
    });

    ws.on('close', () => {
      log(`Terminal ${terminalId} disconnected from parser updates`);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      terminalId,
      timestamp: new Date().toISOString()
    }));
  });

  // Load configuration
  console.log("Loading system configuration...");
  const config = loadConfig();
  const systemConfig = getConfig('system');
  
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
    log(`Health check: ${systemConfig.api_base_url}/health`);
    log(`WebSocket server: ${systemConfig.websocket_url}/parser`);
    log(`Admin panel: ${systemConfig.admin_panel_url}`);
    log(`Environment: ${systemConfig.environment}`);
  });
})();



// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});