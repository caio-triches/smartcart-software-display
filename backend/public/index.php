<?php

require_once __DIR__ . '/../src/core/Env.php';

Env::load(__DIR__ . '/../.env');

if (Env::get('APP_ENV', 'production') === 'development') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', 'php://stderr');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

$allowedOrigins = array_filter(array_map('trim', explode(',', Env::get('FRONTEND_URL', 'http://localhost:5173'))));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: ' . ($allowedOrigins[0] ?? '*'));
}

header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro interno da API',
        'detail' => Env::get('APP_ENV', 'production') === 'development' ? $error->getMessage() : null,
    ], JSON_UNESCAPED_UNICODE);
});

require_once __DIR__ . '/../src/core/Router.php';
require_once __DIR__ . '/../src/routes/HealthRoutes.php';
require_once __DIR__ . '/../src/routes/ProductRoutes.php';
require_once __DIR__ . '/../src/routes/CartRoutes.php';

$router->dispatch();
