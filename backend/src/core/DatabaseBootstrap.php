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
