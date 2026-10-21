<?php

namespace App\Services\Shop;

use App\Models\ShopDocument;
use App\Models\ShopOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sinkron otomatis ke Google Sheets (lewat Apps Script Web App).
 *
 *  - Tab "Pesanan"          : satu baris per barang, ter-update setiap order berubah.
 *  - Tab "Register Dokumen" : satu baris per dokumen (Tagihan/Invoice), seperti sebelumnya.
 *
 * Prinsip:
 *  1. Pengiriman ke Google TIDAK terjadi di dalam transaksi database/respons pelanggan.
 *     Perubahan dicatat (queue*) lalu dikirim setelah respons selesai (terminating).
 *  2. Data selalu dibaca ulang dari database saat dikirim, jadi aman kalau transaksi di-rollback.
 *  3. Sukses = Apps Script membalas JSON {"ok":true}. Selain itu dianggap gagal, dicatat di log,
 *     dan dicoba lagi oleh scheduler (`shop:sheets-sync`, tiap 5 menit) lewat kolom sheets_synced_at.
 */
class SheetsSync
{
    /** Urutan kolom tab Pesanan. Kolom pertama = kunci baris (kode#id-baris), jangan diubah urutannya. */
    public const HEADERS = [
        'ID Baris', 'Kode Order', 'Tanggal Order', 'Status', 'Jenis Pesanan', 'Sumber', 'Customer', 'Telepon', 'Kota',
        'Barang', 'Kode Barang', 'Varian', 'Qty', 'Harga Satuan (Rp)', 'Diskon Satuan (Rp)', 'Total Barang (Rp)',
        'Ongkir (Rp)', 'Biaya Pasang (Rp)', 'Biaya Lain (Rp)', 'PPN (Rp)', 'Grand Total (Rp)',
        'No. Dokumen', 'Tanggal Bayar', 'Metode Bayar', 'Kurir', 'Resi', 'Tgl Kirim', 'Tgl Diterima',
        'Catatan Barang', 'Diperbarui',
    ];

    /** Kolom yang harus berformat teks (supaya nomor telepon tidak berubah jadi angka ilmiah). */
    public const TEXT_COLUMNS = ['ID Baris', 'Kode Order', 'Telepon', 'Resi'];

    private const ORDER_TYPES = ['ready_stock' => 'Ready stock', 'made_to_order' => 'Made to order', 'mixed' => 'Campuran'];
    private const SOURCES = ['web' => 'Website', 'manual' => 'Manual'];
    private const METHODS = ['bca_transfer' => 'Transfer BCA', 'qris' => 'QRIS'];

    /** @var array<int,true> */
    protected static array $pendingOrders = [];
    /** @var array<int,true> */
    protected static array $pendingDocs = [];
    protected static bool $hooked = false;

    public static function ordersEnabled(): bool
    {
        return (bool) config('services.shop.sheets_orders_url');
    }

    public static function docsEnabled(): bool
    {
        return (bool) config('services.shop.sheets_webhook_url');
    }

    // ───────────────────────── Antrean per-request ─────────────────────────

    public static function queueOrder(?int $orderId): void
    {
        if (!$orderId || !static::ordersEnabled()) return;
        static::$pendingOrders[$orderId] = true;
        static::hook();
    }

    public static function queueDocument(?int $docId): void
    {
        if (!$docId || !static::docsEnabled()) return;
        static::$pendingDocs[$docId] = true;
        static::hook();
    }

    protected static function hook(): void
    {
        if (static::$hooked) return;
        static::$hooked = true;
        app()->terminating(fn () => static::flush());
    }

    /** Dipanggil setelah respons terkirim (HTTP) atau di akhir perintah artisan. */
    public static function flush(): void
    {
        $docs = array_keys(static::$pendingDocs);
        $orders = array_keys(static::$pendingOrders);
        static::$pendingDocs = [];
        static::$pendingOrders = [];
        static::$hooked = false;
        sort($docs);
        sort($orders);

        foreach ($docs as $id) {
            try { static::syncDocument((int) $id); } catch (\Throwable $e) { Log::warning('Sinkron Google Sheets gagal (dokumen)', ['doc' => $id, 'error' => $e->getMessage()]); }
        }
        foreach ($orders as $id) {
            try { static::syncOrder((int) $id); } catch (\Throwable $e) { Log::warning('Sinkron Google Sheets gagal (order)', ['order' => $id, 'error' => $e->getMessage()]); }
        }
    }

    // ───────────────────────── Pengiriman ─────────────────────────

    public static function syncOrder(int $id): bool
    {
        $url = config('services.shop.sheets_orders_url');
        if (!$url) return false;

        $startedAt = now();
        $order = ShopOrder::with(['items', 'documents', 'payments'])->find($id);
        if (!$order) return true;

        $ok = static::post($url, config('services.shop.sheets_orders_secret'), [
            'tab' => 'pesanan',
            'order_code' => $order->code,
            'headers' => static::HEADERS,
            'text_columns' => static::TEXT_COLUMNS,
            'money_columns' => array_values(array_filter(static::HEADERS, fn ($h) => str_ends_with($h, '(Rp)'))),
            'rows' => static::buildRows($order),
        ], 'order '.$order->code);

        // Tab Customer: satu baris per nomor WA (kunci), data terbaru menimpa.
        if ($ok && $order->customer_phone) {
            static::post($url, config('services.shop.sheets_orders_secret'), [
                'tab' => 'customer',
                'headers' => ['Telepon', 'Nama', 'Kota', 'Alamat', 'Order Terakhir', 'Total Order', 'Terakhir Update'],
                'rows' => [[
                    $order->customer_phone,
                    $order->customer_name ?? '',
                    $order->shipping['city'] ?? '',
                    $order->shipping['street'] ?? '',
                    $order->code,
                    ShopOrder::where('customer_phone', $order->customer_phone)->count(),
                    now()->toDateTimeString(),
                ]],
            ], 'customer '.$order->customer_phone);
        }

        if ($ok) DB::table('shop_orders')->where('id', $id)->update(['sheets_synced_at' => $startedAt]);

        return $ok;
    }

    public static function syncDocument(int $id): bool
    {
        $url = config('services.shop.sheets_webhook_url');
        if (!$url) return false;

        $startedAt = now();
        $doc = ShopDocument::find($id);
        if (!$doc) return true;

        // Dokumen yang sudah digantikan versi lebih baru (Tagihan → Invoice, nomor sama) tidak dikirim:
        // baris register untuk nomor itu cukup diisi versi terbaru.
        if (ShopDocument::where('number', $doc->number)->where('version', '>', $doc->version)->exists()) {
            DB::table('shop_documents')->where('id', $id)->update(['sheets_synced_at' => $startedAt]);
            return true;
        }

        $s = (array) $doc->snapshot;
        $ok = static::post($url, config('services.shop.sheets_webhook_secret'), [
            'tab' => 'register',
            'nomor' => $doc->number, 'judul' => InvoicePdf::label($doc->title), 'status' => $doc->status, 'versi' => $doc->version,
            'tanggal' => $doc->issued_at?->toDateString(), 'kode_order' => $s['order_code'] ?? null,
            'customer' => $s['buyer']['name'] ?? null, 'perusahaan' => $s['buyer']['company'] ?? null,
            'item' => collect($s['items'] ?? [])->map(fn ($i) => ($i['title'] ?? '').' x'.($i['quantity'] ?? 1))->implode('; '),
            'dpp' => $s['totals']['dpp'] ?? 0, 'ppn' => $s['totals']['ppn'] ?? 0, 'grand_total' => $s['totals']['grand_total'] ?? 0,
            'dibayar' => $s['paid_at'] ?? null, 'metode' => $s['paid_method'] ?? null,
        ], 'dokumen '.$doc->number);

        if ($ok) DB::table('shop_documents')->where('id', $id)->update(['sheets_synced_at' => $startedAt]);

        return $ok;
    }

    /** Tes koneksi tab Pesanan tanpa menulis data. */
    public static function ping(): array
    {
        $url = config('services.shop.sheets_orders_url');
        if (!$url) return [false, 'SHOP_SHEETS_ORDERS_URL belum diisi'];
        try {
            $res = Http::timeout(20)->post($url, ['secret' => config('services.shop.sheets_orders_secret'), 'tab' => 'ping']);
            if ($res->successful() && $res->json('ok') === true) return [true, 'Terhubung (Apps Script membalas ok)'];

            return [false, 'HTTP '.$res->status().' — '.mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $res->body()))), 0, 160)];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }

    protected static function post(string $url, ?string $secret, array $payload, string $what): bool
    {
        try {
            $res = Http::timeout(20)->post($url, ['secret' => $secret] + $payload);
            // Apps Script membalas 200 + {"ok":true}. Halaman login/HTML atau {"ok":false} = gagal.
            if ($res->successful() && $res->json('ok') === true) return true;
            Log::warning('Sinkron Google Sheets ditolak', [
                'untuk' => $what, 'http' => $res->status(),
                'balasan' => mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $res->body()))), 0, 200),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Sinkron Google Sheets gagal', ['untuk' => $what, 'error' => $e->getMessage()]);
        }

        return false;
    }

    // ───────────────────────── Baris tab Pesanan ─────────────────────────

    /** @return array<int,array<int,mixed>> satu baris per barang, urut sesuai HEADERS */
    public static function buildRows(ShopOrder $o): array
    {
        $o->loadMissing(['items', 'documents', 'payments']);
        $ship = (array) ($o->shipping ?? []);
        $quoted = $o->quote_sent_at !== null; // sebelum penawaran, biaya order belum dihitung → dikosongkan
        $docNo = $o->documents->sortByDesc('id')->first()?->number;
        $paid = $o->payments->where('status', 'paid')->where('kind', '!=', 'change')->sortBy('id')->first();
        // Label metode dari Invoice ("Transfer BCA"/"QRIS", dicatat saat lunas); cadangan: kolom method pada pembayaran.
        $method = ((array) ($o->documents->where('title', 'Invoice')->sortByDesc('id')->first()?->snapshot))['paid_method'] ?? null;
        $method ??= $paid?->method ? (self::METHODS[$paid->method] ?? $paid->method) : null;
        $d = fn ($v) => $v?->format('Y-m-d');
        $money = fn ($v) => $quoted ? (int) $v : null;

        $rows = [];
        foreach ($o->items->sortBy('id')->values() as $n => $i) {
            $first = $n === 0; // biaya tingkat-order hanya di baris pertama agar tidak terhitung dobel saat dijumlah
            $rows[] = [
                $o->code.'#'.$i->id,
                $o->code,
                $d($o->created_at),
                ShopOrderService::LABELS[$o->status] ?? $o->status,
                self::ORDER_TYPES[$o->order_type] ?? $o->order_type,
                self::SOURCES[$o->source] ?? $o->source,
                $o->customer_name,
                $o->customer_phone,
                $ship['city'] ?? null,
                $i->title,
                $i->code,
                $i->variant_name,
                (int) $i->quantity,
                (int) $i->unit_price,
                (int) $i->unit_discount,
                ((int) $i->unit_price - (int) $i->unit_discount) * (int) $i->quantity,
                $first ? $money($o->shipping_fee) : null,
                $first ? $money($o->installation_fee) : null,
                $first ? $money($o->other_fee) : null,
                $first ? $money($o->ppn) : null,
                $first ? $money($o->grand_total) : null,
                $docNo,
                $d($o->paid_at),
                $method,
                $o->courier,
                $o->tracking_number,
                $d($o->shipped_at),
                $d($o->received_at),
                $i->note,
                $o->updated_at?->format('Y-m-d H:i:s'),
            ];
        }

        return $rows;
    }
}
