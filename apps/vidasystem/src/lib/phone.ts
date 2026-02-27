export function normalizePhoneForDatabase(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length <= 11) {
    return digits;
  }

  if (digits.startsWith('55')) {
    return digits.slice(-11);
  }

  return digits.slice(0, 11);
}
