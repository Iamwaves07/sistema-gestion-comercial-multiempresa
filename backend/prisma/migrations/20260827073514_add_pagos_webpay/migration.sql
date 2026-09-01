-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO');

-- AlterEnum
ALTER TYPE "EstadoVenta" ADD VALUE 'PENDIENTE_PAGO';

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor" TEXT NOT NULL DEFAULT 'TRANSBANK_WEBPAY_PLUS',
    "buyOrder" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "token" TEXT,
    "codigoAutorizacion" TEXT,
    "codigoRespuesta" INTEGER,
    "tipoPago" TEXT,
    "numeroCuotas" INTEGER,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaResolucion" TIMESTAMP(3),
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pago_buyOrder_key" ON "Pago"("buyOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_token_key" ON "Pago"("token");

-- CreateIndex
CREATE INDEX "Pago_empresaId_fechaCreacion_idx" ON "Pago"("empresaId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "Pago_ventaId_idx" ON "Pago"("ventaId");

-- CreateIndex
CREATE INDEX "Pago_usuarioId_idx" ON "Pago"("usuarioId");

-- CreateIndex
CREATE INDEX "Pago_estado_idx" ON "Pago"("estado");

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
