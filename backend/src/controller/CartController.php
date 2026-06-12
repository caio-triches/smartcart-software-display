<?php

require_once __DIR__ . '/BaseController.php';
require_once __DIR__ . '/../service/CartService.php';

class CartController extends BaseController
{
    private CartService $service;

    public function __construct()
    {
        $this->service = new CartService();
    }

    public function show(string $deviceId): void
    {
        $this->respond($this->service->getCart($deviceId));
    }

    public function sessions(): void
    {
        $this->respond($this->service->sessions());
    }

    public function session(int $sessionId): void
    {
        $this->respond($this->service->session($sessionId));
    }

    public function orders(): void
    {
        $this->respond($this->service->orders());
    }

    public function order(int $orderId): void
    {
        $this->respond($this->service->order($orderId));
    }

    public function addItem(string $deviceId): void
    {
        $this->respond($this->service->addItem($deviceId, $this->body()));
    }

    public function scan(string $deviceId): void
    {
        $this->respond($this->service->scan($deviceId));
    }

    public function removeItem(string $deviceId, int $itemId): void
    {
        $this->respond($this->service->removeItem($deviceId, $itemId));
    }

    public function clear(string $deviceId): void
    {
        $this->respond($this->service->clear($deviceId));
    }

    public function checkout(string $deviceId): void
    {
        $this->respond($this->service->checkout($deviceId, $this->body()));
    }
}
