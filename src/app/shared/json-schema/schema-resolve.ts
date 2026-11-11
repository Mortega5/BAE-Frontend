import { JsonSchema, JsonSchemaOrBool, ResolvedObjectSchema } from './json-schema.model';

type ObjectValue = Record<string, unknown> | null | undefined;

/**
 * Applies the two composition patterns the published schemas use to an object node, for the value it
 * currently holds:
 *
 * - `oneOf` whose branches pin a sibling with `const` (a discriminated union, e.g. `type: helm`): the
 *   matching branch is merged onto the node.
 * - `allOf` of `if {properties: {x: {const}}} then {...}` blocks (e.g. per `backend`): every block whose
 *   condition holds is merged. A property set to `false` in a merged fragment is removed, and the
 *   fragment's `required` is added.
 *
 * Validation stays with ajv on the full schema; this only decides what to render.
 */
export function resolveObjectSchema(node: JsonSchema, value: ObjectValue): ResolvedObjectSchema {
  const resolved: ResolvedObjectSchema = {
    properties: {},
    required: [...(node.required ?? [])],
    discriminators: discriminatorsOf(node),
  };
  for (const [name, schema] of Object.entries(node.properties ?? {})) {
    if (schema === false) continue;
    resolved.properties[name] = schema === true ? {} : { ...schema };
  }

  const branch = (node.oneOf ?? []).find(candidate => pinnedConstsMatch(candidate, value));
  if (branch) {
    mergeFragment(resolved, branch);
    resolved.branchTitle = branch.title;
  }

  for (const block of node.allOf ?? []) {
    if (block.if) {
      const fragment = conditionHolds(block.if, value) ? block.then : block.else;
      if (fragment) mergeFragment(resolved, fragment);
    } else {
      mergeFragment(resolved, block);
    }
  }

  return resolved;
}

/** Shallow keyword merge, recursing into `properties` and taking the union of `required`. */
export function mergeSchemas(base: JsonSchema | undefined, overlay: JsonSchema): JsonSchema {
  if (!base) return { ...overlay };
  const merged: JsonSchema = { ...base, ...overlay };
  if (base.properties && overlay.properties) {
    const properties: Record<string, JsonSchemaOrBool> = { ...base.properties };
    for (const [name, schema] of Object.entries(overlay.properties)) {
      const current = properties[name];
      properties[name] = typeof schema === 'boolean' || typeof current !== 'object'
        ? schema
        : mergeSchemas(current, schema);
    }
    merged.properties = properties;
  }
  if (base.required || overlay.required) {
    merged.required = union(base.required ?? [], overlay.required ?? []);
  }
  return merged;
}

/** The properties a branch selector reads: pinned with `const` in a `oneOf` branch or an `if`. */
export function discriminatorsOf(node: JsonSchema): string[] {
  const names = new Set<string>();
  const collect = (schema: JsonSchema | undefined) => {
    for (const [name, prop] of Object.entries(schema?.properties ?? {})) {
      if (typeof prop === 'object' && 'const' in prop) names.add(name);
    }
  };
  (node.oneOf ?? []).forEach(collect);
  (node.allOf ?? []).forEach(block => collect(block.if));
  return [...names];
}

function mergeFragment(resolved: ResolvedObjectSchema, fragment: JsonSchema): void {
  for (const [name, schema] of Object.entries(fragment.properties ?? {})) {
    if (schema === false) {
      delete resolved.properties[name];
      resolved.required = resolved.required.filter(r => r !== name);
    } else if (schema !== true) {
      resolved.properties[name] = mergeSchemas(resolved.properties[name], schema);
    }
  }
  resolved.required = union(resolved.required, (fragment.required ?? []).filter(r => r in resolved.properties));
}

/** A `oneOf` branch matches when every sibling it pins with `const` holds that value. */
function pinnedConstsMatch(branch: JsonSchema, value: ObjectValue): boolean {
  const pinned = Object.entries(branch.properties ?? {})
    .filter(([, prop]) => typeof prop === 'object' && 'const' in prop);
  return pinned.length > 0 && pinned.every(([name, prop]) => value?.[name] === (prop as JsonSchema).const);
}

/** Only `const`, `enum` and `required` conditions are evaluated; that is all the schemas use. */
function conditionHolds(condition: JsonSchema, value: ObjectValue): boolean {
  if (!(condition.required ?? []).every(name => value?.[name] !== undefined)) return false;
  return Object.entries(condition.properties ?? {}).every(([name, prop]) => {
    if (typeof prop !== 'object') return true;
    const actual = value?.[name];
    if ('const' in prop) return actual === prop.const;
    if (prop.enum) return prop.enum.includes(actual);
    return true;
  });
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}
