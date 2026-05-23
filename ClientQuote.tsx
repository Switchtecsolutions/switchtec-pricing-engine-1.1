@config "../tailwind.config.js";

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f7f4ee;
  color: #2d2d2d;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

button,
input,
select,
textarea {
  font: inherit;
}

button,
input,
select,
textarea {
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.logo,
.header-logo,
.quote-logo,
img[alt="Switchtec logo"] {
  max-width: 220px;
  height: auto;
  object-fit: contain;
}

.quote-logo {
  max-width: 260px;
}

@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  body {
    background: white;
  }

  aside,
  header,
  .print\:hidden {
    display: none !important;
  }

  main {
    padding: 0 !important;
  }

  .lg\:pl-72 {
    padding-left: 0 !important;
  }

  .quote-page {
    display: block !important;
    width: 100%;
    max-width: 100% !important;
    break-inside: avoid;
  }

  .quote-page section,
  .quote-page footer {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
