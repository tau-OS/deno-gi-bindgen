import {
  ConstructorDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  Writers,
} from "https://deno.land/x/ts_morph@14.0.0/mod.ts";
import type {
  Parameter,
  ReturnValue,
  Parameters,
  Type,
  Array,
  Namespace,
  Member,
} from "./gi.ts";

export const goBasicTypeToTsType = (type: string): string | undefined => {
  if (gnumberTypes.has(type)) {
    return "number";
  }

  switch (type) {
    case "gboolean":
      return "boolean";
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
    case "gint16":
      return "i16";
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

export const goTypeToFFIType = (type: { type?: Type; array?: Array }) => {
  if (type.array) {
    return "pointer";
  }

  if (!type.type) {
    throw new Error("Type is not specified");
  }

  return goBasicTypeToFFIType(type.type["@name"]);
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
    .map((p) => {
      const type = getTypescriptType(p, namespace);
      return `${getValidIdentifier(p["@name"])}: ${type}`;
    })
    .join(", ");

export const xmlList = <T>(value: T | T[] | undefined): T[] =>
  value ? (value instanceof Array ? value.filter((v) => v) : [value]) : [];

export const generateFFIFunction = ({
  parameters,
  returnType,
}: {
  parameters?: Parameters;
  returnType: ReturnValue;
}): Deno.ForeignFunction => {
  return {
    parameters: parameters
      ? [
          ...(parameters["instance-parameter"]
            ? [goTypeToFFIType(parameters["instance-parameter"])]
            : []),
          ...xmlList(parameters.parameter).map((p) => goTypeToFFIType(p)),
        ]
      : [],
    result: goTypeToFFIType(returnType),
  };
};

const gnumberTypes = new Set([
  "gsize",
  "gssize",
  "gint16",
  "guint16",
  "gint64",
  "guint64",
  "guint32",
  "gint32",
  "guint8",
  "gint",
  "gchar",
  "gunichar",
  "guint",
  "gfloat",
  "gdouble",
  "glong",
  "gulong",
]);

type GType =
  | {
      type: Type;
    }
  | {
      array: Array;
    };

export const lookupType = (namespace: Namespace, param: GType): GType => {
  if ("array" in param) {
    // const arr = {...param.array, type: }
    // param.array.type
    // return lookupType(namespace, { type: param.array.type! });
    // throw new Error(JSON.stringify(param));
    return param;
  }

  const name = param.type["@name"];

  const bitfield = xmlList(namespace.bitfield).find((x) => x["@name"] === name);
  if (bitfield)
    return {
      type: {
        "@name": "gint",
      },
    };
  const enumeration = xmlList(namespace.enumeration).find(
    (x) => x["@name"] === name
  );
  if (enumeration)
    return {
      type: {
        "@name": "gint",
      },
    };
  const alias = xmlList(namespace.alias).find((x) => x["@name"] === name);
  if (alias) return { type: alias };

  return param;
};

export const convertToFFIBase = (type: Type, identifier: string) => {
  const typeName = type["@name"];

  if (typeName === "gboolean") {
    return `${identifier} === true ? 1 : 0`;
  }

  if (typeName === "utf8" || typeName === "filename") {
    return `getNullTerminatedCString(${identifier})`;
  }

  if (typeName === "gpointer") {
    return identifier;
  }

  if (gnumberTypes.has(typeName)) {
    return identifier;
  }

  return `${identifier}.internalPointer`;
};

export const convertToFFI = (param: GType, identifier: string) => {
  if ("array" in param) {
    const name = param.array.type["@name"];

    if (gnumberTypes.has(name)) {
      const ffiArrayType = goBasicTypeToFFIType(name);

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
    }

    if (name === "gboolean") {
      return `new Int32Array(${identifier}.map((x) => x === true ? 1 : 0))`;
    }

    if (name === "utf8" || name === "filename") {
      return `new BigInt64Array(${identifier}.map((x) => Deno.UnsafePointer.of(getNullTerminatedCString(x)).value))`;
    }

    if (name === "gpointer") {
      return `new BigInt64Array(${identifier}.map((x) => x.value))`;
    }

    return `new BigInt64Array(${identifier}.map((x) => x.internalPointer.value))`;
  }

  return convertToFFIBase(param.type, identifier);
};

export const generateFunctionBody = ({
  func,
  parameters,
  identifer,
  namespace,
}: {
  func: MethodDeclaration | FunctionDeclaration | ConstructorDeclaration;
  parameters?: Parameters;
  returnType?: ReturnValue;
  identifer: string;
  namespace: Namespace;
}) => {
  const params = xmlList(parameters?.parameter);

  func.addStatements([
    Writers.returnStatement(
      `ffi.symbols['${identifer}'](${[
        ...(parameters?.["instance-parameter"]
          ? [
              convertToFFI(
                lookupType(namespace, parameters?.["instance-parameter"]),
                "this"
              ),
            ]
          : []),
        ...params.map((p) =>
          convertToFFI(lookupType(namespace, p), getValidIdentifier(p["@name"]))
        ),
      ].join(", ")}) as any`
    ),
  ]);
};
