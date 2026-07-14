import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRole } from "./role.js";

test("normalizeRole maps supported backend role labels", () => {
  assert.equal(normalizeRole("Super Admin"), "superadmin");
  assert.equal(normalizeRole("Admin"), "admin");
  assert.equal(normalizeRole("Karyawan"), "employee");
  assert.equal(normalizeRole("employee"), "employee");
  assert.equal(normalizeRole(null), "");
});
