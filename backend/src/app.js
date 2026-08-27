import categoriaRouter from "./routes/categoria.routes.js";
import express from "express";
import prisma from "./lib/prisma.js";
import authRouter from "./routes/auth.routes.js";
import productoRouter from "./routes/producto.routes.js";
import clienteRouter from "./routes/cliente.routes.js";
import movimientoRouter from "./routes/movimiento.routes.js";
import empresaRouter from "./routes/empresa.routes.js";
import usuarioRouter from "./routes/usuario.routes.js";
import rolRouter from "./routes/rol.routes.js";
import cors from "cors";
import helmet from "helmet";
import cotizacionRouter from "./routes/cotizacion.routes.js";
import ventaRouter from "./routes/venta.routes.js";

import { loginLimiter } from "./middlewares/security.middleware.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();
app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API funcionando correctamente",
  });
});

app.get("/health/database", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "Conexión con PostgreSQL funcionando correctamente",
    });
  } catch (error) {
    console.error("Error al comprobar PostgreSQL:", error);

    return res.status(503).json({
      success: false,
      message: "No fue posible conectar con PostgreSQL",
    });
  }
});

app.use("/auth/login", loginLimiter);
app.use("/auth", authRouter);
app.use("/categorias", categoriaRouter);
app.use("/productos", productoRouter);
app.use("/clientes", clienteRouter);
app.use("/movimientos", movimientoRouter);
app.use("/cotizaciones", cotizacionRouter);
app.use("/empresas", empresaRouter);
app.use("/usuarios", usuarioRouter);
app.use("/roles", rolRouter);
app.use("/ventas", ventaRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;