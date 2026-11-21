/**
 * Strict validation utilities for data entry
 */

export const isEmailColumn = (col) => {
  if (!col) return false;
  const name = (col.name || '').trim().toLowerCase();
  return col.type === 'email' || name === 'email' || name.includes('email') || name.includes('e-mail');
};

export const isValidEmail = (value) => {
  if (!value || typeof value !== 'string') return false;
  // RFC 5322 standard compliant strict email regex
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(value.trim());
};
