import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const { nombre, rut, correo, telefono, direccion } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();

      const rutNormalizado = String(rut ?? "")
        .trim()
        .replace(/\./g, "")
        .replace(/\s/g, "")
        .toUpperCase();

      const correoNormalizado = String(correo ?? "")
        .trim()
        .toLowerCase();

      const telefonoNormalizado = telefono
        ? String(telefono).trim() || null
        : null;

      const direccionNormalizada = direccion
        ? String(direccion).trim() || null
        : null;

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la empresa es obligatorio",
        });
      }

      if (!rutNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El RUT de la empresa es obligatorio",
        });
      }

      const formatoRut = /^\d{7,8}-[\dK]$/;

      if (!formatoRut.test(rutNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El formato del RUT no es válido. Ejemplo: 12345678-9",
        });
      }

      if (!correoNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El correo de la empresa es obligatorio",
        });
      }

      const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!formatoCorreo.test(correoNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El correo de la empresa no es válido",
        });
      }

      const empresaExistente = await prisma.empresa.findUnique({
        where: {
          rut: rutNormalizado,
        },
      });

      if (empresaExistente) {
        return res.status(409).json({
          success: false,
          message: "Ya existe una empresa con ese RUT",
        });
      }

      const empresa = await prisma.empresa.create({
        data: {
          nombre: nombreNormalizado,
          rut: rutNormalizado,
          correo: correoNormalizado,
          telefono: telefonoNormalizado,
          direccion: direccionNormalizada,
        },
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Empresa creada correctamente",
        data: {
          empresa,
        },
      });
    } catch (error) {
      console.error("Error al crear empresa:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe una empresa con ese RUT",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible crear la empresa",
      });
    }
  }
);
router.get(
  "/",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const empresas = await prisma.empresa.findMany({
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
        orderBy: {
          nombre: "asc",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Empresas obtenidas correctamente",
        data: {
          empresas,
        },
      });
    } catch (error) {
      console.error("Error al obtener empresas:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible obtener las empresas",
      });
    }
  }
);
router.get(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID de la empresa no es válido",
        });
      }

      const empresa = await prisma.empresa.findUnique({
        where: {
          id: empresaId,
        },
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
      });

      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Empresa obtenida correctamente",
        data: {
          empresa,
        },
      });
    } catch (error) {
      console.error("Error al obtener empresa:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible obtener la empresa",
      });
    }
  }
);
router.put(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID de la empresa no es válido",
        });
      }

      const empresaExistente = await prisma.empresa.findUnique({
        where: {
          id: empresaId,
        },
      });

      if (!empresaExistente) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      const { nombre, rut, correo, telefono, direccion } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();

      const rutNormalizado = String(rut ?? "")
        .trim()
        .replace(/\./g, "")
        .replace(/\s/g, "")
        .toUpperCase();

      const correoNormalizado = String(correo ?? "")
        .trim()
        .toLowerCase();

      const telefonoNormalizado = telefono
        ? String(telefono).trim() || null
        : null;

      const direccionNormalizada = direccion
        ? String(direccion).trim() || null
        : null;

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la empresa es obligatorio",
        });
      }

      const formatoRut = /^\d{7,8}-[\dK]$/;

      if (!formatoRut.test(rutNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El formato del RUT no es válido. Ejemplo: 12345678-9",
        });
      }

      const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!formatoCorreo.test(correoNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El correo de la empresa no es válido",
        });
      }

      const empresaConMismoRut = await prisma.empresa.findFirst({
        where: {
          rut: rutNormalizado,
          id: {
            not: empresaId,
          },
        },
      });

      if (empresaConMismoRut) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otra empresa con ese RUT",
        });
      }

      const empresaActualizada = await prisma.empresa.update({
        where: {
          id: empresaId,
        },
        data: {
          nombre: nombreNormalizado,
          rut: rutNormalizado,
          correo: correoNormalizado,
          telefono: telefonoNormalizado,
          direccion: direccionNormalizada,
        },
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Empresa actualizada correctamente",
        data: {
          empresa: empresaActualizada,
        },
      });
    } catch (error) {
      console.error("Error al actualizar empresa:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe otra empresa con ese RUT",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible actualizar la empresa",
      });
    }
  }
);
router.delete(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID de la empresa no es válido",
        });
      }

      const empresa = await prisma.empresa.findUnique({
        where: {
          id: empresaId,
        },
      });

      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      if (!empresa.estado) {
        return res.status(409).json({
          success: false,
          message: "La empresa ya se encuentra desactivada",
        });
      }

      const empresaDesactivada = await prisma.empresa.update({
        where: {
          id: empresaId,
        },
        data: {
          estado: false,
        },
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Empresa desactivada correctamente",
        data: {
          empresa: empresaDesactivada,
        },
      });
    } catch (error) {
      console.error("Error al desactivar empresa:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible desactivar la empresa",
      });
    }
  }
);
router.patch(
  "/:id/reactivar",
  authRequired,
  authorizeRoles("SuperAdministrador"),
  async (req, res) => {
    try {
      const empresaId = Number(req.params.id);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID de la empresa no es válido",
        });
      }

      const empresa = await prisma.empresa.findUnique({
        where: {
          id: empresaId,
        },
      });

      if (!empresa) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      if (empresa.estado) {
        return res.status(409).json({
          success: false,
          message: "La empresa ya se encuentra activa",
        });
      }

      const empresaReactivada = await prisma.empresa.update({
        where: {
          id: empresaId,
        },
        data: {
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Empresa reactivada correctamente",
        data: {
          empresa: empresaReactivada,
        },
      });
    } catch (error) {
      console.error("Error al reactivar empresa:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible reactivar la empresa",
      });
    }
  }
);
export default router;