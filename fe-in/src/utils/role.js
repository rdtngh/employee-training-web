export function normalizeRole(role = "") {
  const value = String(role).toLowerCase();
  if (value.includes("super")) return "superadmin";
  if (value.includes("admin")) return "admin";
  if (value.includes("employee") || value.includes("karyawan")) return "employee";
  return "";
}
