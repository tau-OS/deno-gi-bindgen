import { parse } from "https://deno.land/x/xml@2.0.4/mod.ts";
import type { Root } from "./gi.ts";
import {
  generateParams,
  generateParamsDocs,
  generateReturnType,
  // getTypescriptType,
  getValidIdentifier,
  goBasicTypeToFFIType,
  goBasicTypeToTsType,
} from "./util.ts";

const file = await Deno.open("GLib-2.0.gir");
const { size } = await file.stat();

const parsed = parse(file, {
  progress(bytes) {
    Deno.stdout.writeSync(
      new TextEncoder().encode(
        `Parsing document: ${((100 * bytes) / size).toFixed(2)}%\r`
      )
    );
  },
}) as unknown as Root;

let generated = `
// GENERATED BINDINGS
`;

const namespace = parsed.repository.namespace["@name"];
const functions: Record<string, Deno.ForeignFunction> = {};

generated += `
// Constants
`;

parsed.repository.namespace.constant.forEach((c) => {
  const doc = c.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .join("")} */\n`;
  }

  generated += /* ts */ `export const ${getValidIdentifier(
    c["@name"]
  )} = ${JSON.stringify(c["@value"])};\n`;
});

// Enums

generated += `
// Enums
`;

parsed.repository.namespace.enumeration.forEach((e) => {
  const doc = e.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .join("")} */\n`;
  }

  const member = e.member instanceof Array ? e.member : [e.member];

  generated += `export enum ${e["@name"]} {\n`;
  member.forEach((m) => {
    generated += `  /**\n${m.doc?.["#text"]
      .split("\n")
      .map((line) => `   * ${line}\n`)
      .join("")}   */\n`;

    generated += `  ${getValidIdentifier(m["@name"])} = ${JSON.stringify(
      m["@value"]
    )},\n`;
  });
  generated += `}\n`;
});

// Bitfields

generated += `
// Bitfields
`;

parsed.repository.namespace.bitfield.forEach((b) => {
  const doc = b.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .join("")} */\n`;
  }

  generated += `export enum ${b["@name"]} {\n`;

  const member = b.member instanceof Array ? b.member : [b.member];

  member.forEach((m) => {
    generated += `  /**\n${m.doc?.["#text"]
      .split("\n")
      .map((line) => `   * ${line}\n`)
      .join("")}   */\n`;

    generated += `  ${getValidIdentifier(m["@name"])} = ${JSON.stringify(
      m["@value"]
    )},\n`;
  });

  generated += `}\n`;
});

// Callbacks

generated += `
// Callbacks
`;

parsed.repository.namespace.callback.forEach((c) => {
  const parameter = c.parameters?.parameter
    ? c.parameters.parameter instanceof Array
      ? c.parameters.parameter
      : [c.parameters.parameter]
    : [];

  const paramsDocs = generateParamsDocs(parameter);
  const paramsType = generateParams(parameter, namespace);

  const doc = c.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .concat(paramsDocs)
      .join("")} */\n`;
  }

  generated += `export type ${
    c["@name"]
  } = (${paramsType}) => ${generateReturnType(c["return-value"])}\n`;
});

// Typedefs

generated += `
// Typedefs
`;

parsed.repository.namespace.alias.forEach((a) => {
  const doc = a.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .join("")} */\n`;
  }

  const type = goBasicTypeToTsType(a.type["@name"])
    ? goBasicTypeToTsType(a.type["@name"])
    : a.type["@name"] === "none"
    ? "void"
    : a.type["@name"];

  generated += `export type ${a["@name"]} = ${type}\n`;
});

// Record

generated += `
// Records
`;

parsed.repository.namespace.record.forEach((r) => {
  const doc = r.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .join("")} */\n`;
  }

  generated += `export class ${r["@name"]} {\n`;

  generated += `}\n`;
});

// Functions

generated += `
// Functions
`;

parsed.repository.namespace.function.forEach((f) => {
  if (f["@introspectable"] === 0) return;

  const parameter = f.parameters?.parameter
    ? f.parameters.parameter instanceof Array
      ? f.parameters.parameter
      : [f.parameters.parameter]
    : [];

  const paramsDocs = generateParamsDocs(parameter);
  const paramsType = generateParams(parameter, namespace);

  const doc = f.doc?.["#text"];
  if (doc) {
    generated += `/**\n${doc
      .split("\n")
      .map((line) => ` * ${line}\n`)
      .concat(paramsDocs)
      .join("")} */\n`;
  }

  functions[f["@c:identifier"]] = {
    parameters: parameter.map((p) =>
      p.array ? "pointer" : goBasicTypeToFFIType(p.type["@name"])
    ),
    result: f["return-value"].array
      ? "pointer"
      : goBasicTypeToFFIType(f["return-value"].type?.["@name"]!),
  };

  const returnType = f["return-value"].array
    ? "other"
    : ["string", "number", "boolean"].includes(
        goBasicTypeToTsType(f["return-value"].type?.["@name"]!)!
      )
    ? goBasicTypeToTsType(f["return-value"].type?.["@name"]!)
    : "other";

  generated += `export const ${
    f["@name"]
  } = (${paramsType}): ${generateReturnType(f["return-value"])} => {
    return fromFFIValue(${JSON.stringify(returnType)}, ffi.symbols["${
    f["@c:identifier"]
  }"](${parameter
    .map((p) => `toFFIValue(${getValidIdentifier(p["@name"])})`)
    .join(", ")}));
  }\n`;
});

const objectFile = parsed.repository.namespace["@shared-library"].split(",")[0];

generated =
  /* ts */ `
import { toFFIValue, dlSearch, fromFFIValue } from "./runtime.ts";
const ffi = Deno.dlopen(await dlSearch(${JSON.stringify(
    objectFile
  )}), ${JSON.stringify(functions)});
` + generated;

await Deno.writeFile("out.ts", new TextEncoder().encode(generated));

// TODO: Implement nullability
