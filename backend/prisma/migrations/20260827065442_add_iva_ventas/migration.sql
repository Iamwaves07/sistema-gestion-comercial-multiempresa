-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN     "subtotalNeto" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "montoIva" DECIMAL(12,2),
ADD COLUMN     "subtotalNeto" DECIMAL(12,2),
ADD COLUMN     "tasaIva" DECIMAL(5,2) NOT NULL DEFAULT 19.00;
