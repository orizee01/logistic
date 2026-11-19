-- gen_random_uuid() is built into PostgreSQL 13+.

CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL CHECK (email = lower(email)),
    phone         VARCHAR(30),
    password_hash TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins and dispatchers who assign riders.
CREATE TABLE staff_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL CHECK (email = lower(email)),
    password_hash TEXT,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dispatcher')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE riders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL CHECK (email = lower(email)),
    phone         VARCHAR(30) NOT NULL,
    password_hash TEXT,
    is_available  BOOLEAN NOT NULL DEFAULT TRUE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deliveries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code       VARCHAR(20) UNIQUE NOT NULL,
    customer_id         UUID NOT NULL REFERENCES customers(id),
    rider_id            UUID REFERENCES riders(id),
    pickup_address      TEXT NOT NULL,
    delivery_address    TEXT NOT NULL,
    recipient_name      VARCHAR(150) NOT NULL,
    recipient_phone     VARCHAR(30) NOT NULL,
    package_description TEXT NOT NULL,
    package_weight_kg   NUMERIC(8, 2) CHECK (package_weight_kg > 0),
    notes               TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    assigned_at         TIMESTAMPTZ,
    picked_up_at        TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_customer ON deliveries (customer_id, created_at DESC);
CREATE INDEX idx_deliveries_rider ON deliveries (rider_id, status);
CREATE INDEX idx_deliveries_status ON deliveries (status, created_at DESC);

CREATE TABLE delivery_status_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id     UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    changed_by_type VARCHAR(20) NOT NULL CHECK (changed_by_type IN ('customer', 'staff', 'rider', 'system')),
    changed_by_id   UUID,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_delivery ON delivery_status_history (delivery_id, created_at);

-- Single-use tokens that let seeded customers/riders set their own password.
-- Only a SHA-256 hash of the token is stored.
CREATE TABLE account_activation_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('customer', 'rider')),
    account_id   UUID NOT NULL,
    token_hash   TEXT UNIQUE NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activation_tokens_account ON account_activation_tokens (account_type, account_id);
