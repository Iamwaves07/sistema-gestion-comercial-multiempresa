import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const { nombre, correo, password, empresaId, rolId } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();

      const correoNormalizado = String(correo ?? "")
        .trim()
        .toLowerCase();

      const passwordNormalizada = String(password ?? "");

      const rolIdNormalizado = Number(rolId);

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre del usuario es obligatorio",
        });
      }

      const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!formatoCorreo.test(correoNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El correo del usuario no es válido",
        });
      }

      if (passwordNormalizada.length < 8) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres",
        });
      }

      if (!Number.isInteger(rolIdNormalizado) || rolIdNormalizado <= 0) {
        return res.status(400).json({
          success: false,
          message: "El rol seleccionado no es válido",
        });
      }

      let empresaIdDestino;

      if (req.auth.rol === "SuperAdministrador") {
        empresaIdDestino = Number(empresaId);

        if (
          !Number.isInteger(empresaIdDestino) ||
          empresaIdDestino <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "La empresa seleccionada no es válida",
          });
        }
      } else {
        empresaIdDestino = req.auth.empresaId;

        if (
          empresaId !== undefined &&
          Number(empresaId) !== empresaIdDestino
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Un Administrador solo puede crear usuarios en su propia empresa",
          });
        }
      }

      const empresa = await prisma.empresa.findUnique({
        where: {
          id: empresaIdDestino,
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
          message: "No se pueden crear usuarios en una empresa inactiva",
        });
      }

      const rol = await prisma.rol.findUnique({
        where: {
          id: rolIdNormalizado,
        },
      });

      if (!rol) {
        return res.status(404).json({
          success: false,
          message: "Rol no encontrado",
        });
      }

      if (!rol.estado) {
        return res.status(409).json({
          success: false,
          message: "El rol seleccionado se encuentra inactivo",
        });
      }

      if (rol.nombre === "SuperAdministrador") {
        return res.status(403).json({
          success: false,
          message:
            "No está permitido crear cuentas SuperAdministrador desde esta ruta",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        rol.nombre !== "Vendedor"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solamente puede crear usuarios con rol Vendedor",
        });
      }

      const usuarioExistente = await prisma.usuario.findUnique({
        where: {
          correo: correoNormalizado,
        },
      });

      if (usuarioExistente) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un usuario registrado con ese correo",
        });
      }

      const passwordHash = await bcrypt.hash(passwordNormalizada, 12);

      const usuario = await prisma.usuario.create({
        data: {
          nombre: nombreNormalizado,
          correo: correoNormalizado,
          password: passwordHash,
          empresaId: empresaIdDestino,
          rolId: rolIdNormalizado,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Usuario creado correctamente",
        data: {
          usuario,
        },
      });
    } catch (error) {
      console.error("Error al crear usuario:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe un usuario registrado con ese correo",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible crear el usuario",
      });
    }
  }
);
router.get(
  "/",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      let filtroUsuarios = {};

      if (req.auth.rol === "Administrador") {
        const rolSuperAdministrador = await prisma.rol.findUnique({
          where: {
            nombre: "SuperAdministrador",
          },
          select: {
            id: true,
          },
        });

        filtroUsuarios = {
          empresaId: req.auth.empresaId,
          ...(rolSuperAdministrador
            ? {
                rolId: {
                  not: rolSuperAdministrador.id,
                },
              }
            : {}),
        };
      }

      const usuarios = await prisma.usuario.findMany({
        where: filtroUsuarios,
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy: [
          {
            empresa: {
              nombre: "asc",
            },
          },
          {
            nombre: "asc",
          },
        ],
      });

      return res.status(200).json({
        success: true,
        message: "Usuarios obtenidos correctamente",
        data: {
          usuarios,
        },
      });
    } catch (error) {
      console.error("Error al obtener usuarios:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible obtener los usuarios",
      });
    }
  }
);
router.get(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const usuarioId = Number(req.params.id);

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID del usuario no es válido",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.empresa.id !== req.auth.empresaId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solo puede consultar usuarios de su propia empresa",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.rol.nombre === "SuperAdministrador"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador no puede consultar cuentas SuperAdministrador",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Usuario obtenido correctamente",
        data: {
          usuario,
        },
      });
    } catch (error) {
      console.error("Error al obtener usuario:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible obtener el usuario",
      });
    }
  }
);
router.put(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const usuarioId = Number(req.params.id);

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID del usuario no es válido",
        });
      }

      const usuarioExistente = await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        include: {
          rol: true,
          empresa: true,
        },
      });

      if (!usuarioExistente) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      if (usuarioExistente.rol.nombre === "SuperAdministrador") {
        return res.status(403).json({
          success: false,
          message:
            "Las cuentas SuperAdministrador no pueden modificarse desde esta ruta",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuarioExistente.empresaId !== req.auth.empresaId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solo puede editar usuarios de su propia empresa",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuarioExistente.rol.nombre !== "Vendedor"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solamente puede editar usuarios con rol Vendedor",
        });
      }

      const { nombre, correo, password, empresaId, rolId } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();

      const correoNormalizado = String(correo ?? "")
        .trim()
        .toLowerCase();

      const passwordNormalizada =
        password === undefined ? null : String(password);

      const rolIdNormalizado = Number(rolId);

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre del usuario es obligatorio",
        });
      }

      const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!formatoCorreo.test(correoNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El correo del usuario no es válido",
        });
      }

      if (
        passwordNormalizada !== null &&
        passwordNormalizada.length > 0 &&
        passwordNormalizada.length < 8
      ) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres",
        });
      }

      if (!Number.isInteger(rolIdNormalizado) || rolIdNormalizado <= 0) {
        return res.status(400).json({
          success: false,
          message: "El rol seleccionado no es válido",
        });
      }

      let empresaIdDestino;

      if (req.auth.rol === "SuperAdministrador") {
        empresaIdDestino = Number(empresaId);

        if (
          !Number.isInteger(empresaIdDestino) ||
          empresaIdDestino <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "La empresa seleccionada no es válida",
          });
        }
      } else {
        empresaIdDestino = req.auth.empresaId;

        if (
          empresaId !== undefined &&
          Number(empresaId) !== empresaIdDestino
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Un Administrador no puede trasladar usuarios a otra empresa",
          });
        }
      }

      const empresaDestino = await prisma.empresa.findUnique({
        where: {
          id: empresaIdDestino,
        },
      });

      if (!empresaDestino) {
        return res.status(404).json({
          success: false,
          message: "Empresa no encontrada",
        });
      }

      if (!empresaDestino.estado) {
        return res.status(409).json({
          success: false,
          message: "No se puede asignar un usuario a una empresa inactiva",
        });
      }

      const rolDestino = await prisma.rol.findUnique({
        where: {
          id: rolIdNormalizado,
        },
      });

      if (!rolDestino) {
        return res.status(404).json({
          success: false,
          message: "Rol no encontrado",
        });
      }

      if (!rolDestino.estado) {
        return res.status(409).json({
          success: false,
          message: "El rol seleccionado se encuentra inactivo",
        });
      }

      if (rolDestino.nombre === "SuperAdministrador") {
        return res.status(403).json({
          success: false,
          message:
            "No está permitido asignar el rol SuperAdministrador desde esta ruta",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        rolDestino.nombre !== "Vendedor"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solamente puede asignar el rol Vendedor",
        });
      }

      const usuarioConMismoCorreo = await prisma.usuario.findFirst({
        where: {
          correo: correoNormalizado,
          id: {
            not: usuarioId,
          },
        },
      });

      if (usuarioConMismoCorreo) {
        return res.status(409).json({
          success: false,
          message: "Ya existe otro usuario registrado con ese correo",
        });
      }

      const datosActualizados = {
        nombre: nombreNormalizado,
        correo: correoNormalizado,
        empresaId: empresaIdDestino,
        rolId: rolIdNormalizado,
      };

      if (
        passwordNormalizada !== null &&
        passwordNormalizada.length > 0
      ) {
        datosActualizados.password = await bcrypt.hash(
          passwordNormalizada,
          12
        );
      }

      const usuarioActualizado = await prisma.usuario.update({
        where: {
          id: usuarioId,
        },
        data: datosActualizados,
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Usuario actualizado correctamente",
        data: {
          usuario: usuarioActualizado,
        },
      });
    } catch (error) {
      console.error("Error al actualizar usuario:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe otro usuario registrado con ese correo",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible actualizar el usuario",
      });
    }
  }
);
router.delete(
  "/:id",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const usuarioId = Number(req.params.id);

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID del usuario no es válido",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        include: {
          empresa: true,
          rol: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      if (usuario.rol.nombre === "SuperAdministrador") {
        return res.status(403).json({
          success: false,
          message:
            "Las cuentas SuperAdministrador no pueden desactivarse desde esta ruta",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.empresaId !== req.auth.empresaId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solo puede desactivar usuarios de su propia empresa",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.rol.nombre !== "Vendedor"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solamente puede desactivar usuarios con rol Vendedor",
        });
      }

      if (!usuario.estado) {
        return res.status(409).json({
          success: false,
          message: "El usuario ya se encuentra desactivado",
        });
      }

      const usuarioDesactivado = await prisma.usuario.update({
        where: {
          id: usuarioId,
        },
        data: {
          estado: false,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Usuario desactivado correctamente",
        data: {
          usuario: usuarioDesactivado,
        },
      });
    } catch (error) {
      console.error("Error al desactivar usuario:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible desactivar el usuario",
      });
    }
  }
);
router.patch(
  "/:id/reactivar",
  authRequired,
  authorizeRoles("SuperAdministrador", "Administrador"),
  async (req, res) => {
    try {
      const usuarioId = Number(req.params.id);

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El ID del usuario no es válido",
        });
      }

      const usuario = await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        include: {
          empresa: true,
          rol: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      if (usuario.rol.nombre === "SuperAdministrador") {
        return res.status(403).json({
          success: false,
          message:
            "Las cuentas SuperAdministrador no pueden reactivarse desde esta ruta",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.empresaId !== req.auth.empresaId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solo puede reactivar usuarios de su propia empresa",
        });
      }

      if (
        req.auth.rol === "Administrador" &&
        usuario.rol.nombre !== "Vendedor"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Un Administrador solamente puede reactivar usuarios con rol Vendedor",
        });
      }

      if (!usuario.empresa.estado) {
        return res.status(409).json({
          success: false,
          message:
            "No se puede reactivar un usuario perteneciente a una empresa inactiva",
        });
      }

      if (usuario.estado) {
        return res.status(409).json({
          success: false,
          message: "El usuario ya se encuentra activo",
        });
      }

      const usuarioReactivado = await prisma.usuario.update({
        where: {
          id: usuarioId,
        },
        data: {
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          estado: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          rol: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Usuario reactivado correctamente",
        data: {
          usuario: usuarioReactivado,
        },
      });
    } catch (error) {
      console.error("Error al reactivar usuario:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible reactivar el usuario",
      });
    }
  }
);
export default router;