const sharp = require("sharp");
const path = require("path");

const src = path.join(__dirname, "../public/logo.png.png");

async function makeIcon(size, destName) {
  const logoBuffer = await sharp(src)
    .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
      fit: "contain",
      background: { r: 37, g: 99, b: 235, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 37, g: 99, b: 235, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(path.join(__dirname, "../public", destName));

  console.log(`${destName} (${size}x${size}) 생성 완료`);
}

Promise.all([
  makeIcon(192, "icon-192.png"),
  makeIcon(512, "icon-512.png"),
]).catch(console.error);
