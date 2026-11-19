-- Riders also start without a password and activate the same way customers do.
INSERT INTO riders (name, email, phone, password_hash)
VALUES
    ('Mesa Ibrahim', 'musa.rider@example.com', '+2348020000001', NULL),
    ('Chioma Eze', 'chioma.rider@example.com', '+2348020000002', NULL)
ON CONFLICT (email) DO NOTHING;
