const sharp = require("sharp");
const { mkdir } = require("node:fs/promises");

async function main() {
  const outDir = "mobile/store/android";
  await mkdir(outDir, { recursive: true });

  await sharp("mobile/assets/images/icon.png")
    .resize(512, 512)
    .png()
    .toFile(`${outDir}/icon-512.png`);

  const banner = await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 3,
      background: "#142033",
    },
  })
    .png()
    .toBuffer();

  const mark = await sharp("mobile/assets/images/icon.png")
    .resize(280, 280)
    .png()
    .toBuffer();

  await sharp(banner)
    .composite([{ input: mark, left: 80, top: 110 }])
    .png()
    .toFile(`${outDir}/feature-graphic.png`);

  const feature = await sharp(`${outDir}/feature-graphic.png`).metadata();
  const icon = await sharp(`${outDir}/icon-512.png`).metadata();
  console.log(`icon-512 ${icon.width}x${icon.height}`);
  console.log(`feature-graphic ${feature.width}x${feature.height}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
