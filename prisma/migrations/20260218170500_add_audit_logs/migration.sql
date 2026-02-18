-- CreateTable
CREATE TABLE "tbmlog_events" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,

    CONSTRAINT "tbmlog_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbmlog_events_actor_idx" ON "tbmlog_events"("actor");

-- CreateIndex
CREATE INDEX "tbmlog_events_entity_idx" ON "tbmlog_events"("entity");

-- CreateIndex
CREATE INDEX "tbmlog_events_timestamp_idx" ON "tbmlog_events"("timestamp");
