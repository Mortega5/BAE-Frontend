/**
 * The subset of JSON Schema (draft-07) the schema-driven forms understand. Schemas are data fetched
 * at runtime, so every keyword is optional and anything else is carried through untouched.
 */
export interface JsonSchema {
  $id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  format?: string;
  /** What a string holds (e.g. `application/yaml`); picks the editor for it. */
  contentMediaType?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  required?: string[];
  properties?: Record<string, JsonSchemaOrBool>;
  additionalProperties?: JsonSchemaOrBool;
  propertyNames?: JsonSchema;
  items?: JsonSchemaOrBool;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  [keyword: string]: unknown;
}

/** `false` on a property means "this property must not be present" (used by if/then branches). */
export type JsonSchemaOrBool = JsonSchema | boolean;

/** An object node after its `oneOf` branch and matching `if/then` blocks have been applied. */
export interface ResolvedObjectSchema {
  /** Properties to render, in schema order. Properties forbidden by the active branch are absent. */
  properties: Record<string, JsonSchema>;
  required: string[];
  /** Property names whose value selects a branch: a change to any of them means resolving again. */
  discriminators: string[];
  /** Title of the selected `oneOf` branch, when there is one. */
  branchTitle?: string;
}
