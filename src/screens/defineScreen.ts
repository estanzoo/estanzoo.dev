// One entry of the screen registry (src/screens/registry.ts): a section, the strict zod
// schema of its view model and the logic-free View that draws it. The screen renderer
// (tools/screens) parses a mock's 'vm' with the schema and renders the View with it.
import type { ComponentType } from 'react';
import type { z } from 'zod';

export type Screen = {
  section: string;
  schema: z.ZodType<unknown>;
  View: ComponentType<{ vm: never }>;
};

/** Ties the schema and the View to one VM type, then erases it for the registry list. */
export function defineScreen<VM>(screen: {
  section: string;
  schema: z.ZodType<VM>;
  View: ComponentType<{ vm: VM }>;
}): Screen {
  return screen as Screen;
}
