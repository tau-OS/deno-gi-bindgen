export interface Root {
  xml: Xml;
  repository: Repository;
  "#comment": string[];
}

export interface Xml {
  "@version": number;
}

export interface Repository {
  "@xmlns": string;
  "@xmlns:c": string;
  "@xmlns:glib": string;
  "@version": number;
  include: Include[];
  package: Package;
  "c:include": CInclude;
  namespace: Namespace;
}

export interface Include {
  "@name": string;
  "@version": number;
  "#text": string | null;
}

export interface Package {
  "@name": string;
  "#text": string | null;
}

export interface CInclude {
  "@name": string;
  "#text": string | null;
}

export interface Namespace {
  "@name": string;
  "@version": number;
  "@shared-library": string;
  "@c:identifier-prefixes": string;
  "@c:symbol-prefixes": string;
  alias: Alias[];
  "function-macro": FunctionMacro[];
  constant: Constant[];
  class: Class[];
  record: Record[];
  interface: Interface[];
  enumeration: Enumeration[];
  bitfield: Bitfield[];
  callback: Callback[];
  union: Union[];
  "glib:boxed": GlibBoxed;
  function: Function[];
  docsection: Docsection;
}

export interface UnionField {
  "@name": string;
  "@readable"?: number;
  "@private"?: number;
  "@writable"?: number;
  type?: Type;
  array?: Array;
}

export interface Union {
  "@name": string;
  "@c:type": string;
  doc: Doc;
  field: UnionField[];
  method?: Method | Method[];
}
export interface Alias {
  "@name": string;
  "@c:type": string;
  doc: Doc;
  type: Type;
}

export interface Doc {
  "@xml:space": string;
  "#text": string;
}

export interface Type {
  "@name": string;
  "@c:type"?: string;
  "#text": string | null;
  type?: Type;
}

export interface FunctionMacro {
  "@name": string;
  "@c:identifier": string;
  "@introspectable": number;
  parameters: Parameters;
  doc?: Doc;
}

export interface Parameters {
  "instance-parameter"?: Parameter;
  parameter: Parameter | Parameter[];
}

export interface Constant {
  "@name": string;
  "@value": unknown;
  "@c:type": string;
  doc?: Doc;
  type: Type;
}

export interface Class {
  "@name": string;
  "@c:symbol-prefix": string;
  "@c:type"?: string;
  "@parent"?: string;
  "@abstract"?: number;
  "@glib:type-name": string;
  "@glib:get-type": string;
  "@glib:type-struct"?: string;
  doc: Doc;
  constructor?: Constructor | undefined[];
  method: any;
  property: any;
  "glib:signal": any;
  implements: any;
  function: any;
  "virtual-method": any;
  field: any;
  "@glib:fundamental"?: number;
  "@glib:ref-func"?: string;
  "@glib:unref-func"?: string;
  "@glib:set-value-func"?: string;
  "@glib:get-value-func"?: string;
  "@version"?: number;
}

export interface Constructor {
  "@name": string;
  "@c:identifier": string;
  doc?: Doc;
  "return-value": ReturnValue;
  parameters?: Parameters;
  "@introspectable"?: number;
  "@shadows"?: string;
  "@shadowed-by"?: string;
  "@version"?: number;
  "@throws"?: number;
}

export interface ReturnValue {
  "@transfer-ownership": string;
  doc?: Doc;
  type?: Type;
  "@nullable"?: number;
  array?: Array;
}

export interface Record {
  "@name": string;
  "@c:type": string;
  "@disguised"?: number;
  "@glib:is-gtype-struct-for"?: string;
  "@introspectable"?: number;
  "#text": string | null;
  doc?: Doc;
  field: any;
  "@glib:type-name"?: string;
  "@glib:get-type"?: string;
  "@c:symbol-prefix"?: string;
  constructor?: Constructor | undefined[];
  method?: Method | Method[];
  function?: Function | Function[];
}

export interface Method {
  "@name": string;
  "@c:identifier": string;
  "@introspectable"?: number;
  doc: Doc;
  "return-value": ReturnValue;
  parameters: Parameters;
  "@shadowed-by"?: string;
  "@shadows"?: string;
  "@throws"?: number;
}

export interface Array {
  "@length"?: number;
  "@zero-terminated"?: number;
  "@c:type": string;
  type: Type;
  "@name"?: string;
}

export interface Parameter {
  "@name": string;
  "@transfer-ownership": string;
  doc?: Doc;
  type: Type;
  "@nullable"?: number;
  "@allow-none"?: number;
  array?: Array;
}

export interface Function {
  "@name": string;
  "@c:identifier": string;
  doc?: Doc;
  "return-value": ReturnValue;
  parameters?: Parameters;
  "@introspectable"?: number;
  "@version"?: number;
  "@moved-to"?: string;
  "@throws"?: number;
}

export interface Interface {
  "@name": string;
  "@c:symbol-prefix": string;
  "@c:type": string;
  "@glib:type-name": string;
  "@glib:get-type": string;
  "@glib:type-struct"?: string;
  doc: Doc;
  method: any;
  property: any;
  prerequisite: any;
  "virtual-method": any;
  "glib:signal": any;
  function: any;
  "@version"?: number;
}

export interface Enumeration {
  "@name": string;
  "@glib:type-name"?: string;
  "@glib:get-type"?: string;
  "@c:type": string;
  doc: Doc;
  member: Member | Member[];
  function?: Function;
  "@glib:error-domain"?: string;
  "@version"?: number;
}

export interface Member {
  "@name": string;
  "@value": number;
  "@c:identifier": string;
  "@glib:nick": string;
  "@glib:name"?: string;
  doc: Doc;
}

export interface Bitfield {
  "@name": string;
  "@glib:type-name": string;
  "@glib:get-type": string;
  "@c:type": string;
  doc: Doc;
  member: Member | Member[];
}

export interface Callback {
  "@name": string;
  "@c:type": string;
  doc?: Doc;
  "return-value": ReturnValue;
  parameters?: Parameters;
}

export interface GlibBoxed {
  "@glib:name": string;
  "@c:symbol-prefix": string;
  "@glib:type-name": string;
  "@glib:get-type": string;
  "#text": string | null;
}

export interface Docsection {
  "@name": string;
  doc: Doc;
}
