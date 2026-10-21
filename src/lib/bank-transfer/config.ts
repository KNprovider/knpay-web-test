export const bankTransferConfig = {
  apiKey: process.env.GEMBA_API_KEY || '',
  baseUrl: process.env.GEMBA_BASE_URL || 'https://api.ge.mba',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
};

// Standard bankoplysninger til fakturaer og QR-koder
export const KNPAY_BENEFICIARY_NAME = process.env.NEXT_PUBLIC_BENEFICIARY_NAME || 'KNprovider';
export const KNPAY_IBAN = process.env.NEXT_PUBLIC_IBAN || 'DK0000000000000000';

/**
 * Genererer QR-streng til bankoverførsler (understøtter både objekt og separate argumenter)
 */
export function generateBankTransferQRString(
  amountOrParams: any,
  referenceArg?: string,
  beneficiaryName = KNPAY_BENEFICIARY_NAME,
  iban = KNPAY_IBAN
): string {
  let amount: any = '';
  let reference = '';

  if (typeof amountOrParams === 'object' && amountOrParams !== null) {
    amount = amountOrParams.amountDkk ?? amountOrParams.amount ?? '';
    reference = amountOrParams.reference ?? '';
  } else {
    amount = amountOrParams;
    reference = referenceArg ?? '';
  }

  return `BCD\n001\n1\nSCT\n\n${beneficiaryName}\n${iban}\nDKK${amount}\n\n${reference}`;
}
