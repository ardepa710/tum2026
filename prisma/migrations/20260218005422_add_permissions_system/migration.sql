/*
  Warnings:

  - You are about to drop the column `permissions` on the `tbmtasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tbmtasks" DROP COLUMN "permissions";

-- CreateTable
CREATE TABLE "tbmpermissions" (
    "id" SERIAL NOT NULL,
    "permission_code" TEXT NOT NULL,
    "permission_description" TEXT,
    "permission_enabled" BOOLEAN NOT NULL DEFAULT true,
    "registered_by" TEXT NOT NULL,
    "registered_dttm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmpermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmtask_permissions" (
    "task_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "tbmtask_permissions_pkey" PRIMARY KEY ("task_id","permission_id")
);

-- CreateTable
CREATE TABLE "tbmuser_permissions" (
    "user_id" TEXT NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmuser_permissions_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbmpermissions_permission_code_key" ON "tbmpermissions"("permission_code");

-- AddForeignKey
ALTER TABLE "tbmtask_permissions" ADD CONSTRAINT "tbmtask_permissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tbmtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmtask_permissions" ADD CONSTRAINT "tbmtask_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "tbmpermissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmuser_permissions" ADD CONSTRAINT "tbmuser_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmuser_permissions" ADD CONSTRAINT "tbmuser_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "tbmpermissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
