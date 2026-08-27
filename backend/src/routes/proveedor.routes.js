import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

const rolesProveedores = authorizeRoles(
  "Administrador",
  "Vendedor",
);

const normalizarRut = (rut = "") =>
  String(rut)
    .trim()
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toUpperCase();

/*
 * =========================================================
 * LISTAR PROVEEDORES
 * =========================================================
 */

router.get(
  "/",
  authRequired,
  rolesProveedores,
  async (req, res) => {
    try {
      const proveedores =
        await prisma.proveedor.findMany({
          where: {
            empresaId: req.auth.empresaId,
          },
          orderBy: {
            razonSocial: "asc",
          },
        });

      return res.status(200).json({
        success: true,
        data: {
          proveedores,
        },
      });
    } catch (error) {
      console.error(
        "Error al listar proveedores:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar los proveedores",
      });
    }
  },
);

/*
 * =========================================================
 * OBTENER PROVEEDOR POR ID
 * =========================================================
 */

router.get(
  "/:id",
  authRequired,
  rolesProveedores,
  async (req, res) => {
    try {
      const proveedorId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador del proveedor no es válido",
        });
      }

      const proveedor =
        await prisma.proveedor.findFirst({
          where: {
            id: proveedorId,
            empresaId: req.auth.empresaId,
          },
        });

      if (!proveedor) {
        return res.status(404).json({
          success: false,
          message: "Proveedor no encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          proveedor,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar proveedor:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar el proveedor",
      });
    }
  },
);

/*
 * =========================================================
 * CREAR PROVEEDOR
 * =========================================================
 */

router.post(
  "/",
  authRequired,
  rolesProveedores,
  async (req, res) => {
    try {
      const {
        razonSocial,
        rut,
        giro,
        correo,
        telefono,
        direccion,
      } = req.body;

      const razonSocialNormalizada =
        String(razonSocial || "").trim();

      const rutNormalizado =
        normalizarRut(rut);

      if (!razonSocialNormalizada) {
        return res.status(400).json({
          success: false,
          message:
            "La razón social es obligatoria",
        });
      }

      if (!rutNormalizado) {
        return res.status(400).json({
          success: false,
          message:
            "El RUT del proveedor es obligatorio",
        });
      }

      const proveedorExistente =
        await prisma.proveedor.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            rut: rutNormalizado,
          },
          select: {
            id: true,
          },
        });

      if (proveedorExistente) {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe un proveedor con ese RUT en tu empresa",
        });
      }

      const proveedor =
        await prisma.proveedor.create({
          data: {
            empresaId: req.auth.empresaId,
            razonSocial:
              razonSocialNormalizada,
            rut: rutNormalizado,
            giro:
              String(giro || "").trim() ||
              null,
            correo:
              String(correo || "")
                .trim()
                .toLowerCase() || null,
            telefono:
              String(telefono || "").trim() ||
              null,
            direccion:
              String(direccion || "").trim() ||
              null,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Proveedor creado correctamente",
        data: {
          proveedor,
        },
      });
    } catch (error) {
      console.error(
        "Error al crear proveedor:",
        error,
      );

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe un proveedor con ese RUT en tu empresa",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No fue posible crear el proveedor",
      });
    }
  },
);

/*
 * =========================================================
 * ACTUALIZAR PROVEEDOR
 * =========================================================
 */

router.put(
  "/:id",
  authRequired,
  rolesProveedores,
  async (req, res) => {
    try {
      const proveedorId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador del proveedor no es válido",
        });
      }

      const proveedorActual =
        await prisma.proveedor.findFirst({
          where: {
            id: proveedorId,
            empresaId: req.auth.empresaId,
          },
        });

      if (!proveedorActual) {
        return res.status(404).json({
          success: false,
          message: "Proveedor no encontrado",
        });
      }

      const {
        razonSocial,
        rut,
        giro,
        correo,
        telefono,
        direccion,
      } = req.body;

      const razonSocialNormalizada =
        String(razonSocial || "").trim();

      const rutNormalizado =
        normalizarRut(rut);

      if (!razonSocialNormalizada) {
        return res.status(400).json({
          success: false,
          message:
            "La razón social es obligatoria",
        });
      }

      if (!rutNormalizado) {
        return res.status(400).json({
          success: false,
          message:
            "El RUT del proveedor es obligatorio",
        });
      }

      const proveedorDuplicado =
        await prisma.proveedor.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            rut: rutNormalizado,
            NOT: {
              id: proveedorId,
            },
          },
          select: {
            id: true,
          },
        });

      if (proveedorDuplicado) {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe otro proveedor con ese RUT en tu empresa",
        });
      }

      const proveedor =
        await prisma.proveedor.update({
          where: {
            id: proveedorId,
          },
          data: {
            razonSocial:
              razonSocialNormalizada,
            rut: rutNormalizado,
            giro:
              String(giro || "").trim() ||
              null,
            correo:
              String(correo || "")
                .trim()
                .toLowerCase() || null,
            telefono:
              String(telefono || "").trim() ||
              null,
            direccion:
              String(direccion || "").trim() ||
              null,
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Proveedor actualizado correctamente",
        data: {
          proveedor,
        },
      });
    } catch (error) {
      console.error(
        "Error al actualizar proveedor:",
        error,
      );

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "Ya existe otro proveedor con ese RUT en tu empresa",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No fue posible actualizar el proveedor",
      });
    }
  },
);

/*
 * =========================================================
 * ACTIVAR / DESACTIVAR PROVEEDOR
 * =========================================================
 */

router.patch(
  "/:id/estado",
  authRequired,
  rolesProveedores,
  async (req, res) => {
    try {
      const proveedorId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(proveedorId) ||
        proveedorId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador del proveedor no es válido",
        });
      }

      if (typeof req.body.estado !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "El estado debe ser verdadero o falso",
        });
      }

      const proveedorActual =
        await prisma.proveedor.findFirst({
          where: {
            id: proveedorId,
            empresaId: req.auth.empresaId,
          },
        });

      if (!proveedorActual) {
        return res.status(404).json({
          success: false,
          message: "Proveedor no encontrado",
        });
      }

      const proveedor =
        await prisma.proveedor.update({
          where: {
            id: proveedorId,
          },
          data: {
            estado: req.body.estado,
          },
        });

      return res.status(200).json({
        success: true,
        message: req.body.estado
          ? "Proveedor activado correctamente"
          : "Proveedor desactivado correctamente",
        data: {
          proveedor,
        },
      });
    } catch (error) {
      console.error(
        "Error al cambiar estado del proveedor:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible cambiar el estado del proveedor",
      });
    }
  },
);

export default router;