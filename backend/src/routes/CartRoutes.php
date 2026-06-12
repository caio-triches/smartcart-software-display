<?php

require_once __DIR__ . '/../controller/CartController.php';

$router->get('/sessions', [CartController::class, 'sessions']);
$router->get('/sessions/{sessionId}', [CartController::class, 'session']);
$router->get('/order', [CartController::class, 'orders']);
$router->get('/order/{orderId}', [CartController::class, 'order']);
$router->get('/cart/{deviceId}', [CartController::class, 'show']);
$router->post('/cart/{deviceId}/item', [CartController::class, 'addItem']);
$router->post('/cart/{deviceId}/scan', [CartController::class, 'scan']);
$router->delete('/cart/{deviceId}/item/{itemId}', [CartController::class, 'removeItem']);
$router->delete('/cart/{deviceId}', [CartController::class, 'clear']);
$router->post('/cart/{deviceId}/checkout', [CartController::class, 'checkout']);
