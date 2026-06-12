<?php

require_once __DIR__ . '/BaseController.php';

class HealthController extends BaseController
{
    public function index(): void
    {
        $this->respond([
            'status' => 'ok',
            'message' => 'SmartCart Display API is healthy',
        ]);
    }
}
