/*
  Warnings:

  - You are about to drop the `Tenant` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `tenantId` on the `AutomationTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "AutomationTask" DROP CONSTRAINT "AutomationTask_tenantId_fkey";

-- AlterTable
ALTER TABLE "AutomationTask" DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Tenant";

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "tenant_abbrv" TEXT NOT NULL,
    "tenantid_rewst" TEXT NOT NULL,
    "tenantid_msft" TEXT NOT NULL,
    "reg_dttm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reg_user" TEXT NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationTask_tenantId_idx" ON "AutomationTask"("tenantId");

-- AddForeignKey
ALTER TABLE "AutomationTask" ADD CONSTRAINT "AutomationTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
