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
      const { nombre, descripcion } = req.body;

      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la categoría es obligatorio",
        });
      }

      const nombreNormalizado = String(nombre).trim();
      const descripcionNormalizada = descripcion
        ? String(descripcion).trim() || null
        : null;

      const categoriaExistente = await prisma.categoria.findFirst({
        where: {
          empresaId: req.auth.empresaId,
          nombre: {
            equals: nombreNormalizado,
            mode: "insensitive",
          },
        },
      });

      if (categoriaExistente) {
        return res.status(409).json({
          success: false,
          message: "Ya existe una categoría con ese nombre",
        });
      }

      const categoria = await prisma.categoria.create({
        data: {
          empresaId: req.auth.empresaId,
          nombre: nombreNormalizado,
          descripcion: descripcionNormalizada,
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          estado: true,
          empresaId: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Categoría creada correctamente",
        data: {
          categoria,
        },
      });
    } catch (error) {
      console.error("Error al crear categoría:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe una categoría con ese nombre",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible crear la categoría",
      });
    }
  }
);
router.get("/", authRequired, async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      where: {
        empresaId: req.auth.empresaId,
      },
      orderBy: {
        nombre: "asc",
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        empresaId: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        categorias,
      },
    });
  } catch (error) {
    console.error("Error al listar categorías:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar las categorías",
    });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const categoriaId = Number(req.params.id);

    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la categoría no es válido",
      });
    }

    const categoria = await prisma.categoria.findFirst({
      where: {
        id: categoriaId,
        empresaId: req.auth.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        estado: true,
        empresaId: true,
      },
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        categoria,
      },
    });
  } catch (error) {
    console.error("Error al consultar categoría:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible consultar la categoría",
    });
  }
});

router.put(
  "/:id",
  authRequired,
  authorizeRoles("Administrador"),
  async (req, res) => {
    try {
      const categoriaId = Number(req.params.id);
      const { nombre, descripcion } = req.body;

      if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador de la categoría no es válido",
        });
      }

      if (nombre === undefined && descripcion === undefined) {
        return res.status(400).json({
          success: false,
          message: "Debes enviar al menos un campo para actualizar",
        });
      }

      const categoriaActual = await prisma.categoria.findFirst({
        where: {
          id: categoriaId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!categoriaActual) {
        return res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
      }

      let nombreNormalizado;

      if (nombre !== undefined) {
        nombreNormalizado = String(nombre).trim();

        if (!nombreNormalizado) {
          return res.status(400).json({
            success: false,
            message: "El nombre de la categoría no puede estar vacío",
          });
        }

        const categoriaDuplicada = await prisma.categoria.findFirst({
          where: {
            empresaId: req.auth.empresaId,
            id: {
              not: categoriaId,
            },
            nombre: {
              equals: nombreNormalizado,
              mode: "insensitive",
            },
          },
        });

        if (categoriaDuplicada) {
          return res.status(409).json({
            success: false,
            message: "Ya existe una categoría con ese nombre",
          });
        }
      }

      const categoriaActualizada = await prisma.categoria.update({
        where: {
          id: categoriaId,
        },
        data: {
          ...(nombre !== undefined && {
            nombre: nombreNormalizado,
          }),
          ...(descripcion !== undefined && {
            descripcion: String(descripcion).trim() || null,
          }),
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          estado: true,
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Categoría actualizada correctamente",
        data: {
          categoria: categoriaActualizada,
        },
      });
    } catch (error) {
      console.error("Error al actualizar categoría:", error);

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Ya existe una categoría con ese nombre",
        });
      }

      return res.status(500).json({
        success: false,
        message: "No fue posible actualizar la categoría",
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
      const categoriaId = Number(req.params.id);

      if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador de la categoría no es válido",
        });
      }

      const categoria = await prisma.categoria.findFirst({
        where: {
          id: categoriaId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!categoria) {
        return res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
      }

      if (!categoria.estado) {
        return res.status(409).json({
          success: false,
          message: "La categoría ya se encuentra desactivada",
        });
      }

      const categoriaDesactivada = await prisma.categoria.update({
        where: {
          id: categoriaId,
        },
        data: {
          estado: false,
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          estado: true,
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Categoría desactivada correctamente",
        data: {
          categoria: categoriaDesactivada,
        },
      });
    } catch (error) {
      console.error("Error al desactivar categoría:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible desactivar la categoría",
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
      const categoriaId = Number(req.params.id);

      if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({
          success: false,
          message: "El identificador de la categoría no es válido",
        });
      }

      const categoria = await prisma.categoria.findFirst({
        where: {
          id: categoriaId,
          empresaId: req.auth.empresaId,
        },
      });

      if (!categoria) {
        return res.status(404).json({
          success: false,
          message: "Categoría no encontrada",
        });
      }

      if (categoria.estado) {
        return res.status(409).json({
          success: false,
          message: "La categoría ya se encuentra activa",
        });
      }

      const categoriaReactivada = await prisma.categoria.update({
        where: {
          id: categoriaId,
        },
        data: {
          estado: true,
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          estado: true,
          empresaId: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Categoría reactivada correctamente",
        data: {
          categoria: categoriaReactivada,
        },
      });
    } catch (error) {
      console.error("Error al reactivar categoría:", error);

      return res.status(500).json({
        success: false,
        message: "No fue posible reactivar la categoría",
      });
    }
  }
);
export default router;