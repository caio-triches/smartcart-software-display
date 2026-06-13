DELETE oi FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
WHERE o.transaction_id LIKE 'SC-DEMO-%';

DELETE ci FROM cart_items ci
INNER JOIN cart_sessions cs ON cs.id = ci.session_id
LEFT JOIN orders o ON o.session_id = cs.id
WHERE o.transaction_id LIKE 'SC-DEMO-%'
   OR cs.device_id IN ('SC-01', 'SC-02', 'SC-04');

DELETE FROM orders
WHERE transaction_id LIKE 'SC-DEMO-%';

DELETE FROM cart_sessions
WHERE device_id IN ('SC-01', 'SC-02', 'SC-04');
