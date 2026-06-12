<?php

require_once __DIR__ . '/../core/Connection.php';

class ProductRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Connection::get();
    }

    public function all(): array
    {
        $stmt = $this->db->query('
            SELECT id, name, category, price, unit, sold_by_weight, color, accent, icon
            FROM products
            WHERE active = 1
            ORDER BY sold_by_weight ASC, category ASC, name ASC
        ');

        return array_map([$this, 'mapProduct'], $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, name, category, price, unit, sold_by_weight, color, accent, icon
            FROM products
            WHERE id = ? AND active = 1
            LIMIT 1
        ');
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        return $product ? $this->mapProduct($product) : null;
    }

    public function random(): ?array
    {
        $stmt = $this->db->query("
            SELECT id, name, category, price, unit, sold_by_weight, color, accent, icon
            FROM products
            WHERE active = 1
            ORDER BY RAND()
            LIMIT 1
        ");
        $product = $stmt->fetch();

        return $product ? $this->mapProduct($product) : null;
    }

    private function mapProduct(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'price' => (float) $row['price'],
            'unit' => $row['unit'],
            'soldByWeight' => (bool) $row['sold_by_weight'],
            'color' => $row['color'],
            'accent' => $row['accent'],
            'icon' => $row['icon'],
        ];
    }
}
