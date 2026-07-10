const sharp = require("sharp");
const path = require("path");

const src = path.join(__dirname, "../public/logo.png.png");
const dest = path.join(__dirname, "../public/notification-icon.png");

async function run() {
  const logoBuffer = await sharp(src)
    .resize(160, 160, { fit: "contain", background: { r: 37, g: 99, b: 235, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 192, height: 192, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 1 } },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(dest);

  console.log("notification-icon.png 생성 완료");
}

run().catch(console.error);
