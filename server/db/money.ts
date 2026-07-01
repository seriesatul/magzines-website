export type Paise = number & { readonly __brand: "Paise" };

export function paise(value: number): Paise {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Money must be a non-negative integer in paise.");
  }

  return value as Paise;
}

export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isInteger(rupees) || rupees < 0) {
    throw new Error("Rupee amount must be a non-negative integer.");
  }

  return paise(rupees * 100);
}

export function formatPaise(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amountPaise / 100);
}
