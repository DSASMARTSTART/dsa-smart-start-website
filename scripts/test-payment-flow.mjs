// No project credentials or network: real Postgres (WASM), real webhook source,
// and a mocked merchant API. Run with npm run test:payments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read(
  'supabase/migrations/20261005140000_reconcile_successful_payment_retries.sql'
);
const bootstrap = read('supabase/tests/payment-retry-bootstrap.sql');
const source = ts.transpileModule(
  read('supabase/functions/payment-webhook/index.ts').replace(
    /import \{ createClient \} from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2'/,
    'const createClient = globalThis.createTestClient;'
  ),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }
).outputText;

function webhook(options = {}) {
  let handler;
  const calls = [],
    orphans = [],
    invoices = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (options.rpc) return options.rpc(name, args);
      return { data: { success: true, purchases_confirmed: 1 }, error: null };
    },
    from: (table) => ({
      insert: async (row) => {
        orphans.push({ table, row });
        return {};
      },
    }),
  };
  vm.runInNewContext(source, {
    createTestClient: () => client,
    Deno: {
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: 'https://database.example.invalid',
            SUPABASE_SERVICE_ROLE_KEY: 'test-only',
            RAIACCEPT_API_USERNAME: 'test-only',
            RAIACCEPT_API_PASSWORD: 'test-only',
          })[key],
      },
      serve: (fn) => {
        handler = fn;
      },
    },
    fetch: async (url) => {
      if (url === 'https://authenticate.raiaccept.com') {
        return Response.json({ AuthenticationResult: { IdToken: 'test-token' } });
      }
      if (url.startsWith('https://trapi.raiaccept.com/orders/')) {
        if (options.unavailable) return new Response(null, { status: 503 });
        return Response.json({
          status: options.status ?? 'PAID',
          invoice: {
            merchantOrderReference: options.reference ?? 'our-order',
            items: options.items ?? [{}],
          },
        });
      }
      if (url.endsWith('/generate-invoice')) {
        invoices.push(url);
        return Response.json({ success: true });
      }
      throw new Error(`Unexpected network access: ${url}`);
    },
    Response,
    Request,
    URL,
    AbortSignal,
    console: { log() {}, warn() {}, error() {} },
  });
  const invoke = (body = {}, query = 'provider=raiaccept', method = 'POST') =>
    handler(
      new Request(`https://database.example.invalid/functions/v1/payment-webhook?${query}`, {
        method,
        ...(method === 'POST'
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order: {
                  orderIdentification: 'bank-order',
                  invoice: { merchantOrderReference: 'untrusted-reference' },
                },
                transaction: { status: 'SUCCESS' },
                ...body,
              }),
            }
          : {}),
      })
    );
  return { invoke, calls, orphans, invoices };
}

test('production SQL reproduces the bug; the migration recovers retries atomically and safely', async () => {
  const db = new PGlite();
  try {
    const originalConfirm = read(
      'supabase/migrations/20260429000000_payment_flow_hardening.sql'
    ).match(
      /CREATE OR REPLACE FUNCTION confirm_purchase_webhook\([\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/
    )[0];
    const originalFail = read('supabase/apply-purchase-fix.sql').match(
      /CREATE OR REPLACE FUNCTION fail_purchase_webhook\([\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/
    )[0];
    await db.exec(bootstrap + originalConfirm + originalFail);
    const assertions = read('supabase/tests/payment-retry.sql');
    await assert.rejects(db.exec(assertions), /verified retry must recover a failed purchase/);
    await db.exec(migration);
    await db.exec(assertions);
    await db.exec(migration); // Idempotent deploy.
  } finally {
    await db.close();
  }
});

test('real webhook and SQL recover a failed-then-paid mixed cart', async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap + migration);
    // Products use the same entitlement path: ebook, interactive, live and hybrid.
    await db.exec(`INSERT INTO purchases(user_id,course_id,transaction_id)
      SELECT gen_random_uuid(),gen_random_uuid(),'our-order' FROM generate_series(1,4);`);
    const rpc = async (name, args) => ({
      data: (
        await db.query(`SELECT ${name}($1,$2::jsonb) AS result`, [
          args.p_transaction_id,
          JSON.stringify(args.p_provider_response),
        ])
      ).rows[0].result,
      error: null,
    });
    const failure = webhook({ status: 'FAILED', rpc, items: [{}, {}, {}, {}] });
    assert.equal((await failure.invoke({ transaction: { status: 'FAILED' } })).status, 200);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM purchases WHERE status='failed'")).rows[0].n,
      4
    );
    const success = webhook({ status: 'PAID', rpc, items: [{}, {}, {}, {}] });
    assert.equal((await success.invoke()).status, 200);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM purchases WHERE status='completed'")).rows[0]
        .n,
      4
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM enrollments WHERE status='active'")).rows[0]
        .n,
      4
    );
    assert.equal(success.invoices.length, 1);
    await failure.invoke(); // Stale notification re-checks bank then SQL preserves completion.
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM purchases WHERE status='completed'")).rows[0]
        .n,
      4
    );
  } finally {
    await db.close();
  }
});

for (const status of ['PENDING', 'PROCESSING', '', 'UNRECOGNIZED']) {
  test(`verified ${status || 'empty'} status does not fail a payment`, async () => {
    const h = webhook({ status });
    assert.equal((await h.invoke({ transaction: { status: 'PENDING' } })).status, 200);
    assert.equal(h.calls.length, 0);
    assert.equal(h.invoices.length, 0);
  });
  test(`paid callback with ${status || 'empty'} order state requests another verification`, async () => {
    const h = webhook({ status });
    assert.equal((await h.invoke()).status, 503);
    assert.equal(h.calls.length, 0);
    assert.equal(h.invoices.length, 0);
  });
}
for (const status of ['SUCCESS', 'FAILED']) {
  test(`verification outage requests retry and does not mutate a claimed ${status} payment`, async () => {
    const h = webhook({ unavailable: true });
    assert.equal((await h.invoke({ transaction: { status } })).status, 503);
    assert.equal(h.calls.length, 0);
    assert.equal(h.invoices.length, 0);
  });
}
test('merchant API must provide the reference; caller cannot bind an order to another purchase', async () => {
  const h = webhook({ reference: '' });
  assert.equal((await h.invoke()).status, 503);
  assert.equal(h.calls.length, 0);
});
test('authoritative order reference and item count replace callback-supplied values', async () => {
  const h = webhook();
  await h.invoke({
    order: {
      orderIdentification: 'bank-order',
      invoice: {
        merchantOrderReference: 'victim-order',
        items: [{}, {}, {}],
      },
    },
  });
  assert.equal(h.calls[0].args.p_transaction_id, 'our-order');
  assert.equal(h.calls[0].args.p_provider_response.verification.status, 'PAID');
  assert.equal(h.invoices.length, 1);
});
for (const status of ['PAID', 'FAILED']) {
  test(`database error for ${status} requests provider retry`, async () => {
    const h = webhook({
      status,
      rpc: async () => ({ error: { message: 'temporary database outage' } }),
    });
    assert.equal((await h.invoke()).status, 503);
    assert.equal(h.invoices.length, 0);
  });
}
test('legacy redirects cannot mark purchases paid or failed', async () => {
  for (const status of ['success', 'failed']) {
    const h = webhook();
    await h.invoke({}, `provider=raiaccept&tx=our-order&status=${status}`, 'GET');
    assert.equal(h.calls.length, 0);
    assert.equal(h.invoices.length, 0);
  }
});
test('unverified PayPal notifications cannot mutate payment state', async () => {
  const h = webhook();
  await h.invoke(
    { event_type: 'PAYMENT.CAPTURE.DENIED', resource: { id: 'our-order' } },
    'provider=paypal'
  );
  assert.equal(h.calls.length, 0);
});
test('unexpected processing errors return a retryable response', async () => {
  const h = webhook({
    rpc: async () => {
      throw new Error('connection reset');
    },
  });
  assert.equal((await h.invoke()).status, 500);
  assert.equal(h.invoices.length, 0);
});
