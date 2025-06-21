import express from "express";
import { createServer } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes.js";
import { storage } from "./database.js";
import path from "path";
import { fileURLToPath } from "url";

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

  // Register API routes first
  await registerRoutes(app);

  // Setup frontend serving
  if (process.env.NODE_ENV === "development") {
    // Simple static file serving for development
    app.use(express.static(path.resolve(__dirname, "../client")));
    
    // Fallback to index.html for SPA routing
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "../client/index.html"));
    });
  } else {
    // Serve static files in production
    const clientPath = path.resolve(__dirname, "../dist/public");
    app.use(express.static(clientPath));
    
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();



// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});