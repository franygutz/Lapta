const fs = require("node:fs");
const sharp = require("sharp");
async function main() {
  fs.mkdirSync("assets", { recursive: true });
  await sharp("identidad-marca/lapta-isotipo.svg", { density: 200 })
    .trim()
    .resize(720, 720, { fit: "contain", background: "#FFF9EF" })
    .flatten({ background: "#FFF9EF" })
    .extend({
      top: 152,
      bottom: 152,
      left: 152,
      right: 152,
      background: "#FFF9EF",
    })
    .png()
    .toFile("assets/icon.png");
  for (const name of ["logotipo", "imagotipo"]) {
    await sharp(`identidad-marca/lapta-${name}.svg`, { density: 200 })
      .trim()
      .resize({ width: 600 })
      .flatten({ background: "#FFF9EF" })
      .png()
      .toFile(`assets/${name}.png`);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
