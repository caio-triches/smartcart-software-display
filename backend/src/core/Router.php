<?php

class Router
{
    private array $routes = [];

    public function get(string $path, array $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    public function post(string $path, array $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    public function delete(string $path, array $handler): void
    {
        $this->add('DELETE', $path, $handler);
    }

    private function add(string $method, string $path, array $handler): void
    {
        $this->routes[] = [$method, $path, $handler];
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
        $uri = '/' . trim($uri, '/');
        if ($uri !== '/') {
            $uri = rtrim($uri, '/');
        }

        foreach ($this->routes as [$routeMethod, $routePath, $handler]) {
            $pattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
            $pattern = "#^{$pattern}$#";

            if ($method === $routeMethod && preg_match($pattern, $uri, $matches)) {
                array_shift($matches);
                [$class, $action] = $handler;
                $controller = new $class();
                $controller->$action(...$matches);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }
}

$router = new Router();
