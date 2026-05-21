export const PHONE_DIGITS_MIN = 9
export const PHONE_DIGITS_MAX = 15

export function countPhoneDigits(value: unknown): number {
  return String(value ?? '').replace(/\D/g, '').length
}

export function isValidPhoneDigits(value: unknown): boolean {
  const digits = countPhoneDigits(value)
  return digits >= PHONE_DIGITS_MIN && digits <= PHONE_DIGITS_MAX
}

export const PHONE_DIGITS_MIN_ERROR = `Phone must have at least ${PHONE_DIGITS_MIN} digits`

export const PHONE_DIGITS_RANGE_ERROR = `Phone must be ${PHONE_DIGITS_MIN} to ${PHONE_DIGITS_MAX} digits`
