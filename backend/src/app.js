import categoriaRouter from "./routes/categoria.routes.js";
import express from "express";
import prisma from "./lib/prisma.js";
import authRouter from "./routes/auth.routes.js";
import productoRouter from "./routes/producto.routes.js";
import clienteRouter from "./routes/cliente.routes.js";

const app = express();

app.use(express.json());

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

app.use("/auth", authRouter);
app.use("/categorias", categoriaRouter);
app.use("/productos", productoRouter);
app.use("/clientes", clienteRouter);

export default app;