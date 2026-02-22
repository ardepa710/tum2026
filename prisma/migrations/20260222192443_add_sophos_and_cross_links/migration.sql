-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "sophos_api_host" TEXT,
ADD COLUMN     "sophos_org_id" TEXT,
ADD COLUMN     "sophos_region" TEXT;

-- CreateTable
CREATE TABLE "device_cross_links" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "ninja_device_id" INTEGER NOT NULL,
    "ninja_device_name" TEXT NOT NULL,
    "sophos_endpoint_id" TEXT NOT NULL,
    "sophos_endpoint_name" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_by" TEXT NOT NULL,

    CONSTRAINT "device_cross_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_cross_links_tenantId_ninja_device_id_key" ON "device_cross_links"("tenantId", "ninja_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_cross_links_tenantId_sophos_endpoint_id_key" ON "device_cross_links"("tenantId", "sophos_endpoint_id");

-- AddForeignKey
ALTER TABLE "device_cross_links" ADD CONSTRAINT "device_cross_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
