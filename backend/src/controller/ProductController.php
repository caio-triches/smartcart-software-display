<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../service/ProductService.php';

class ProductController extends BaseController
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    public function index(): void
    {
        $this->respond($this->service->index());
    }

    public function show(int $id): void
    {
        $this->respond($this->service->show($id));
    }
}
