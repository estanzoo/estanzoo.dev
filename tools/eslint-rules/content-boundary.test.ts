// R7 self-test of content-boundary: the rule reports exactly the imports of src/content.ts
// from files that are not src/App.tsx or a section container, and nothing else.
import { at, ruleTester } from './ruleTester';
import rule from './content-boundary';

const message =
  "Only src/App.tsx and section containers (src/components/<section>/<Section>.tsx) may import src/content.ts; pass the copy in through the view model.";

ruleTester.run('content-boundary', rule, {
  valid: [
    { filename: at('src/App.tsx'), code: "import { site } from './content';" },
    { filename: at('src/components/hero/Hero.tsx'), code: "import { site } from '../../content';" },
    { filename: at('src/components/contact/Contact.tsx'), code: "import { site } from '../../content.ts';" },
    // Another module whose name ends in "content" is not src/content.ts.
    { filename: at('src/components/hero/HeroView.tsx'), code: "import { x } from './content';" },
    { filename: at('src/components/hero/heroVm.ts'), code: "import { x } from '../../vm/content';" },
    // An explicit allow-list entry.
    {
      filename: at('src/terminal.ts'),
      code: "import { site } from './content';",
      options: [{ allow: ['src/terminal.ts'] }],
    },
  ],
  invalid: [
    {
      filename: at('src/components/hero/HeroView.tsx'),
      code: "import type { X } from 'react';\nimport { site } from '../../content';",
      errors: [{ message, line: 2, column: 22, endLine: 2, endColumn: 37 }],
    },
    {
      filename: at('src/components/hero/heroVm.ts'),
      code: "export { site } from '../../content.ts';",
      errors: [{ message, line: 1, column: 22 }],
    },
    {
      filename: at('src/terminal.ts'),
      code: "export * from './content';",
      errors: [{ message, line: 1, column: 15 }],
    },
    {
      filename: at('src/components/hero/Hero.helper.tsx'),
      code: "const c = import('../../content');",
      errors: [{ message, line: 1, column: 18 }],
    },
    {
      // A lower-case file in a section folder is a helper, not the container.
      filename: at('src/components/hero/lines.tsx'),
      code: "import { site } from '../../content';",
      errors: [{ message, line: 1, column: 22 }],
    },
    {
      // A container-looking file outside src/components/<section>/ is not a container.
      filename: at('src/Other.tsx'),
      code: "import { site } from './content';",
      errors: [{ message, line: 1, column: 22 }],
    },
  ],
});
