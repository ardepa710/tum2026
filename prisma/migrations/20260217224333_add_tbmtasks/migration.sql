-- CreateTable
CREATE TABLE "tbmtasks" (
    "id" SERIAL NOT NULL,
    "task_name" TEXT NOT NULL,
    "task_details" TEXT,
    "task_code" TEXT NOT NULL,
    "ticket_required" BOOLEAN NOT NULL DEFAULT false,
    "username_required" BOOLEAN NOT NULL DEFAULT false,
    "sync_required" BOOLEAN NOT NULL DEFAULT false,
    "rewst_webhook" TEXT,
    "tenant_exclusive" TEXT,
    "task_group" TEXT,
    "system_mgr" TEXT,
    "permissions" TEXT,

    CONSTRAINT "tbmtasks_pkey" PRIMARY KEY ("id")
);
