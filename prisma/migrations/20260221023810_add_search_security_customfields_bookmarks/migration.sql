-- CreateTable
CREATE TABLE "tbmsearch_history" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "result_type" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "clicked_label" TEXT NOT NULL,
    "searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmsearch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmsecurity_snapshots" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "checks_json" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmsecurity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmcustom_fields" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "options" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmcustom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmcustom_field_values" (
    "id" SERIAL NOT NULL,
    "field_id" INTEGER NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbmcustom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbmbookmarks" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbmbookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbmsearch_history_user_id_searched_at_idx" ON "tbmsearch_history"("user_id", "searched_at");

-- CreateIndex
CREATE INDEX "tbmsecurity_snapshots_tenant_id_captured_at_idx" ON "tbmsecurity_snapshots"("tenant_id", "captured_at");

-- CreateIndex
CREATE INDEX "tbmcustom_field_values_entity_type_entity_id_idx" ON "tbmcustom_field_values"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbmcustom_field_values_field_id_entity_type_entity_id_key" ON "tbmcustom_field_values"("field_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "tbmbookmarks_user_id_idx" ON "tbmbookmarks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tbmbookmarks_user_id_entity_type_entity_id_key" ON "tbmbookmarks"("user_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "tbmsearch_history" ADD CONSTRAINT "tbmsearch_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmsecurity_snapshots" ADD CONSTRAINT "tbmsecurity_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmcustom_field_values" ADD CONSTRAINT "tbmcustom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "tbmcustom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbmbookmarks" ADD CONSTRAINT "tbmbookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
