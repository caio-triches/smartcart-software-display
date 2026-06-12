<?php

require_once __DIR__ . '/../repository/CartRepository.php';
require_once __DIR__ . '/../repository/ProductRepository.php';
require_once __DIR__ . '/../repository/OrderRepository.php';

class CartService
{
    private CartRepository $cart;
    private ProductRepository $products;
    private OrderRepository $orders;

    public function __construct()
    {
        $this->cart = new CartRepository();
        $this->products = new ProductRepository();
        $this->orders = new OrderRepository();
    }

    public function getCart(string $deviceId): array
    {
        $session = $this->activeSession($deviceId);
        return ['cart' => $this->cart->getCart($session['id'])];
    }

    public function sessions(): array
    {
        return ['sessions' => $this->cart->allSessions()];
    }

    public function session(int $sessionId): array
    {
        $session = $this->cart->findSession($sessionId);
        if (!$session) {
            http_response_code(404);
            return ['error' => 'Sessao nao encontrada'];
        }

        return ['cart' => $this->cart->getCart($sessionId)];
    }

    public function orders(): array
    {
        return ['orders' => $this->orders->all()];
    }

    public function order(int $orderId): array
    {
        $order = $this->orders->find($orderId);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Pedido nao encontrado'];
        }

        return ['order' => $order];
    }

    public function addItem(string $deviceId, array $body): array
    {
        $productId = (int) ($body['product_id'] ?? $body['produto_id'] ?? 0);
        if ($productId <= 0) {
            http_response_code(400);
            return ['error' => 'Produto obrigatorio'];
        }

        $product = $this->products->find($productId);
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Produto nao encontrado'];
        }

        $quantity = $this->resolveQuantity($product, $body);
        if ($quantity <= 0) {
            http_response_code(400);
            return ['error' => 'Quantidade invalida'];
        }

        $source = $product['soldByWeight'] ? 'scale' : ($body['source'] ?? 'sensor');
        $session = $this->activeSession($deviceId);
        $cart = $this->cart->addItem($session['id'], $product, $quantity, $source);

        return [
            'message' => "{$product['name']} adicionado ao carrinho",
            'cart' => $cart,
            'added' => [
                ...$product,
                'quantity' => $quantity,
            ],
        ];
    }

    public function scan(string $deviceId): array
    {
        $product = $this->products->random();
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Nenhum produto disponivel para leitura'];
        }

        $quantity = $product['soldByWeight'] ? $this->randomWeight() : 1.0;
        $source = $product['soldByWeight'] ? 'scale' : 'sensor';
        $session = $this->activeSession($deviceId);
        $cart = $this->cart->addItem($session['id'], $product, $quantity, $source);

        return [
            'message' => $product['soldByWeight']
                ? "Balanca detectou {$product['name']}"
                : "Sensor detectou {$product['name']}",
            'cart' => $cart,
            'added' => [
                ...$product,
                'quantity' => $quantity,
                'source' => $source,
            ],
        ];
    }

    public function removeItem(string $deviceId, int $itemId): array
    {
        $session = $this->activeSession($deviceId);
        $removed = $this->cart->removeItem($session['id'], $itemId);

        if (!$removed) {
            http_response_code(404);
            return ['error' => 'Item nao encontrado'];
        }

        return [
            'message' => 'Item removido com sucesso',
            'cart' => $this->cart->getCart($session['id']),
        ];
    }

    public function clear(string $deviceId): array
    {
        $session = $this->activeSession($deviceId);
        $this->cart->clear($session['id']);

        return [
            'message' => 'Carrinho limpo com sucesso',
            'cart' => $this->cart->getCart($session['id']),
        ];
    }

    public function checkout(string $deviceId, array $body): array
    {
        $method = $body['method'] ?? $body['payment_method'] ?? null;
        if (!in_array($method, ['pix', 'card'], true)) {
            http_response_code(400);
            return ['error' => 'Metodo de pagamento invalido'];
        }

        $session = $this->activeSession($deviceId);
        $cart = $this->cart->getCart($session['id']);

        if (empty($cart['items'])) {
            http_response_code(400);
            return ['error' => 'Carrinho vazio'];
        }

        $transactionId = $body['transaction_id'] ?? $this->transactionId();
        $order = $this->orders->create($cart['session'], $cart['items'], $method, $transactionId);
        $newSession = $this->cart->createSession($deviceId);

        return [
            'message' => 'Compra finalizada com sucesso',
            'order' => $order,
            'cart' => $this->cart->getCart($newSession['id']),
        ];
    }

    private function activeSession(string $deviceId): array
    {
        $session = $this->cart->getActiveSession($deviceId);
        return $session ?? $this->cart->createSession($deviceId);
    }

    private function resolveQuantity(array $product, array $body): float
    {
        if ($product['soldByWeight']) {
            return round((float) ($body['weight'] ?? $body['quantity'] ?? 0), 3);
        }

        return max(1.0, (float) ($body['quantity'] ?? 1));
    }

    private function randomWeight(): float
    {
        return round(mt_rand(18, 185) / 100, 2);
    }

    private function transactionId(): string
    {
        return 'SC-' . strtoupper(substr(bin2hex(random_bytes(8)), 0, 12));
    }
}
