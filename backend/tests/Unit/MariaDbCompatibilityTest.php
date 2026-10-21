<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class MariaDbCompatibilityTest extends TestCase
{
    public function test_backend_query_strings_do_not_use_postgresql_only_syntax(): void
    {
        $backend = dirname(__DIR__, 2);
        $violations = [];
        $checked = 0;
        $pattern = '/\bCOMMENT\s+ON\s+(?:COLUMN|TABLE|INDEX)\b|\bILIKE\b|\bjsonb\b|\bON\s+CONFLICT\b|\bRETURNING\b|::\s*(?:jsonb?|text|uuid|boolean|integer|bigint|numeric|timestamp|date)\b/i';

        foreach (['app', 'database', 'routes'] as $directory) {
            $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(
                $backend . '/' . $directory,
                \FilesystemIterator::SKIP_DOTS
            ));

            foreach ($files as $file) {
                if (!$file->isFile() || $file->getExtension() !== 'php') {
                    continue;
                }

                $checked++;
                // Inspect strings only: PHP comments and Class::method calls are not SQL.
                foreach (token_get_all(file_get_contents($file->getPathname())) as $token) {
                    if (!is_array($token) || !in_array($token[0], [T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE], true)) {
                        continue;
                    }
                    if (preg_match($pattern, $token[1], $match)) {
                        $violations[] = substr($file->getPathname(), strlen($backend) + 1)
                            . ':' . $token[2] . ' uses ' . $match[0];
                    }
                }
            }
        }

        $this->assertGreaterThan(0, $checked, 'The backend source scan must not be empty.');
        $this->assertSame([], $violations, implode("\n", $violations));
    }
}