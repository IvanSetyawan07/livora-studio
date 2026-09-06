<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
    'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    // Kredensial OAuth terpisah untuk AI Marketing Dashboard (Search Console,
    // dan nanti GA4/Ads). SENGAJA dipisah dari 'google.client_id' di atas
    // (dipakai untuk fitur "Sign in with Google" login user) supaya tidak
    // tertukar — dua project Google Cloud yang berbeda tujuan.
    'google_marketing' => [
        'client_id' => env('GOOGLE_MARKETING_CLIENT_ID'),
        'client_secret' => env('GOOGLE_MARKETING_CLIENT_SECRET'),
        'redirect_uri' => env('GOOGLE_MARKETING_REDIRECT_URI'),
    ],

    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
    ],
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-3.6-flash'),
    ],

    // ---------------------------------------------------------------
    // AI Marketing — koneksi platform luar.
    // Semua nilai dibaca dari backend/.env. Selama kosong, dashboard
    // menampilkan blok "Not connected" dan TIDAK memakai data contoh.
    // ---------------------------------------------------------------
    'meta_ads' => [
        'access_token' => env('META_ADS_ACCESS_TOKEN'),
        'account_id' => env('META_ADS_ACCOUNT_ID'),
        'api_version' => env('META_ADS_API_VERSION', 'v21.0'),
    ],

    'meta_graph' => [
        'access_token' => env('META_GRAPH_ACCESS_TOKEN'),
        'page_id' => env('META_PAGE_ID'),
        'instagram_business_id' => env('META_INSTAGRAM_BUSINESS_ID'),
    ],

    'google_ads' => [
        'developer_token' => env('GOOGLE_ADS_DEVELOPER_TOKEN'),
        'customer_id' => env('GOOGLE_ADS_CUSTOMER_ID'),
        'refresh_token' => env('GOOGLE_ADS_REFRESH_TOKEN'),
        'login_customer_id' => env('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
        'client_id' => env('GOOGLE_ADS_CLIENT_ID'),
        'client_secret' => env('GOOGLE_ADS_CLIENT_SECRET'),
    ],

    'ga4' => [
        'property_id' => env('GA4_PROPERTY_ID'),
        'service_account_json' => env('GA4_SERVICE_ACCOUNT_JSON'),
    ],

    'google_business' => [
        'account_id' => env('GOOGLE_BUSINESS_ACCOUNT_ID'),
        'location_id' => env('GOOGLE_BUSINESS_LOCATION_ID'),
    ],

    'tiktok' => [
        'access_token' => env('TIKTOK_ACCESS_TOKEN'),
        'business_id' => env('TIKTOK_BUSINESS_ID'),
    ],

    'youtube' => [
        'api_key' => env('YOUTUBE_API_KEY'),
        'channel_id' => env('YOUTUBE_CHANNEL_ID'),
    ],
];
