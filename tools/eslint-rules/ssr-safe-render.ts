// ssr-safe-render: no browser globals on the render path, because the site is pre-rendered
// in Node (scripts/prerender.mjs) and then hydrated.
//
// Reads: section Views and containers (eslint.config.js scopes it). Globals: window,
// document, navigator, localStorage, sessionStorage, matchMedia.
// Bad:   export function Hero() { const reduce = window.matchMedia('(...)').matches; ... }
// Why:   the pre-render throws (no window in Node), or, behind a typeof guard, the server
//        and the first client render differ and hydration breaks.
//
// In a *View.tsx every read is reported: a View draws only its VM. In any other file a
// read is reported when it runs while rendering or when the module loads:
//   - module top level, the body of a component (Capitalized) or a hook (use...);
//   - a function that is not deferred and sits on the render path: callbacks such as
//     .map(), useState()/useMemo() initialisers and IIFEs run where they are written;
//   - a named local or module function that is called on the render path.
// Deferred, never reported: the first argument of useEffect, useLayoutEffect,
// useInsertionEffect and useCallback; a function written in an on* or ref JSX attribute;
// a named function that is only called from deferred code or only passed by name (e.g.
// onClick={onKey}). Limit: a named function passed by name to a render-time call
// (items.map(helper), useState(init)) and reads through globalThis/self are not seen.
import type { Rule, Scope } from 'eslint';

const GLOBALS = new Set(['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'matchMedia']);
const DEFERRED_HOOKS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback']);
const TYPE_CONTEXT = new Set(['TSTypeAnnotation', 'TSTypeAliasDeclaration', 'TSInterfaceDeclaration', 'TSTypeQuery', 'TSTypeReference']);

// The parser's nodes carry JSX and TS types that estree does not know; walk them loosely.
type AnyNode = { type: string; parent?: AnyNode | null } & Record<string, unknown>;

const isFunction = (n: AnyNode) =>
  n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression';

function enclosingFunction(node: AnyNode): AnyNode | null {
  for (let n = node.parent; n; n = n.parent) if (isFunction(n)) return n;
  return null;
}

const calleeName = (call: AnyNode): string | null => {
  const callee = call.callee as AnyNode;
  if (callee.type === 'Identifier') return callee.name as string;
  if (callee.type === 'MemberExpression' && (callee.property as AnyNode).type === 'Identifier') {
    return (callee.property as AnyNode).name as string;
  }
  return null;
};

/** The binding a function is declared under: function f() {} or const f = () => ... */
function bindingOf(fn: AnyNode): AnyNode | null {
  if (fn.type === 'FunctionDeclaration' && fn.id) return fn;
  const parent = fn.parent!;
  if (parent.type === 'VariableDeclarator' && parent.init === fn && (parent.id as AnyNode).type === 'Identifier') {
    return parent;
  }
  return null;
}

function nameOf(fn: AnyNode): string | null {
  if (fn.id) return (fn.id as AnyNode).name as string;
  const binding = bindingOf(fn);
  return binding ? ((binding.id as AnyNode).name as string) : null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'No browser globals on the render path of a View or container.' },
    schema: [],
    messages: {
      view: '{{name}} is not available while the page pre-renders: a View draws only its view model and never reads {{name}}.',
      render:
        '{{name}} is not available while the page pre-renders: read it in a useEffect/useLayoutEffect callback, an event handler or a ref callback, not on the render path.',
    },
  },
  create(context) {
    const isView = context.filename.endsWith('View.tsx');
    const sourceCode = context.sourceCode;

    function isDeferred(fn: AnyNode): boolean {
      const parent = fn.parent!;
      if (parent.type === 'CallExpression' && (parent.arguments as AnyNode[])[0] === fn) {
        const name = calleeName(parent);
        if (name && DEFERRED_HOOKS.has(name)) return true;
      }
      if (parent.type === 'JSXExpressionContainer' && parent.parent?.type === 'JSXAttribute') {
        const attr = (parent.parent.name as AnyNode).name;
        return typeof attr === 'string' && (attr === 'ref' || /^on[A-Z]/.test(attr));
      }
      return false;
    }

    /** True when node runs while rendering or when the module loads. */
    function onRenderPath(node: AnyNode, visiting: Set<AnyNode>): boolean {
      const fn = enclosingFunction(node);
      if (!fn) return true;
      const name = nameOf(fn);
      if (name && /^([A-Z]|use[A-Z0-9])/.test(name)) return true;
      if (isDeferred(fn)) return false;
      const binding = bindingOf(fn);
      if (!binding) return onRenderPath(fn, visiting);
      if (visiting.has(fn)) return false;
      const next = new Set(visiting).add(fn);
      const variables = sourceCode.getDeclaredVariables(binding as unknown as Rule.Node);
      return variables.some((variable) =>
        variable.references.some((ref) => {
          const id = ref.identifier as unknown as AnyNode;
          const call = id.parent!;
          return call.type === 'CallExpression' && call.callee === id && onRenderPath(call, next);
        }),
      );
    }

    const inTypePosition = (node: AnyNode) => {
      for (let n = node.parent; n; n = n.parent) if (TYPE_CONTEXT.has(n.type)) return true;
      return false;
    };

    function check(ref: Scope.Reference) {
      const id = ref.identifier as unknown as AnyNode;
      const name = id.name as string;
      if (!GLOBALS.has(name) || inTypePosition(id)) return;
      if (isView) {
        context.report({ node: ref.identifier, messageId: 'view', data: { name } });
      } else if (onRenderPath(id, new Set())) {
        context.report({ node: ref.identifier, messageId: 'render', data: { name } });
      }
    }

    return {
      'Program:exit'() {
        const global = sourceCode.scopeManager.globalScope!;
        // Unresolved names, plus names the config declares as globals.
        for (const ref of global.through) check(ref);
        for (const variable of global.variables) {
          if (GLOBALS.has(variable.name)) for (const ref of variable.references) check(ref);
        }
      },
    };
  },
};

export default rule;
