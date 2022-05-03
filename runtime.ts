export const dlSearch = async (dl: string) => {
  const search = Deno.run({
    cmd: ["whereis", dl],
    stdout: "piped",
  });

  const output = new TextDecoder().decode(await search.output());

  search.close();

  const libraryPath = /: ([^\s]+)/g.exec(output)?.[1];

  if (!libraryPath) {
    throw "Could not find ${objectFile}";
  }

  return libraryPath;
};

export const toFFIValue = (value: unknown) => {
  if (value instanceof Array) {
    // /shrug
    return 1;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "string") {
    return new Uint8Array([
      ...new TextEncoder().encode(value),
      // null terminator
      ...new Uint8Array([0]),
    ]);
  }

  return value as any;
};

type fromFFIValueType<T> = T extends "string" ? Deno.UnsafePointer : any;

export const fromFFIValue = <
  T extends "string" | "boolean" | "number" | "other"
>(
  type: T,
  value: fromFFIValueType<T>
) => {
  if (type === "string") {
    return new Deno.UnsafePointerView(value).getCString();
  }

  if (typeof value == "boolean") {
    return value ? true : false;
  }

  if (type === "number") {
    return value;
  }

  return value as any;
};
