import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

const rolesOrdenesCompra = authorizeRoles(
  "Administrador",

);

const TASA_IVA = 19;

/*
 * =========================================================
 * INCLUDES
 * =========================================================
 */

const incluirOrdenCompra = {
  proveedor: {
    select: {
      id: true,
      razonSocial: true,
      rut: true,
      giro: true,
      correo: true,
      telefono: true,
      direccion: true,
      estado: true,
    },
  },

  usuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
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
          stockMinimo: true,
          estado: true,
        },
      },
    },
  },
};

/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

const redondearDinero = (valor) => {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
};

const calcularTotales = (detalles) => {
  const subtotalNeto = redondearDinero(
    detalles.reduce(
      (total, detalle) =>
        total +
        detalle.cantidad *
          detalle.costoUnitarioNeto,
      0,
    ),
  );

  const montoIva = redondearDinero(
    subtotalNeto * (TASA_IVA / 100),
  );

  const total = redondearDinero(
    subtotalNeto + montoIva,
  );

  return {
    subtotalNeto,
    tasaIva: TASA_IVA,
    montoIva,
    total,
  };
};

const generarNumeroOrdenCompra = async (
  clientePrisma,
  empresaId,
) => {
  const ultimaOrden =
    await clientePrisma.ordenCompra.findFirst({
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

  if (ultimaOrden?.numero) {
    const coincidencia =
      ultimaOrden.numero.match(/(\d+)$/);

    if (coincidencia) {
      correlativo =
        Number(coincidencia[1]) + 1;
    }
  }

  return `OC-${String(correlativo).padStart(
    6,
    "0",
  )}`;
};

const validarDetalles = async (
  detalles,
  empresaId,
) => {
  if (
    !Array.isArray(detalles) ||
    detalles.length === 0
  ) {
    return {
      error:
        "La orden de compra debe contener al menos un producto",
    };
  }

  const productosUsados = new Set();
  const detallesNormalizados = [];

  for (const detalle of detalles) {
    const productoId = Number(
      detalle.productoId,
    );

    const cantidad = Number(
      detalle.cantidad,
    );

    const costoUnitarioNeto = Number(
      detalle.costoUnitarioNeto,
    );

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return {
        error:
          "Uno de los productos seleccionados no es válido",
      };
    }

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      return {
        error:
          "La cantidad de cada producto debe ser un número entero mayor que cero",
      };
    }

    if (
      !Number.isFinite(costoUnitarioNeto) ||
      costoUnitarioNeto <= 0
    ) {
      return {
        error:
          "El costo unitario neto de cada producto debe ser mayor que cero",
      };
    }

    if (productosUsados.has(productoId)) {
      return {
        error:
          "Un producto no puede aparecer más de una vez en la misma orden de compra",
      };
    }

    productosUsados.add(productoId);

    const producto =
      await prisma.producto.findFirst({
        where: {
          id: productoId,
          empresaId,
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          empresaId: true,
          estado: true,
        },
      });

    if (!producto) {
      return {
        error:
          "Uno de los productos seleccionados no existe, está inactivo o no pertenece a tu empresa",
      };
    }

    const costoNormalizado =
      redondearDinero(costoUnitarioNeto);

    const subtotalNeto =
      redondearDinero(
        cantidad * costoNormalizado,
      );

    detallesNormalizados.push({
      productoId,
      cantidad,
      costoUnitarioNeto:
        costoNormalizado,
      subtotalNeto,
    });
  }

  return {
    detalles: detallesNormalizados,
  };
};

/*
 * =========================================================
 * LISTAR ÓRDENES DE COMPRA
 * =========================================================
 */

router.get(
  "/",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenes =
        await prisma.ordenCompra.findMany({
          where: {
            empresaId: req.auth.empresaId,
          },
          include: incluirOrdenCompra,
          orderBy: {
            fechaCreacion: "desc",
          },
        });

      return res.status(200).json({
        success: true,
        data: {
          ordenes,
        },
      });
    } catch (error) {
      console.error(
        "Error al listar órdenes de compra:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar las órdenes de compra",
      });
    }
  },
);

/*
 * =========================================================
 * OBTENER ORDEN DE COMPRA POR ID
 * =========================================================
 */

router.get(
  "/:id",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(ordenId) ||
        ordenId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden de compra no es válido",
        });
      }

      const orden =
        await prisma.ordenCompra.findFirst({
          where: {
            id: ordenId,
            empresaId: req.auth.empresaId,
          },
          include: incluirOrdenCompra,
        });

      if (!orden) {
        return res.status(404).json({
          success: false,
          message:
            "Orden de compra no encontrada",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          orden,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar orden de compra:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar la orden de compra",
      });
    }
  },
);

/*
 * =========================================================
 * CREAR ORDEN DE COMPRA
 * =========================================================
 */

router.post(
  "/",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const {
        proveedorId,
        observacion,
        detalles,
      } = req.body;

      const proveedorIdNumerico =
        Number(proveedorId);

      if (
        !Number.isInteger(
          proveedorIdNumerico,
        ) ||
        proveedorIdNumerico <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Debes seleccionar un proveedor válido",
        });
      }

      const proveedor =
        await prisma.proveedor.findFirst({
          where: {
            id: proveedorIdNumerico,
            empresaId: req.auth.empresaId,
            estado: true,
          },
        });

      if (!proveedor) {
        return res.status(404).json({
          success: false,
          message:
            "El proveedor no existe, está inactivo o no pertenece a tu empresa",
        });
      }

      const resultadoDetalles =
        await validarDetalles(
          detalles,
          req.auth.empresaId,
        );

      if (resultadoDetalles.error) {
        return res.status(400).json({
          success: false,
          message:
            resultadoDetalles.error,
        });
      }

      const detallesNormalizados =
        resultadoDetalles.detalles;

      /*
       * IMPORTANTE:
       * El backend calcula todos los montos.
       * No se confía en subtotal, IVA ni total
       * enviados por el frontend.
       */
      const totales = calcularTotales(
        detallesNormalizados,
      );

      const numero =
        await generarNumeroOrdenCompra(
          prisma,
          req.auth.empresaId,
        );

      const orden =
        await prisma.ordenCompra.create({
          data: {
            empresaId:
              req.auth.empresaId,

            proveedorId:
              proveedorIdNumerico,

            usuarioId:
              req.auth.usuarioId,

            numero,

            observacion:
              String(
                observacion || "",
              ).trim() || null,

            subtotalNeto:
              totales.subtotalNeto,

            tasaIva:
              totales.tasaIva,

            montoIva:
              totales.montoIva,

            total:
              totales.total,

            detalles: {
              create:
                detallesNormalizados.map(
                  (detalle) => ({
                    productoId:
                      detalle.productoId,

                    cantidad:
                      detalle.cantidad,

                    costoUnitarioNeto:
                      detalle.costoUnitarioNeto,

                    subtotalNeto:
                      detalle.subtotalNeto,
                  }),
                ),
            },
          },

          include:
            incluirOrdenCompra,
        });

      return res.status(201).json({
        success: true,
        message:
          "Orden de compra creada correctamente",
        data: {
          orden,
        },
      });
    } catch (error) {
      console.error(
        "Error al crear orden de compra:",
        error,
      );

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "No fue posible generar el número de la orden de compra",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No fue posible crear la orden de compra",
      });
    }
  },
);

/*
 * =========================================================
 * EDITAR ORDEN DE COMPRA
 * SOLO BORRADOR
 * =========================================================
 */

router.put(
  "/:id",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(ordenId) ||
        ordenId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden de compra no es válido",
        });
      }

      const ordenActual =
        await prisma.ordenCompra.findFirst({
          where: {
            id: ordenId,
            empresaId:
              req.auth.empresaId,
          },
        });

      if (!ordenActual) {
        return res.status(404).json({
          success: false,
          message:
            "Orden de compra no encontrada",
        });
      }

      if (
        ordenActual.estado !==
        "BORRADOR"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Solo las órdenes en estado BORRADOR pueden editarse",
        });
      }

      const {
        proveedorId,
        observacion,
        detalles,
      } = req.body;

      const proveedorIdNumerico =
        Number(proveedorId);

      if (
        !Number.isInteger(
          proveedorIdNumerico,
        ) ||
        proveedorIdNumerico <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Debes seleccionar un proveedor válido",
        });
      }

      const proveedor =
        await prisma.proveedor.findFirst({
          where: {
            id: proveedorIdNumerico,
            empresaId:
              req.auth.empresaId,
            estado: true,
          },
        });

      if (!proveedor) {
        return res.status(404).json({
          success: false,
          message:
            "El proveedor no existe, está inactivo o no pertenece a tu empresa",
        });
      }

      const resultadoDetalles =
        await validarDetalles(
          detalles,
          req.auth.empresaId,
        );

      if (resultadoDetalles.error) {
        return res.status(400).json({
          success: false,
          message:
            resultadoDetalles.error,
        });
      }

      const detallesNormalizados =
        resultadoDetalles.detalles;

      const totales =
        calcularTotales(
          detallesNormalizados,
        );

      const ordenActualizada =
        await prisma.$transaction(
          async (tx) => {
            await tx.detalleOrdenCompra.deleteMany({
              where: {
                ordenCompraId:
                  ordenActual.id,
              },
            });

            await tx.ordenCompra.update({
              where: {
                id: ordenActual.id,
              },

              data: {
                proveedorId:
                  proveedorIdNumerico,

                observacion:
                  String(
                    observacion || "",
                  ).trim() || null,

                subtotalNeto:
                  totales.subtotalNeto,

                tasaIva:
                  totales.tasaIva,

                montoIva:
                  totales.montoIva,

                total:
                  totales.total,

                detalles: {
                  create:
                    detallesNormalizados.map(
                      (detalle) => ({
                        productoId:
                          detalle.productoId,

                        cantidad:
                          detalle.cantidad,

                        costoUnitarioNeto:
                          detalle.costoUnitarioNeto,

                        subtotalNeto:
                          detalle.subtotalNeto,
                      }),
                    ),
                },
              },
            });

            return tx.ordenCompra.findUnique({
              where: {
                id: ordenActual.id,
              },
              include:
                incluirOrdenCompra,
            });
          },
        );

      return res.status(200).json({
        success: true,
        message:
          "Orden de compra actualizada correctamente",
        data: {
          orden: ordenActualizada,
        },
      });
    } catch (error) {
      console.error(
        "Error al actualizar orden de compra:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible actualizar la orden de compra",
      });
    }
  },
);

/*
 * =========================================================
 * EMITIR ORDEN DE COMPRA
 * BORRADOR → EMITIDA
 * =========================================================
 */

router.patch(
  "/:id/emitir",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(ordenId) ||
        ordenId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden de compra no es válido",
        });
      }

      const resultado =
        await prisma.ordenCompra.updateMany({
          where: {
            id: ordenId,
            empresaId:
              req.auth.empresaId,
            estado: "BORRADOR",
          },

          data: {
            estado: "EMITIDA",
            fechaEmision: new Date(),
          },
        });

      if (resultado.count !== 1) {
        const orden =
          await prisma.ordenCompra.findFirst({
            where: {
              id: ordenId,
              empresaId:
                req.auth.empresaId,
            },
          });

        if (!orden) {
          return res.status(404).json({
            success: false,
            message:
              "Orden de compra no encontrada",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "Solo una orden en estado BORRADOR puede emitirse",
        });
      }

      const orden =
        await prisma.ordenCompra.findUnique({
          where: {
            id: ordenId,
          },
          include:
            incluirOrdenCompra,
        });

      return res.status(200).json({
        success: true,
        message:
          "Orden de compra emitida correctamente",
        data: {
          orden,
        },
      });
    } catch (error) {
      console.error(
        "Error al emitir orden de compra:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible emitir la orden de compra",
      });
    }
  },
);

/*
 * =========================================================
 * RECEPCIONAR ORDEN DE COMPRA
 * EMITIDA → RECIBIDA
 *
 * Aumenta stock y genera movimientos ENTRADA.
 * Todo se realiza dentro de una transacción.
 * =========================================================
 */

router.patch(
  "/:id/recepcionar",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(ordenId) ||
        ordenId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden de compra no es válido",
        });
      }

      const orden =
        await prisma.ordenCompra.findFirst({
          where: {
            id: ordenId,
            empresaId:
              req.auth.empresaId,
          },

          include: {
            proveedor: true,

            detalles: {
              include: {
                producto: true,
              },
            },
          },
        });

      if (!orden) {
        return res.status(404).json({
          success: false,
          message:
            "Orden de compra no encontrada",
        });
      }

      if (
        orden.estado !== "EMITIDA"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Solo una orden EMITIDA puede recepcionarse",
        });
      }

      if (
        orden.detalles.length === 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "La orden de compra no contiene productos",
        });
      }

      for (const detalle of orden.detalles) {
        if (
          detalle.producto.empresaId !==
          req.auth.empresaId
        ) {
          return res.status(403).json({
            success: false,
            message:
              "La orden contiene productos que no pertenecen a tu empresa",
          });
        }

        if (!detalle.producto.estado) {
          return res.status(409).json({
            success: false,
            message: `El producto "${detalle.producto.nombre}" se encuentra inactivo`,
          });
        }
      }

      const ordenRecibida =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Marcamos primero la orden como
             * RECIBIDA usando estado EMITIDA
             * como condición.
             *
             * Esto evita que dos solicitudes
             * simultáneas ingresen stock dos veces.
             */
            const cambioEstado =
              await tx.ordenCompra.updateMany({
                where: {
                  id: orden.id,
                  empresaId:
                    req.auth.empresaId,
                  estado: "EMITIDA",
                },

                data: {
                  estado: "RECIBIDA",
                  fechaRecepcion:
                    new Date(),
                },
              });

            if (
              cambioEstado.count !== 1
            ) {
              const errorRecepcion =
                new Error(
                  "La orden ya fue recepcionada o cambió de estado",
                );

              errorRecepcion.code =
                "ORDEN_NO_RECEPCIONABLE";

              throw errorRecepcion;
            }

            for (
              const detalle of orden.detalles
            ) {
              const productoActualizado =
                await tx.producto.updateMany({
                  where: {
                    id: detalle.productoId,
                    empresaId:
                      req.auth.empresaId,
                    estado: true,
                  },

                  data: {
                    stock: {
                      increment:
                        detalle.cantidad,
                    },
                  },
                });

              if (
                productoActualizado.count !==
                1
              ) {
                const errorProducto =
                  new Error(
                    `No fue posible actualizar el stock de "${detalle.producto.nombre}"`,
                  );

                errorProducto.code =
                  "PRODUCTO_NO_DISPONIBLE";

                throw errorProducto;
              }

              await tx.movimientoInventario.create({
                data: {
                  empresaId:
                    req.auth.empresaId,

                  productoId:
                    detalle.productoId,

                  usuarioId:
                    req.auth.usuarioId,

                  ordenCompraId:
                    orden.id,

                  tipo: "ENTRADA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Entrada generada por recepción de ${orden.numero}`,
                },
              });
            }

            return tx.ordenCompra.findUnique({
              where: {
                id: orden.id,
              },
              include:
                incluirOrdenCompra,
            });
          },
        );

      return res.status(200).json({
        success: true,
        message:
          "Orden de compra recepcionada y stock actualizado correctamente",
        data: {
          orden: ordenRecibida,
        },
      });
    } catch (error) {
      console.error(
        "Error al recepcionar orden de compra:",
        error,
      );

      if (
        error.code ===
        "ORDEN_NO_RECEPCIONABLE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            error.message,
        });
      }

      if (
        error.code ===
        "PRODUCTO_NO_DISPONIBLE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "No fue posible recepcionar la orden de compra",
      });
    }
  },
);

/*
 * =========================================================
 * ANULAR ORDEN
 *
 * BORRADOR o EMITIDA → ANULADA
 * Una orden RECIBIDA no puede anularse porque ya
 * generó movimientos y aumentó inventario.
 * =========================================================
 */

router.patch(
  "/:id/anular",
  authRequired,
  rolesOrdenesCompra,
  async (req, res) => {
    try {
      const ordenId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(ordenId) ||
        ordenId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El identificador de la orden de compra no es válido",
        });
      }

      const resultado =
        await prisma.ordenCompra.updateMany({
          where: {
            id: ordenId,
            empresaId:
              req.auth.empresaId,
            estado: {
              in: [
                "BORRADOR",
                "EMITIDA",
              ],
            },
          },

          data: {
            estado: "ANULADA",
          },
        });

      if (resultado.count !== 1) {
        const orden =
          await prisma.ordenCompra.findFirst({
            where: {
              id: ordenId,
              empresaId:
                req.auth.empresaId,
            },
          });

        if (!orden) {
          return res.status(404).json({
            success: false,
            message:
              "Orden de compra no encontrada",
          });
        }

        if (
          orden.estado === "RECIBIDA"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Una orden ya recepcionada no puede anularse",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "La orden de compra ya se encuentra anulada",
        });
      }

      const orden =
        await prisma.ordenCompra.findUnique({
          where: {
            id: ordenId,
          },
          include:
            incluirOrdenCompra,
        });

      return res.status(200).json({
        success: true,
        message:
          "Orden de compra anulada correctamente",
        data: {
          orden,
        },
      });
    } catch (error) {
      console.error(
        "Error al anular orden de compra:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible anular la orden de compra",
      });
    }
  },
);

export default router;