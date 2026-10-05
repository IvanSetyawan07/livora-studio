<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'storage/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'https://www.livoralcr.com,https://livoralcr.com,http://localhost:8080'))),

    'allowed_origins_patterns' => [
    '#^https://(www\.)?livoralcr\.com$#',
    '#^http://localhost:\d+$#',
    '#^https://[a-z0-9-]+\.lovable\.app$#',
],

    'allowed_headers' => [
    'Content-Type',
    'X-Requested-With',
    'Authorization',
    'X-Locale', // tambahkan ini
],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
