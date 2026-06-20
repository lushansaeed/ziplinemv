import { hexToRgbTriplet, themeCssVariables } from "@/lib/theme";

export function ThemeScript() {
  const script = `
    (function () {
      try {
        var theme = JSON.parse(window.localStorage.getItem("zipline-theme") || "null");
        if (!theme) return;
        var variables = ${JSON.stringify(themeCssVariables)};
        var hexToRgb = ${hexToRgbTriplet.toString()};
        Object.keys(theme).forEach(function (key) {
          if (variables[key]) document.documentElement.style.setProperty(variables[key], hexToRgb(theme[key]));
        });
      } catch (error) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
