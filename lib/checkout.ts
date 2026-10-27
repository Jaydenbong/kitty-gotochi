export type CheckoutForm = { name: string; email: string; phone: string; address: string };
export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export function validateCheckout(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!form.name.trim()) errors.name = "Please enter your name";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Please enter a valid email";
  if (!/^[689]\d{7}$/.test(form.phone.replace(/\s/g, "")))
    errors.phone = "Please enter an 8-digit Singapore number";
  if (form.address.trim().length < 10) errors.address = "Please enter your full delivery address";
  return errors;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}