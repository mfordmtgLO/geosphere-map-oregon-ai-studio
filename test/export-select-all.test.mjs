import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("includes onSelectAllCheckboxChange on selectAllExportsCheckbox and handles container click without ignoring checkbox changes", () => {
  assert.match(html, /id="selectAllExportsCheckbox"\s+onchange="onSelectAllCheckboxChange\(this\.checked\)"/);
  assert.match(html, /window\.onSelectAllCheckboxChange = function\(isChecked\)/);
  assert.match(html, /cbs\.forEach\(cb => cb\.checked = isChecked\)/);
  assert.match(html, /if \(e && e\.target && e\.target\.tagName === 'INPUT'\) return;/);
  assert.match(html, /window\.onSelectAllCheckboxChange\(mainCb\.checked\)/);
});
