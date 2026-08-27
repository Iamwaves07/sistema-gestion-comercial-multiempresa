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

const TASA_IVA = 19;

/*
 * =========================================================
 * INCLUDES
 * =========================================================
 */

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
 * UTILIDADES
 * =========================================================
 */

const redondearDinero = (valor) => {
  return (
    Math.round(
      (Number(valor) + Number.EPSILON) * 100,
    ) / 100
  );
};

/*
 * Los precios de Producto representan el precio
 * FINAL de venta al cliente, es decir, IVA incluido.
 *
 * Por lo tanto:
 *
 * Neto = Total / 1,19
 * IVA  = Total - Neto
 *
 * NO agregamos otro 19% sobre el precio.
 */
const calcularIvaIncluido = (total) => {
  const totalNormalizado =
    redondearDinero(total);

  const subtotalNeto =
    redondearDinero(
      totalNormalizado /
        (1 + TASA_IVA / 100),
    );

  const montoIva =
    redondearDinero(
      totalNormalizado - subtotalNeto,
    );

  return {
    subtotalNeto,
    tasaIva: TASA_IVA,
    montoIva,
    total: totalNormalizado,
  };
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
  const ultimaVenta =
    await clientePrisma.venta.findFirst({
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
      correlativo =
        Number(coincidencia[1]) + 1;
    }
  }

  return `VENTA-${String(
    correlativo,
  ).padStart(6, "0")}`;
};

/*
 * =========================================================
 * VALIDAR DETALLES DE VENTA DIRECTA
 * =========================================================
 */

const validarDetallesVentaDirecta = async (
  detalles,
  empresaId,
) => {
  if (
    !Array.isArray(detalles) ||
    detalles.length === 0
  ) {
    return {
      error:
        "La venta debe contener al menos un producto",
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

    if (productosUsados.has(productoId)) {
      return {
        error:
          "Un producto no puede aparecer más de una vez en la misma venta",
      };
    }

    productosUsados.add(productoId);

    /*
     * El precio SIEMPRE se obtiene del backend.
     * No confiamos en precios enviados por frontend.
     */
    const producto =
      await prisma.producto.findFirst({
        where: {
          id: productoId,
          empresaId,
          estado: true,
        },

        select: {
          id: true,
          empresaId: true,
          nombre: true,
          precio: true,
          stock: true,
          estado: true,
        },
      });

    if (!producto) {
      return {
        error:
          "Uno de los productos seleccionados no existe, está inactivo o no pertenece a tu empresa",
      };
    }

    if (producto.stock < cantidad) {
      return {
        error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, requerido: ${cantidad}`,
        code: "STOCK_INSUFICIENTE",
      };
    }

    const precioUnitario =
      redondearDinero(producto.precio);

    const subtotal =
      redondearDinero(
        precioUnitario * cantidad,
      );

    const desgloseIva =
      calcularIvaIncluido(subtotal);

    detallesNormalizados.push({
      productoId,
      cantidad,
      precioUnitario,
      subtotal,
      subtotalNeto:
        desgloseIva.subtotalNeto,

      producto,
    });
  }

  return {
    detalles:
      detallesNormalizados,
  };
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
      const ventas =
        await prisma.venta.findMany({
          where: {
            empresaId:
              req.auth.empresaId,
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
      console.error(
        "Error al listar ventas:",
        error,
      );

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
 * CREAR VENTA DIRECTA
 * =========================================================
 *
 * Flujo:
 *
 * Cliente
 *    ↓
 * Productos
 *    ↓
 * Precio final IVA incluido
 *    ↓
 * Venta CONFIRMADA
 *    ↓
 * Stock -
 *    ↓
 * Movimientos SALIDA
 *
 * cotizacionId queda NULL para identificar
 * que la venta fue realizada directamente.
 * =========================================================
 */

router.post(
  "/",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const {
        clienteId,
        observacion,
        detalles,
      } = req.body;

      const clienteIdNumerico =
        Number(clienteId);

      if (
        !Number.isInteger(
          clienteIdNumerico,
        ) ||
        clienteIdNumerico <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Debes seleccionar un cliente válido",
        });
      }

      /*
       * El cliente debe pertenecer a la
       * empresa autenticada y estar activo.
       */
      const cliente =
        await prisma.cliente.findFirst({
          where: {
            id: clienteIdNumerico,
            empresaId:
              req.auth.empresaId,
            estado: true,
          },
        });

      if (!cliente) {
        return res.status(404).json({
          success: false,

          message:
            "El cliente no existe, está inactivo o no pertenece a tu empresa",
        });
      }

      const resultadoDetalles =
        await validarDetallesVentaDirecta(
          detalles,
          req.auth.empresaId,
        );

      if (resultadoDetalles.error) {
        return res.status(
          resultadoDetalles.code ===
            "STOCK_INSUFICIENTE"
            ? 409
            : 400,
        ).json({
          success: false,

          message:
            resultadoDetalles.error,

          ...(resultadoDetalles.code && {
            code: resultadoDetalles.code,
          }),
        });
      }

      const detallesNormalizados =
        resultadoDetalles.detalles;

      /*
       * Los subtotales de línea contienen IVA.
       * Sumamos esos valores para obtener el
       * precio final completo de la venta.
       */
      const total =
        redondearDinero(
          detallesNormalizados.reduce(
            (acumulado, detalle) =>
              acumulado +
              detalle.subtotal,
            0,
          ),
        );

      /*
       * Desglosamos el IVA incluido.
       */
      const totales =
        calcularIvaIncluido(total);

      const numero =
        await generarNumeroVenta(
          prisma,
          req.auth.empresaId,
        );

      const ventaCreada =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Creamos primero la venta.
             *
             * cotizacionId no se informa,
             * por lo que queda NULL y
             * representa una venta directa.
             */
            const venta =
              await tx.venta.create({
                data: {
                  empresaId:
                    req.auth.empresaId,

                  clienteId:
                    clienteIdNumerico,

                  usuarioId:
                    req.auth.usuarioId,

                  numero,

                  estado: "CONFIRMADA",

                  /*
                   * subtotal se conserva por
                   * compatibilidad con el modelo
                   * histórico del sistema.
                   *
                   * Representa el precio final
                   * antes del desglose tributario.
                   */
                  subtotal:
                    totales.total,

                  subtotalNeto:
                    totales.subtotalNeto,

                  tasaIva:
                    totales.tasaIva,

                  montoIva:
                    totales.montoIva,

                  total:
                    totales.total,

                  observacion:
                    String(
                      observacion || "",
                    ).trim() || null,

                  detalles: {
                    create:
                      detallesNormalizados.map(
                        (detalle) => ({
                          productoId:
                            detalle.productoId,

                          cantidad:
                            detalle.cantidad,

                          precioUnitario:
                            detalle.precioUnitario,

                          subtotal:
                            detalle.subtotal,

                          subtotalNeto:
                            detalle.subtotalNeto,
                        }),
                      ),
                  },
                },
              });

            /*
             * Descontamos stock de forma segura.
             * Aunque lo validamos previamente,
             * volvemos a comprobarlo dentro de
             * la transacción.
             */
            for (
              const detalle of
              detallesNormalizados
            ) {
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
                      decrement:
                        detalle.cantidad,
                    },
                  },
                });

              if (
                resultadoStock.count !== 1
              ) {
                const errorStock =
                  new Error(
                    `Stock insuficiente para "${detalle.producto.nombre}"`,
                  );

                errorStock.code =
                  "STOCK_INSUFICIENTE";

                throw errorStock;
              }

              /*
               * Cada producto vendido genera
               * un movimiento SALIDA.
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

                  observacion:
                    `Salida generada por ${numero} - venta directa`,
                },
              });
            }

            return tx.venta.findUnique({
              where: {
                id: venta.id,
              },

              include:
                incluirVenta,
            });
          },
        );

      return res.status(201).json({
        success: true,

        message:
          "Venta directa registrada correctamente",

        data: {
          venta: ventaCreada,
        },
      });
    } catch (error) {
      console.error(
        "Error al registrar venta directa:",
        error,
      );

      if (
        error.code ===
        "STOCK_INSUFICIENTE"
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
            "No fue posible generar el número de la venta",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "No fue posible registrar la venta directa",
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
      const ventaId = Number(
        req.params.id,
      );

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

      const venta =
        await prisma.venta.findFirst({
          where: {
            id: ventaId,

            empresaId:
              req.auth.empresaId,
          },

          include: incluirVenta,
        });

      if (!venta) {
        return res.status(404).json({
          success: false,

          message:
            "Venta no encontrada",
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
 *
 * Mantiene los precios históricos de la
 * cotización y agrega el desglose del IVA
 * incluido en esos valores.
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

            empresaId:
              req.auth.empresaId,
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

          message:
            "Cotización no encontrada",
        });
      }

      if (cotizacion.venta) {
        return res.status(409).json({
          success: false,

          message:
            "Esta cotización ya fue convertida en una venta",
        });
      }

      if (
        cotizacion.estado !==
        "ACEPTADA"
      ) {
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

      if (
        cotizacion.detalles.length === 0
      ) {
        return res.status(409).json({
          success: false,

          message:
            "La cotización no contiene productos",
        });
      }

      /*
       * Validaciones previas.
       */
      for (
        const detalle of
        cotizacion.detalles
      ) {
        if (!detalle.producto.estado) {
          return res.status(409).json({
            success: false,

            message:
              `El producto "${detalle.producto.nombre}" se encuentra inactivo`,
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

            message:
              `Stock insuficiente para "${detalle.producto.nombre}". Disponible: ${detalle.producto.stock}, requerido: ${detalle.cantidad}`,

            code:
              "STOCK_INSUFICIENTE",
          });
        }
      }

      /*
       * El total de la cotización representa
       * el precio final al cliente.
       */
      const totalVenta =
        redondearDinero(
          cotizacion.total,
        );

      const totales =
        calcularIvaIncluido(
          totalVenta,
        );

      const detallesVenta =
        cotizacion.detalles.map(
          (detalle) => {
            const subtotal =
              redondearDinero(
                detalle.subtotal,
              );

            const desgloseLinea =
              calcularIvaIncluido(
                subtotal,
              );

            return {
              productoId:
                detalle.productoId,

              cantidad:
                detalle.cantidad,

              precioUnitario:
                redondearDinero(
                  detalle.precioUnitario,
                ),

              subtotal,

              subtotalNeto:
                desgloseLinea.subtotalNeto,
            };
          },
        );

      const numero =
        await generarNumeroVenta(
          prisma,
          req.auth.empresaId,
        );

      const ventaCreada =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Se conservan los valores históricos
             * de la cotización.
             */
            const venta =
              await tx.venta.create({
                data: {
                  empresaId:
                    req.auth.empresaId,

                  clienteId:
                    cotizacion.clienteId,

                  usuarioId:
                    req.auth.usuarioId,

                  cotizacionId:
                    cotizacion.id,

                  numero,

                  subtotal:
                    cotizacion.subtotal,

                  subtotalNeto:
                    totales.subtotalNeto,

                  tasaIva:
                    totales.tasaIva,

                  montoIva:
                    totales.montoIva,

                  total:
                    totales.total,

                  observacion:
                    cotizacion.observacion,

                  detalles: {
                    create:
                      detallesVenta,
                  },
                },
              });

            /*
             * Descontamos stock nuevamente
             * dentro de la transacción.
             */
            for (
              const detalle of
              cotizacion.detalles
            ) {
              const resultadoStock =
                await tx.producto.updateMany({
                  where: {
                    id:
                      detalle.productoId,

                    empresaId:
                      req.auth.empresaId,

                    estado: true,

                    stock: {
                      gte:
                        detalle.cantidad,
                    },
                  },

                  data: {
                    stock: {
                      decrement:
                        detalle.cantidad,
                    },
                  },
                });

              if (
                resultadoStock.count !==
                1
              ) {
                const errorStock =
                  new Error(
                    `Stock insuficiente para "${detalle.producto.nombre}"`,
                  );

                errorStock.code =
                  "STOCK_INSUFICIENTE";

                throw errorStock;
              }

              await tx.movimientoInventario.create({
                data: {
                  empresaId:
                    req.auth.empresaId,

                  productoId:
                    detalle.productoId,

                  usuarioId:
                    req.auth.usuarioId,

                  ventaId:
                    venta.id,

                  tipo: "SALIDA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Salida generada por ${numero}`,
                },
              });
            }

            /*
             * La cotización queda convertida
             * solamente si toda la transacción
             * resultó correctamente.
             */
            await tx.cotizacion.update({
              where: {
                id:
                  cotizacion.id,
              },

              data: {
                estado:
                  "CONVERTIDA",
              },
            });

            return tx.venta.findUnique({
              where: {
                id: venta.id,
              },

              include:
                incluirVenta,
            });
          },
        );

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
        error.code ===
        "STOCK_INSUFICIENTE"
      ) {
        return res.status(409).json({
          success: false,

          message:
            error.message,

          code:
            "STOCK_INSUFICIENTE",
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
 *
 * La anulación:
 *
 * CONFIRMADA → ANULADA
 *
 * devuelve exactamente las unidades vendidas
 * y genera movimientos ENTRADA.
 *
 * El cambio de estado se realiza dentro de la
 * misma transacción para evitar una devolución
 * de stock duplicada.
 * =========================================================
 */

router.patch(
  "/:id/anular",
  authRequired,
  rolesVentas,
  async (req, res) => {
    try {
      const ventaId = Number(
        req.params.id,
      );

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

      const venta =
        await prisma.venta.findFirst({
          where: {
            id: ventaId,

            empresaId:
              req.auth.empresaId,
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

          message:
            "Venta no encontrada",
        });
      }

      if (
        venta.estado === "ANULADA"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "La venta ya se encuentra anulada",
        });
      }

      const ventaAnulada =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Cambiamos el estado primero
             * mediante una operación condicional.
             *
             * Si dos solicitudes intentaran anular
             * simultáneamente la misma venta, solo
             * una podrá continuar.
             */
            const cambioEstado =
              await tx.venta.updateMany({
                where: {
                  id: venta.id,

                  empresaId:
                    req.auth.empresaId,

                  estado:
                    "CONFIRMADA",
                },

                data: {
                  estado:
                    "ANULADA",
                },
              });

            if (
              cambioEstado.count !== 1
            ) {
              const errorAnulacion =
                new Error(
                  "La venta ya fue anulada o cambió de estado",
                );

              errorAnulacion.code =
                "VENTA_NO_ANULABLE";

              throw errorAnulacion;
            }

            /*
             * Restauramos exactamente el
             * inventario descontado.
             */
            for (
              const detalle of
              venta.detalles
            ) {
              const resultadoProducto =
                await tx.producto.updateMany({
                  where: {
                    id:
                      detalle.productoId,

                    empresaId:
                      req.auth.empresaId,
                  },

                  data: {
                    stock: {
                      increment:
                        detalle.cantidad,
                    },
                  },
                });

              if (
                resultadoProducto.count !==
                1
              ) {
                const errorProducto =
                  new Error(
                    `No fue posible restaurar el stock de "${detalle.producto.nombre}"`,
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

                  ventaId:
                    venta.id,

                  tipo: "ENTRADA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Devolución de stock por anulación de ${venta.numero}`,
                },
              });
            }

            return tx.venta.findUnique({
              where: {
                id: venta.id,
              },

              include:
                incluirVenta,
            });
          },
        );

      return res.status(200).json({
        success: true,

        message:
          "Venta anulada y stock restaurado correctamente",

        data: {
          venta:
            ventaAnulada,
        },
      });
    } catch (error) {
      console.error(
        "Error al anular venta:",
        error,
      );

      if (
        error.code ===
        "VENTA_NO_ANULABLE"
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
          "No fue posible anular la venta",
      });
    }
  },
);

export default router;