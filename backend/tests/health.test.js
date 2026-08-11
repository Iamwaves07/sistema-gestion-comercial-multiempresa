import { describe, test, expect } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

describe("GET /health", () => {
  test("debe responder que la API funciona correctamente", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "API funcionando correctamente",
    });
  });
});