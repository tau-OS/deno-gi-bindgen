import { parse } from "https://deno.land/x/xml@2.0.4/mod.ts";
import type { Root } from "./gi.ts";
import {
  generateParams,
  generateReturnType,
  getTypescriptType,
  getValidIdentifier,
  // getTypescriptType,
  goBasicTypeToTsType,
} from "./util.ts";
import {
  Project,
  VariableDeclarationKind,
  Writers,
} from "https://deno.land/x/ts_morph@14.0.0/mod.ts";

const project = new Project();

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

const sourceFile = project.createSourceFile("out.ts", undefined, {
  overwrite: true,
});
const objectFile = parsed.repository.namespace["@shared-library"].split(",")[0];

sourceFile.addImportDeclaration({
  moduleSpecifier: `./runtime.ts`,
  namedImports: [
    "dlSearch",
    "fromFFIValue",
    "noop",
    "getCBoolean",
    "getNullTerminatedCString",
  ],
});

// sourceFile.addVariableStatement({
//   declarationKind: VariableDeclarationKind.Const,
//   declarations: [
//     {
//       name: "ffi",
//       // TODO: AAAAA
//       initializer: `Deno.dlopen(await dlSearch(${JSON.stringify(
//         objectFile
//       )}), ${JSON.stringify(functions)});`,
//     },
//   ],
// });

const namespace = parsed.repository.namespace["@name"];
const functions: Record<string, Deno.ForeignFunction> = {};

parsed.repository.namespace.constant.forEach((c) => {
  const doc = c.doc?.["#text"];

  sourceFile.addVariableStatement({
    isExported: true,
    docs: doc
      ? [
          {
            description: doc,
          },
        ]
      : [],
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: c["@name"],
        initializer: JSON.stringify(c["@value"]),
      },
    ],
  });
});

parsed.repository.namespace.enumeration.forEach((e) => {
  const doc = e.doc?.["#text"];
  const member = e.member instanceof Array ? e.member : [e.member];

  sourceFile.addEnum({
    isExported: true,
    name: e["@name"],
    docs: doc
      ? [
          {
            description: doc,
          },
        ]
      : [],
    members: member.map((m) => ({
      name: m["@name"],
      value: m["@value"],
      docs: m.doc?.["#text"]
        ? [
            {
              description: m.doc?.["#text"],
            },
          ]
        : [],
    })),
  });
});

parsed.repository.namespace.bitfield.forEach((b) => {
  const doc = b.doc?.["#text"];
  const member = b.member instanceof Array ? b.member : [b.member];

  sourceFile.addEnum({
    isExported: true,
    name: b["@name"],
    docs: doc
      ? [
          {
            description: doc,
          },
        ]
      : [],
    members: member.map((m) => ({
      name: m["@name"],
      value: m["@value"],
      docs: m.doc?.["#text"]
        ? [
            {
              description: m.doc?.["#text"],
            },
          ]
        : [],
    })),
  });
});

parsed.repository.namespace.callback.forEach((c) => {
  const parameter = c.parameters?.parameter
    ? c.parameters.parameter instanceof Array
      ? c.parameters.parameter
      : [c.parameters.parameter]
    : [];

  const paramsType = generateParams(parameter, namespace);

  const doc = c.doc?.["#text"];

  sourceFile.addTypeAlias({
    docs: doc
      ? [
          {
            description: doc,
            tags: parameter.map((p) => ({
              tagName: "param",
              text: `${p["@name"]} ${p.doc?.["#text"]}`,
            })),
          },
        ]
      : [],
    isExported: true,
    name: c["@name"],
    // TODO: aaaaa
    type: `(${paramsType}) => ${generateReturnType(c["return-value"])}`,
  });
});

parsed.repository.namespace.alias.forEach((a) => {
  const doc = a.doc?.["#text"];
  const type = goBasicTypeToTsType(a.type["@name"])
    ? goBasicTypeToTsType(a.type["@name"])
    : a.type["@name"] === "none"
    ? "void"
    : a.type["@name"];

  sourceFile.addTypeAlias({
    docs: doc ? [{ description: doc }] : [],
    isExported: true,
    name: a["@name"],
    type: type!,
  });
});

sourceFile.addInterface({
  isExported: true,
  name: "GObject",
});

parsed.repository.namespace.record.forEach((r) => {
  if (r["@introspectable"] === 0) return;
  const doc = r.doc?.["#text"];

  const classType = sourceFile.addClass({
    isExported: true,
    implements: ["GObject"],
    name: r["@name"],
    docs: doc ? [{ description: doc }] : [],
  });

  const func = (
    r.function ? (r.function instanceof Array ? r.function : [r.function]) : []
  ).filter((f) => f["@introspectable"] !== 0);
  const method = (
    r.method ? (r.method instanceof Array ? r.method : [r.method]) : []
  ).filter((m) => m["@introspectable"] !== 0);

  func.forEach((f) => {
    const parameter = f.parameters?.parameter
      ? f.parameters.parameter instanceof Array
        ? f.parameters.parameter
        : [f.parameters.parameter]
      : [];

    const method = classType.addMethod({
      name: f["@name"],
      docs: f.doc?.["#text"]
        ? [
            {
              description: f.doc?.["#text"],
              tags: parameter.map((p) => {
                const formattedName = getValidIdentifier(p["@name"]);

                return {
                  tagName: "param",
                  text: `${formattedName} ${p.doc?.["#text"]}`,
                };
              }),
            },
          ]
        : [],
      isStatic: true,
      returnType: generateReturnType(f["return-value"]),
      parameters: parameter.map((p) => {
        const formattedName = getValidIdentifier(p["@name"]);

        return {
          name: formattedName,
          type: getTypescriptType(p, namespace),
        };
      }),
    });

    method.addStatements([Writers.returnStatement("{} as any")]);
  });

  method.forEach((f) => {
    const parameter = f.parameters?.parameter
      ? f.parameters.parameter instanceof Array
        ? f.parameters.parameter
        : [f.parameters.parameter]
      : [];

    const method = classType.addMethod({
      name: f["@name"],
      docs: f.doc?.["#text"]
        ? [
            {
              description: f.doc?.["#text"],
              tags: parameter.map((p) => {
                const formattedName = getValidIdentifier(p["@name"]);

                return {
                  tagName: "param",
                  text: `${formattedName} ${p.doc?.["#text"]}`,
                };
              }),
            },
          ]
        : [],
      returnType: generateReturnType(f["return-value"]),
      parameters: parameter.map((p) => {
        const formattedName = getValidIdentifier(p["@name"]);

        return {
          name: formattedName,
          type: getTypescriptType(p, namespace),
        };
      }),
    });

    method.addStatements([Writers.returnStatement("{} as any")]);
  });
});

parsed.repository.namespace.function.forEach((f) => {
  if (f["@introspectable"] === 0) return;

  const parameter = f.parameters?.parameter
    ? f.parameters.parameter instanceof Array
      ? f.parameters.parameter
      : [f.parameters.parameter]
    : [];

  const doc = f.doc?.["#text"];

  const func = sourceFile.addFunction({
    isExported: true,
    name: f["@name"],
    docs: doc
      ? [
          {
            description: doc,
            tags: parameter.map((p) => {
              const formattedName = getValidIdentifier(p["@name"]);

              return {
                tagName: "param",
                text: `${formattedName} ${p.doc?.["#text"]}`,
              };
            }),
          },
        ]
      : [],
    returnType: generateReturnType(f["return-value"]),
    parameters: parameter.map((p) => {
      const formattedName = getValidIdentifier(p["@name"]);

      return {
        name: formattedName,
        type: getTypescriptType(p, namespace),
      };
    }),
  });

  func.addStatements([Writers.returnStatement("{} as any")]);
});

await sourceFile.save();
