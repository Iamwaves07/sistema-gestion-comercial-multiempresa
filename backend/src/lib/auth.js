import "dotenv/config";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h";

if (!jwtSecret) {
  throw new Error("La variable JWT_SECRET no está configurada");
}

export function generateAccessToken(usuario) {
  return jwt.sign(
    {
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      rol: usuario.rol.nombre,
    },
    jwtSecret,
    {
      subject: String(usuario.id),
      expiresIn: jwtExpiresIn,
      algorithm: "HS256",
      issuer: "sgcm-api",
      audience: "sgcm-frontend",
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret, {
    algorithms: ["HS256"],
    issuer: "sgcm-api",
    audience: "sgcm-frontend",
  });
}