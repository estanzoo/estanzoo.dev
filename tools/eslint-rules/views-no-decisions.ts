// views-no-decisions (blueprint R7 "No decisions", owner decision 3): a View decides
// nothing and holds no state.
//
// Reads: *View.tsx files (eslint.config.js scopes the rule; the rule itself checks every
// file it is given).
// Bad:   {vm.link && <a href={vm.link}>...</a>}   or   const [open] = useState(false);
// Why:   a branch in a View is a state no mock is forced to show and no type covers. Put
//        it in the VM as a union slot (<Render>) or a nullable value (<Optional>), so the
//        mock contract test (src/screens/contract.test.ts) covers every branch.
//
// Reports &&, ||, ?? (and &&=, ||=, ??=), ?:, if, switch, and any call of use<Upper>...
// Allowed: property reads, .map, optional calls of callbacks (onX?.()), <Render>,
// <Optional> and JSX. Limits: optional chaining (a?.b) and default parameter values are
// not reported.
import type { Rule } from 'eslint';

const HOOK = /^use[A-Z0-9]/;

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'A View has no &&, ||, ??, ?:, if, switch or hooks.' },
    schema: [],
    messages: {
      decision:
        'A View decides nothing: no {{what}}. Move the decision into the container and give the View a <Render> union slot or an <Optional> value.',
      hook: 'A View holds no state or effects: no hook {{name}}(). Move it into the container and pass the result through the view model.',
    },
  },
  create(context) {
    const decision = (node: Rule.Node, what: string) => context.report({ node, messageId: 'decision', data: { what } });
    return {
      LogicalExpression: (node) => decision(node, node.operator),
      AssignmentExpression(node) {
        if (['&&=', '||=', '??='].includes(node.operator)) decision(node, node.operator);
      },
      ConditionalExpression: (node) => decision(node, '?:'),
      IfStatement: (node) => decision(node, 'if'),
      SwitchStatement: (node) => decision(node, 'switch'),
      CallExpression(node) {
        const callee = node.callee;
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier'
              ? callee.property.name
              : null;
        if (name && HOOK.test(name)) context.report({ node, messageId: 'hook', data: { name } });
      },
    };
  },
};

export default rule;
