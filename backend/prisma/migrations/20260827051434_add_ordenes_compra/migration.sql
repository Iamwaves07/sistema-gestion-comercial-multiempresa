-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'EMITIDA', 'RECIBIDA', 'ANULADA');

-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN     "ordenCompraId" INTEGER;

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "observacion" TEXT,
    "subtotalNeto" DECIMAL(12,2) NOT NULL,
    "tasaIva" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "montoIva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEmision" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleOrdenCompra" (
    "id" SERIAL NOT NULL,
    "ordenCompraId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioNeto" DECIMAL(12,2) NOT NULL,
    "subtotalNeto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrdenCompra_empresaId_fechaCreacion_idx" ON "OrdenCompra"("empresaId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "OrdenCompra_usuarioId_idx" ON "OrdenCompra"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_empresaId_numero_key" ON "OrdenCompra"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_ordenCompraId_idx" ON "DetalleOrdenCompra"("ordenCompraId");

-- CreateIndex
CREATE INDEX "DetalleOrdenCompra_productoId_idx" ON "DetalleOrdenCompra"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "DetalleOrdenCompra_ordenCompraId_productoId_key" ON "DetalleOrdenCompra"("ordenCompraId", "productoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_ordenCompraId_idx" ON "MovimientoInventario"("ordenCompraId");

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
