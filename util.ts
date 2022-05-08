import type { Parameter, ReturnValue } from "./gi.ts";

export const goBasicTypeToTsType = (type: string): string | undefined => {
  switch (type) {
    case "gboolean":
      return "boolean";
    case "gsize":
      return "number";
    case "gssize":
      return "number";
    case "guint16":
      return "number";
    case "gint64":
      return "number";
    case "guint64":
      return "number";
    case "guint32":
      return "number";
    case "gint32":
      return "number";
    case "guint8":
      return "number";
    case "gint":
      return "number";
    case "gchar":
      return "number";
    case "gunichar":
      return "number";
    case "guint":
      return "number";
    case "gfloat":
      return "number";
    case "gdouble":
      return "number";
    case "glong":
      return "number";
    case "gulong":
      return "number";
    case "utf8":
      return "string";
    case "filename":
      return "string";
    case "gpointer":
      return "Deno.UnsafePointer";
    case "void":
      return "void";
    case "none":
      return "void";
  }
};

export const goBasicTypeToFFIType = (type: string): Deno.NativeType => {
  switch (type) {
    case "gboolean":
      return "i32";
    case "gsize":
      return "u32";
    case "gssize":
      return "i32";
    case "guint16":
      return "u16";
    case "gint64":
      return "i64";
    case "guint64":
      return "u64";
    case "guint32":
      return "u32";
    case "gint32":
      return "i32";
    case "guint8":
      return "u8";
    case "gint":
      return "i32";
    case "gchar":
      return "u8";
    case "gunichar":
      return "u32";
    case "guint":
      return "u32";
    case "gfloat":
      return "f32";
    case "gdouble":
      return "f64";
    case "glong":
      return "i32";
    case "gulong":
      return "u32";
    case "utf8":
      return "pointer";
    case "filename":
      return "pointer";
    case "gpointer":
      return "pointer";
    case "void":
      return "void";
    case "none":
      return "void";
    default:
      return "pointer";
  }
};

// export const getBaseFFIConverter = (type: string) => {
//   if (p.type["@name"] === "gboolean") {
//     return "boolean";
//   }

//   if (p.type["@name"] === "utf8" || p.type["@name"] === "filename") {
//     return "string";
//   }
// };

const ffiNumberTypes = new Set([
  "i8",
  "u8",
  "i16",
  "u16",
  "i32",
  "u32",
  "i64",
  "u64",
  "usize",
  "f32",
  "f64",
]);

export const getFFIConverter = (p: Parameter, identifier: string) => {
  if (p.array) {
    const ffiArrayType = goBasicTypeToFFIType(p.array.type["@name"]);
    if (ffiNumberTypes.has(ffiArrayType)) {
      switch (ffiArrayType) {
        case "i8":
          return `new Int8Array(${identifier})`;
        case "u8":
          return `new Uint8Array(${identifier})`;
        case "i16":
          return `new Int16Array(${identifier})`;
        case "u16":
          return `new Uint16Array(${identifier})`;
        case "i32":
          return `new Int32Array(${identifier})`;
        case "u32":
          return `new Uint32Array(${identifier})`;
        case "i64":
          return `new BigInt64Array(${identifier})`;
        case "u64":
          return `new BigUint64Array(${identifier})`;
        case "usize":
          return `new Uint32Array(${identifier})`;
        case "f32":
          return `new Float32Array(${identifier})`;
        case "f64":
          return `new Float64Array(${identifier})`;
      }
      // new Uint8Array([1]).
      // Deno.UnsafePointer.of()
    }

    if (
      p.array.type["@name"] === "utf8" ||
      p.array.type["@name"] === "filename"
    ) {
      return `new BigInt64Array(${identifier}.map((x) => Deno.UnsafePointer.of(getNullTerminatedCString(x)).value))`;
    }

    return `noop(${identifier})`;
  }

  if (p.type["@name"] === "gboolean") {
    return `getCBoolean(${identifier})`;
  }

  if (p.type["@name"] === "utf8" || p.type["@name"] === "filename") {
    return `getNullTerminatedCString(${identifier})`;
  }

  return `noop(${identifier})`;
};

const replacementKeywords = new Set([
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with",
]);

export const getValidIdentifier = (name: string): string => {
  if (replacementKeywords.has(name) || name.match(/^\d/)) {
    return `_${name}`;
  }

  return name;
};

export const resolveNamespace = (name: string) => {
  const parts = name.split(".");
  const namespace = parts.slice(0, parts.length - 1).join(".");
  return namespace === "" ? undefined : namespace;
};

export const stripNamespace = (name: string) => {
  const parts = name.split(".");
  return parts[parts.length - 1];
};

export const generateReturnType = (r: ReturnValue) =>
  (r.type?.["@name"]
    ? r.type?.["@name"] === "none"
      ? "void"
      : goBasicTypeToTsType(r.type["@name"])
    : r.array?.type["@name"]
    ? goBasicTypeToTsType(r.array.type["@name"])
      ? goBasicTypeToTsType(r.array.type["@name"]) + "[]"
      : r.array.type["@name"] + "[]"
    : "void") ?? "void";

export const getTypescriptType = (p: Parameter, namespace: string) => {
  const type = p.type?.["@name"]
    ? goBasicTypeToTsType(p.type["@name"])
      ? goBasicTypeToTsType(p.type["@name"])
      : p.type["@name"]
    : p.array?.type["@name"]
    ? goBasicTypeToTsType(p.array.type["@name"])
      ? goBasicTypeToTsType(p.array.type["@name"]) + "[]"
      : p.array.type["@name"] + "[]"
    : undefined;

  const paramNamespace = resolveNamespace(type!);

  return paramNamespace
    ? paramNamespace === namespace
      ? stripNamespace(type!)
      : type
    : type;
};

export const generateParams = (params: Parameter[], namespace: string) =>
  params
    .filter((param) => param["@name"] !== "...")
    .map((p, i) => {
      const type = getTypescriptType(p, namespace);
      return `${getValidIdentifier(p["@name"])}: ${type}`;
    })
    .join(", ");

export const xmlList = <T>(value: T | T[] | undefined): T[] =>
  value ? (value instanceof Array ? value : [value]) : [];
