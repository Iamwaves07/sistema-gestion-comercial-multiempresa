import express from "express";

import transbankSdk from "transbank-sdk";

const {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} = transbankSdk;

import prisma from "../lib/prisma.js";

import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

const rolesPagos = authorizeRoles(
  "Administrador",
  "Vendedor",
);

const soloAdministrador = authorizeRoles(
  "Administrador",
);

/*
 * =========================================================
 * CONFIGURACIÓN WEBPAY
 * =========================================================
 *
 * Durante el desarrollo utilizamos el ambiente oficial
 * de integración de Transbank.
 *
 * No almacenamos números de tarjeta ni CVV.
 * =========================================================
 */

const crearTransaccionWebpay = () => {
  return new WebpayPlus.Transaction(
    new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration,
    ),
  );
};

const obtenerFrontendUrl = () => {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  );
};

const obtenerReturnUrl = () => {
  return (
    process.env.WEBPAY_RETURN_URL ||
    "http://localhost:3000/pagos/retorno"
  );
};

/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

const normalizarMontoCLP = (valor) => {
  const monto = Math.round(
    Number(valor),
  );

  if (
    !Number.isFinite(monto) ||
    monto <= 0
  ) {
    return null;
  }

  return monto;
};

const generarBuyOrder = (
  ventaId,
) => {
  /*
   * Webpay exige un identificador de orden.
   * Debe ser único y suficientemente corto.
   */
  const marcaTiempo =
    Date.now()
      .toString(36)
      .toUpperCase();

  return `WP-${ventaId}-${marcaTiempo}`;
};

const generarSessionId = (
  usuarioId,
) => {
  return `SGCM-${usuarioId}-${Date.now()}`;
};

const construirUrlResultado = ({
  estado,
  ventaId,
  pagoId,
}) => {
  const frontendUrl =
    obtenerFrontendUrl();

  const parametros =
    new URLSearchParams({
      webpay: estado,
    });

  if (ventaId) {
    parametros.set(
      "ventaId",
      String(ventaId),
    );
  }

  if (pagoId) {
    parametros.set(
      "pagoId",
      String(pagoId),
    );
  }

  return `${frontendUrl}/?${parametros.toString()}`;
};

/*
 * =========================================================
 * INCLUDE DE PAGO
 * =========================================================
 */

const incluirPago = {
  venta: {
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          rut: true,
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
              estado: true,
            },
          },
        },
      },
    },
  },

  usuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
    },
  },
};

/*
 * =========================================================
 * LISTAR PAGOS
 * =========================================================
 */

router.get(
  "/",
  authRequired,
  rolesPagos,
  async (req, res) => {
    try {
      const pagos =
        await prisma.pago.findMany({
          where: {
            empresaId:
              req.auth.empresaId,
          },

          select: {
            id: true,
            ventaId: true,
            usuarioId: true,
            monto: true,
            estado: true,
            proveedor: true,
            buyOrder: true,

            codigoAutorizacion:
              true,

            codigoRespuesta:
              true,

            tipoPago: true,
            numeroCuotas: true,

            fechaCreacion:
              true,

            fechaResolucion:
              true,

            venta: {
              select: {
                id: true,
                numero: true,
                estado: true,
                total: true,

                cliente: {
                  select: {
                    id: true,
                    nombre: true,
                    rut: true,
                  },
                },
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

          orderBy: {
            fechaCreacion:
              "desc",
          },
        });

      return res.status(200).json({
        success: true,

        data: {
          pagos,
        },
      });
    } catch (error) {
      console.error(
        "Error al listar pagos:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "No fue posible consultar los pagos",
      });
    }
  },
);

/*
 * =========================================================
 * INICIAR PAGO WEBPAY
 * =========================================================
 *
 * POST /pagos/iniciar/:ventaId
 *
 * Venta PENDIENTE_PAGO
 *          ↓
 * validar stock
 *          ↓
 * crear Pago PENDIENTE
 *          ↓
 * Webpay Transaction.create()
 *          ↓
 * token + URL
 * =========================================================
 */

router.post(
  "/iniciar/:ventaId",
  authRequired,
  rolesPagos,
  async (req, res) => {
    let pagoCreado = null;

    try {
      const ventaId = Number(
        req.params.ventaId,
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
        venta.estado !==
        "PENDIENTE_PAGO"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Solo una venta PENDIENTE_PAGO puede iniciar un pago",
        });
      }

      const existePagoPendiente =
        venta.pagos.some(
          (pago) =>
            pago.estado ===
            "PENDIENTE",
        );

      if (existePagoPendiente) {
        return res.status(409).json({
          success: false,

          message:
            "La venta ya posee un intento de pago pendiente",
        });
      }

      const existePagoAprobado =
        venta.pagos.some(
          (pago) =>
            pago.estado ===
            "APROBADO",
        );

      if (existePagoAprobado) {
        return res.status(409).json({
          success: false,

          message:
            "La venta ya posee un pago aprobado",
        });
      }

      if (
        venta.detalles.length === 0
      ) {
        return res.status(409).json({
          success: false,

          message:
            "La venta no contiene productos",
        });
      }

      /*
       * Primera comprobación de stock.
       *
       * Se realizará una segunda comprobación
       * cuando Transbank autorice el pago.
       */
      for (
        const detalle of
        venta.detalles
      ) {
        if (
          !detalle.producto ||
          !detalle.producto.estado ||
          detalle.producto.empresaId !==
            req.auth.empresaId
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Uno de los productos de la venta ya no se encuentra disponible",
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

      const monto =
        normalizarMontoCLP(
          venta.total,
        );

      if (!monto) {
        return res.status(409).json({
          success: false,

          message:
            "El monto de la venta no es válido para iniciar el pago",
        });
      }

      const buyOrder =
        generarBuyOrder(
          venta.id,
        );

      const sessionId =
        generarSessionId(
          req.auth.usuarioId,
        );

      /*
       * Primero dejamos trazabilidad local
       * del intento.
       */
      pagoCreado =
        await prisma.pago.create({
          data: {
            empresaId:
              req.auth.empresaId,

            ventaId:
              venta.id,

            usuarioId:
              req.auth.usuarioId,

            monto,

            estado:
              "PENDIENTE",

            proveedor:
              "TRANSBANK_WEBPAY_PLUS",

            buyOrder,
            sessionId,
          },
        });

      const transaccion =
        crearTransaccionWebpay();

      /*
       * Transbank devuelve:
       *
       * {
       *   token,
       *   url
       * }
       */
      const respuestaWebpay =
        await transaccion.create(
          buyOrder,
          sessionId,
          monto,
          obtenerReturnUrl(),
        );

      const pagoActualizado =
        await prisma.pago.update({
          where: {
            id: pagoCreado.id,
          },

          data: {
            token:
              respuestaWebpay.token,
          },

          select: {
            id: true,
            ventaId: true,
            monto: true,
            estado: true,
            proveedor: true,
            buyOrder: true,
            fechaCreacion: true,
          },
        });

      return res.status(201).json({
        success: true,

        message:
          "Pago Webpay iniciado correctamente",

        data: {
          pago:
            pagoActualizado,

          webpay: {
            token:
              respuestaWebpay.token,

            url:
              respuestaWebpay.url,
          },
        },
      });
    } catch (error) {
      console.error(
        "Error al iniciar pago Webpay:",
        error,
      );

      /*
       * Si alcanzamos a crear el intento local
       * pero Transbank falla antes de entregar
       * el token, lo cerramos como rechazado
       * para permitir un nuevo intento.
       */
      if (pagoCreado?.id) {
        try {
          await prisma.pago.updateMany({
            where: {
              id:
                pagoCreado.id,

              estado:
                "PENDIENTE",
            },

            data: {
              estado:
                "RECHAZADO",

              fechaResolucion:
                new Date(),
            },
          });
        } catch (
          errorActualizacion
        ) {
          console.error(
            "No fue posible cerrar el intento de pago fallido:",
            errorActualizacion,
          );
        }
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,

          message:
            "No fue posible generar un identificador único para el pago",
        });
      }

      return res.status(502).json({
        success: false,

        message:
          "No fue posible iniciar la transacción con Webpay",
      });
    }
  },
);

/*
 * =========================================================
 * RETORNO WEBPAY
 * =========================================================
 *
 * Esta ruta NO utiliza JWT porque el navegador vuelve
 * desde Webpay sin nuestro header Authorization.
 *
 * La seguridad del proceso se basa en el token de
 * Transbank y en Transaction.commit().
 *
 * Soportamos GET y POST para manejar adecuadamente
 * los distintos retornos del navegador.
 * =========================================================
 */

router.all(
  "/retorno",

  express.urlencoded({
    extended: false,
  }),

  async (req, res) => {
    try {
      const datos = {
        ...req.query,
        ...req.body,
      };

      const token =
        datos.token_ws;

      /*
       * Cuando el usuario cancela o abandona
       * el flujo, Transbank puede retornar
       * los campos TBK_* en lugar de token_ws.
       */
      if (!token) {
        const buyOrderCancelada =
          datos.TBK_ORDEN_COMPRA;

        if (buyOrderCancelada) {
          const pago =
            await prisma.pago.findUnique({
              where: {
                buyOrder:
                  String(
                    buyOrderCancelada,
                  ),
              },
            });

          if (pago) {
            await prisma.pago.updateMany({
              where: {
                id: pago.id,

                estado:
                  "PENDIENTE",
              },

              data: {
                estado:
                  "RECHAZADO",

                fechaResolucion:
                  new Date(),
              },
            });

            return res.redirect(
              303,
              construirUrlResultado({
                estado:
                  "cancelado",

                ventaId:
                  pago.ventaId,

                pagoId:
                  pago.id,
              }),
            );
          }
        }

        return res.redirect(
          303,
          construirUrlResultado({
            estado:
              "cancelado",
          }),
        );
      }

      const pago =
        await prisma.pago.findUnique({
          where: {
            token:
              String(token),
          },

          include:
            incluirPago,
        });

      if (!pago) {
        return res.redirect(
          303,
          construirUrlResultado({
            estado:
              "no-encontrado",
          }),
        );
      }

      /*
       * Retorno idempotente.
       *
       * Si por alguna razón el navegador vuelve
       * nuevamente con el mismo token y ya lo
       * procesamos, no volvemos a descontar stock.
       */
      if (
        pago.estado ===
        "APROBADO"
      ) {
        return res.redirect(
          303,
          construirUrlResultado({
            estado:
              "aprobado",

            ventaId:
              pago.ventaId,

            pagoId:
              pago.id,
          }),
        );
      }

      if (
        pago.estado ===
          "RECHAZADO" ||
        pago.estado ===
          "ANULADO"
      ) {
        return res.redirect(
          303,
          construirUrlResultado({
            estado:
              pago.estado ===
              "ANULADO"
                ? "anulado"
                : "rechazado",

            ventaId:
              pago.ventaId,

            pagoId:
              pago.id,
          }),
        );
      }

      const transaccion =
        crearTransaccionWebpay();

      /*
       * Confirmamos realmente la transacción
       * con Transbank.
       */
      const respuesta =
        await transaccion.commit(
          String(token),
        );

      const codigoRespuesta =
        Number(
          respuesta.response_code,
        );

      const montoRespuesta =
        Number(
          respuesta.amount,
        );

      const montoEsperado =
        Number(
          pago.monto,
        );

      const datosCoinciden =
        String(
          respuesta.buy_order,
        ) ===
          pago.buyOrder &&
        String(
          respuesta.session_id,
        ) ===
          pago.sessionId &&
        montoRespuesta ===
          montoEsperado;

      /*
       * No basta con recibir respuesta.
       *
       * La aprobación exige:
       * response_code = 0
       * status = AUTHORIZED
       * y correspondencia con nuestros datos.
       */
      const aprobado =
        codigoRespuesta === 0 &&
        respuesta.status ===
          "AUTHORIZED" &&
        datosCoinciden;

      /*
       * =====================================================
       * PAGO RECHAZADO
       * =====================================================
       */

      if (!aprobado) {
        await prisma.pago.updateMany({
          where: {
            id: pago.id,

            estado:
              "PENDIENTE",
          },

          data: {
            estado:
              "RECHAZADO",

            codigoAutorizacion:
              respuesta.authorization_code
                ? String(
                    respuesta.authorization_code,
                  )
                : null,

            codigoRespuesta:
              Number.isFinite(
                codigoRespuesta,
              )
                ? codigoRespuesta
                : null,

            tipoPago:
              respuesta.payment_type_code
                ? String(
                    respuesta.payment_type_code,
                  )
                : null,

            numeroCuotas:
              Number.isFinite(
                Number(
                  respuesta.installments_number,
                ),
              )
                ? Number(
                    respuesta.installments_number,
                  )
                : null,

            fechaResolucion:
              new Date(),
          },
        });

        return res.redirect(
          303,
          construirUrlResultado({
            estado:
              "rechazado",

            ventaId:
              pago.ventaId,

            pagoId:
              pago.id,
          }),
        );
      }

      /*
       * =====================================================
       * PAGO APROBADO
       * =====================================================
       *
       * Revalidamos stock DENTRO de la transacción.
       *
       * Solo si todo está correcto:
       *
       * Pago → APROBADO
       * Venta → CONFIRMADA
       * Stock -
       * Movimiento → SALIDA
       * =====================================================
       */

      try {
        await prisma.$transaction(
          async (tx) => {
            const actualizarPago =
              await tx.pago.updateMany({
                where: {
                  id: pago.id,

                  estado:
                    "PENDIENTE",
                },

                data: {
                  estado:
                    "APROBADO",

                  codigoAutorizacion:
                    respuesta.authorization_code
                      ? String(
                          respuesta.authorization_code,
                        )
                      : null,

                  codigoRespuesta:
                    codigoRespuesta,

                  tipoPago:
                    respuesta.payment_type_code
                      ? String(
                          respuesta.payment_type_code,
                        )
                      : null,

                  numeroCuotas:
                    Number.isFinite(
                      Number(
                        respuesta.installments_number,
                      ),
                    )
                      ? Number(
                          respuesta.installments_number,
                        )
                      : null,

                  fechaResolucion:
                    new Date(),
                },
              });

            if (
              actualizarPago.count !== 1
            ) {
              const errorPago =
                new Error(
                  "El intento de pago ya fue procesado",
                );

              errorPago.code =
                "PAGO_YA_PROCESADO";

              throw errorPago;
            }

            const actualizarVenta =
              await tx.venta.updateMany({
                where: {
                  id:
                    pago.venta.id,

                  empresaId:
                    pago.empresaId,

                  estado:
                    "PENDIENTE_PAGO",
                },

                data: {
                  estado:
                    "CONFIRMADA",
                },
              });

            if (
              actualizarVenta.count !== 1
            ) {
              const errorVenta =
                new Error(
                  "La venta ya no se encuentra pendiente de pago",
                );

              errorVenta.code =
                "VENTA_NO_DISPONIBLE";

              throw errorVenta;
            }

            for (
              const detalle of
              pago.venta.detalles
            ) {
              const resultadoStock =
                await tx.producto.updateMany({
                  where: {
                    id:
                      detalle.productoId,

                    empresaId:
                      pago.empresaId,

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
                    `Stock insuficiente para "${detalle.producto.nombre}" al confirmar el pago`,
                  );

                errorStock.code =
                  "STOCK_INSUFICIENTE";

                throw errorStock;
              }

              await tx.movimientoInventario.create({
                data: {
                  empresaId:
                    pago.empresaId,

                  productoId:
                    detalle.productoId,

                  usuarioId:
                    pago.usuarioId,

                  ventaId:
                    pago.venta.id,

                  tipo:
                    "SALIDA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Salida generada por ${pago.venta.numero} - pago Webpay aprobado`,
                },
              });
            }
          },
        );
      } catch (errorConfirmacion) {
        /*
         * ===================================================
         * PAGO AUTORIZADO PERO NO PODEMOS CONFIRMAR LA VENTA
         * ===================================================
         *
         * Ejemplo:
         * otro proceso consumió el stock mientras
         * el cliente estaba en Webpay.
         *
         * Intentamos reversar el cobro inmediatamente.
         * ===================================================
         */

        console.error(
          "No fue posible confirmar la venta después del pago:",
          errorConfirmacion,
        );

        if (
          errorConfirmacion.code ===
            "STOCK_INSUFICIENTE" ||
          errorConfirmacion.code ===
            "VENTA_NO_DISPONIBLE"
        ) {
          try {
            const respuestaReversa =
              await transaccion.refund(
                String(token),
                montoEsperado,
              );

            const reversaExitosa =
              respuestaReversa.type ===
                "REVERSED" ||
              (
                respuestaReversa.type ===
                  "NULLIFIED" &&
                Number(
                  respuestaReversa.response_code,
                ) === 0
              );

            if (reversaExitosa) {
              await prisma.pago.update({
                where: {
                  id:
                    pago.id,
                },

                data: {
                  estado:
                    "ANULADO",

                  codigoAutorizacion:
                    respuesta.authorization_code
                      ? String(
                          respuesta.authorization_code,
                        )
                      : null,

                  codigoRespuesta:
                    codigoRespuesta,

                  tipoPago:
                    respuesta.payment_type_code
                      ? String(
                          respuesta.payment_type_code,
                        )
                      : null,

                  numeroCuotas:
                    Number.isFinite(
                      Number(
                        respuesta.installments_number,
                      ),
                    )
                      ? Number(
                          respuesta.installments_number,
                        )
                      : null,

                  fechaResolucion:
                    new Date(),
                },
              });

              return res.redirect(
                303,
                construirUrlResultado({
                  estado:
                    "reversado-stock",

                  ventaId:
                    pago.ventaId,

                  pagoId:
                    pago.id,
                }),
              );
            }
          } catch (
            errorReversa
          ) {
            console.error(
              "ERROR CRÍTICO: pago autorizado pero no fue posible reversarlo:",
              errorReversa,
            );
          }

          /*
           * Si la reversa automática falla,
           * dejamos registrada la aprobación.
           *
           * No confirmamos la venta ni tocamos stock,
           * de modo que el caso pueda ser revisado
           * administrativamente sin esconder que el
           * proveedor sí autorizó el cobro.
           */
          await prisma.pago.update({
            where: {
              id:
                pago.id,
            },

            data: {
              estado:
                "APROBADO",

              codigoAutorizacion:
                respuesta.authorization_code
                  ? String(
                      respuesta.authorization_code,
                    )
                  : null,

              codigoRespuesta:
                codigoRespuesta,

              tipoPago:
                respuesta.payment_type_code
                  ? String(
                      respuesta.payment_type_code,
                    )
                  : null,

              numeroCuotas:
                Number.isFinite(
                  Number(
                    respuesta.installments_number,
                  ),
                )
                  ? Number(
                      respuesta.installments_number,
                    )
                  : null,

              fechaResolucion:
                new Date(),
            },
          });

          return res.redirect(
            303,
            construirUrlResultado({
              estado:
                "error-stock",

              ventaId:
                pago.ventaId,

              pagoId:
                pago.id,
            }),
          );
        }

        if (
          errorConfirmacion.code ===
          "PAGO_YA_PROCESADO"
        ) {
          return res.redirect(
            303,
            construirUrlResultado({
              estado:
                "aprobado",

              ventaId:
                pago.ventaId,

              pagoId:
                pago.id,
            }),
          );
        }

        throw errorConfirmacion;
      }

      return res.redirect(
        303,
        construirUrlResultado({
          estado:
            "aprobado",

          ventaId:
            pago.ventaId,

          pagoId:
            pago.id,
        }),
      );
    } catch (error) {
      console.error(
        "Error al procesar retorno Webpay:",
        error,
      );

      return res.redirect(
        303,
        construirUrlResultado({
          estado:
            "error",
        }),
      );
    }
  },
);

/*
 * =========================================================
 * ANULAR / REVERSAR PAGO APROBADO
 * =========================================================
 *
 * POST /pagos/:id/anular
 *
 * Por tratarse de devolución de dinero,
 * esta operación queda restringida al
 * Administrador.
 *
 * Pago APROBADO
 *      ↓
 * Webpay refund()
 *      ↓
 * Pago ANULADO
 * Venta ANULADA
 * Stock +
 * Movimiento ENTRADA
 * =========================================================
 */

router.post(
  "/:id/anular",
  authRequired,
  soloAdministrador,
  async (req, res) => {
    try {
      const pagoId = Number(
        req.params.id,
      );

      if (
        !Number.isInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "El identificador del pago no es válido",
        });
      }

      const pago =
        await prisma.pago.findFirst({
          where: {
            id:
              pagoId,

            empresaId:
              req.auth.empresaId,
          },

          include:
            incluirPago,
        });

      if (!pago) {
        return res.status(404).json({
          success: false,

          message:
            "Pago no encontrado",
        });
      }

      if (
        pago.estado !==
        "APROBADO"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Solo un pago APROBADO puede anularse",
        });
      }

      if (
        pago.venta.estado !==
        "CONFIRMADA"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "La venta asociada ya no se encuentra confirmada",
        });
      }

      if (!pago.token) {
        return res.status(409).json({
          success: false,

          message:
            "El pago no posee un token Webpay válido para realizar la anulación",
        });
      }

      const monto =
        normalizarMontoCLP(
          pago.monto,
        );

      if (!monto) {
        return res.status(409).json({
          success: false,

          message:
            "El monto del pago no es válido",
        });
      }

      const transaccion =
        crearTransaccionWebpay();

      /*
       * Primero resolvemos la devolución
       * con el proveedor de pagos.
       */
      const respuestaReversa =
        await transaccion.refund(
          pago.token,
          monto,
        );

      const reversaExitosa =
        respuestaReversa.type ===
          "REVERSED" ||
        (
          respuestaReversa.type ===
            "NULLIFIED" &&
          Number(
            respuestaReversa.response_code,
          ) === 0
        );

      if (!reversaExitosa) {
        return res.status(409).json({
          success: false,

          message:
            "Transbank no confirmó la anulación del pago",
        });
      }

      /*
       * Una vez confirmada la reversa externa,
       * sincronizamos venta e inventario.
       */
      const resultado =
        await prisma.$transaction(
          async (tx) => {
            const cambioPago =
              await tx.pago.updateMany({
                where: {
                  id:
                    pago.id,

                  empresaId:
                    req.auth.empresaId,

                  estado:
                    "APROBADO",
                },

                data: {
                  estado:
                    "ANULADO",

                  fechaResolucion:
                    new Date(),
                },
              });

            if (
              cambioPago.count !== 1
            ) {
              const errorPago =
                new Error(
                  "El pago cambió de estado antes de completar la anulación",
                );

              errorPago.code =
                "PAGO_NO_ANULABLE";

              throw errorPago;
            }

            const cambioVenta =
              await tx.venta.updateMany({
                where: {
                  id:
                    pago.venta.id,

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
              cambioVenta.count !== 1
            ) {
              const errorVenta =
                new Error(
                  "La venta cambió de estado antes de completar la anulación",
                );

              errorVenta.code =
                "VENTA_NO_ANULABLE";

              throw errorVenta;
            }

            for (
              const detalle of
              pago.venta.detalles
            ) {
              const productoActualizado =
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
                productoActualizado.count !==
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
                    pago.venta.id,

                  tipo:
                    "ENTRADA",

                  cantidad:
                    detalle.cantidad,

                  observacion:
                    `Devolución de stock por anulación Webpay de ${pago.venta.numero}`,
                },
              });
            }

            const pagoActualizado =
              await tx.pago.findUnique({
                where: {
                  id:
                    pago.id,
                },

                include:
                  incluirPago,
              });

            return pagoActualizado;
          },
        );

      return res.status(200).json({
        success: true,

        message:
          "Pago anulado, venta anulada y stock restaurado correctamente",

        data: {
          pago:
            resultado,
        },
      });
    } catch (error) {
      console.error(
        "Error al anular pago Webpay:",
        error,
      );

      if (
        error.code ===
          "PAGO_NO_ANULABLE" ||
        error.code ===
          "VENTA_NO_ANULABLE" ||
        error.code ===
          "PRODUCTO_NO_DISPONIBLE"
      ) {
        return res.status(409).json({
          success: false,

          message:
            error.message,
        });
      }

      return res.status(502).json({
        success: false,

        message:
          "No fue posible completar la anulación del pago Webpay",
      });
    }
  },
);

export default router;