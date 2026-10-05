import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({
  session: vi.fn(),
  rpc: vi.fn(),
  ownership: vi.fn(),
  course: vi.fn(),
  clear: vi.fn(),
  navigate: vi.fn(),
  user: { id: 'student', name: 'Student', email: 'student@example.invalid' },
  t: (key: string) => key,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: f.t, i18n: { language: 'en' } }),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: f.user, profile: f.user }) }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc: f.rpc }, storageHelpers: {} }));
vi.mock('../data/supabaseStore', () => ({
  coursesApi: { getById: f.course },
  enrollmentsApi: { checkEnrollment: f.ownership },
}));
vi.mock('../lib/paymentService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/paymentService')>()),
  raiAcceptPayment: { createPaymentSession: f.session },
}));
vi.mock('./AuthModal', () => ({ default: () => null }));
import CheckoutPage from './CheckoutPage';

const props = {
  cart: ['course-a'],
  onBack: vi.fn(),
  onRemoveItem: vi.fn(),
  onClearCart: f.clear,
  onBrowse: vi.fn(),
  onNavigate: f.navigate,
  user: f.user,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('VITE_RAIACCEPT_ENABLED', 'true');
  vi.stubEnv('VITE_RAIFFEISEN_INSTALLMENTS_ENABLED', 'false');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  sessionStorage.clear();
  f.course.mockImplementation(async (id) => ({
    id,
    title: 'Level 1',
    level: 'A1',
    isPublished: true,
    pricing: { price: 35 },
  }));
  f.ownership.mockResolvedValue(true); // The webhook has already enrolled the buyer.
  f.rpc.mockResolvedValue({ data: {} });
  f.session.mockResolvedValue({
    paymentFormUrl: 'https://bank.example.invalid/checkout',
    orderIdentification: 'bank-order',
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function checkout() {
  render(<CheckoutPage {...props} />);
  await screen.findByRole('button', { name: 'paymentMethod.proceedToPayment' });
  fireEvent.change(screen.getByLabelText('billingInfo.address'), {
    target: { value: 'Test Street 1' },
  });
  fireEvent.change(screen.getByLabelText('billingInfo.city'), { target: { value: 'Belgrade' } });
  fireEvent.change(screen.getByLabelText('billingInfo.postalCode'), { target: { value: '11000' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'terms.acceptPlain' }));
  fireEvent.click(screen.getByRole('button', { name: 'paymentMethod.proceedToPayment' }));
  await waitFor(() => expect(f.session).toHaveBeenCalledTimes(1));
  await screen.findByTitle('RaiAccept Payment');
}

function success(origin = 'https://bank.example.invalid') {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      data: { name: 'orderResult', payload: { status: 'success' } },
    })
  );
}

for (const refreshFails of [false, true]) {
  it(`redirects an already enrolled buyer after payment, even when refresh fails: ${refreshFails}`, async () => {
    await checkout();
    const request = f.session.mock.calls[0][0];
    expect(request.orderId).toBe(request.idempotencyKey);
    if (refreshFails) f.rpc.mockRejectedValueOnce(new Error('Temporary database outage'));
    await act(async () => success());
    expect(f.navigate).toHaveBeenCalledWith('checkout-success');
    expect(f.clear).toHaveBeenCalledTimes(1);
    expect(f.ownership).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('checkout_idempotency_v1')).toBeNull();
  });
}

it('ignores success messages before a bank form opens and from unrelated origins', async () => {
  const view = render(<CheckoutPage {...props} />);
  await act(async () => success());
  expect(f.clear).not.toHaveBeenCalled();
  view.unmount();
  await checkout();
  await act(async () => success('https://unrelated.example.invalid'));
  expect(f.clear).not.toHaveBeenCalled();
  expect(f.navigate).not.toHaveBeenCalled();
});

it('reuses the checkout key for the same cart and changes it for different courses', async () => {
  const view = render(<CheckoutPage {...props} />);
  const first = JSON.parse(sessionStorage.getItem('checkout_idempotency_v1')!);
  view.rerender(<CheckoutPage {...props} cart={['course-a']} />);
  expect(JSON.parse(sessionStorage.getItem('checkout_idempotency_v1')!).key).toBe(first.key);
  view.rerender(<CheckoutPage {...props} cart={['course-b']} />);
  expect(JSON.parse(sessionStorage.getItem('checkout_idempotency_v1')!).key).not.toBe(first.key);
  await act(async () => {});
});
