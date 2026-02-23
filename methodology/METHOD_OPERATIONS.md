# Method Operations

## Rule 1: Use Pure CSS Only

All styling in this project must be written in pure CSS.

Do not use CSS frameworks, utility libraries, CSS-in-JS tooling, or any third-party styling dependency.

### Why this rule exists

Using pure CSS keeps the styling layer simple, transparent, and easy to maintain.  
It reduces dependency overhead, avoids framework lock-in, and helps us move faster with fewer integration issues as the project evolves

## Rule 2: Component-Scoped CSS Files Only

Do not keep styling in one large stylesheet.

All CSS must be organized into separate files by component or feature area (for example: topbar, sidebar, editor, modal), then composed through a small index stylesheet if needed.

### Why this rule exists

Component-scoped CSS keeps styles easier to find, review, and change without unintended side effects across the app.
