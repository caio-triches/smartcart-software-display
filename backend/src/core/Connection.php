<?php

require_once __DIR__ . '/Env.php';
require_once __DIR__ . '/DatabaseBootstrap.php';

class Connection
{
    private static ?PDO $instance = null;

    public static function get(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $host = Env::get('DB_HOST', Env::get('MYSQLHOST', 'localhost'));
        $port = Env::get('DB_PORT', Env::get('MYSQLPORT', '3306'));
        $name = Env::get('DB_NAME', Env::get('MYSQLDATABASE', 'smartcart_display'));
        $user = Env::get('DB_USER', Env::get('MYSQLUSER', 'root'));
        $pass = Env::get('DB_PASS', Env::get('MYSQLPASSWORD', ''));

        $server = new PDO(
            "mysql:host={$host};port={$port};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_FOUND_ROWS => true,
            ]
        );

        self::createDatabaseIfMissing($server, $name);
        $server->exec("USE `" . str_replace('`', '``', $name) . "`");

        self::$instance = $server;
        DatabaseBootstrap::run(self::$instance);
        return self::$instance;
    }

    private static function createDatabaseIfMissing(PDO $db, string $name): void
    {
        $safeName = str_replace('`', '``', $name);
        $db->exec("CREATE DATABASE IF NOT EXISTS `{$safeName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
}
