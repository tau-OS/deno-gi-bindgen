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

export const getNullTerminatedCString = (str: string) =>
  new Uint8Array([...new TextEncoder().encode(str), ...new Uint8Array([0])]);
