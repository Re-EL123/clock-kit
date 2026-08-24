export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

export function isPassword(value) {
  const text = String(value || '');
  return text.length >= 8 && text.length <= 200;
}
