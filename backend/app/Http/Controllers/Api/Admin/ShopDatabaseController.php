<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ShopDocument;
use App\Models\ShopOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Menu Database: Register Dokumen, Pesanan, Customer + ekspor CSV (tercatat). */
class ShopDatabaseController extends Controller
{
    public function grid(Request $request, string $grid)
    {
        $rows = $this->rows($grid, $request);
        if ($request->query('format') === 'csv') {
            $role = $request->user()->admin_role ?: 'owner';
            abort_unless(in_array($role, ['owner', 'finance'], true), 403, 'Ekspor hanya untuk Owner dan Keuangan.');
            AuditLog::record('database.export', null, null, ['grid' => $grid, 'rows' => count($rows)]);

            return response()->streamDownload(function () use ($rows) {
                $out = fopen('php://output', 'w');
                fwrite($out, "\xEF\xBB\xBF");
                if ($rows) fputcsv($out, array_keys($rows[0]));
                foreach ($rows as $r) fputcsv($out, array_map(fn ($v) => is_array($v) ? json_encode($v) : $v, $r));
                fclose($out);
            }, "livora-$grid-".now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return ['rows' => $rows];
    }

    protected function rows(string $grid, Request $r): array
    {
        $from = $r->query('from');
        $to = $r->query('to');
        $hideTax = ($r->user()->admin_role ?: 'owner') === 'cs';

        return match ($grid) {
            'documents' => ShopDocument::with('order:id,code,customer_name,courier,tracking_number,received_at', 'payment:id,method,paid_at,gateway_ref,verified_by')
                ->whereIn('id', ShopDocument::selectRaw('MAX(id)')->groupBy('number'))
                ->when($from, fn ($q) => $q->whereDate('issued_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('issued_at', '<=', $to))
                ->latest('issued_at')->get()->map(fn ($d) => [
                    'nomor' => $d->number, 'judul' => $d->title, 'tanggal' => $d->issued_at?->toDateString(), 'status' => $d->status,
                    'kode_order' => $d->order?->code, 'customer' => $d->snapshot['buyer']['name'] ?? $d->order?->customer_name,
                    'perusahaan' => $d->snapshot['buyer']['company'] ?? null,
                    'item' => collect($d->snapshot['items'] ?? [])->map(fn ($i) => $i['title'].' x'.$i['quantity'])->implode('; '),
                    'sub_total' => $d->snapshot['totals']['subtotal'] ?? 0, 'diskon_produk' => $d->snapshot['totals']['product_discount'] ?? 0,
                    'diskon_tambahan' => $d->snapshot['totals']['extra_discount'] ?? 0, 'dpp' => $d->snapshot['totals']['dpp'] ?? 0,
                    'ppn' => $d->snapshot['totals']['ppn'] ?? 0, 'ongkir' => $d->snapshot['totals']['shipping_fee'] ?? 0,
                    'biaya_pasang' => $d->snapshot['totals']['installation_fee'] ?? 0, 'grand_total' => $d->snapshot['totals']['grand_total'] ?? 0,
                    'metode_bayar' => $d->payment?->method, 'tanggal_bayar' => $d->paid_at?->toDateString(),
                    'ref_midtrans' => $d->payment?->gateway_ref, 'resi' => $d->order?->tracking_number,
                    'tanggal_terima' => $d->order?->received_at?->toDateString(),
                ])->all(),
            'orders' => ShopOrder::query()->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
                ->latest()->get()->map(fn ($o) => [
                    'kode' => $o->code, 'customer' => $o->customer_name, 'telepon' => $o->customer_phone, 'status' => $o->status,
                    'jenis' => $o->order_type, 'sumber' => $o->source, 'tanggal' => $o->created_at->toDateString(),
                    'total' => (int) $o->grand_total, 'dibayar' => $o->paid_at?->toDateString(), 'resi' => $o->tracking_number,
                ])->all(),
            'customers' => DB::table('shop_orders')
                ->selectRaw('customer_phone, MAX(customer_name) as nama, MAX(customer_email) as email, MAX(source) as sumber, COUNT(*) as jumlah_pesanan, SUM(CASE WHEN paid_at IS NOT NULL THEN grand_total ELSE 0 END) as total_belanja, MAX(created_at) as pesanan_terakhir, MAX(wa_consent) as opt_in_wa')
                ->whereNotNull('customer_phone')->groupBy('customer_phone')->orderByDesc('pesanan_terakhir')->get()
                ->map(fn ($c) => ['nomor_wa' => $c->customer_phone] + (array) $c)
                ->map(function ($c) use ($hideTax) { unset($c['customer_phone']); if ($hideTax) unset($c['email']); return $c; })->values()->all(),
            'monthly' => DB::table('shop_documents')->where('title', 'Invoice')->where('status', 'lunas')
                ->selectRaw("DATE_FORMAT(paid_at, '%Y-%m') as bulan, COUNT(*) as jumlah, SUM(JSON_EXTRACT(snapshot, '$.totals.dpp')) as dpp, SUM(JSON_EXTRACT(snapshot, '$.totals.ppn')) as ppn, SUM(JSON_EXTRACT(snapshot, '$.totals.grand_total')) as total")
                ->groupBy('bulan')->orderByDesc('bulan')->get()->map(fn ($r) => (array) $r)->all(),
            default => abort(404),
        };
    }
}
