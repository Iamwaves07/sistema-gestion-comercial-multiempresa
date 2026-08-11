import { describe, test, expect } from "@jest/globals";
import {
  generateAccessToken,
  verifyAccessToken,
} from "../src/lib/auth.js";

describe("Autenticación JWT", () => {
  test("debe generar y verificar un token con los datos del usuario", () => {
    const usuario = {
      id: 10,
      empresaId: 5,
      rolId: 2,
      rol: {
        nombre: "Administrador",
      },
    };

    const token = generateAccessToken(usuario);
    const payload = verifyAccessToken(token);

    expect(typeof token).toBe("string");
    expect(payload.sub).toBe("10");
    expect(payload.empresaId).toBe(5);
    expect(payload.rolId).toBe(2);
    expect(payload.rol).toBe("Administrador");
    expect(payload.iss).toBe("sgcm-api");
    expect(payload.aud).toBe("sgcm-frontend");
  });
});