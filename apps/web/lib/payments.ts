export type PaymentMethod = "MOMO" | "CREDIT_CARD" | "CASH";

export interface CheckoutCartItem {
  productId: string;
  productName: string;
  size?: string;
  toppings?: string[];
  basePrice: number;
  quantity: number;
}

export interface CreatePaymentPayload {
  userId: string;
  items: { productId: string; quantity: number }[];
  promoCode?: string;
  paymentMethod: PaymentMethod;
}

export interface PaymentOrderResponse {
  id: string;
  userId: string;
  totalAmount: string | number;
  discountAmount: string | number;
  finalAmount: string | number;
  status: string;
  idempotencyKey: string;
  createdAt: string;
  payment?: {
    id: string;
    transactionId: string | null;
    method: PaymentMethod;
    status: string;
    amount: string | number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function submitPayment(
  idempotencyKey: string,
  payload: CreatePaymentPayload,
  accessToken?: string | null,
): Promise<PaymentOrderResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "idempotency-key": idempotencyKey,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ thanh toán. Vui lòng thử lại.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join(" ")
      : data.message || `Thanh toán thất bại (${response.status})`;
    throw new Error(msg);
  }

  return data as PaymentOrderResponse;
}