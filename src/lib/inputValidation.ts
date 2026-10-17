export function lettersAndSpaces(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s.'’-]/gu, '');
}

export function mobileDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function wholeNumber(value: string, maxLength = 12): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function decimalNumber(value: string): string {
  const input = value.replace(/[^\d.-]/g, '');
  const negative = input.startsWith('-');
  const digits = input.replace(/-/g, '');
  const parts = digits.split('.');
  const integer = parts.shift() || '';
  const fraction = parts.join('');
  return `${negative ? '-' : ''}${integer}${digits.includes('.') ? `.${fraction}` : ''}`;
}

export function isValidMobile(value: string): boolean {
  return value.length === 0 || /^[6-9]\d{9}$/.test(mobileDigits(value));
}