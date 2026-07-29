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
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const { nombre, rut, correo, telefono, direccion } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();

      const rutNormalizado = String(rut ?? "")
        .trim()
        .replace(/\./g, "")
        .replace(/\s/g, "")
        .toUpperCase();

      const correoNormalizado = correo
        ? String(correo).trim().toLowerCase()
        : null;

      const telefonoNormalizado = telefono
        ? String(telefono).trim() || null
        : null;

      const direccionNormalizada = direccion
        ? String(direccion).trim() || null
        : null;

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre del cliente es obligatorio",
        });
      }

      if (!rutNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El RUT del cliente es obligatorio",
        });
      }

      const formatoRut = /^\d{7,8}-[\dK]$/;

      if (!formatoRut.test(rutNormalizado)) {
        return res.status(400).json({
          success: false,
          message: "El formato del RUT no es válido. Ejemplo: 12345678-9",
        });
      }

      if (correoNormalizado) {
        const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoCorreo.test(correoNormalizado)) {
          return res.status(400).json({
            success: false,
            message: "El correo del cliente no es válido",
          });
        }
      }

      const clienteExistente = await prisma.cliente.findFirst({
        where: {
          empresaId: req.auth.empresaId,
          rut: rutNormalizado,
        },
      });

      if (clienteExistente) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un cliente con ese RUT",
        });
      }

      const cliente = await prisma.cliente.create({
        data: {
          empresaId: req.auth.empresaId,
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
          empresaId: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Cliente creado correctamente",
        data: {
          cliente,
        },
      });
    } catch (error) {
      console.error("Error al crear cliente:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe un cliente con ese RUT",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible crear el cliente",
      });
    }
  }
);
router.get("/", authRequired, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        empresaId: req.auth.empresaId,
      },
      orderBy: {
        nombre: "asc",
      },
      select: {
        id: true,
        nombre: true,
        rut: true,
        correo: true,
        telefono: true,
        direccion: true,
        estado: true,
        empresaId: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        clientes,
      },
    });
  } catch (error) {
    console.error("Error al listar clientes:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar los clientes",
    });
  }
});
router.get("/:id", authRequired, async (req, res) => {
  try {
    const clienteId = Number(req.params.id);

    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      return res.status(400).json({
        success: false,
        message: "El identificador del cliente no es válido",
      });
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId: req.auth.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        rut: true,
        correo: true,
        telefono: true,
        direccion: true,
        estado: true,
        empresaId: true,
      },
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        cliente,
      },
    });
  } catch (error) {
    console.error("Error al consultar cliente:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar el cliente",
    });
  }
});
router.put(
  "/:id",
  authRequired,
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const clienteId = Number(req.params.id);
      const { nombre, rut, correo, telefono, direccion } = req.body;

      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del cliente no es válido",
        });
      }

      if (
        nombre === undefined &&
        rut === undefined &&
        correo === undefined &&
        telefono === undefined &&
        direccion === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Debes enviar al menos un campo para actualizar",
        });
      }

      const clienteActual = await prisma.cliente.findFirst({
        where: {
          id: clienteId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!clienteActual) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado",
        });
      }

      const datosActualizados = {};

      if (nombre !== undefined) {
        const nombreNormalizado = String(nombre).trim();

        if (!nombreNormalizado) {
          return res.status(400).json({
            success: false,
            message: "El nombre del cliente no puede estar vacío",
          });
        }

        datosActualizados.nombre = nombreNormalizado;
      }

      if (rut !== undefined) {
        const rutNormalizado = String(rut)
          .trim()
          .replace(/\./g, "")
          .replace(/\s/g, "")
          .toUpperCase();

        const formatoRut = /^\d{7,8}-[\dK]$/;

        if (!formatoRut.test(rutNormalizado)) {
          return res.status(400).json({
            success: false,
            message: "El formato del RUT no es válido. Ejemplo: 12345678-9",
          });
        }

        const clienteDuplicado = await prisma.cliente.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            id: {
              not: clienteId,
            },
            rut: rutNormalizado,
          },
        });

        if (clienteDuplicado) {
          return res.status(409).json({
            success: false,
            message: "Ya existe un cliente con ese RUT",
          });
        }

        datosActualizados.rut = rutNormalizado;
      }

      if (correo !== undefined) {
        const correoNormalizado = String(correo).trim().toLowerCase();

        if (correoNormalizado) {
          const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (!formatoCorreo.test(correoNormalizado)) {
            return res.status(400).json({
              success: false,
              message: "El correo del cliente no es válido",
            });
          }
        }

        datosActualizados.correo = correoNormalizado || null;
      }

      if (telefono !== undefined) {
        datosActualizados.telefono =
          String(telefono).trim() || null;
      }

      if (direccion !== undefined) {
        datosActualizados.direccion =
          String(direccion).trim() || null;
      }

      const clienteActualizado = await prisma.cliente.update({
        where: {
          id: clienteId,
        },
        data: datosActualizados,
        select: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          telefono: true,
          direccion: true,
          estado: true,
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Cliente actualizado correctamente",
        data: {
          cliente: clienteActualizado,
        },
      });
    } catch (error) {
      console.error("Error al actualizar cliente:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe un cliente con ese RUT",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible actualizar el cliente",
      });
    }
  }
);
router.delete(
  "/:id",
  authRequired,
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const clienteId = Number(req.params.id);

      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del cliente no es válido",
        });
      }

      const cliente = await prisma.cliente.findFirst({
        where: {
          id: clienteId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado",
        });
      }

      if (!cliente.estado) {
        return res.status(409).json({
          success: false,
          message: "El cliente ya se encuentra desactivado",
        });
      }

      const clienteDesactivado = await prisma.cliente.update({
        where: {
          id: clienteId,
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
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Cliente desactivado correctamente",
        data: {
          cliente: clienteDesactivado,
        },
      });
    } catch (error) {
      console.error("Error al desactivar cliente:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible desactivar el cliente",
      });
    }
  }
);
router.patch(
  "/:id/reactivar",
  authRequired,
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const clienteId = Number(req.params.id);

      if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del cliente no es válido",
        });
      }

      const cliente = await prisma.cliente.findFirst({
        where: {
          id: clienteId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado",
        });
      }

      if (cliente.estado) {
        return res.status(409).json({
          success: false,
          message: "El cliente ya se encuentra activo",
        });
      }

      const clienteReactivado = await prisma.cliente.update({
        where: {
          id: clienteId,
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
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Cliente reactivado correctamente",
        data: {
          cliente: clienteReactivado,
        },
      });
    } catch (error) {
      console.error("Error al reactivar cliente:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible reactivar el cliente",
      });
    }
  }
);
export default router;