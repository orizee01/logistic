export const customerQueries = {
  findById: `
    SELECT id, name, email, phone, is_active, created_at
    FROM customers
    WHERE id = $<id>
  `,
};
