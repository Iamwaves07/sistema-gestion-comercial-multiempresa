import { afterAll, describe, test, expect } from "@jest/globals";
import request from "supertest";

import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

describe("Integración de autenticación", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("debe iniciar sesión y acceder a una ruta protegida con JWT", async () => {
    const correo = process.env.SEED_ADMIN_CORREO;
    const password = process.env.SEED_ADMIN_PASSWORD;

    expect(correo).toBeDefined();
    expect(password).toBeDefined();

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({
        correo,
        password,
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.token).toBeDefined();

    const token = loginResponse.body.data.token;

    const meResponse = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.usuario.correo).toBe(
      correo.trim().toLowerCase()
    );
    expect(meResponse.body.data.usuario.rol.nombre).toBe(
      "Administrador"
    );
  });
});