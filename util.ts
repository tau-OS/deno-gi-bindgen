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

export const getTypescriptType = (p: Parameter) => {
  return p.type?.["@name"]
    ? goBasicTypeToTsType(p.type["@name"])
      ? goBasicTypeToTsType(p.type["@name"])
      : p.type["@name"]
    : p.array?.type["@name"]
    ? goBasicTypeToTsType(p.array.type["@name"])
      ? goBasicTypeToTsType(p.array.type["@name"]) + "[]"
      : p.array.type["@name"] + "[]"
    : undefined;
};

export const generateParams = (params: Parameter[], namespace: string) =>
  params
    .filter((param) => param["@name"] !== "...")
    .map((p, i) => {
      const type = getTypescriptType(p);

      if (!type) throw new Error("Invalid parameter type");

      const paramNamespace = resolveNamespace(type);
      const name = getValidIdentifier(p["@name"]);

      return `${
        params.length - 2 === i && params[i + 1]["@name"] === "..." ? "" : ""
      }${name}: ${paramNamespace === namespace ? stripNamespace(type) : type}`;
    })
    .join(", ");

export const generateParamsDocs = (params: Parameter[]) =>
  params
    .map(
      (p) => ` * @param ${getValidIdentifier(p["@name"])} ${p.doc?.["#text"]}`
    )
    .join("\n");
