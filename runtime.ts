export const dlSearch = async () => {
  const search = Deno.run({
    cmd: ["whereis", "${objectFile}"],
    stdout: "piped",
  });

  const output = new TextDecoder().decode(await search.output());

  search.close();

  const libraryPath = /: ([^\\s]+)/g.exec(output)?.[1];

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
    return new TextEncoder().encode(value);
  }

  return value as any;
};
