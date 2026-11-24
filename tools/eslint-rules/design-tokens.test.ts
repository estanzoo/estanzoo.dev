// R7 self-test of design-tokens: the rule reports exactly each string literal or template
// that holds a raw hex, rgb()/rgba() or hsl()/hsla() colour, and nothing else.
import { at, ruleTester } from './ruleTester';
import rule from './design-tokens';

const filename = at('src/components/demo/Demo.tsx');
const message = (colour: string) =>
  `Raw colour ${colour}: use a var(--...) token from src/styles/global.css.`;

ruleTester.run('design-tokens', rule, {
  valid: [
    { filename, code: "const a = 'var(--accent)';" },
    { filename, code: '<a href="#about" style={{ color: \'var(--fg)\' }} />;' },
    // Not colours: anchors, two or five or seven hex digits, a hex id inside a word.
    { filename, code: "const a = ['#top', '#12', '#12345', '#1234567', 'a#fff', '#fffx', 'rgbx(1,2,3)'];" },
    // Numbers and comments are not string literals.
    { filename, code: "const n = 0xfff; // #fff rgb(0, 0, 0)\n/* hsl(0, 0%, 0%) */" },
    // Option allow: exact hex values a file may carry, in any case.
    { filename, code: "const a = ['#F2F2F2', '#ff5a4d'];", options: [{ allow: ['#f2f2f2', '#FF5A4D'] }] },
  ],
  invalid: [
    {
      // An allowed value does not hide another colour in the same file or literal.
      filename,
      code: "const a = '#F2F2F2';\nconst b = '#F2F2F2 #000';\nconst c = 'rgb(1,2,3)';",
      options: [{ allow: ['#F2F2F2'] }],
      errors: [
        { message: message('#000'), line: 2, column: 11 },
        { message: message('rgb('), line: 3, column: 11 },
      ],
    },
    {
      filename,
      code: "const a = '#fff';\nconst b = \"#A1B2C3\";\nconst c = '#a1b2c3d4';\nconst d = '#abcd';",
      errors: [
        { message: message('#fff'), line: 1, column: 11, endLine: 1, endColumn: 17 },
        { message: message('#A1B2C3'), line: 2, column: 11 },
        { message: message('#a1b2c3d4'), line: 3, column: 11 },
        { message: message('#abcd'), line: 4, column: 11 },
      ],
    },
    {
      filename,
      code: "const a = 'rgb(1, 2, 3)';\nconst b = 'RGBA(0,0,0,.5)';\nconst c = 'hsl(10 20% 30%)';\nconst d = 'hsla(1,2%,3%,0.4)';",
      errors: [
        { message: message('rgb('), line: 1, column: 11 },
        { message: message('RGBA('), line: 2, column: 11 },
        { message: message('hsl('), line: 3, column: 11 },
        { message: message('hsla('), line: 4, column: 11 },
      ],
    },
    {
      filename,
      code: 'const a = `1px solid ${x} #000`;\n<i style={{ background: \'linear-gradient(#111, #222)\' }} />;',
      errors: [
        { message: message('#000'), line: 1, column: 11 },
        { message: message('#111'), line: 2, column: 25 },
      ],
    },
    {
      filename,
      code: '<i data-c="#123456" />;',
      errors: [{ message: message('#123456'), line: 1, column: 11 }],
    },
  ],
});
