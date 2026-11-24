// The site's stylesheets in the cascade order of the real page: the same imports as
// src/main.tsx (App pulls in every component's CSS, then global.css). The screen
// renderer loads this in the dev server and builds it for standalone pages, so a mock
// renders with exactly the CSS the site ships. Keep in step with src/main.tsx.
import '../App';
import '../styles/global.css';
