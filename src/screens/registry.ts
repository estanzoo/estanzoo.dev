// Screen registry: one line per section that the screen renderer can draw from
// mocks/<section>/<state>.json (npm run screens). A section joins when its View +
// container refactor lands: add its line here and its mocks under mocks/<section>/.
import { contactVmSchema } from '../components/contact/contactVm';
import { ContactView } from '../components/contact/ContactView';
import { projectsVmSchema } from '../components/projects/projectsVm';
import { ProjectsView } from '../components/projects/ProjectsView';
import { defineScreen } from './defineScreen';
import type { Screen } from './defineScreen';

export const screens: Screen[] = [
  defineScreen({ section: 'contact', schema: contactVmSchema, View: ContactView }),
  defineScreen({ section: 'projects', schema: projectsVmSchema, View: ProjectsView }),
];
