// Execute the providers' actual authoritative price calculation, with no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const provider of ['create-raiaccept-session', 'create-raiffeisen-installment-session']) {
  const source = readFileSync(new URL(`../supabase/functions/${provider}/index.ts`, import.meta.url), 'utf8');
  const calculation = source.slice(source.indexOf('const computed = body.purchaseItems.map'), source.indexOf('// Validate the discount server-side', source.indexOf('const computed = body.purchaseItems.map')));
  const js = ts.transpileModule(calculation + '\nglobalThis.pricingResult = computed;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  function price(course, selected = true) {
    const courses = new Map([['course', { pricing: { price: 599 }, teaching_materials_price: 50, ...course }]]);
    const context = { body: { purchaseItems: [{ courseId: 'course', teachingMaterialsIncluded: selected, amount: 1, teachingMaterialsPrice: 1 }] }, courseMap: courses, courseById: courses, round2: n => Math.round(n * 100) / 100 };
    vm.runInNewContext(js, context);
    return context.pricingResult[0];
  }
  test(`${provider}: included materials cannot increase the charge, even with a stale/tampered add-on selection`, () => {
    const result = price({ teaching_materials_included: true });
    assert.equal(result.gross, 599);
    assert.equal(result.materials, 0);
  });
  test(`${provider}: optional materials use the authoritative course price only when selected`, () => {
    assert.equal(price({ teaching_materials_included: false }).gross, 649);
    assert.equal(price({ teaching_materials_included: false }, false).gross, 599);
    assert.equal(price({ teaching_materials_included: false, teaching_materials_price: null }).gross, 599);
  });
}
