import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

const requiredVariables = [
  "SEED_EMPRESA_NOMBRE",
  "SEED_EMPRESA_RUT",
  "SEED_EMPRESA_CORREO",
  "SEED_ADMIN_NOMBRE",
  "SEED_ADMIN_CORREO",
  "SEED_ADMIN_PASSWORD",
  "SEED_SUPERADMIN_NOMBRE",
  "SEED_SUPERADMIN_CORREO",
  "SEED_SUPERADMIN_PASSWORD",
];

function validateEnvironmentVariables() {
  for (const variable of requiredVariables) {
    if (!process.env[variable]) {
      throw new Error(`La variable ${variable} no está configurada`);
    }
  }
}

async function main() {
  validateEnvironmentVariables();

  const administradorPasswordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD,
    12
  );

  const superAdministradorPasswordHash = await bcrypt.hash(
    process.env.SEED_SUPERADMIN_PASSWORD,
    12
  );

  const empresa = await prisma.empresa.upsert({
    where: {
      rut: process.env.SEED_EMPRESA_RUT,
    },
    update: {
      nombre: process.env.SEED_EMPRESA_NOMBRE,
      correo: process.env.SEED_EMPRESA_CORREO,
      estado: true,
    },
    create: {
      nombre: process.env.SEED_EMPRESA_NOMBRE,
      rut: process.env.SEED_EMPRESA_RUT,
      correo: process.env.SEED_EMPRESA_CORREO,
      estado: true,
    },
  });

  const rolSuperAdministrador = await prisma.rol.upsert({
    where: {
      nombre: "SuperAdministrador",
    },
    update: {
      descripcion: "Acceso global a la administración del sistema",
      estado: true,
    },
    create: {
      nombre: "SuperAdministrador",
      descripcion: "Acceso global a la administración del sistema",
      estado: true,
    },
  });

  const rolAdministrador = await prisma.rol.upsert({
    where: {
      nombre: "Administrador",
    },
    update: {
      descripcion: "Acceso completo a la gestión de la empresa",
      estado: true,
    },
    create: {
      nombre: "Administrador",
      descripcion: "Acceso completo a la gestión de la empresa",
      estado: true,
    },
  });

  await prisma.rol.upsert({
    where: {
      nombre: "Vendedor",
    },
    update: {
      descripcion: "Acceso a funciones comerciales e inventario autorizado",
      estado: true,
    },
    create: {
      nombre: "Vendedor",
      descripcion: "Acceso a funciones comerciales e inventario autorizado",
      estado: true,
    },
  });

  const administrador = await prisma.usuario.upsert({
    where: {
      correo: process.env.SEED_ADMIN_CORREO,
    },
    update: {
      empresaId: empresa.id,
      rolId: rolAdministrador.id,
      nombre: process.env.SEED_ADMIN_NOMBRE,
      password: administradorPasswordHash,
      estado: true,
    },
    create: {
      empresaId: empresa.id,
      rolId: rolAdministrador.id,
      nombre: process.env.SEED_ADMIN_NOMBRE,
      correo: process.env.SEED_ADMIN_CORREO,
      password: administradorPasswordHash,
      estado: true,
    },
  });

  const superAdministrador = await prisma.usuario.upsert({
    where: {
      correo: process.env.SEED_SUPERADMIN_CORREO,
    },
    update: {
      empresaId: empresa.id,
      rolId: rolSuperAdministrador.id,
      nombre: process.env.SEED_SUPERADMIN_NOMBRE,
      password: superAdministradorPasswordHash,
      estado: true,
    },
    create: {
      empresaId: empresa.id,
      rolId: rolSuperAdministrador.id,
      nombre: process.env.SEED_SUPERADMIN_NOMBRE,
      correo: process.env.SEED_SUPERADMIN_CORREO,
      password: superAdministradorPasswordHash,
      estado: true,
    },
  });

  console.log("Datos iniciales creados correctamente:");
  console.log(`Empresa: ${empresa.nombre}`);
  console.log(`Administrador: ${administrador.correo}`);
  console.log(`SuperAdministrador: ${superAdministrador.correo}`);
  console.log(
    "Roles: SuperAdministrador, Administrador y Vendedor"
  );
}

main()
  .catch((error) => {
    console.error("Error al crear los datos iniciales:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });