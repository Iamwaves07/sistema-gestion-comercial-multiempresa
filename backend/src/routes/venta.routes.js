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

  /*
   * No exponemos token ni sessionId de Webpay
   * en el listado normal de ventas.
   */
  pagos: {
    select: {
      id: true,
      estado: true,
      proveedor: true,
      codigoAutorizacion: true,
      codigoRespuesta: true,
      tipoPago: true,
      numeroCuotas: true,
      fechaCreacion: true,
      fechaResolucion: true,
    },

    orderBy: {
      fechaCreacion: "desc",
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
     * Precio y stock siempre obtenidos desde
     * el backend.
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

    /*
     * Todavía comprobamos que exista stock antes
     * de crear la venta pendiente.
     *
     * El descuento definitivo se realizará
     * solamente después de aprobar el pago.
     */
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
 * NUEVO FLUJO v0.21.0
 *
 * Cliente
 *    ↓
 * Productos
 *    ↓
 * Venta PENDIENTE_PAGO
 *    ↓
 * Webpay
 *    ↓
 * Pago aprobado
 *    ↓
 * Venta CONFIRMADA
 *    ↓
 * Stock -
 *    ↓
 * Movimiento SALIDA
 *
 * IMPORTANTE:
 *
 * En esta ruta NO descontamos inventario.
 * El módulo de pagos será responsable de
 * hacerlo únicamente cuando Webpay confirme
 * correctamente la transacción.
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
            code:
              resultadoDetalles.code,
          }),
        });
      }

      const detallesNormalizados =
        resultadoDetalles.detalles;

      const total =
        redondearDinero(
          detallesNormalizados.reduce(
            (acumulado, detalle) =>
              acumulado +
              detalle.subtotal,
            0,
          ),
        );

      const totales =
        calcularIvaIncluido(total);

      const numero =
        await generarNumeroVenta(
          prisma,
          req.auth.empresaId,
        );

      /*
       * Creamos la venta, pero todavía
       * NO modificamos el inventario.
       */
      const ventaCreada =
        await prisma.venta.create({
          data: {
            empresaId:
              req.auth.empresaId,

            clienteId:
              clienteIdNumerico,

            usuarioId:
              req.auth.usuarioId,

            numero,

            estado:
              "PENDIENTE_PAGO",

            /*
             * subtotal se mantiene por
             * compatibilidad histórica.
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

          include: incluirVenta,
        });

      return res.status(201).json({
        success: true,

        message:
          "Venta creada y pendiente de pago",

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
 * La cotización conserva sus precios históricos,
 * pero la nueva venta queda PENDIENTE_PAGO.
 *
 * El stock todavía NO se descuenta.
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
                estado: true,
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
       * Validamos disponibilidad actual antes
       * de generar la venta pendiente.
       *
       * El stock se comprobará nuevamente
       * cuando el pago sea aprobado.
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
             * La venta queda pendiente.
             * NO se descuenta stock aquí.
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

                  estado:
                    "PENDIENTE_PAGO",

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
             * La cotización ya fue transformada
             * en una venta, aunque todavía esté
             * pendiente de pago.
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
          "Cotización convertida en venta pendiente de pago",

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
 * Existen ahora dos casos.
 *
 * 1) PENDIENTE_PAGO
 *
 *    Puede anularse sin modificar inventario porque
 *    todavía no se realizó ninguna SALIDA.
 *
 * 2) CONFIRMADA
 *
 *    Las ventas históricas que no tienen un pago Webpay
 *    aprobado mantienen el comportamiento anterior:
 *    restaurar stock y generar ENTRADA.
 *
 *    Si existe un pago Webpay APROBADO, no anulamos desde
 *    esta ruta. Primero deberá realizarse la reversa/anulación
 *    del pago mediante el módulo de pagos.
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

            pagos: {
              select: {
                id: true,
                estado: true,
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

      const pagoPendiente =
        venta.pagos.some(
          (pago) =>
            pago.estado ===
            "PENDIENTE",
        );

      const pagoAprobado =
        venta.pagos.some(
          (pago) =>
            pago.estado ===
            "APROBADO",
        );

      /*
       * =====================================================
       * VENTA PENDIENTE DE PAGO
       * =====================================================
       */

      if (
        venta.estado ===
        "PENDIENTE_PAGO"
      ) {
        /*
         * No permitimos anular mientras haya una
         * transacción Webpay activa, porque el cliente
         * podría continuar el pago externamente.
         */
        if (pagoPendiente) {
          return res.status(409).json({
            success: false,

            message:
              "La venta posee un pago pendiente. Debes finalizar o resolver el intento de pago antes de anularla",
          });
        }

        const ventaAnulada =
          await prisma.venta.update({
            where: {
              id: venta.id,
            },

            data: {
              estado:
                "ANULADA",
            },

            include:
              incluirVenta,
          });

        return res.status(200).json({
          success: true,

          message:
            "Venta pendiente anulada correctamente. No fue necesario modificar el stock",

          data: {
            venta:
              ventaAnulada,
          },
        });
      }

      /*
       * =====================================================
       * VENTA CONFIRMADA CON PAGO WEBPAY
       * =====================================================
       */

      if (pagoAprobado) {
        return res.status(409).json({
          success: false,

          message:
            "Esta venta posee un pago Webpay aprobado. La anulación debe realizarse desde el módulo de pagos para mantener sincronizado el pago y el inventario",
        });
      }

      /*
       * =====================================================
       * VENTA CONFIRMADA HISTÓRICA
       * =====================================================
       *
       * Conservamos exactamente el comportamiento
       * anterior para ventas creadas antes del módulo
       * Webpay.
       */

      const ventaAnulada =
        await prisma.$transaction(
          async (tx) => {
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

                  tipo:
                    "ENTRADA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Devolución de stock por anulación de ${venta.numero}`,
                },
              });
            }

            return tx.venta.findUnique({
              where: {
                id:
                  venta.id,
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