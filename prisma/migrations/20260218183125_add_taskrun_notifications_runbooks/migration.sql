-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "tbmtask_runs" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "target_user" TEXT,
    "actor" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "ticket_number" TEXT,
    "output" TEXT,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tbmtask_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmnotifications" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmnotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmnotification_prefs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "on_task_run" BOOLEAN NOT NULL DEFAULT true,
    "on_task_fail" BOOLEAN NOT NULL DEFAULT true,
    "on_tech_sync" BOOLEAN NOT NULL DEFAULT true,
    "on_new_tenant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tbmnotification_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmrunbooks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "task_id" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbmrunbooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbmtask_runs_actor_idx" ON "tbmtask_runs"("actor");

-- CreateIndex
CREATE INDEX "tbmtask_runs_status_idx" ON "tbmtask_runs"("status");

-- CreateIndex
CREATE INDEX "tbmtask_runs_started_at_idx" ON "tbmtask_runs"("started_at");

-- CreateIndex
CREATE INDEX "tbmnotifications_user_id_is_read_idx" ON "tbmnotifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "tbmnotifications_created_at_idx" ON "tbmnotifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbmnotification_prefs_user_id_key" ON "tbmnotification_prefs"("user_id");

-- AddForeignKey
ALTER TABLE "tbmtask_runs" ADD CONSTRAINT "tbmtask_runs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tbmtasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmtask_runs" ADD CONSTRAINT "tbmtask_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmnotifications" ADD CONSTRAINT "tbmnotifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmnotification_prefs" ADD CONSTRAINT "tbmnotification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmrunbooks" ADD CONSTRAINT "tbmrunbooks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tbmtasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
