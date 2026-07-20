<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('role')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $user->role?->name,
            ]);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $role = Role::where('name', $request->role)->first();

        $user = User::create([
            'role_id' => $role?->id,
            'employee_number' => $request->employee_number,
            'name' => $request->name,
            'department' => $request->department,
            'position' => $request->role,
            'email' => $request->email ?? null,
            'password' => Hash::make($request->employee_number),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil ditambahkan. Password awal sama dengan nomor karyawan.',
            'data' => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $role?->name,
            ],
        ], 201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        if ($user->role?->name === 'Super Admin' && $request->role !== 'Super Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Role Super Admin tidak dapat diubah.',
            ], 403);
        }

        $role = Role::where('name', $request->role)->first();

        $user->update([
            'role_id' => $role?->id,
            'employee_number' => $request->employee_number,
            'name' => $request->name,
            'department' => $request->department,
            'position' => $request->role,
            'email' => $request->email ?? $user->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil diperbarui.',
            'data' => [
                'id' => $user->id,
                'user' => $user->name,
                'userId' => $user->employee_number,
                'department' => $user->department,
                'role' => $role?->name,
            ],
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        set_time_limit(300);

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:10240'],
        ], [
            'file.required' => 'File wajib dipilih.',
            'file.mimes' => 'File harus berformat XLSX atau CSV.',
        ]);

        $rows = $this->readImportRows($request->file('file')->getRealPath(), $request->file('file')->getClientOriginalExtension());

        if (count($rows) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak berisi data karyawan yang bisa diimport.',
            ], 422);
        }

        $role = Role::where('name', 'Karyawan')->firstOrFail();
        $departments = ['IT', 'HRD', 'Keuangan', 'Pelayanan', 'Manajemen'];
        $created = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($rows, $role, $departments, &$created, &$updated, &$skipped) {
            foreach ($rows as $index => $row) {
                $employeeNumber = trim((string) ($row['employee_number'] ?? ''));
                $name = trim((string) ($row['name'] ?? ''));

                if ($employeeNumber === '' || $name === '') {
                    $skipped++;
                    continue;
                }

                if (! preg_match('/^[0-9]{1,20}$/', $employeeNumber) || strlen($name) > 255) {
                    $skipped++;
                    continue;
                }

                $department = $departments[$index % count($departments)];
                $user = User::where('employee_number', $employeeNumber)->first();

                if ($user) {
                    if ($user->role?->name !== 'Karyawan') {
                        $skipped++;
                        continue;
                    }

                    $user->update([
                        'role_id' => $role->id,
                        'name' => $name,
                        'department' => $department,
                        'position' => 'Karyawan',
                    ]);
                    $updated++;
                    continue;
                }

                User::create([
                    'role_id' => $role->id,
                    'employee_number' => $employeeNumber,
                    'name' => $name,
                    'department' => $department,
                    'position' => 'Karyawan',
                    'email' => null,
                    'password' => Hash::make($employeeNumber),
                ]);
                $created++;
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Import data karyawan berhasil.',
            'data' => [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'total_rows' => count($rows),
            ],
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->role?->name === 'Super Admin') {
            return response()->json([
                'success' => false,
                'message' => 'Super Admin tidak dapat dihapus.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }

    private function readImportRows(string $path, string $extension): array
    {
        return strtolower($extension) === 'xlsx'
            ? $this->readXlsxRows($path)
            : $this->readCsvRows($path);
    }

    private function readCsvRows(string $path): array
    {
        $handle = fopen($path, 'r');

        if (! $handle) {
            return [];
        }

        $rows = [];

        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }

        fclose($handle);

        return $this->normalizeImportRows($rows);
    }

    private function readXlsxRows(string $path): array
    {
        if (! class_exists(ZipArchive::class)) {
            abort(500, 'PHP Zip extension belum aktif, sehingga file XLSX tidak dapat dibaca.');
        }

        $zip = new ZipArchive();

        if ($zip->open($path) !== true) {
            return [];
        }

        $sharedStrings = $this->readSharedStrings($zip);
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        if (! $sheetXml) {
            return [];
        }

        $sheet = simplexml_load_string($sheetXml);
        $sheet->registerXPathNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $rows = [];

        foreach ($sheet->xpath('//main:sheetData/main:row') as $row) {
            $cells = [];
            $row->registerXPathNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

            foreach ($row->xpath('main:c') as $cell) {
                $reference = (string) $cell['r'];
                $column = preg_replace('/\d+/', '', $reference);
                $index = $this->columnIndex($column);
                $cells[$index] = $this->cellValue($cell, $sharedStrings);
            }

            if ($cells) {
                ksort($cells);
                $rows[] = array_values($cells);
            }
        }

        return $this->normalizeImportRows($rows);
    }

    private function readSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');

        if (! $xml) {
            return [];
        }

        $strings = [];
        $shared = simplexml_load_string($xml);
        $shared->registerXPathNamespace('main', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        foreach ($shared->xpath('//main:si') as $item) {
            $strings[] = $this->textFromXmlNode($item);
        }

        return $strings;
    }

    private function cellValue(\SimpleXMLElement $cell, array $sharedStrings): string
    {
        $type = (string) $cell['t'];
        $value = (string) ($cell->v ?? '');

        if ($type === 's') {
            return $sharedStrings[(int) $value] ?? '';
        }

        if ($type === 'inlineStr') {
            return $this->textFromXmlNode($cell);
        }

        return $value;
    }

    private function textFromXmlNode(\SimpleXMLElement $node): string
    {
        $xml = dom_import_simplexml($node);

        if (! $xml) {
            return '';
        }

        $texts = $xml->getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
            't'
        );
        $value = '';

        foreach ($texts as $text) {
            $value .= $text->textContent;
        }

        return $value;
    }

    private function columnIndex(string $column): int
    {
        $index = 0;

        foreach (str_split($column) as $letter) {
            $index = ($index * 26) + (ord(strtoupper($letter)) - 64);
        }

        return $index - 1;
    }

    private function normalizeImportRows(array $rows): array
    {
        $normalized = [];

        foreach ($rows as $rowIndex => $row) {
            $values = array_map(fn ($value) => trim((string) $value), $row);

            if ($this->isHeaderRow($values)) {
                continue;
            }

            $employeeNumber = $values[0] ?? '';
            $name = $values[1] ?? '';

            if ($rowIndex === 0 && ! preg_match('/\d/', $employeeNumber)) {
                continue;
            }

            $employeeNumber = $this->normalizeEmployeeNumber($employeeNumber);

            $normalized[] = [
                'employee_number' => $employeeNumber,
                'name' => $name,
            ];
        }

        return $normalized;
    }

    private function isHeaderRow(array $row): bool
    {
        $first = strtolower($row[0] ?? '');
        $second = strtolower($row[1] ?? '');

        return str_contains($first, 'no')
            || str_contains($first, 'id')
            || str_contains($first, 'nik')
            || str_contains($first, 'nip')
            || str_contains($second, 'nama')
            || str_contains($second, 'name');
    }

    private function normalizeEmployeeNumber(string $value): string
    {
        $value = trim($value);

        if (preg_match('/^[0-9]+\.0$/', $value)) {
            return preg_replace('/\.0$/', '', $value);
        }

        if (preg_match('/^[0-9.]+e[+-]?[0-9]+$/i', $value)) {
            return number_format((float) $value, 0, '', '');
        }

        return $value;
    }
}
