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

describe("Integración del flujo de ventas", () => {
  let token;
  let empresaId;
  let cliente;
  let producto;
  let stockInicial;
  let ventaCreadaId;

  beforeAll(async () => {
    const correo =
      process.env.SEED_ADMIN_CORREO;

    const password =
      process.env.SEED_ADMIN_PASSWORD;

    if (!correo || !password) {
      throw new Error(
        "Faltan SEED_ADMIN_CORREO o SEED_ADMIN_PASSWORD para ejecutar las pruebas",
      );
    }

    /*
     * Iniciamos sesión mediante la API real
     * para utilizar un JWT válido durante
     * las pruebas de integración.
     */
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({
        correo,
        password,
      });

    if (loginResponse.status !== 200) {
      throw new Error(
        "No fue posible iniciar sesión con el usuario Administrador de pruebas",
      );
    }

    token =
      loginResponse.body.data.token;

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          correo:
            correo.trim().toLowerCase(),
        },

        select: {
          empresaId: true,
        },
      });

    if (!usuario) {
      throw new Error(
        "No se encontró el usuario Administrador de pruebas",
      );
    }

    empresaId =
      usuario.empresaId;

    /*
     * Utilizamos datos existentes de la empresa
     * para no depender de identificadores fijos.
     */
    cliente =
      await prisma.cliente.findFirst({
        where: {
          empresaId,
          estado: true,
        },

        orderBy: {
          id: "asc",
        },
      });

    if (!cliente) {
      throw new Error(
        "La empresa de pruebas no posee clientes activos",
      );
    }

    producto =
      await prisma.producto.findFirst({
        where: {
          empresaId,
          estado: true,

          stock: {
            gt: 0,
          },
        },

        orderBy: {
          id: "asc",
        },
      });

    if (!producto) {
      throw new Error(
        "La empresa de pruebas no posee productos activos con stock",
      );
    }

    stockInicial =
      producto.stock;
  });

  afterAll(async () => {
    /*
     * Eliminamos cualquier dato generado
     * específicamente por esta suite.
     *
     * Esto permite repetir npm test sin llenar
     * la base de datos con ventas de prueba.
     */
    if (ventaCreadaId) {
      await prisma.pago.deleteMany({
        where: {
          ventaId:
            ventaCreadaId,
        },
      });

      await prisma.movimientoInventario.deleteMany({
        where: {
          ventaId:
            ventaCreadaId,
        },
      });

      await prisma.venta.deleteMany({
        where: {
          id:
            ventaCreadaId,
        },
      });
    }

    await prisma.$disconnect();
  });

  test("debe permitir listar las ventas de la empresa autenticada", async () => {
    const response = await request(app)
      .get("/ventas")
      .set(
        "Authorization",
        `Bearer ${token}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      Array.isArray(
        response.body.data.ventas,
      ),
    ).toBe(true);
  });

  test("debe crear una venta PENDIENTE_PAGO sin descontar stock", async () => {
    const response = await request(app)
      .post("/ventas")
      .set(
        "Authorization",
        `Bearer ${token}`,
      )
      .send({
        clienteId:
          cliente.id,

        observacion:
          "Venta generada por prueba automatizada",

        detalles: [
          {
            productoId:
              producto.id,

            cantidad: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const venta =
      response.body.data.venta;

    ventaCreadaId =
      venta.id;

    expect(venta.estado).toBe(
      "PENDIENTE_PAGO",
    );

    expect(venta.clienteId).toBe(
      cliente.id,
    );

    expect(
      venta.detalles,
    ).toHaveLength(1);

    expect(
      venta.detalles[0].productoId,
    ).toBe(producto.id);

    expect(
      venta.detalles[0].cantidad,
    ).toBe(1);

    /*
     * Comprobación clave del flujo Webpay:
     * crear la venta NO debe descontar stock.
     */
    const productoDespues =
      await prisma.producto.findUnique({
        where: {
          id:
            producto.id,
        },

        select: {
          stock: true,
        },
      });

    expect(
      productoDespues.stock,
    ).toBe(stockInicial);
  });

  test("debe anular una venta pendiente sin modificar el stock de Productos", async () => {
    expect(
      ventaCreadaId,
    ).toBeDefined();

    const response = await request(app)
      .patch(
        `/ventas/${ventaCreadaId}/anular`,
      )
      .set(
        "Authorization",
        `Bearer ${token}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(
      response.body.data.venta.estado,
    ).toBe("ANULADA");

    /*
     * Como nunca existió un pago aprobado,
     * tampoco existió SALIDA de Productos.
     *
     * Por eso anular la venta no debe sumar
     * ni restar unidades.
     */
    const productoDespues =
      await prisma.producto.findUnique({
        where: {
          id:
            producto.id,
        },

        select: {
          stock: true,
        },
      });

    expect(
      productoDespues.stock,
    ).toBe(stockInicial);

    const movimientos =
      await prisma.movimientoInventario.findMany({
        where: {
          ventaId:
            ventaCreadaId,
        },
      });

    expect(
      movimientos,
    ).toHaveLength(0);
  });
});