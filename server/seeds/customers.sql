-- Seeds customer profiles only. password_hash is NULL, so these customers must
-- activate their account (set their own password) before they can log in.
INSERT INTO customers (name, email, phone, password_hash)
VALUES
    ('Ada Okafor', 'ada@example.com', '+2348010000001', NULL),
    ('John Bello', 'john@example.com', '+2348010000002', NULL),
    ('SwiftDrop Customer', 'gifttee2004@gmail.com', NULL, NULL)
ON CONFLICT (email) DO NOTHING;
