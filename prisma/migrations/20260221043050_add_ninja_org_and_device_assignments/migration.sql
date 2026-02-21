-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "ninja_org_id" INTEGER,
ADD COLUMN     "ninja_org_name" TEXT;

-- CreateTable
CREATE TABLE "device_assignments" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "ninja_device_id" INTEGER NOT NULL,
    "ninja_device_name" TEXT NOT NULL,
    "ad_user_upn" TEXT NOT NULL,
    "ad_user_name" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    CONSTRAINT "device_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_assignments_tenantId_ninja_device_id_key" ON "device_assignments"("tenantId", "ninja_device_id");

-- AddForeignKey
ALTER TABLE "device_assignments" ADD CONSTRAINT "device_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
