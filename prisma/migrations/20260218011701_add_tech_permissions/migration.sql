-- CreateTable
CREATE TABLE "tbmtechpermissions" (
    "id" SERIAL NOT NULL,
    "tech_name" TEXT NOT NULL,
    "tech_email" TEXT NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "tbmtechpermissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbmtechpermissions_tech_email_permission_id_key" ON "tbmtechpermissions"("tech_email", "permission_id");

-- AddForeignKey
ALTER TABLE "tbmtechpermissions" ADD CONSTRAINT "tbmtechpermissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "tbmpermissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
