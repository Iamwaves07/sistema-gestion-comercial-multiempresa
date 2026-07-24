import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { generateAccessToken } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        success: false,
        message: "El correo y la contraseña son obligatorios",
      });
    }

    const correoNormalizado = String(correo).trim().toLowerCase();

    const usuario = await prisma.usuario.findUnique({
      where: {
        correo: correoNormalizado,
      },
      include: {
        empresa: true,
        rol: true,
      },
    });

    if (
      !usuario ||
      !usuario.estado ||
      !usuario.empresa.estado ||
      !usuario.rol.estado
    ) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas",
      });
    }

    const passwordValida = await bcrypt.compare(
      String(password),
      usuario.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas",
      });
    }

    const token = generateAccessToken(usuario);

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto",
      data: {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          empresa: {
            id: usuario.empresa.id,
            nombre: usuario.empresa.nombre,
          },
          rol: {
            id: usuario.rol.id,
            nombre: usuario.rol.nombre,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error durante el inicio de sesión:", error);

    return res.status(500).json({
      success: false,
      message: "Ocurrió un error interno durante el inicio de sesión",
    });
  }
});

export default router;