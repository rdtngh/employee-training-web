<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use ZipArchive;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::with('role')
            ->when($search !== '', function ($query) use ($search) {
                $keyword = '%'.addcslashes($search, '%_\\').'%';

                $query->where(function ($query) use ($keyword) {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('employee_number', 'like', $keyword)
                        ->orWhere('department', 'like', $keyword)
                        ->orWhereHas('role', fn ($roleQuery) => $roleQuery->where('name', 'like', $keyword));
                });
            })
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

    public function options(): JsonResponse
    {
        $participantRoleIds = Role::whereIn('name', User::PARTICIPANT_ROLES)->pluck('id');

        $departmentQuery = User::query()
            ->whereNotNull('department')
            ->where('department', '<>', '');

        if ($participantRoleIds->isNotEmpty()) {
            $departmentQuery->whereIn('role_id', $participantRoleIds);
        }

        $departments = $departmentQuery
            ->select('department')
            ->distinct()
            ->orderBy('department')
            ->pluck('department')
            ->push('Mahasiswa/Pelajar')
            ->unique()
            ->sort()
            ->values();

        $roles = Role::query()
            ->orderByRaw("CASE name WHEN 'Super Admin' THEN 1 WHEN 'Admin' THEN 2 WHEN 'Karyawan' THEN 3 WHEN 'Mahasiswa/Pelajar' THEN 4 ELSE 5 END")
            ->orderBy('name')
            ->pluck('name')
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'departments' => $departments,
                'roles' => $roles,
            ],
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
            'message' => 'Pengguna berhasil ditambahkan. Password awal sama dengan username.',
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
        $employeeNumberChanged = $user->employee_number !== $request->employee_number;

        $payload = [
            'role_id' => $role?->id,
            'employee_number' => $request->employee_number,
            'name' => $request->name,
            'department' => $request->department,
            'position' => $request->role,
            'email' => $request->email ?? $user->email,
        ];

        if ($employeeNumberChanged) {
            $payload['password'] = Hash::make($request->employee_number);
        }

        $user->update($payload);

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
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $deleted = 0;
        $importRows = [];
        $seenEmployeeNumbers = [];
        $fileEmployeeNumbers = [];

        foreach ($rows as $row) {
            $employeeNumber = trim((string) ($row['employee_number'] ?? ''));
            $name = trim((string) ($row['name'] ?? ''));
            $department = trim((string) ($row['department'] ?? ''));

            if ($employeeNumber === '') {
                $skipped++;

                continue;
            }

            if (! preg_match('/^[A-Za-z0-9._-]{1,20}$/', $employeeNumber)) {
                $skipped++;

                continue;
            }

            $fileEmployeeNumbers[$employeeNumber] = true;

            if ($name === '' || $department === '') {
                $skipped++;

                continue;
            }

            if (strlen($name) > 255 || strlen($department) > 255) {
                $skipped++;

                continue;
            }

            if (isset($seenEmployeeNumbers[$employeeNumber])) {
                $skipped++;

                continue;
            }

            $seenEmployeeNumbers[$employeeNumber] = true;
            $importRows[] = [
                'employee_number' => $employeeNumber,
                'name' => $name,
                'department' => $department,
            ];
        }

        if (count($importRows) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak memiliki baris dengan username, nama, dan departemen yang valid.',
            ], 422);
        }

        DB::transaction(function () use ($importRows, $role, $fileEmployeeNumbers, &$created, &$updated, &$skipped, &$deleted) {
            $incomingEmployeeNumbers = array_keys($fileEmployeeNumbers);

            foreach ($importRows as $row) {
                $employeeNumber = $row['employee_number'];
                $name = $row['name'];
                $department = $row['department'];
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

            $deleted = User::where('role_id', $role->id)
                ->whereNotIn('employee_number', $incomingEmployeeNumbers)
                ->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Import data karyawan berhasil. Data karyawan lama sudah disesuaikan dengan file terbaru.',
            'data' => [
                'created' => $created,
                'updated' => $updated,
                'deleted' => $deleted,
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
        $delimiter = $this->detectCsvDelimiter($path);

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            $rows[] = $row;
        }

        fclose($handle);

        return $this->normalizeImportRows($rows);
    }

    private function detectCsvDelimiter(string $path): string
    {
        $sample = file_get_contents($path, false, null, 0, 4096);

        if ($sample === false || $sample === '') {
            return ',';
        }

        $firstLine = strtok($sample, "\r\n") ?: $sample;
        $delimiters = [',' => 0, ';' => 0, "\t" => 0];

        foreach ($delimiters as $delimiter => $count) {
            $delimiters[$delimiter] = substr_count($firstLine, $delimiter);
        }

        arsort($delimiters);

        return array_key_first($delimiters) ?: ',';
    }

    private function readXlsxRows(string $path): array
    {
        if (! class_exists(ZipArchive::class)) {
            abort(500, 'PHP Zip extension belum aktif, sehingga file XLSX tidak dapat dibaca.');
        }

        $zip = new ZipArchive;

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
                $rows[] = $cells;
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
        $columnMap = null;

        foreach ($rows as $rowIndex => $row) {
            $values = array_map(fn ($value) => trim((string) $value), $row);

            if ($this->isHeaderRow($values)) {
                $columnMap = $this->importColumnMap($values);

                continue;
            }

            $employeeNumberIndex = $columnMap['employee_number'] ?? 0;
            $nameIndex = $columnMap['name'] ?? 1;
            $departmentIndex = $columnMap['department'] ?? null;
            $employeeNumber = $values[$employeeNumberIndex] ?? '';
            $name = $values[$nameIndex] ?? '';
            $department = $departmentIndex !== null ? ($values[$departmentIndex] ?? '') : '';

            $employeeNumber = $this->normalizeEmployeeNumber($employeeNumber);

            $normalized[] = [
                'employee_number' => $employeeNumber,
                'name' => $name,
                'department' => $department,
            ];
        }

        return $normalized;
    }

    private function isHeaderRow(array $row): bool
    {
        foreach ($row as $value) {
            $header = $this->normalizeHeader($value);

            if ($this->isEmployeeNumberHeader($header) || $this->isNameHeader($header) || $this->isDepartmentHeader($header)) {
                return true;
            }
        }

        return false;
    }

    private function importColumnMap(array $row): array
    {
        $map = [];

        foreach ($row as $index => $value) {
            $header = $this->normalizeHeader($value);

            if (! isset($map['employee_number']) && $this->isEmployeeNumberHeader($header)) {
                $map['employee_number'] = $index;
            }

            if (! isset($map['name']) && $this->isNameHeader($header)) {
                $map['name'] = $index;
            }

            if (! isset($map['department']) && $this->isDepartmentHeader($header)) {
                $map['department'] = $index;
            }
        }

        return $map;
    }

    private function normalizeHeader(string $value): string
    {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', trim($value)) ?? '';

        return preg_replace('/[^a-z0-9]+/', ' ', strtolower($value)) ?? '';
    }

    private function isEmployeeNumberHeader(string $header): bool
    {
        return str_contains($header, 'no karyawan')
            || str_contains($header, 'nomor karyawan')
            || str_contains($header, 'no rekening')
            || str_contains($header, 'nomor rekening')
            || $header === 'username'
            || $header === 'user name'
            || $header === 'id'
            || $header === 'nik'
            || $header === 'nip';
    }

    private function isNameHeader(string $header): bool
    {
        return $header === 'nama'
            || $header === 'name'
            || str_contains($header, 'nama karyawan')
            || str_contains($header, 'nama pegawai');
    }

    private function isDepartmentHeader(string $header): bool
    {
        return $header === 'department'
            || $header === 'departemen'
            || $header === 'departement'
            || $header === 'dept'
            || $header === 'bagian'
            || $header === 'unit'
            || str_contains($header, 'unit kerja');
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
