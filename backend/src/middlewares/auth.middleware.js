import { verifyAccessToken } from "../lib/auth.js";

export function authRequired(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token de acceso requerido",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token de acceso requerido",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    if (typeof payload !== "object" || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      });
    }

    req.auth = {
      usuarioId: Number(payload.sub),
      empresaId: payload.empresaId,
      rolId: payload.rolId,
      rol: payload.rol,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
}

export function authorizeRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        message: "Autenticación requerida",
      });
    }

    if (!rolesPermitidos.includes(req.auth.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para realizar esta acción",
      });
    }

    return next();
  };
}