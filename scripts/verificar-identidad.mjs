import {readFile} from "node:fs/promises";

const requiredReferences = [
  ["src/app/page.tsx", "GevetLogo"],
  ["src/components/auth/auth-form.tsx", "GevetLogo"],
  ["src/app/onboarding/page.tsx", "GevetLogo"],
  ["src/components/layout/admin-shell.tsx", "GevetLogo"],
  ["src/app/layout.tsx", "/GEVET.svg"],
  ["public/manifest.webmanifest", "/GEVET.svg"],
];

const failures = [];
const svg = await readFile("public/GEVET.svg", "utf8");

if (!svg.trimStart().startsWith("<svg")) failures.push("public/GEVET.svg no es un SVG válido");
if (/<script\b/i.test(svg)) failures.push("public/GEVET.svg contiene una etiqueta script");
if (/\bon\w+\s*=/i.test(svg)) failures.push("public/GEVET.svg contiene un event handler embebido");

for (const [path, expected] of requiredReferences) {
  const source = await readFile(path, "utf8");
  if (!source.includes(expected)) failures.push(`${path} no referencia ${expected}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Identidad de GeVet verificada en el asset y las superficies principales.");
}
