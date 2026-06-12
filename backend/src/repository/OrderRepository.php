<?php

require_once __DIR__ . '/../core/Connection.php';

class OrderRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Connection::get();
    }

    public function create(array $session, array $items, string $method, ?string $transactionId): array
    {
        $this->db->beginTransaction();

        try {
            $total = array_reduce($items, fn($acc, $item) => $acc + $item['subtotal'], 0.0);
            $stmt = $this->db->prepare('
                INSERT INTO orders (session_id, device_id, payment_method, transaction_id, status, total)
                VALUES (?, ?, ?, ?, "paid", ?)
            ');
            $stmt->execute([$session['id'], $session['deviceId'], $method, $transactionId, $total]);
            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare('
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            ');

            foreach ($items as $item) {
                $itemStmt->execute([$orderId, $item['productId'], $item['quantity'], $item['price'], $item['subtotal']]);
            }

            $paid = $this->db->prepare('UPDATE cart_sessions SET status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $paid->execute([$session['id']]);

            $this->db->commit();
            $order = $this->find($orderId);
            if (!$order) {
                throw new RuntimeException('Pedido criado, mas nao encontrado');
            }

            return $order;
        } catch (Throwable $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function all(): array
    {
        $stmt = $this->db->query('
            SELECT id, session_id, device_id, payment_method, transaction_id, status, total, created_at
            FROM orders
            ORDER BY created_at DESC, id DESC
        ');

        return array_map([$this, 'mapOrderSummary'], $stmt->fetchAll());
    }

    public function find(int $orderId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, session_id, device_id, payment_method, transaction_id, status, total, created_at
            FROM orders
            WHERE id = ?
        ');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }

        $items = $this->db->prepare('
            SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal, p.name, p.category, p.unit
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.id ASC
        ');
        $items->execute([$orderId]);

        return [
            'id' => (int) $order['id'],
            'sessionId' => (int) $order['session_id'],
            'deviceId' => $order['device_id'],
            'paymentMethod' => $order['payment_method'],
            'transactionId' => $order['transaction_id'],
            'status' => $order['status'],
            'total' => (float) $order['total'],
            'createdAt' => $order['created_at'],
            'items' => array_map(fn($item) => [
                'id' => (int) $item['id'],
                'productId' => (int) $item['product_id'],
                'name' => $item['name'],
                'category' => $item['category'],
                'quantity' => (float) $item['quantity'],
                'unit' => $item['unit'],
                'price' => (float) $item['unit_price'],
                'subtotal' => (float) $item['subtotal'],
            ], $items->fetchAll()),
        ];
    }

    private function mapOrderSummary(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'sessionId' => (int) $row['session_id'],
            'deviceId' => $row['device_id'],
            'paymentMethod' => $row['payment_method'],
            'transactionId' => $row['transaction_id'],
            'status' => $row['status'],
            'total' => (float) $row['total'],
            'createdAt' => $row['created_at'],
        ];
    }
}
