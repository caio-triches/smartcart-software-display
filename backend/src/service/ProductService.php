<?php

require_once __DIR__ . '/../repository/ProductRepository.php';

class ProductService
{
    private ProductRepository $products;

    public function __construct()
    {
        $this->products = new ProductRepository();
    }

    public function index(): array
    {
        return ['products' => $this->products->all()];
    }

    public function show(int $id): array
    {
        $product = $this->products->find($id);
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Produto nao encontrado'];
        }

        return ['product' => $product];
    }
}
