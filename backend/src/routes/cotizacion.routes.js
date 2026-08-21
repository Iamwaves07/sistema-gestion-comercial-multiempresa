import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  authRequired,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = Router();

const estadosPermitidos = [
  "BORRADOR",
  "ENVIADA",
  "ACEPTADA",
  "RECHAZADA",
  "VENCIDA",
  "CONVERTIDA",
];

const selectCotizacion = {
  id: true,
  numero: true,
  estado: true,
  observacion: true,
  subtotal: true,
  total: true,
  fechaCreacion: true,
  fechaVencimiento: true,
  fechaActualizacion: true,
  empresaId: true,

  cliente: {
    select: {
      id: true,
      nombre: true,
      rut: true,
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
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      cantidad: true,
      precioUnitario: true,
      subtotal: true,

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

function normalizarObservacion(observacion) {
  if (observacion === undefined || observacion === null) {
    return null;
  }

  return String(observacion).trim() || null;
}

function normalizarFechaVencimiento(fecha) {
  if (!fecha) {
    return null;
  }

  const fechaNormalizada = new Date(fecha);

  if (Number.isNaN(fechaNormalizada.getTime())) {
    return undefined;
  }

  return fechaNormalizada;
}

function validarDetalles(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return {
      valido: false,
      message:
        "La cotización debe contener al menos un producto",
    };
  }

  const detallesNormalizados = [];

  for (const detalle of detalles) {
    const productoId = Number(detalle.productoId);
    const cantidad = Number(detalle.cantidad);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0
    ) {
      return {
        valido: false,
        message:
          "Todos los productos de la cotización deben ser válidos",
      };
    }

    if (
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      return {
        valido: false,
        message:
          "La cantidad de cada producto debe ser un número entero mayor que cero",
      };
    }

    detallesNormalizados.push({
      productoId,
      cantidad,
    });
  }

  const idsProductos = detallesNormalizados.map(
    (detalle) => detalle.productoId,
  );

  const idsUnicos = new Set(idsProductos);

  if (idsUnicos.size !== idsProductos.length) {
    return {
      valido: false,
      message:
        "Un producto no puede aparecer más de una vez en la misma cotización",
    };
  }

  return {
    valido: true,
    detalles: detallesNormalizados,
  };
}

async function prepararDatosCotizacion({
  empresaId,
  clienteId,
  detalles,
}) {
  const clienteIdNumero = Number(clienteId);

  if (
    !Number.isInteger(clienteIdNumero) ||
    clienteIdNumero <= 0
  ) {
    return {
      error: {
        status: 400,
        message:
          "El cliente seleccionado no es válido",
      },
    };
  }

  const validacionDetalles =
    validarDetalles(detalles);

  if (!validacionDetalles.valido) {
    return {
      error: {
        status: 400,
        message: validacionDetalles.message,
      },
    };
  }

  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteIdNumero,
      empresaId,
      estado: true,
    },
    select: {
      id: true,
      nombre: true,
    },
  });

  if (!cliente) {
    return {
      error: {
        status: 404,
        message:
          "El cliente no existe, está desactivado o pertenece a otra empresa",
      },
    };
  }

  const idsProductos =
    validacionDetalles.detalles.map(
      (detalle) => detalle.productoId,
    );

  const productos = await prisma.producto.findMany({
    where: {
      id: {
        in: idsProductos,
      },
      empresaId,
      estado: true,
      categoria: {
        estado: true,
      },
    },
    select: {
      id: true,
      nombre: true,
      precio: true,
    },
  });

  if (productos.length !== idsProductos.length) {
    return {
      error: {
        status: 404,
        message:
          "Uno o más productos no existen, están desactivados o pertenecen a otra empresa",
      },
    };
  }

  const productosPorId = new Map(
    productos.map((producto) => [
      producto.id,
      producto,
    ]),
  );

  let subtotalGeneral = 0;

  const detallesCalculados =
    validacionDetalles.detalles.map((detalle) => {
      const producto = productosPorId.get(
        detalle.productoId,
      );

      const precioUnitario = Number(
        producto.precio,
      );

      const subtotalDetalle =
        precioUnitario * detalle.cantidad;

      subtotalGeneral += subtotalDetalle;

      return {
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitario,
        subtotal: subtotalDetalle,
      };
    });

  return {
    clienteId: clienteIdNumero,
    detallesCalculados,
    subtotal: subtotalGeneral,
    total: subtotalGeneral,
  };
}

async function generarNumeroCotizacion(
  tx,
  empresaId,
) {
  const ultimaCotizacion =
    await tx.cotizacion.findFirst({
      where: {
        empresaId,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
        numero: true,
      },
    });

  let siguienteNumero = 1;

  if (ultimaCotizacion) {
    const coincidencia =
      ultimaCotizacion.numero?.match(
        /(\d+)$/,
      );

    if (coincidencia) {
      siguienteNumero =
        Number(coincidencia[1]) + 1;
    } else {
      siguienteNumero =
        ultimaCotizacion.id + 1;
    }
  }

  return `COT-${String(
    siguienteNumero,
  ).padStart(6, "0")}`;
}

/* =========================================================
   CREAR COTIZACIÓN
   ========================================================= */

router.post(
  "/",
  authRequired,
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const {
        clienteId,
        detalles,
        observacion,
        fechaVencimiento,
      } = req.body;

      const fechaVencimientoNormalizada =
        normalizarFechaVencimiento(
          fechaVencimiento,
        );

      if (
        fechaVencimientoNormalizada === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La fecha de vencimiento no es válida",
        });
      }

      const usuario =
        await prisma.usuario.findFirst({
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
          select: {
            id: true,
          },
        });

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message:
            "La sesión ya no es válida",
        });
      }

      const datosPreparados =
        await prepararDatosCotizacion({
          empresaId: req.auth.empresaId,
          clienteId,
          detalles,
        });

      if (datosPreparados.error) {
        return res
          .status(datosPreparados.error.status)
          .json({
            success: false,
            message:
              datosPreparados.error.message,
          });
      }

      const cotizacion =
        await prisma.$transaction(
          async (tx) => {
            const numero =
              await generarNumeroCotizacion(
                tx,
                req.auth.empresaId,
              );

            return tx.cotizacion.create({
              data: {
                empresaId:
                  req.auth.empresaId,

                clienteId:
                  datosPreparados.clienteId,

                usuarioId:
                  req.auth.usuarioId,

                numero,

                estado: "BORRADOR",

                observacion:
                  normalizarObservacion(
                    observacion,
                  ),

                subtotal:
                  datosPreparados.subtotal,

                total:
                  datosPreparados.total,

                fechaVencimiento:
                  fechaVencimientoNormalizada,

                detalles: {
                  create:
                    datosPreparados.detallesCalculados,
                },
              },

              select: selectCotizacion,
            });
          },
        );

      return res.status(201).json({
        success: true,
        message:
          "Cotización creada correctamente",
        data: {
          cotizacion,
        },
      });
    } catch (error) {
      console.error(
        "Error al crear cotización:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible crear la cotización",
      });
    }
  },
);

/* =========================================================
   LISTAR COTIZACIONES
   ========================================================= */

router.get(
  "/",
  authRequired,
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const cotizaciones =
        await prisma.cotizacion.findMany({
          where: {
            empresaId: req.auth.empresaId,
          },

          orderBy: {
            fechaCreacion: "desc",
          },

          select: selectCotizacion,
        });

      return res.status(200).json({
        success: true,
        data: {
          cotizaciones,
        },
      });
    } catch (error) {
      console.error(
        "Error al listar cotizaciones:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar las cotizaciones",
      });
    }
  },
);

/* =========================================================
   CONSULTAR COTIZACIÓN
   ========================================================= */

router.get(
  "/:id",
  authRequired,
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const cotizacionId =
        Number(req.params.id);

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

          select: selectCotizacion,
        });

      if (!cotizacion) {
        return res.status(404).json({
          success: false,
          message:
            "Cotización no encontrada",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          cotizacion,
        },
      });
    } catch (error) {
      console.error(
        "Error al consultar cotización:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible consultar la cotización",
      });
    }
  },
);

/* =========================================================
   EDITAR COTIZACIÓN EN BORRADOR
   ========================================================= */

router.put(
  "/:id",
  authRequired,
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const cotizacionId =
        Number(req.params.id);

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

      const cotizacionActual =
        await prisma.cotizacion.findFirst({
          where: {
            id: cotizacionId,
            empresaId: req.auth.empresaId,
          },

          select: {
            id: true,
            estado: true,
          },
        });

      if (!cotizacionActual) {
        return res.status(404).json({
          success: false,
          message:
            "Cotización no encontrada",
        });
      }

      if (
        cotizacionActual.estado !== "BORRADOR"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Solo las cotizaciones en estado BORRADOR pueden ser editadas",
        });
      }

      const {
        clienteId,
        detalles,
        observacion,
        fechaVencimiento,
      } = req.body;

      const fechaVencimientoNormalizada =
        normalizarFechaVencimiento(
          fechaVencimiento,
        );

      if (
        fechaVencimientoNormalizada === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La fecha de vencimiento no es válida",
        });
      }

      const datosPreparados =
        await prepararDatosCotizacion({
          empresaId: req.auth.empresaId,
          clienteId,
          detalles,
        });

      if (datosPreparados.error) {
        return res
          .status(datosPreparados.error.status)
          .json({
            success: false,
            message:
              datosPreparados.error.message,
          });
      }

      const cotizacion =
        await prisma.$transaction(
          async (tx) => {
            await tx.detalleCotizacion.deleteMany({
              where: {
                cotizacionId,
              },
            });

            return tx.cotizacion.update({
              where: {
                id: cotizacionId,
              },

              data: {
                clienteId:
                  datosPreparados.clienteId,

                observacion:
                  normalizarObservacion(
                    observacion,
                  ),

                subtotal:
                  datosPreparados.subtotal,

                total:
                  datosPreparados.total,

                fechaVencimiento:
                  fechaVencimientoNormalizada,

                detalles: {
                  create:
                    datosPreparados.detallesCalculados,
                },
              },

              select: selectCotizacion,
            });
          },
        );

      return res.status(200).json({
        success: true,
        message:
          "Cotización actualizada correctamente",
        data: {
          cotizacion,
        },
      });
    } catch (error) {
      console.error(
        "Error al actualizar cotización:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible actualizar la cotización",
      });
    }
  },
);

/* =========================================================
   CAMBIAR ESTADO DE COTIZACIÓN
   ========================================================= */

router.patch(
  "/:id/estado",
  authRequired,
  authorizeRoles("Administrador", "Vendedor"),
  async (req, res) => {
    try {
      const cotizacionId =
        Number(req.params.id);

      const estadoNuevo = String(
        req.body.estado ?? "",
      )
        .trim()
        .toUpperCase();

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

      if (
        !estadosPermitidos.includes(
          estadoNuevo,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El estado indicado no es válido",
        });
      }

      const cotizacionActual =
        await prisma.cotizacion.findFirst({
          where: {
            id: cotizacionId,
            empresaId: req.auth.empresaId,
          },

          select: {
            id: true,
            estado: true,
          },
        });

      if (!cotizacionActual) {
        return res.status(404).json({
          success: false,
          message:
            "Cotización no encontrada",
        });
      }

      const transicionesPermitidas = {
        BORRADOR: [
          "ENVIADA",
        ],

        ENVIADA: [
          "ACEPTADA",
          "RECHAZADA",
          "VENCIDA",
        ],

        ACEPTADA: [],
        RECHAZADA: [],
        VENCIDA: [],
        CONVERTIDA: [],
      };

      if (
        !transicionesPermitidas[
          cotizacionActual.estado
        ]?.includes(estadoNuevo)
      ) {
        return res.status(409).json({
          success: false,
          message: `No es posible cambiar una cotización desde ${cotizacionActual.estado} a ${estadoNuevo}`,
        });
      }

      /*
       * CONVERTIDA se reserva para el futuro
       * módulo de Ventas. No debe establecerse
       * manualmente desde este endpoint.
       */
      if (estadoNuevo === "CONVERTIDA") {
        return res.status(409).json({
          success: false,
          message:
            "El estado CONVERTIDA solo podrá establecerse al generar una venta",
        });
      }

      const cotizacion =
        await prisma.cotizacion.update({
          where: {
            id: cotizacionId,
          },

          data: {
            estado: estadoNuevo,
          },

          select: selectCotizacion,
        });

      return res.status(200).json({
        success: true,
        message:
          "Estado de la cotización actualizado correctamente",
        data: {
          cotizacion,
        },
      });
    } catch (error) {
      console.error(
        "Error al cambiar estado de cotización:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "No fue posible cambiar el estado de la cotización",
      });
    }
  },
);

export default router;