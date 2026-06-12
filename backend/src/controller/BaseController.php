<?php

class BaseController
{
    protected function body(): array
    {
        $raw = file_get_contents('php://input');
        if (!$raw) {
            return [];
        }

        $body = json_decode($raw, true);
        return is_array($body) ? $body : [];
    }

    protected function respond(array $payload, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
}
