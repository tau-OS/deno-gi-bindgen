import { parse } from "https://deno.land/x/xml@2.0.4/mod.ts";
import type { Root } from "./gi.ts";
import {
  generateFFIFunction,
  generateFunctionBody,
  generateParams,
  getTypescriptType,
  getValidIdentifier,
  goBasicTypeToTsType,
  goTypeToFFIType,
  xmlList,
} from "./util.ts";
import {
  Project,
  VariableDeclarationKind,
  Writers,
} from "https://deno.land/x/ts_morph@14.0.0/mod.ts";

// TODO: Handle nullable types

const project = new Project();

const file = await Deno.open("Gtk-4.0.gir");
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

sourceFile.addImportDeclaration({
  moduleSpecifier: `./runtime.ts`,
  namedImports: ["dlSearch", "getNullTerminatedCString", "nullableExpression"],
});

export const namespace = parsed.repository.namespace;
const objectFile = namespace["@shared-library"].split(",")[0];
const ffiFunctions: Record<string, Deno.ForeignFunction> = {};

// TODO: Temporary because for some reason it generates GType as Type, but references GType
const gtype = xmlList(namespace.alias).find(
  (alias) => alias["@name"] === "Type"
);
if (gtype) {
  xmlList(namespace.alias).push({ ...gtype, "@name": "GType" });
}

console.log("Constant");

xmlList(namespace.constant).forEach((c) => {
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

console.log("enum");

xmlList(namespace.enumeration).forEach((e) => {
  const doc = e.doc?.["#text"];
  const members = xmlList(e.member);

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
    members: members.map((m) => ({
      // TODO: Sometimes this XML parser converts stuff like 'false' to a boolean
      name: m["@name"].toString(),
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

console.log("bitfield");

xmlList(namespace.bitfield).forEach((b) => {
  const doc = b.doc?.["#text"];
  const members = xmlList(b.member);

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
    members: members.map((m) => ({
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

console.log("callback");

xmlList(namespace.callback).forEach((c) => {
  const parameters = xmlList(c.parameters?.parameter);
  const paramsType = generateParams(parameters);

  const doc = c.doc?.["#text"];

  sourceFile.addTypeAlias({
    docs: doc
      ? [
          {
            description: doc,
            tags: parameters.map((p) => ({
              tagName: "param",
              text: `${p["@name"]} ${p.doc?.["#text"]}`,
            })),
          },
        ]
      : [],
    isExported: true,
    name: c["@name"],
    // TODO: aaaaa
    type: `(${paramsType}) => ${getTypescriptType(c["return-value"])}`,
  });
});

console.log("alias");

xmlList(namespace.alias)?.forEach((a) => {
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

const pointerBackedClass = sourceFile.addClass({
  isExported: true,
  name: "PointerBacked",
  properties: [
    {
      name: "internalPointer",
      type: "Deno.UnsafePointer",
      hasExclamationToken: true,
    },
  ],
});

{
  const method = pointerBackedClass.addMethod({
    name: "fromPointer",
    isStatic: true,
    typeParameters: ["T extends object"],
    returnType: "T",
    parameters: [
      {
        name: "this",
        type: "{ prototype: T }",
      },
      {
        name: "pointer",
        type: "Deno.UnsafePointer",
      },
    ],
  });

  method.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "obj",
        initializer: "Object.create(this.prototype)",
      },
    ],
  });

  method.addStatements([
    "obj.internalPointer = pointer",
    Writers.returnStatement("obj"),
  ]);
}

console.log("union");

xmlList(namespace.union).forEach((u) => {
  const doc = u.doc?.["#text"];

  const classType = sourceFile.addClass({
    docs: doc ? [{ description: doc }] : [],
    isExported: true,
    extends: "PointerBacked",
    name: u["@name"],
  });

  const methods = xmlList(u.method);

  // TODO: Do we have to do constructors for this again?
  methods.forEach((m) => {
    const parameters = xmlList(m.parameters.parameter);
    const method = classType.addMethod({
      name: m["@name"],
      docs: m.doc?.["#text"]
        ? [
            {
              description: m.doc?.["#text"],
              tags: parameters.map((p) => {
                const formattedName = getValidIdentifier(p["@name"]);

                return {
                  tagName: "param",
                  text: `${formattedName} ${p.doc?.["#text"]}`,
                };
              }),
            },
          ]
        : [],
      returnType: getTypescriptType(m["return-value"]),
      parameters: parameters.map((p) => {
        const formattedName = getValidIdentifier(p["@name"]);

        return {
          name: formattedName,
          type: getTypescriptType(p),
        };
      }),
    });

    method.addStatements([
      Writers.returnStatement(
        generateFunctionBody({
          parameters: m.parameters,
          identifer: m["@c:identifier"],
          returnType: m["return-value"],
        })
      ),
    ]);

    ffiFunctions[m["@c:identifier"]] = generateFFIFunction({
      parameters: m.parameters,
      returnType: m["return-value"],
    });
  });
});

sourceFile.addInterface({
  isExported: true,
  name: "GObject",
});

console.log("record");

xmlList(namespace.record).forEach((r) => {
  if (r["@introspectable"] === 0) return;
  const doc = r.doc?.["#text"];

  const classType = sourceFile.addClass({
    isExported: true,
    extends: "PointerBacked",
    name: r["@name"],
    docs: doc ? [{ description: doc }] : [],
    isAbstract: xmlList(r.constructor).every((c) => c["@name"] !== "new"),
  });

  const func = xmlList(r.function).filter((f) => f["@introspectable"] !== 0);
  const method = xmlList(r.method).filter((m) => m["@introspectable"] !== 0);

  func.forEach((f) => {
    const parameters = xmlList(f.parameters?.parameter);
    const method = classType.addMethod({
      name: f["@name"],
      docs: f.doc?.["#text"]
        ? [
            {
              description: f.doc?.["#text"],
              tags: parameters.map((p) => {
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
      returnType: getTypescriptType(f["return-value"]),
      parameters: parameters.map((p) => {
        const formattedName = getValidIdentifier(p["@name"]);

        return {
          name: formattedName,
          type: getTypescriptType(p),
        };
      }),
    });

    method.addStatements([
      Writers.returnStatement(
        generateFunctionBody({
          parameters: f.parameters,
          identifer: f["@c:identifier"],
          returnType: f["return-value"],
        })
      ),
    ]);

    ffiFunctions[f["@c:identifier"]] = generateFFIFunction({
      parameters: f.parameters,
      returnType: f["return-value"],
    });
  });

  method.forEach((f) => {
    const parameters = xmlList(f.parameters?.parameter);
    const method = classType.addMethod({
      name: f["@name"],
      docs: f.doc?.["#text"]
        ? [
            {
              description: f.doc?.["#text"],
              tags: parameters.map((p) => {
                const formattedName = getValidIdentifier(p["@name"]);

                return {
                  tagName: "param",
                  text: `${formattedName} ${p.doc?.["#text"]}`,
                };
              }),
            },
          ]
        : [],
      returnType: getTypescriptType(f["return-value"]),
      parameters: parameters.map((p) => {
        const formattedName = getValidIdentifier(p["@name"]);

        return {
          name: formattedName,
          type: getTypescriptType(p),
        };
      }),
    });

    method.addStatements([
      Writers.returnStatement(
        generateFunctionBody({
          parameters: f.parameters,
          identifer: f["@c:identifier"],
          returnType: f["return-value"],
        })
      ),
    ]);

    ffiFunctions[f["@c:identifier"]] = generateFFIFunction({
      parameters: f.parameters,
      returnType: f["return-value"],
    });
  });

  const constructors = xmlList(r.constructor).filter(
    (x) => typeof x !== "function"
  );

  constructors.forEach((c) => {
    if (c["@introspectable"] === 0) return;

    const parameters = xmlList(c.parameters?.parameter);
    const docs = c.doc?.["#text"]
      ? [
          {
            description: c.doc?.["#text"],
            tags: parameters.map((p) => {
              const formattedName = getValidIdentifier(p["@name"]);

              return {
                tagName: "param",
                text: `${formattedName} ${p.doc?.["#text"]}`,
              };
            }),
          },
        ]
      : [];

    const method =
      c["@name"] === "new"
        ? classType.addConstructor({
            docs,
            parameters: parameters.map((p) => {
              const formattedName = getValidIdentifier(p["@name"]);

              return {
                name: formattedName,
                type: getTypescriptType(p),
              };
            }),
          })
        : classType.addMethod({
            name: c["@name"],
            docs,
            isStatic: true,
            returnType: r["@name"],
            parameters: parameters.map((p) => {
              const formattedName = getValidIdentifier(p["@name"]);

              return {
                name: formattedName,
                type: getTypescriptType(p),
              };
            }),
          });

    const body = generateFunctionBody({
      parameters: c.parameters,
      identifer: c["@c:identifier"],
      returnType: c["return-value"],
      convertReturn: false,
    });

    if (c["@name"] === "new") {
      method.addStatements(["super()"]);
      method.addStatements(["this.internalPointer = " + body]);
    } else {
      method.addStatements([
        Writers.returnStatement(`this.fromPointer(${body})`),
      ]);
    }

    ffiFunctions[c["@c:identifier"]] = {
      parameters: xmlList(c.parameters?.parameter).map((p) =>
        goTypeToFFIType(p)
      ),
      result: "pointer",
    };
  });
});

console.log("function");

xmlList(namespace.function).forEach((f) => {
  if (f["@introspectable"] === 0) return;

  const parameters = xmlList(f.parameters?.parameter);
  const doc = f.doc?.["#text"];

  const func = sourceFile.addFunction({
    isExported: true,
    name: f["@name"],
    docs: doc
      ? [
          {
            description: doc,
            tags: parameters.map((p) => {
              const formattedName = getValidIdentifier(p["@name"]);

              return {
                tagName: "param",
                text: `${formattedName} ${p.doc?.["#text"]}`,
              };
            }),
          },
        ]
      : [],
    returnType: getTypescriptType(f["return-value"]),
    parameters: parameters.map((p) => {
      const formattedName = getValidIdentifier(p["@name"]);

      return {
        name: formattedName,
        type: getTypescriptType(p),
      };
    }),
  });

  func.addStatements([
    Writers.returnStatement(
      generateFunctionBody({
        parameters: f.parameters,
        identifer: f["@c:identifier"],
        returnType: f["return-value"],
      })
    ),
  ]);

  ffiFunctions[f["@c:identifier"]] = generateFFIFunction({
    parameters: f.parameters,
    returnType: f["return-value"],
  });
});

console.log("build");

sourceFile.insertVariableStatement(1, {
  isExported: true,
  declarationKind: VariableDeclarationKind.Const,
  declarations: [
    {
      name: "ffi",
      initializer: `Deno.dlopen(await dlSearch(${JSON.stringify(
        objectFile
      )}), ${JSON.stringify(ffiFunctions)})`,
    },
  ],
});

await sourceFile.save();
