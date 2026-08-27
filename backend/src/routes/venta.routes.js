import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

const rolesVentas = authorizeRoles(
  "Administrador",
  "Vendedor",
);

const incluirVenta = {
  cliente: {
    select: {
      id: true,
      nombre: true,
      rut: true,
      correo: true,
    },
  },
  usuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
  cotizacion: {
    select: {
      id: true,
      numero: true,
      estado: true,
    },
  },
  detalles: {
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          estado: true,
        },
      },
    },
  },
};

/*
 * =========================================================
 * GENERAR NÚMERO DE VENTA
 * =========================================================
 */

const generarNumeroVenta = async (
  clientePrisma,
  empresaId,
) => {
  const ultimaVenta = await clientePrisma.venta.findFirst({
    where: {
      empresaId,
    },
    orderBy: {
      id: "desc",
    },
    select: {
      numero: true,
    },
  });

  let correlativo = 1;

  if (ultimaVenta?.numero) {
    const coincidencia =
      ultimaVenta.numero.match(/(\d+)$/);

    if (coincidencia) {
      correlativo = Number(coincidencia[1]) + 1;
    }
  }

  return `VENTA-${String(correlativo).padStart(
    6,
    "0",
  )}`;
};

/*
 * =========================================================
 * LISTAR VENTAS
 * =========================================================
 */

router.get(
  "/",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const ventas = await prisma.venta.findMany({
        where: {
          empresaId: req.auth.empresaId,
        },
        include: incluirVenta,
        orderBy: {
          fechaCreacion: "desc",
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          ventas,
        },
      });
    } catch (error) {
      console.error("Error al listar ventas:", error);

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar las ventas",
      });
    }
  },
);

/*
 * =========================================================
 * OBTENER UNA VENTA
 * =========================================================
 */

router.get(
  "/:id",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const ventaId = Number(req.params.id);

      if (
        !Number.isInteger(ventaId) ||
        ventaId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la venta no es válido",
        });
      }

      const venta = await prisma.venta.findFirst({
        where: {
          id: ventaId,
          empresaId: req.auth.empresaId,
        },
        include: incluirVenta,
      });

      if (!venta) {
        return res.status(404).json({
          success: false,
          message: "Venta no encontrada",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          venta,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar venta:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar la venta",
      });
    }
  },
);

/*
 * =========================================================
 * CONVERTIR COTIZACIÓN A VENTA
 * =========================================================
 */

router.post(
  "/desde-cotizacion/:cotizacionId",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const cotizacionId = Number(
        req.params.cotizacionId,
      );

      if (
        !Number.isInteger(cotizacionId) ||
        cotizacionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la cotización no es válido",
        });
      }

      const cotizacion =
        await prisma.cotizacion.findFirst({
          where: {
            id: cotizacionId,
            empresaId: req.auth.empresaId,
          },
          include: {
            cliente: true,
            detalles: {
              include: {
                producto: true,
              },
            },
            venta: {
              select: {
                id: true,
                numero: true,
              },
            },
          },
        });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message: "Cotización no encontrada",
        });
      }

      if (cotizacion.venta) {
        return res.status(409).json({
          success: false,
          message:
            "Esta cotización ya fue convertida en una venta",
        });
      }

      if (cotizacion.estado !== "ACEPTADA") {
        return res.status(409).json({
          success: false,
          message:
            "Solo una cotización ACEPTADA puede convertirse en venta",
        });
      }

      if (!cotizacion.cliente.estado) {
        return res.status(409).json({
          success: false,
          message:
            "El cliente asociado a la cotización se encuentra inactivo",
        });
      }

      if (cotizacion.detalles.length === 0) {
        return res.status(409).json({
          success: false,
          message:
            "La cotización no contiene productos",
        });
      }

      for (const detalle of cotizacion.detalles) {
        if (!detalle.producto.estado) {
          return res.status(409).json({
            success: false,
            message: `El producto "${detalle.producto.nombre}" se encuentra inactivo`,
          });
        }

        if (
          detalle.producto.empresaId !==
          req.auth.empresaId
        ) {
          return res.status(403).json({
            success: false,
            message:
              "La cotización contiene productos que no pertenecen a tu empresa",
          });
        }

        if (
          detalle.producto.stock <
          detalle.cantidad
        ) {
          return res.status(409).json({
            success: false,
            message: `Stock insuficiente para "${detalle.producto.nombre}". Disponible: ${detalle.producto.stock}, requerido: ${detalle.cantidad}`,
            code: "STOCK_INSUFICIENTE",
          });
        }
      }

      const numero = await generarNumeroVenta(
        prisma,
        req.auth.empresaId,
      );

      const ventaCreada =
        await prisma.$transaction(async (tx) => {
          /*
           * Creamos primero la venta y congelamos
           * los valores históricos de la cotización.
           */
          const venta = await tx.venta.create({
            data: {
              empresaId: req.auth.empresaId,
              clienteId: cotizacion.clienteId,
              usuarioId: req.auth.usuarioId,
              cotizacionId: cotizacion.id,
              numero,
              subtotal: cotizacion.subtotal,
              total: cotizacion.total,
              observacion:
                cotizacion.observacion,
              detalles: {
                create: cotizacion.detalles.map(
                  (detalle) => ({
                    productoId:
                      detalle.productoId,
                    cantidad: detalle.cantidad,
                    precioUnitario:
                      detalle.precioUnitario,
                    subtotal: detalle.subtotal,
                  }),
                ),
              },
            },
          });

          /*
           * Descontamos stock de manera segura.
           * El updateMany verifica nuevamente el
           * stock dentro de la transacción.
           */
          for (const detalle of cotizacion.detalles) {
            const resultadoStock =
              await tx.producto.updateMany({
                where: {
                  id: detalle.productoId,
                  empresaId:
                    req.auth.empresaId,
                  estado: true,
                  stock: {
                    gte: detalle.cantidad,
                  },
                },
                data: {
                  stock: {
                    decrement: detalle.cantidad,
                  },
                },
              });

            if (resultadoStock.count !== 1) {
              const errorStock = new Error(
                `Stock insuficiente para "${detalle.producto.nombre}"`,
              );

              errorStock.code =
                "STOCK_INSUFICIENTE";

              throw errorStock;
            }

            /*
             * Cada producto vendido genera un
             * movimiento SALIDA trazable.
             */
            await tx.movimientoInventario.create({
              data: {
                empresaId:
                  req.auth.empresaId,
                productoId:
                  detalle.productoId,
                usuarioId:
                  req.auth.usuarioId,
                ventaId: venta.id,
                tipo: "SALIDA",
                cantidad:
                  detalle.cantidad,
                observacion: `Salida generada por ${numero}`,
              },
            });
          }

          /*
           * La cotización queda marcada como
           * CONVERTIDA únicamente después de
           * crear correctamente la venta y
           * descontar todo el stock.
           */
          await tx.cotizacion.update({
            where: {
              id: cotizacion.id,
            },
            data: {
              estado: "CONVERTIDA",
            },
          });

          return tx.venta.findUnique({
            where: {
              id: venta.id,
            },
            include: incluirVenta,
          });
        });

      return res.status(201).json({
        success: true,
        message:
          "Cotización convertida en venta correctamente",
        data: {
          venta: ventaCreada,
        },
      });
    } catch (error) {
      console.error(
        "Error al convertir cotización en venta:",
        error,
      );

      if (
        error.code === "STOCK_INSUFICIENTE"
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: "STOCK_INSUFICIENTE",
        });
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "La cotización ya fue convertida o el número de venta ya existe",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No fue posible convertir la cotización en venta",
      });
    }
  },
);

/*
 * =========================================================
 * ANULAR VENTA
 * =========================================================
 */

router.patch(
  "/:id/anular",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const ventaId = Number(req.params.id);

      if (
        !Number.isInteger(ventaId) ||
        ventaId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la venta no es válido",
        });
      }

      const venta = await prisma.venta.findFirst({
        where: {
          id: ventaId,
          empresaId: req.auth.empresaId,
        },
        include: {
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!venta) {
        return res.status(404).json({
          success: false,
          message: "Venta no encontrada",
        });
      }

      if (venta.estado === "ANULADA") {
        return res.status(409).json({
          success: false,
          message:
            "La venta ya se encuentra anulada",
        });
      }

      const ventaAnulada =
        await prisma.$transaction(async (tx) => {
          /*
           * Al anular devolvemos al inventario
           * exactamente lo vendido.
           */
          for (const detalle of venta.detalles) {
            await tx.producto.update({
              where: {
                id: detalle.productoId,
              },
              data: {
                stock: {
                  increment: detalle.cantidad,
                },
              },
            });

            await tx.movimientoInventario.create({
              data: {
                empresaId:
                  req.auth.empresaId,
                productoId:
                  detalle.productoId,
                usuarioId:
                  req.auth.usuarioId,
                ventaId: venta.id,
                tipo: "ENTRADA",
                cantidad:
                  detalle.cantidad,
                observacion: `Devolución de stock por anulación de ${venta.numero}`,
              },
            });
          }

          await tx.venta.update({
            where: {
              id: venta.id,
            },
            data: {
              estado: "ANULADA",
            },
          });

          return tx.venta.findUnique({
            where: {
              id: venta.id,
            },
            include: incluirVenta,
          });
        });

      return res.status(200).json({
        success: true,
        message:
          "Venta anulada y stock restaurado correctamente",
        data: {
          venta: ventaAnulada,
        },
      });
    } catch (error) {
      console.error(
        "Error al anular venta:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible anular la venta",
      });
    }
  },
);

export default router;