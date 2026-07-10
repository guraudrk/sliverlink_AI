const sharp = require("sharp");
const path = require("path");

const src = path.join(__dirname, "../public/logo.png.png");
const dest = path.join(__dirname, "../public/badge-icon.png");

async function run() {
  const { data, info } = await sharp(src)
    .resize(96, 96)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 흰색/밝은 배경 → 투명, 컬러 로고 픽셀 → 흰색 불투명
  const rgba = Buffer.allocUnsafe(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4 + 0];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const isBackground = r > 235 && g > 235 && b > 235;
    rgba[i * 4 + 0] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = isBackground ? 0 : 255;
  }

  await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(dest);

  console.log("badge-icon.png 생성 완료");
}

run().catch(console.error);
