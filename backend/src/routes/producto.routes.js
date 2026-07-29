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
      const {
        nombre,
        precio,
        stock = 0,
        stockMinimo = 0,
        categoriaId,
      } = req.body;

      const nombreNormalizado = String(nombre ?? "").trim();
      const precioNumero = Number(precio);
      const stockNumero = Number(stock);
      const stockMinimoNumero = Number(stockMinimo);
      const categoriaIdNumero = Number(categoriaId);

      if (!nombreNormalizado) {
        return res.status(400).json({
          success: false,
          message: "El nombre del producto es obligatorio",
        });
      }

      if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
        return res.status(400).json({
          success: false,
          message: "El precio debe ser un número mayor que cero",
        });
      }

      if (!Number.isInteger(stockNumero) || stockNumero < 0) {
        return res.status(400).json({
          success: false,
          message: "El stock debe ser un número entero igual o mayor que cero",
        });
      }

      if (!Number.isInteger(stockMinimoNumero) || stockMinimoNumero < 0) {
        return res.status(400).json({
          success: false,
          message:
            "El stock mínimo debe ser un número entero igual o mayor que cero",
        });
      }

      if (
        !Number.isInteger(categoriaIdNumero) ||
        categoriaIdNumero <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "La categoría seleccionada no es válida",
        });
      }

      const categoria = await prisma.categoria.findFirst({
        where: {
          id: categoriaIdNumero,
          empresaId: req.auth.empresaId,
          estado: true,
        },
      });

      if (!categoria) {
        return res.status(404).json({
          success: false,
          message:
            "La categoría no existe, está desactivada o pertenece a otra empresa",
        });
      }

      const productoExistente = await prisma.producto.findFirst({
        where: {
          empresaId: req.auth.empresaId,
          nombre: {
            equals: nombreNormalizado,
            mode: "insensitive",
          },
        },
      });

      if (productoExistente) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un producto con ese nombre",
        });
      }

      const producto = await prisma.producto.create({
        data: {
          empresaId: req.auth.empresaId,
          categoriaId: categoriaIdNumero,
          nombre: nombreNormalizado,
          precio: precioNumero,
          stock: stockNumero,
          stockMinimo: stockMinimoNumero,
        },
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          stockMinimo: true,
          estado: true,
          empresaId: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Producto creado correctamente",
        data: {
          producto,
        },
      });
    } catch (error) {
      console.error("Error al crear producto:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible crear el producto",
      });
    }
  }
);
router.get("/", authRequired, async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: {
        empresaId: req.auth.empresaId,
      },
      orderBy: {
        nombre: "asc",
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        stock: true,
        stockMinimo: true,
        estado: true,
        empresaId: true,
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        productos,
      },
    });
  } catch (error) {
    console.error("Error al listar productos:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar los productos",
    });
  }
});
router.get("/:id", authRequired, async (req, res) => {
  try {
    const productoId = Number(req.params.id);

    if (!Number.isInteger(productoId) || productoId <= 0) {
      return res.status(400).json({
        success: false,
        message: "El identificador del producto no es válido",
      });
    }

    const producto = await prisma.producto.findFirst({
      where: {
        id: productoId,
        empresaId: req.auth.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        stock: true,
        stockMinimo: true,
        estado: true,
        empresaId: true,
        categoria: {
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        },
      },
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        producto,
      },
    });
  } catch (error) {
    console.error("Error al consultar producto:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar el producto",
    });
  }
});
router.put(
  "/:id",
  authRequired,
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const productoId = Number(req.params.id);
      const { nombre, precio, stockMinimo, categoriaId } = req.body;

      if (!Number.isInteger(productoId) || productoId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del producto no es válido",
        });
      }

      if (
        nombre === undefined &&
        precio === undefined &&
        stockMinimo === undefined &&
        categoriaId === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Debes enviar al menos un campo para actualizar",
        });
      }

      const productoActual = await prisma.producto.findFirst({
        where: {
          id: productoId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!productoActual) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      const datosActualizados = {};

      if (nombre !== undefined) {
        const nombreNormalizado = String(nombre).trim();

        if (!nombreNormalizado) {
          return res.status(400).json({
            success: false,
            message: "El nombre del producto no puede estar vacío",
          });
        }

        const productoDuplicado = await prisma.producto.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            id: {
              not: productoId,
            },
            nombre: {
              equals: nombreNormalizado,
              mode: "insensitive",
            },
          },
        });

        if (productoDuplicado) {
          return res.status(409).json({
            success: false,
            message: "Ya existe un producto con ese nombre",
          });
        }

        datosActualizados.nombre = nombreNormalizado;
      }

      if (precio !== undefined) {
        const precioNumero = Number(precio);

        if (!Number.isFinite(precioNumero) || precioNumero <= 0) {
          return res.status(400).json({
            success: false,
            message: "El precio debe ser un número mayor que cero",
          });
        }

        datosActualizados.precio = precioNumero;
      }

      if (stockMinimo !== undefined) {
        const stockMinimoNumero = Number(stockMinimo);

        if (
          !Number.isInteger(stockMinimoNumero) ||
          stockMinimoNumero < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "El stock mínimo debe ser un número entero igual o mayor que cero",
          });
        }

        datosActualizados.stockMinimo = stockMinimoNumero;
      }

      if (categoriaId !== undefined) {
        const categoriaIdNumero = Number(categoriaId);

        if (
          !Number.isInteger(categoriaIdNumero) ||
          categoriaIdNumero <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "La categoría seleccionada no es válida",
          });
        }

        const categoria = await prisma.categoria.findFirst({
          where: {
            id: categoriaIdNumero,
            empresaId: req.auth.empresaId,
            estado: true,
          },
        });

        if (!categoria) {
          return res.status(404).json({
            success: false,
            message:
              "La categoría no existe, está desactivada o pertenece a otra empresa",
          });
        }

        datosActualizados.categoriaId = categoriaIdNumero;
      }

      const productoActualizado = await prisma.producto.update({
        where: {
          id: productoId,
        },
        data: datosActualizados,
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          stockMinimo: true,
          estado: true,
          empresaId: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Producto actualizado correctamente",
        data: {
          producto: productoActualizado,
        },
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible actualizar el producto",
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
      const productoId = Number(req.params.id);

      if (!Number.isInteger(productoId) || productoId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del producto no es válido",
        });
      }

      const producto = await prisma.producto.findFirst({
        where: {
          id: productoId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!producto) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      if (!producto.estado) {
        return res.status(409).json({
          success: false,
          message: "El producto ya se encuentra desactivado",
        });
      }

      const productoDesactivado = await prisma.producto.update({
        where: {
          id: productoId,
        },
        data: {
          estado: false,
        },
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          stockMinimo: true,
          estado: true,
          empresaId: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Producto desactivado correctamente",
        data: {
          producto: productoDesactivado,
        },
      });
    } catch (error) {
      console.error("Error al desactivar producto:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible desactivar el producto",
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
      const productoId = Number(req.params.id);

      if (!Number.isInteger(productoId) || productoId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador del producto no es válido",
        });
      }

      const producto = await prisma.producto.findFirst({
        where: {
          id: productoId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!producto) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado",
        });
      }

      if (producto.estado) {
        return res.status(409).json({
          success: false,
          message: "El producto ya se encuentra activo",
        });
      }

      const productoReactivado = await prisma.producto.update({
        where: {
          id: productoId,
        },
        data: {
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          precio: true,
          stock: true,
          stockMinimo: true,
          estado: true,
          empresaId: true,
          categoria: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Producto reactivado correctamente",
        data: {
          producto: productoReactivado,
        },
      });
    } catch (error) {
      console.error("Error al reactivar producto:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible reactivar el producto",
      });
    }
  }
);
export default router;