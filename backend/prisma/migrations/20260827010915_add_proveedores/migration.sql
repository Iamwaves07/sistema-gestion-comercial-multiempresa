-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "giro" TEXT,
    "correo" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proveedor_empresaId_idx" ON "Proveedor"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_empresaId_rut_key" ON "Proveedor"("empresaId", "rut");

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
