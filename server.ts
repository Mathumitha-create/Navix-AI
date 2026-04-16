import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;
  app.use(express.json());

  const DEMO_DRIVER = {
    driverId: "DRV001",
    password: "demo123",
    name: "Rahul Verma",
    shipment: "SHP-2026-041",
    source: "Chennai Hub, India",
    destination: "Kanchipuram DC, India",
  };

  const DEMO_ADMIN = {
    username: "admin",
    password: "admin2026",
    name: "Operations Admin",
  };

  app.post("/api/login", (req, res) => {
    const { driverId, password } = req.body ?? {};

    if (
      driverId === DEMO_DRIVER.driverId &&
      password === DEMO_DRIVER.password
    ) {
      return res.json({
        success: true,
        driver: {
          id: DEMO_DRIVER.driverId,
          name: DEMO_DRIVER.name,
        },
        assignment: {
          shipment: DEMO_DRIVER.shipment,
          source: DEMO_DRIVER.source,
          destination: DEMO_DRIVER.destination,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid Driver ID or Password",
    });
  });

  app.post("/api/admin-login", (req, res) => {
    const { username, password } = req.body ?? {};

    if (username === DEMO_ADMIN.username && password === DEMO_ADMIN.password) {
      return res.json({
        success: true,
        admin: {
          username: DEMO_ADMIN.username,
          name: DEMO_ADMIN.name,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin username or password",
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
