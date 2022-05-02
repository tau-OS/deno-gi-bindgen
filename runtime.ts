export const toFFIValue = (value: unknown) => {
  if (value instanceof Array) {
    // /shrug
    return 1;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  return value as any;
};
