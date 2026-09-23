<?php

namespace App\Services\AI\Actions;

use RuntimeException;

/**
 * Dilempar kalau record target sudah diubah (manual) SETELAH rekomendasi dibuat.
 * Eksekusi dibatalkan supaya AI tidak menimpa pekerjaan admin.
 */
class ActionTargetChangedException extends RuntimeException
{
}
