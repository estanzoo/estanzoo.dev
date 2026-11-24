// Screen registry: one line per section that the screen renderer can draw from
// mocks/<section>/<state>.json (npm run screens). A section joins when its View +
// container refactor lands: add its line here and its mocks under mocks/<section>/.
import { aboutVmSchema } from '../components/about/aboutVm';
import { AboutView } from '../components/about/AboutView';
import { contactVmSchema } from '../components/contact/contactVm';
import { ContactView } from '../components/contact/ContactView';
import { headerVmSchema } from '../components/header/headerVm';
import { HeaderView } from '../components/header/HeaderView';
import { defineScreen } from './defineScreen';
import type { Screen } from './defineScreen';

export const screens: Screen[] = [
  defineScreen({ section: 'header', schema: headerVmSchema, View: HeaderView }),
  defineScreen({ section: 'about', schema: aboutVmSchema, View: AboutView }),
  defineScreen({ section: 'contact', schema: contactVmSchema, View: ContactView }),
];
