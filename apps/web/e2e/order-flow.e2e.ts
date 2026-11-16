import { expect, test } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
const stamp = Date.now();
const USER = {
  name: 'E2E User',
  email: `e2e_${stamp}@brewlite.test`,
  password: 'Test@123456',
};

test('menu hiển thị danh sách đồ uống', async ({ page }) => {
  await page.goto('/#menu');
  await expect(page.getByText('Menu hôm nay')).toBeVisible();
});

test('/orders yêu cầu đăng nhập khi chưa có token', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByTestId('orders-error')).toContainText('đăng nhập');
});

test('/orders hiển thị trạng thái rỗng hoặc danh sách khi đã đăng nhập', async ({ page, request }) => {
  await request.post(`${API}/auth/register`, { data: USER });
  const res = await request.post(`${API}/auth/login`, {
    data: { email: USER.email, password: USER.password },
  });
  test.skip(!res.ok(), 'Không đăng nhập được tài khoản E2E (kiểm tra API đang chạy)');
  const { accessToken } = await res.json();

  await page.addInitScript((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('brewlite_access_token', t);
    }, accessToken);
  await page.goto('/orders');

  await expect(
    page.getByTestId('orders-empty').or(page.getByTestId('order-card').first()),
  ).toBeVisible();
});

// Luồng đầy đủ Menu -> Giỏ -> Đặt đơn -> Theo dõi: chạy khi UI đã có các data-testid
// (add-to-cart, cart-button, checkout-button, place-order-button, order-success)
test.describe('Luồng đầy đủ', () => {
  test.skip(!process.env.E2E_FULL, 'Đặt E2E_FULL=1 khi menu/checkout đã gắn data-testid');

  test('thêm món, đặt đơn và theo dõi trạng thái', async ({ page, request }) => {
    await request.post(`${API}/auth/register`, { data: USER });
    const res = await request.post(`${API}/auth/login`, {
      data: { email: USER.email, password: USER.password },
    });
    const { accessToken } = await res.json();
    await page.addInitScript((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('brewlite_access_token', t);
    }, accessToken);

    await page.goto('/#menu');
    await page.getByTestId('add-to-cart').first().click();
    await page.getByTestId('cart-button').click();
    await page.getByTestId('checkout-button').click();
    await page.getByTestId('place-order-button').click();
    await expect(page.getByTestId('order-success')).toBeVisible();

    await page.goto('/orders');
    await expect(page.getByTestId('order-card').first()).toBeVisible();
    await expect(page.getByTestId('step-0').first()).toHaveAttribute('data-state', 'active');
  });
});
