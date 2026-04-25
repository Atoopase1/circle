const fs = require('fs');
let css = fs.readFileSync('src/app/globals.css', 'utf8');
css = css.replace(/@theme inline \{[\s\S]*?\}/, `@theme inline {
  --color-background: var(--bg-app);
  --color-foreground: var(--text-primary);
  --font-sans: var(--font-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif);
  --text-xs: calc(0.75rem * var(--text-scale, 1));
  --text-sm: calc(0.875rem * var(--text-scale, 1));
  --text-base: calc(1rem * var(--text-scale, 1));
  --text-lg: calc(1.125rem * var(--text-scale, 1));
  --text-xl: calc(1.25rem * var(--text-scale, 1));
  --text-2xl: calc(1.5rem * var(--text-scale, 1));
  --text-3xl: calc(1.875rem * var(--text-scale, 1));
  --text-4xl: calc(2.25rem * var(--text-scale, 1));
}`);
fs.writeFileSync('src/app/globals.css', css);
