-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA');

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleCotizacion" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DetalleCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cotizacion_empresaId_fechaCreacion_idx" ON "Cotizacion"("empresaId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "Cotizacion_clienteId_idx" ON "Cotizacion"("clienteId");

-- CreateIndex
CREATE INDEX "Cotizacion_usuarioId_idx" ON "Cotizacion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cotizacion_empresaId_numero_key" ON "Cotizacion"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "DetalleCotizacion_cotizacionId_idx" ON "DetalleCotizacion"("cotizacionId");

-- CreateIndex
CREATE INDEX "DetalleCotizacion_productoId_idx" ON "DetalleCotizacion"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleCotizacion_cotizacionId_productoId_key" ON "DetalleCotizacion"("cotizacionId", "productoId");

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCotizacion" ADD CONSTRAINT "DetalleCotizacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleCotizacion" ADD CONSTRAINT "DetalleCotizacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
