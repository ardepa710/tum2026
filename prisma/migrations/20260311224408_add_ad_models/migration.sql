-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "ad_agent_id" TEXT,
ADD COLUMN     "ad_last_sync_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tbmusers_ad" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "sam_account_name" TEXT NOT NULL,
    "object_guid" TEXT,
    "display_name" TEXT NOT NULL,
    "mail" TEXT,
    "upn" TEXT NOT NULL,
    "account_enabled" BOOLEAN NOT NULL DEFAULT true,
    "locked_out" BOOLEAN NOT NULL DEFAULT false,
    "job_title" TEXT,
    "department" TEXT,
    "last_logon_date" TIMESTAMP(3),
    "password_last_set" TIMESTAMP(3),
    "password_expired" BOOLEAN NOT NULL DEFAULT false,
    "created_in_ad" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmusers_ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmgroups_ad" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "sam_account_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "group_category" TEXT NOT NULL DEFAULT 'Security',
    "group_scope" TEXT NOT NULL DEFAULT 'Global',
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmgroups_ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmgroup_members_ad" (
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "tbmgroup_members_ad_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateIndex
CREATE INDEX "tbmusers_ad_tenant_id_idx" ON "tbmusers_ad"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbmusers_ad_tenant_id_sam_account_name_key" ON "tbmusers_ad"("tenant_id", "sam_account_name");

-- CreateIndex
CREATE INDEX "tbmgroups_ad_tenant_id_idx" ON "tbmgroups_ad"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbmgroups_ad_tenant_id_sam_account_name_key" ON "tbmgroups_ad"("tenant_id", "sam_account_name");

-- AddForeignKey
ALTER TABLE "tbmusers_ad" ADD CONSTRAINT "tbmusers_ad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmgroups_ad" ADD CONSTRAINT "tbmgroups_ad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmgroup_members_ad" ADD CONSTRAINT "tbmgroup_members_ad_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "tbmgroups_ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmgroup_members_ad" ADD CONSTRAINT "tbmgroup_members_ad_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbmusers_ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
