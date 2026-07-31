import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const nombresPermitidos =
        req.auth.rol === "SuperAdministrador"
          ? ["Administrador", "Vendedor"]
          : ["Vendedor"];

      const roles = await prisma.rol.findMany({
        where: {
          nombre: {
            in: nombresPermitidos,
          },
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          estado: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Roles obtenidos correctamente",
        data: {
          roles,
        },
      });
    } catch (error) {
      console.error("Error al obtener roles:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible obtener los roles",
      });
    }
  }
);

export default router;