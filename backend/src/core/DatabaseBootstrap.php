<?php

class DatabaseBootstrap
{
    public static function run(PDO $db): void
    {
        $schema = file_get_contents(__DIR__ . '/../../database/schema.sql');
        foreach (array_filter(array_map('trim', explode(';', $schema))) as $statement) {
            $db->exec($statement);
        }

        self::seedProductsIfEmpty($db);
        self::seedDemoHistoryIfEmpty($db);
    }

    private static function seedProductsIfEmpty(PDO $db): void
    {
        $count = (int) $db->query('SELECT COUNT(*) FROM products')->fetchColumn();
        if ($count > 0) return;

        $stmt = $db->prepare('
            INSERT INTO products (name, category, price, unit, sold_by_weight, color, accent, icon)
            VALUES (:name, :category, :price, :unit, :sold_by_weight, :color, :accent, :icon)
        ');

        foreach (self::seedProducts() as $product) {
            $stmt->execute($product);
        }
    }

    private static function seedDemoHistoryIfEmpty(PDO $db): void
    {
        $sessionCount = (int) $db->query('SELECT COUNT(*) FROM cart_sessions')->fetchColumn();
        if ($sessionCount > 0) return;

        $products = self::productsByName($db);

        self::createDemoPaidCart($db, 'SC-01', 'pix', 'SC-DEMO-PIX-001', [
            ['name' => 'Leite Integral', 'quantity' => 2.0, 'source' => 'sensor'],
            ['name' => 'Pao de Forma', 'quantity' => 1.0, 'source' => 'sensor'],
            ['name' => 'Maca Gala', 'quantity' => 0.85, 'source' => 'scale'],
        ], $products);

        self::createDemoPaidCart($db, 'SC-02', 'card', 'SC-DEMO-CARD-002', [
            ['name' => 'Arroz Branco 5kg', 'quantity' => 1.0, 'source' => 'sensor'],
            ['name' => 'Cafe Torrado', 'quantity' => 1.0, 'source' => 'sensor'],
            ['name' => 'Banana Prata', 'quantity' => 1.24, 'source' => 'scale'],
            ['name' => 'Suco de Uva 1L', 'quantity' => 2.0, 'source' => 'sensor'],
        ], $products);

        self::createDemoActiveCart($db, 'SC-04', [
            ['name' => 'Queijo Mussarela', 'quantity' => 1.0, 'source' => 'sensor'],
            ['name' => 'Tomate Italiano', 'quantity' => 0.64, 'source' => 'scale'],
        ], $products);
    }

    private static function productsByName(PDO $db): array
    {
        $rows = $db->query('SELECT id, name, price FROM products')->fetchAll();
        $products = [];

        foreach ($rows as $row) {
            $products[$row['name']] = [
                'id' => (int) $row['id'],
                'price' => (float) $row['price'],
            ];
        }

        return $products;
    }

    private static function createDemoPaidCart(PDO $db, string $deviceId, string $method, string $transactionId, array $items, array $products): void
    {
        $sessionId = self::createSession($db, $deviceId, 'active');
        $total = self::insertCartItems($db, $sessionId, $items, $products);

        $orderStmt = $db->prepare('
            INSERT INTO orders (session_id, device_id, payment_method, transaction_id, status, total)
            VALUES (?, ?, ?, ?, "paid", ?)
        ');
        $orderStmt->execute([$sessionId, $deviceId, $method, $transactionId, $total]);
        $orderId = (int) $db->lastInsertId();

        $orderItemStmt = $db->prepare('
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?)
        ');

        foreach ($items as $item) {
            $product = $products[$item['name']];
            $subtotal = round($product['price'] * (float) $item['quantity'], 2);
            $orderItemStmt->execute([$orderId, $product['id'], $item['quantity'], $product['price'], $subtotal]);
        }

        $paidSession = $db->prepare('UPDATE cart_sessions SET status = "paid", total = ? WHERE id = ?');
        $paidSession->execute([$total, $sessionId]);
    }

    private static function createDemoActiveCart(PDO $db, string $deviceId, array $items, array $products): void
    {
        $sessionId = self::createSession($db, $deviceId, 'active');
        $total = self::insertCartItems($db, $sessionId, $items, $products);

        $stmt = $db->prepare('UPDATE cart_sessions SET total = ? WHERE id = ?');
        $stmt->execute([$total, $sessionId]);
    }

    private static function createSession(PDO $db, string $deviceId, string $status): int
    {
        $stmt = $db->prepare('INSERT INTO cart_sessions (device_id, status) VALUES (?, ?)');
        $stmt->execute([$deviceId, $status]);
        return (int) $db->lastInsertId();
    }

    private static function insertCartItems(PDO $db, int $sessionId, array $items, array $products): float
    {
        $stmt = $db->prepare('
            INSERT INTO cart_items (session_id, product_id, quantity, unit_price, subtotal, source)
            VALUES (?, ?, ?, ?, ?, ?)
        ');

        $total = 0.0;
        foreach ($items as $item) {
            if (!isset($products[$item['name']])) continue;

            $product = $products[$item['name']];
            $quantity = (float) $item['quantity'];
            $subtotal = round($product['price'] * $quantity, 2);
            $total += $subtotal;

            $stmt->execute([$sessionId, $product['id'], $quantity, $product['price'], $subtotal, $item['source']]);
        }

        return round($total, 2);
    }

    private static function seedProducts(): array
    {
        return [
            ['name' => 'Leite Integral', 'category' => 'Laticinios', 'price' => 6.49, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#eff8ff', 'accent' => '#5d9cec', 'icon' => 'Milk'],
            ['name' => 'Pao de Forma', 'category' => 'Padaria', 'price' => 9.90, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#fff5dd', 'accent' => '#d59632', 'icon' => 'Croissant'],
            ['name' => 'Cafe Torrado', 'category' => 'Mercearia', 'price' => 18.75, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#f2ebe5', 'accent' => '#7b4f35', 'icon' => 'Coffee'],
            ['name' => 'Arroz Branco 5kg', 'category' => 'Mercearia', 'price' => 24.90, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#f4f6f0', 'accent' => '#71816d', 'icon' => 'Wheat'],
            ['name' => 'Suco de Uva 1L', 'category' => 'Bebidas', 'price' => 12.49, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#f4edff', 'accent' => '#7b55c7', 'icon' => 'CupSoda'],
            ['name' => 'Queijo Mussarela', 'category' => 'Laticinios', 'price' => 18.90, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#fff8d8', 'accent' => '#d7a800', 'icon' => 'PackagePlus'],
            ['name' => 'Ovos Brancos 12un', 'category' => 'Mercearia', 'price' => 15.90, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#fff7ef', 'accent' => '#b7753b', 'icon' => 'Popcorn'],
            ['name' => 'Agua Mineral 1,5L', 'category' => 'Bebidas', 'price' => 3.49, 'unit' => 'un', 'sold_by_weight' => 0, 'color' => '#e8fbff', 'accent' => '#2492b3', 'icon' => 'CupSoda'],
            ['name' => 'Maca Gala', 'category' => 'Hortifruti', 'price' => 7.99, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#ffecec', 'accent' => '#d94a4a', 'icon' => 'Apple'],
            ['name' => 'Banana Prata', 'category' => 'Hortifruti', 'price' => 5.99, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#fff7d6', 'accent' => '#c5a01e', 'icon' => 'Banana'],
            ['name' => 'Tomate Italiano', 'category' => 'Hortifruti', 'price' => 8.49, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#ffe8e6', 'accent' => '#d13d31', 'icon' => 'Apple'],
            ['name' => 'Uva Vitoria', 'category' => 'Hortifruti', 'price' => 15.99, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#f3e8ff', 'accent' => '#7b55c7', 'icon' => 'Grape'],
            ['name' => 'Laranja Pera', 'category' => 'Hortifruti', 'price' => 4.99, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#fff0dc', 'accent' => '#dc7d23', 'icon' => 'Apple'],
            ['name' => 'Abacate', 'category' => 'Hortifruti', 'price' => 9.99, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#eef9e8', 'accent' => '#5c9635', 'icon' => 'Apple'],
            ['name' => 'Cenoura', 'category' => 'Hortifruti', 'price' => 5.49, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#fff0df', 'accent' => '#d66c1e', 'icon' => 'Carrot'],
            ['name' => 'Batata Inglesa', 'category' => 'Hortifruti', 'price' => 4.79, 'unit' => 'kg', 'sold_by_weight' => 1, 'color' => '#f8f1e6', 'accent' => '#92723a', 'icon' => 'Wheat'],
        ];
    }
}
