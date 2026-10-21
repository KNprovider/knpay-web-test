import { bankTransferConfig } from './config';

export interface GembaPaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  redirectUrl: string;
}

export interface GembaPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Creates a payment request via the Gemba API
 */
export async function createGembaPayment(data: GembaPaymentRequest): Promise<GembaPaymentResponse> {
  try {
    const response = await fetch(`${bankTransferConfig.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bankTransferConfig.apiKey}`,
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        redirect_url: data.redirectUrl,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.message || `Gemba API error HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      paymentUrl: result.paymentUrl || result.redirect_url || result.checkout_url,
      paymentId: result.id || result.paymentId,
    };
  } catch (err: any) {
    console.error('Error while creating Gemba payment:', err);
    return {
      success: false,
      error: err.message || 'Could not create the payment with Gemba',
    };
  }
}
