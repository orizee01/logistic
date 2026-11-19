const SELECT_DELIVERY = `
  SELECT d.*,
         r.name  AS rider_name,
         r.phone AS rider_phone,
         c.name  AS customer_name,
         c.email AS customer_email
  FROM deliveries d
  JOIN customers c ON c.id = d.customer_id
  LEFT JOIN riders r ON r.id = d.rider_id
`;

export const deliveryQueries = {
  insert: `
    INSERT INTO deliveries (
      tracking_code, customer_id, pickup_address, delivery_address,
      recipient_name, recipient_phone, package_description, package_weight_kg, notes
    )
    VALUES (
      $<trackingCode>, $<customerId>, $<pickupAddress>, $<deliveryAddress>,
      $<recipientName>, $<recipientPhone>, $<packageDescription>, $<packageWeightKg>, $<notes>
    )
    RETURNING id
  `,

  insertHistory: `
    INSERT INTO delivery_status_history (delivery_id, from_status, to_status, changed_by_type, changed_by_id, note)
    VALUES ($<deliveryId>, $<fromStatus>, $<toStatus>, $<changedByType>, $<changedById>, $<note>)
  `,

  // customer_id comes from the verified JWT, so customers only ever see their own deliveries.
  listForCustomer: `
    ${SELECT_DELIVERY}
    WHERE d.customer_id = $<customerId>
    ORDER BY d.created_at DESC
    LIMIT $<limit> OFFSET $<offset>
  `,

  findByIdForCustomer: `
    ${SELECT_DELIVERY}
    WHERE d.id = $<id> AND d.customer_id = $<customerId>
  `,

  summaryForCustomer: `
    SELECT status, COUNT(*)::int AS count
    FROM deliveries
    WHERE customer_id = $<customerId>
    GROUP BY status
  `,

  // Public tracking: deliberately selects no addresses, names, phone numbers or notes.
  findPublicByTrackingCode: `
    SELECT id, tracking_code, status, created_at, assigned_at, picked_up_at, delivered_at, updated_at
    FROM deliveries
    WHERE tracking_code = $<trackingCode>
  `,

  listForRider: `
    ${SELECT_DELIVERY}
    WHERE d.rider_id = $<riderId>
      AND ($<status> IS NULL OR d.status = $<status>)
    ORDER BY d.updated_at DESC
    LIMIT $<limit> OFFSET $<offset>
  `,

  listAll: `
    ${SELECT_DELIVERY}
    WHERE ($<status> IS NULL OR d.status = $<status>)
    ORDER BY d.created_at DESC
    LIMIT $<limit> OFFSET $<offset>
  `,

  findById: `
    ${SELECT_DELIVERY}
    WHERE d.id = $<id>
  `,

  lockById: `SELECT * FROM deliveries WHERE id = $<id> FOR UPDATE`,

  history: `
    SELECT from_status, to_status, changed_by_type, note, created_at
    FROM delivery_status_history
    WHERE delivery_id = $<deliveryId>
    ORDER BY created_at ASC
  `,

  cancel: `
    UPDATE deliveries
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $<id>
  `,

  assignRider: `
    UPDATE deliveries
    SET rider_id = $<riderId>, status = 'assigned', assigned_at = NOW(), updated_at = NOW()
    WHERE id = $<id>
  `,

  updateStatus: `
    UPDATE deliveries
    SET status       = $<status>,
        updated_at   = NOW(),
        picked_up_at = CASE WHEN $<status> = 'picked_up' THEN NOW() ELSE picked_up_at END,
        delivered_at = CASE WHEN $<status> = 'delivered' THEN NOW() ELSE delivered_at END
    WHERE id = $<id>
  `,
};
