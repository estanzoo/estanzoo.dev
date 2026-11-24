// design-tokens (blocking): colours come from the tokens in src/styles/global.css.
//
// Reads: string literals, JSX attribute strings and template literals of src/**/*.ts(x)
// (eslint.config.js scopes it and names the allow-listed files). The CSS side is
// tools/css-tokens/cssColours.ts.
// Bad:   <span style={{ color: '#FFB454' }} />
// Why:   a raw colour skips the palette: a palette change misses it and the design linter
//        cannot tell it from a typo. var(--accent) names the decision.
//
// One report per literal, naming the first raw colour in it that is not allowed. Option
// `allow`: exact hex values (any case) a file may carry, for a file whose colours are
// view-model values rather than styling.
import type { Rule } from 'eslint';

/** A raw hex (#rgb, #rgba, #rrggbb, #rrggbbaa) or an rgb()/rgba()/hsl()/hsla() call. */
const COLOUR = /(?<![\w#])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|(?<![\w-])(?:rgba?|hsla?)\(/gi;

/** Every raw colour in a text, as written, with its offset. Also used for CSS. */
export function allColours(text: string): { index: number; colour: string }[] {
  return [...text.matchAll(COLOUR)].map((m) => ({ index: m.index, colour: m[0] }));
}

/** The first raw colour in a text, as written, that is not in `allow`; or null. */
export function firstColour(text: string, allow: readonly string[] = []): string | null {
  const allowed = new Set(allow.map((c) => c.toLowerCase()));
  return allColours(text).find((c) => !allowed.has(c.colour.toLowerCase()))?.colour ?? null;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'No raw hex, rgb() or hsl() colours: use a var(--...) token.' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: { raw: 'Raw colour {{colour}}: use a var(--...) token from src/styles/global.css.' },
  },
  create(context) {
    const allow: string[] = context.options[0]?.allow ?? [];
    const check = (node: Rule.Node, text: string) => {
      const colour = firstColour(text, allow);
      if (colour) context.report({ node, messageId: 'raw', data: { colour } });
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateLiteral(node) {
        check(node, node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('\u0000'));
      },
    };
  },
};

export default rule;
