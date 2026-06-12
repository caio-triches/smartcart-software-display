<?php

require_once __DIR__ . '/../core/Connection.php';

class CartRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Connection::get();
    }

    public function getActiveSession(string $deviceId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, device_id, status, total, created_at, updated_at
            FROM cart_sessions
            WHERE device_id = ? AND status = "active"
            ORDER BY id DESC
            LIMIT 1
        ');
        $stmt->execute([$deviceId]);
        $session = $stmt->fetch();

        return $session ? $this->mapSession($session) : null;
    }

    public function allSessions(): array
    {
        $stmt = $this->db->query('
            SELECT id, device_id, status, total, created_at, updated_at
            FROM cart_sessions
            ORDER BY created_at DESC, id DESC
        ');

        return array_map([$this, 'mapSession'], $stmt->fetchAll());
    }

    public function createSession(string $deviceId): array
    {
        $stmt = $this->db->prepare('INSERT INTO cart_sessions (device_id) VALUES (?)');
        $stmt->execute([$deviceId]);

        return $this->findSession((int) $this->db->lastInsertId());
    }

    public function findSession(int $sessionId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, device_id, status, total, created_at, updated_at
            FROM cart_sessions
            WHERE id = ?
            LIMIT 1
        ');
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch();

        return $session ? $this->mapSession($session) : null;
    }

    public function getItems(int $sessionId): array
    {
        $stmt = $this->db->prepare('
            SELECT
                ci.id,
                ci.session_id,
                ci.product_id,
                ci.quantity,
                ci.unit_price,
                ci.subtotal,
                ci.source,
                p.name,
                p.category,
                p.unit,
                p.sold_by_weight,
                p.color,
                p.accent,
                p.icon
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.session_id = ?
            ORDER BY ci.id ASC
        ');
        $stmt->execute([$sessionId]);

        return array_map([$this, 'mapItem'], $stmt->fetchAll());
    }

    public function addItem(int $sessionId, array $product, float $quantity, string $source): array
    {
        $subtotal = round($product['price'] * $quantity, 2);

        $stmt = $this->db->prepare('
            INSERT INTO cart_items (session_id, product_id, quantity, unit_price, subtotal, source)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$sessionId, $product['id'], $quantity, $product['price'], $subtotal, $source]);
        $this->refreshTotal($sessionId);

        return $this->getCart($sessionId);
    }

    public function removeItem(int $sessionId, int $itemId): bool
    {
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE session_id = ? AND id = ?');
        $stmt->execute([$sessionId, $itemId]);
        $removed = $stmt->rowCount() > 0;

        if ($removed) {
            $this->refreshTotal($sessionId);
        }

        return $removed;
    }

    public function clear(int $sessionId): void
    {
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE session_id = ?');
        $stmt->execute([$sessionId]);
        $this->refreshTotal($sessionId);
    }

    public function markPaid(int $sessionId): void
    {
        $stmt = $this->db->prepare('UPDATE cart_sessions SET status = "paid", updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$sessionId]);
    }

    public function getCart(int $sessionId): array
    {
        $session = $this->findSession($sessionId);
        $items = $this->getItems($sessionId);

        return [
            'session' => $session,
            'items' => $items,
            'totals' => [
                'items' => array_reduce($items, fn($acc, $item) => $acc + ($item['soldByWeight'] ? 1 : $item['quantity']), 0),
                'total' => array_reduce($items, fn($acc, $item) => $acc + $item['subtotal'], 0.0),
            ],
        ];
    }

    private function refreshTotal(int $sessionId): void
    {
        $stmt = $this->db->prepare('SELECT COALESCE(SUM(subtotal), 0) FROM cart_items WHERE session_id = ?');
        $stmt->execute([$sessionId]);
        $total = (float) $stmt->fetchColumn();

        $update = $this->db->prepare('UPDATE cart_sessions SET total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $update->execute([$total, $sessionId]);
    }

    private function mapSession(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'deviceId' => $row['device_id'],
            'status' => $row['status'],
            'total' => (float) $row['total'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }

    private function mapItem(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'sessionId' => (int) $row['session_id'],
            'productId' => (int) $row['product_id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'price' => (float) $row['unit_price'],
            'quantity' => (float) $row['quantity'],
            'subtotal' => (float) $row['subtotal'],
            'unit' => $row['unit'],
            'soldByWeight' => (bool) $row['sold_by_weight'],
            'source' => $row['source'],
            'color' => $row['color'],
            'accent' => $row['accent'],
            'icon' => $row['icon'],
        ];
    }
}
