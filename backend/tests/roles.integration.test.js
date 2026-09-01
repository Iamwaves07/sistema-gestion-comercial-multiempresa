import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "@jest/globals";

import request from "supertest";

import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import {
  generateAccessToken,
} from "../src/lib/auth.js";

describe("Integración de permisos por rol", () => {
  let tokenAdministrador;
  let tokenVendedor;

  beforeAll(async () => {
    /*
     * =======================================================
     * ADMINISTRADOR
     * =======================================================
     *
     * Para el Administrador utilizamos el login real
     * configurado mediante las variables del seed.
     */
    const correoAdministrador =
      process.env.SEED_ADMIN_CORREO;

    const passwordAdministrador =
      process.env.SEED_ADMIN_PASSWORD;

    if (
      !correoAdministrador ||
      !passwordAdministrador
    ) {
      throw new Error(
        "Faltan las credenciales del Administrador de pruebas",
      );
    }

    const loginAdministrador =
      await request(app)
        .post("/auth/login")
        .send({
          correo:
            correoAdministrador,

          password:
            passwordAdministrador,
        });

    if (
      loginAdministrador.status !== 200
    ) {
      throw new Error(
        "No fue posible iniciar sesión como Administrador",
      );
    }

    tokenAdministrador =
      loginAdministrador.body.data.token;

    /*
     * =======================================================
     * VENDEDOR
     * =======================================================
     *
     * El seed no posee variables SEED_VENDEDOR_*.
     *
     * Para probar exclusivamente autorización por rol,
     * buscamos un usuario Vendedor activo existente
     * y generamos un JWT utilizando la misma función
     * empleada por el sistema.
     */
    const vendedor =
      await prisma.usuario.findFirst({
        where: {
          estado: true,

          empresa: {
            estado: true,
          },

          rol: {
            nombre:
              "Vendedor",

            estado: true,
          },
        },

        include: {
          rol: true,
        },
      });

    if (!vendedor) {
      throw new Error(
        "No existe un usuario Vendedor activo para ejecutar la prueba de permisos",
      );
    }

    tokenVendedor =
      generateAccessToken(
        vendedor,
      );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("debe permitir al Administrador consultar órdenes de compra", async () => {
    const response =
      await request(app)
        .get("/ordenes-compra")
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`,
        );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(
      true,
    );

    expect(
      Array.isArray(
        response.body.data
          .ordenes,
      ),
    ).toBe(true);
  });

  test("debe impedir al Vendedor acceder a órdenes de compra", async () => {
    const response =
      await request(app)
        .get("/ordenes-compra")
        .set(
          "Authorization",
          `Bearer ${tokenVendedor}`,
        );

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(
      false,
    );
  });

  test("debe permitir al Vendedor acceder al módulo de ventas", async () => {
    const response =
      await request(app)
        .get("/ventas")
        .set(
          "Authorization",
          `Bearer ${tokenVendedor}`,
        );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(
      true,
    );

    expect(
      Array.isArray(
        response.body.data.ventas,
      ),
    ).toBe(true);
  });
});