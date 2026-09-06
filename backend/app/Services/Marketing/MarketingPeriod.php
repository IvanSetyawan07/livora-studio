<?php

namespace App\Services\Marketing;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * Satu sumber kebenaran untuk rentang tanggal di seluruh endpoint AI Marketing.
 *
 * Frontend (AiMarketingContext) selalu mengirim `from`, `to`, dan `days`.
 * Endpoint lama hanya mengerti `days`. Kelas ini menerima keduanya, memvalidasi
 * dan menormalkan supaya semua platform (GA4, Meta, Google Ads, Search Console)
 * memakai jendela waktu yang PERSIS SAMA — kalau tidak, angka antar panel
 * tidak akan pernah cocok.
 */
class MarketingPeriod
{
    private function __construct(
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
    ) {
    }

    public static function fromRequest(Request $request, int $defaultDays = 28): self
    {
        $today = CarbonImmutable::today();

        $rawFrom = $request->query('from');
        $rawTo = $request->query('to');

        if (is_string($rawFrom) && is_string($rawTo) && self::isDate($rawFrom) && self::isDate($rawTo)) {
            $from = CarbonImmutable::parse($rawFrom)->startOfDay();
            $to = CarbonImmutable::parse($rawTo)->startOfDay();

            if ($from->greaterThan($to)) {
                [$from, $to] = [$to, $from];
            }

            // Batas atas hari ini (tidak ada platform yang punya data masa depan)
            // dan batas bawah 365 hari supaya kuota API tidak jebol.
            $to = $to->greaterThan($today) ? $today : $to;
            $from = $from->lessThan($to->subDays(364)) ? $to->subDays(364) : $from;

            return new self($from, $to);
        }

        $days = (int) $request->query('days', $defaultDays);
        $days = max(1, min($days, 365));

        return new self($today->subDays($days - 1), $today);
    }

    private static function isDate(string $value): bool
    {
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
    }

    public function days(): int
    {
        return $this->from->diffInDays($this->to) + 1;
    }

    public function fromDate(): string
    {
        return $this->from->toDateString();
    }

    public function toDate(): string
    {
        return $this->to->toDateString();
    }

    /** Periode sebelumnya dengan panjang identik — dipakai untuk delta % yang jujur. */
    public function previous(): self
    {
        $length = $this->days();

        return new self($this->from->subDays($length), $this->from->subDay());
    }

    /** @return array{from: string, to: string, days: int} */
    public function toArray(): array
    {
        return [
            'from' => $this->fromDate(),
            'to' => $this->toDate(),
            'days' => $this->days(),
        ];
    }

    /** Kunci cache stabil per rentang. */
    public function cacheKey(string $prefix): string
    {
        return $prefix.':'.$this->fromDate().':'.$this->toDate();
    }
}
