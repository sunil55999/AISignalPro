import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { storage } from "./database.js";

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Initialize database
  try {
    await storage.initialize();
    log("Database initialized successfully");
  } catch (error) {
    log(`Database initialization failed: ${error}`, "database");
  }

  // Register API routes
  const httpServer = await registerRoutes(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();

async function initializeDatabase() {
  try {
    await storage.initialize();
    log("Database connection established successfully");
  } catch (error) {
    log(`Database initialization error: ${error}`, "database");
    process.exit(1);
  }
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});