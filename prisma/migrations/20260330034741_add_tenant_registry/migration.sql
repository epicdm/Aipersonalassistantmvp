-- CreateTable: tenant_registry
-- Isola multi-tenant registry. One row per provisioned business.
-- containerPort is allocated via tenant_port_seq (atomic, no race condition).

CREATE TABLE "tenant_registry" (
    "tenantId"        TEXT        NOT NULL,
    "waPhoneNumberId" TEXT        NOT NULL,
    "containerPort"   INTEGER     NOT NULL,
    "tokenEncrypted"  TEXT        NOT NULL,
    "template"        TEXT        NOT NULL DEFAULT 'professional',
    "status"          TEXT        NOT NULL DEFAULT 'provisioning',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_registry_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_registry_waPhoneNumberId_key" ON "tenant_registry"("waPhoneNumberId");
CREATE UNIQUE INDEX "tenant_registry_containerPort_key"   ON "tenant_registry"("containerPort");

-- Hot lookup index: every inbound WA message looks up by phone_number_id
CREATE INDEX "idx_tenant_registry_wa_phone" ON "tenant_registry"("waPhoneNumberId");

-- Atomic port allocator: 3200–3299 = 100 tenant ceiling.
-- OCMT calls nextval('tenant_port_seq') when spinning up a container.
-- At 90 tenants, alert Eric to migrate to Traefik label-based routing.
-- NO CYCLE: exhaustion returns an error (caught in /api/provision) instead of wrapping.
CREATE SEQUENCE IF NOT EXISTS tenant_port_seq
    START WITH 3200
    INCREMENT BY 1
    MINVALUE 3200
    MAXVALUE 3299
    NO CYCLE;
