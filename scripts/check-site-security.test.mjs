import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessResponse } from './check-site-security.mjs';

const now = Date.parse('2026-10-01T20:00:00Z');
const healthy = {
  url: 'https://www.eduway.academy/',
  status: 200,
  homepageRecognized: true,
  headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=63072000' },
  certificate: { authorized: true, validFrom: '2026-09-09', validTo: '2026-12-08' },
};

test('accepts a healthy HTTPS page and the expected redirect chain', () => {
  assert.deepEqual(assessResponse(healthy, now), []);
  assert.deepEqual(
    assessResponse(
      {
        ...healthy,
        url: 'https://eduway.academy/',
        status: 307,
        headers: { ...healthy.headers, location: 'https://www.eduway.academy/' },
      },
      now
    ),
    []
  );
  assert.deepEqual(
    assessResponse(
      {
        url: 'http://eduway.academy/',
        status: 308,
        headers: { location: 'https://eduway.academy/' },
      },
      now
    ),
    []
  );
});

test('fails on network and certificate validation errors', () => {
  for (const code of [
    'CERT_HAS_EXPIRED',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'ENOTFOUND',
    'ABORT_ERR',
  ]) {
    assert.equal(assessResponse({ error: { code, message: 'test failure' } }, now).length, 1);
  }
  assert.ok(
    assessResponse(
      { ...healthy, certificate: { ...healthy.certificate, authorized: false } },
      now
    ).includes('TLS validation did not succeed')
  );
});

test('detects imminent expiry, expired, missing, and future certificate dates', () => {
  for (const validTo of ['2026-10-10', '2026-09-30', undefined]) {
    assert.ok(
      assessResponse({ ...healthy, certificate: { ...healthy.certificate, validTo } }, now).length
    );
  }
  assert.ok(
    assessResponse(
      { ...healthy, certificate: { ...healthy.certificate, validFrom: '2026-11-01' } },
      now
    ).length
  );
});

test('detects a foreign redirect or a redirect loop', () => {
  for (const location of [
    'https://example.com/',
    'https://eduway.academy/',
    'http://www.eduway.academy/',
  ]) {
    assert.ok(
      assessResponse(
        {
          ...healthy,
          url: 'https://eduway.academy/',
          status: 307,
          headers: { ...healthy.headers, location },
        },
        now
      ).length
    );
  }
});

test('rejects error pages, unexpected HTML, and missing security headers', () => {
  assert.ok(assessResponse({ ...healthy, status: 503 }, now).length);
  assert.ok(assessResponse({ ...healthy, homepageRecognized: false }, now).length);
  assert.ok(assessResponse({ ...healthy, headers: {} }, now).length >= 2);
  assert.ok(
    assessResponse(
      { ...healthy, headers: { ...healthy.headers, 'strict-transport-security': 'max-age=0' } },
      now
    ).length
  );
});
