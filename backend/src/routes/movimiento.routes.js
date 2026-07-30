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
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const { productoId, tipo, cantidad, observacion } = req.body;

      const productoIdNumero = Number(productoId);
      const cantidadNumero = Number(cantidad);
      const tipoNormalizado = String(tipo ?? "").trim().toUpperCase();

      const observacionNormalizada = observacion
        ? String(observacion).trim() || null
        : null;

      const tiposPermitidos = ["ENTRADA", "SALIDA", "AJUSTE"];

      if (
        !Number.isInteger(productoIdNumero) ||
        productoIdNumero <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "El producto seleccionado no es válido",
        });
      }

      if (!tiposPermitidos.includes(tipoNormalizado)) {
        return res.status(400).json({
          success: false,
          message:
            "El tipo de movimiento debe ser ENTRADA, SALIDA o AJUSTE",
        });
      }

      if (!Number.isInteger(cantidadNumero)) {
        return res.status(400).json({
          success: false,
          message: "La cantidad debe ser un número entero",
        });
      }

      if (
        tipoNormalizado !== "AJUSTE" &&
        cantidadNumero <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La cantidad debe ser mayor que cero para entradas y salidas",
        });
      }

      if (
        tipoNormalizado === "AJUSTE" &&
        cantidadNumero < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "El stock ajustado no puede ser negativo",
        });
      }

      const usuario = await prisma.usuario.findFirst({
        where: {
          id: req.auth.usuarioId,
          empresaId: req.auth.empresaId,
          estado: true,
          empresa: {
            estado: true,
          },
          rol: {
            estado: true,
          },
        },
      });

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: "La sesión ya no es válida",
        });
      }

      const producto = await prisma.producto.findFirst({
        where: {
          id: productoIdNumero,
          empresaId: req.auth.empresaId,
          estado: true,
          categoria: {
            estado: true,
          },
        },
      });

      if (!producto) {
        return res.status(404).json({
          success: false,
          message:
            "El producto no existe, está desactivado o pertenece a otra empresa",
        });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        let actualizacion;

        if (tipoNormalizado === "ENTRADA") {
          actualizacion = await tx.producto.updateMany({
            where: {
              id: productoIdNumero,
              empresaId: req.auth.empresaId,
              estado: true,
            },
            data: {
              stock: {
                increment: cantidadNumero,
              },
            },
          });
        }

        if (tipoNormalizado === "SALIDA") {
          actualizacion = await tx.producto.updateMany({
            where: {
              id: productoIdNumero,
              empresaId: req.auth.empresaId,
              estado: true,
              stock: {
                gte: cantidadNumero,
              },
            },
            data: {
              stock: {
                decrement: cantidadNumero,
              },
            },
          });

          if (actualizacion.count === 0) {
            throw new Error("STOCK_INSUFICIENTE");
          }
        }

        if (tipoNormalizado === "AJUSTE") {
          actualizacion = await tx.producto.updateMany({
            where: {
              id: productoIdNumero,
              empresaId: req.auth.empresaId,
              estado: true,
            },
            data: {
              stock: cantidadNumero,
            },
          });
        }

        if (!actualizacion || actualizacion.count === 0) {
          throw new Error("PRODUCTO_NO_DISPONIBLE");
        }

        const movimiento = await tx.movimientoInventario.create({
          data: {
            empresaId: req.auth.empresaId,
            productoId: productoIdNumero,
            usuarioId: req.auth.usuarioId,
            tipo: tipoNormalizado,
            cantidad: cantidadNumero,
            observacion: observacionNormalizada,
          },
          select: {
            id: true,
            tipo: true,
            cantidad: true,
            observacion: true,
            fechaCreacion: true,
            empresaId: true,
            productoId: true,
            usuarioId: true,
          },
        });

        const productoActualizado = await tx.producto.findFirst({
          where: {
            id: productoIdNumero,
            empresaId: req.auth.empresaId,
          },
          select: {
            id: true,
            nombre: true,
            stock: true,
            stockMinimo: true,
            estado: true,
          },
        });

        return {
          movimiento,
          producto: productoActualizado,
        };
      });

      return res.status(201).json({
        success: true,
        message: "Movimiento de inventario registrado correctamente",
        data: resultado,
      });
    } catch (error) {
      if (error.message === "STOCK_INSUFICIENTE") {
        return res.status(409).json({
          success: false,
          message:
            "No existe stock suficiente para realizar la salida",
        });
      }

      if (error.message === "PRODUCTO_NO_DISPONIBLE") {
        return res.status(409).json({
          success: false,
          message:
            "El producto ya no se encuentra disponible",
        });
      }

      console.error(
        "Error al registrar movimiento de inventario:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible registrar el movimiento de inventario",
      });
    }
  }
);
router.get("/", authRequired, async (req, res) => {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: {
        empresaId: req.auth.empresaId,
      },
      orderBy: {
        fechaCreacion: "desc",
      },
      select: {
        id: true,
        tipo: true,
        cantidad: true,
        observacion: true,
        fechaCreacion: true,
        empresaId: true,
        producto: {
          select: {
            id: true,
            nombre: true,
            stock: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        movimientos,
      },
    });
  } catch (error) {
    console.error("Error al listar movimientos de inventario:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar los movimientos de inventario",
    });
  }
});
router.get("/:id", authRequired, async (req, res) => {
  try {
    const movimientoId = Number(req.params.id);

    if (!Number.isInteger(movimientoId) || movimientoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "El identificador del movimiento no es válido",
      });
    }

    const movimiento = await prisma.movimientoInventario.findFirst({
      where: {
        id: movimientoId,
        empresaId: req.auth.empresaId,
      },
      select: {
        id: true,
        tipo: true,
        cantidad: true,
        observacion: true,
        fechaCreacion: true,
        empresaId: true,
        producto: {
          select: {
            id: true,
            nombre: true,
            stock: true,
            stockMinimo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
      },
    });

    if (!movimiento) {
      return res.status(404).json({
        success: false,
        message: "Movimiento de inventario no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        movimiento,
      },
    });
  } catch (error) {
    console.error("Error al consultar movimiento de inventario:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar el movimiento de inventario",
    });
  }
});
export default router;