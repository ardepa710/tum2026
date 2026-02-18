-- CreateTable
CREATE TABLE "tbmtechnicians" (
    "id" SERIAL NOT NULL,
    "msft_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "job_title" TEXT,
    "account_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmtechnicians_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbmtechnicians_msft_id_key" ON "tbmtechnicians"("msft_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbmtechnicians_email_key" ON "tbmtechnicians"("email");
