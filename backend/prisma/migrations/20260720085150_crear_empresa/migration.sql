-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_rut_key" ON "Empresa"("rut");
