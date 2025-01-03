// import { Canvas, loadImage, FontLibrary } from 'skia-canvas';
import { registerFont, loadImage, Canvas, Image } from 'canvas';
// import { promises as fs } from 'fs';
import fs from 'fs';

import { roundRect, drawBackground, drawWatermarks } from './Utils';

// FontLibrary.use('Burbank Big Regular', 'assets/Fonts/BurbankBigRegular-Black.otf');
registerFont('./assets/Fonts/BurbankBigRegular-Black.otf', {
  family: 'Burbank Big Regular',
  style: 'Black',
});

interface KeyValuePair {
  [key: string]: any;
}

const mult = 0.5;
const gap = 60 * mult;
const imgX = 500 * mult;
const imgY = 530 * mult;
let fontSize: number;
let textWidth: number;

const imgCache: {
  [key: string]: Canvas;
} = {};

const getCachedImage = async (
  path: string,
  x = 100,
  y = 100,
): Promise<Canvas> => {
  if (imgCache[path]) {
    return imgCache[path]!;
  }

  const canvas = new Canvas(x, y);
  const ctx = canvas.getContext('2d');

  const img = await loadImage(path);
  ctx.drawImage(img, 0, 0, x, y);

  imgCache[path] = canvas;

  return canvas;
};

const cache: { [key: string]: Image } = {};

const overlayColors: KeyValuePair = {
  common: 'rgba(96,170,58,1)',
  uncommon: 'rgba(96,170,58,1)',
  rare: 'rgba(73,172,242,1)',
  epic: 'rgba(177,91,226,1)',
  legendary: 'rgba(211,120,65,1)',
  marvel: 'rgba(168,53,56,1)',
  dark: 'rgba(179,62,187,1)',
  dc: 'rgba(80,97,122,1)',
  icon: 'rgba(43,134,135,1)',
  lava: 'rgba(185,102,100,1)',
  frozen: 'rgba(148,215,244,1)',
  shadow: 'rgba(66,64,63,1)',
  starwars: 'rgba(231,196,19,1)',
  slurp: 'rgba(0,233,176,1)',
  platform: 'rgba(117,108,235,1)',
  gaminglegends: 'rgba(117,108,235,1)',
};

const drawLockerItem = async (item: KeyValuePair) => {
  const outpath = `./Cosmetics/${item.type}/${item.rarity}/${item.id}.png`;

  const canvas = new Canvas(imgX, imgY);
  const ctx = canvas.getContext('2d');

  const cosmetic = await loadImage(item.image);

  let background = await getCachedImage(
    './assets/Locker/Backgrounds/Common.png',
    imgX,
    imgY,
  );
  let overlay = await getCachedImage(
    './assets/Locker/Overlays/Common.png',
    imgX,
    imgY,
  );

  switch (item.rarity) {
    case 'uncommon':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Uncommon.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Uncommon.png',
        imgX,
        imgY,
      );
      break;

    case 'rare':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Rare.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Rare.png',
        imgX,
        imgY,
      );
      break;

    case 'epic':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Epic.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Epic.png',
        imgX,
        imgY,
      );
      break;

    case 'legendary':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Legendary.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Legendary.png',
        imgX,
        imgY,
      );
      break;

    case 'marvel':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Marvel.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Marvel.png',
        imgX,
        imgY,
      );
      break;

    case 'dark':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Dark.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Dark.png',
        imgX,
        imgY,
      );
      break;

    case 'dc':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/DC.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/DC.png',
        imgX,
        imgY,
      );
      break;

    case 'icon':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Icon.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Icon.png',
        imgX,
        imgY,
      );
      break;

    case 'lava':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Lava.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Lava.png',
        imgX,
        imgY,
      );
      break;

    case 'frozen':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Frozen.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Frozen.png',
        imgX,
        imgY,
      );
      break;

    case 'shadow':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Shadow.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Shadow.png',
        imgX,
        imgY,
      );
      break;

    case 'starwars':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/StarWars.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/StarWars.png',
        imgX,
        imgY,
      );
      break;

    case 'slurp':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/Slurp.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/Slurp.png',
        imgX,
        imgY,
      );
      break;

    case 'platform':
    case 'gaminglegends':
      background = await getCachedImage(
        './assets/Locker/Backgrounds/GamingLegends.png',
        imgX,
        imgY,
      );
      overlay = await getCachedImage(
        './assets/Locker/Overlays/GamingLegends.png',
        imgX,
        imgY,
      );
      break;
  }

  if (item.isExclusive) {
    background = await getCachedImage(
      './assets/Locker/Backgrounds/Exclusive.png',
      imgX,
      imgY,
    );
    overlay = await getCachedImage(
      './assets/Locker/Overlays/Exclusive.png',
      imgX,
      imgY,
    );
  }

  if (item.isCrew) {
    background = await getCachedImage(
      './assets/Locker/Backgrounds/Crew.png',
      imgX,
      imgY,
    );
    overlay = await getCachedImage(
      './assets/Locker/Overlays/Crew.png',
      imgX,
      imgY,
    );
  }

  if (item.isSTW) {
    background = await getCachedImage(
      './assets/Locker/Backgrounds/STW.png',
      imgX,
      imgY,
    );
    overlay = await getCachedImage(
      './assets/Locker/Overlays/STW.png',
      imgX,
      imgY,
    );
  }

  ctx.drawImage(background, 0, 0);
  if (item.type === 'banner') {
    ctx.drawImage(cosmetic, 0, 0, imgX, imgY);
  } else {
    ctx.drawImage(cosmetic, 0, 0 - imgY * 0.05, imgY * 0.9, imgY * 0.9);
  }
  ctx.drawImage(overlay, 0, 0);

  fontSize = imgY * 0.1;
  ctx.font = `italic ${fontSize}px Burbank Big Rg Bk`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';

  textWidth = ctx.measureText(item.name.toUpperCase()).width;
  while (textWidth > imgX * 0.9) {
    fontSize -= 1;
    ctx.font = `italic ${fontSize}px Burbank Big Rg Bk`;
    textWidth = ctx.measureText(item.name.toUpperCase()).width;
  }

  ctx.fillText(item.name.toUpperCase(), imgX / 2, imgY * 0.8);

  const rarityText = `${item.rarity.toUpperCase()} ${item.type.toUpperCase()}`;

  const rarity: string = item.series ?? item.rarity;
  ctx.fillStyle = overlayColors[rarity] ?? overlayColors.common;

  fontSize = imgY * 0.1;
  ctx.font = `italic ${fontSize}px Burbank Big Rg Bk`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  textWidth = ctx.measureText(rarityText).width;
  while (textWidth > imgX * 0.9) {
    fontSize -= 1;
    ctx.font = `italic ${fontSize}px Burbank Big Rg Bk`;
    textWidth = ctx.measureText(rarityText).width;
  }

  ctx.fillText(rarityText, imgX / 2, imgY * 0.885);

  try {
    // save the file
    await fs.promises.writeFile(outpath, canvas.toBuffer('image/png'));
  } catch (e) {
    let outdir: any = outpath.split('/');
    outdir.pop();
    outdir = outdir.join('/');
    await fs.promises.mkdir(outdir, {
      recursive: true,
    });

    // save the file
    await fs.promises.writeFile(outpath, canvas.toBuffer('image/png'));
  }

  return outpath;
};

const drawLocker = async (
  items: KeyValuePair[],
  epicname: string,
  username: string,
): Promise<Buffer> => {
  const renderedLength = Math.ceil(Math.sqrt(items.length));

  const cX = imgX * renderedLength + gap + renderedLength * gap;
  const headerScale = cX / 2000;
  const cY =
    imgY * Math.ceil(items.length / renderedLength) +
    gap +
    renderedLength * gap +
    headerScale * 128 +
    headerScale * 80;
  const canvas = new Canvas(cX, cY); // create a canvas
  const ctx = canvas.getContext('2d'); // get the context

  drawBackground(ctx, cX, cY);

  let featuredX = gap;
  let featuredY = gap * 2 + 128 * headerScale;
  let rendered = 0;

  // eslint-disable-next-line no-restricted-syntax
  for await (const item of items) {
    ctx.fillStyle = '#fff';
    roundRect(
      ctx,
      featuredX - gap / 4,
      featuredY - gap / 4,
      imgX + gap / 2,
      imgY + gap / 2,
      10,
      true,
      false,
    );

    let img;
    try {
      img = await loadImage(
        `./Cosmetics/${item.type}/${item.rarity}/${item.id}.png`,
      );
    } catch (e) {
      img = await loadImage(await drawLockerItem(item));
    }
    ctx.drawImage(img, featuredX, featuredY);

    featuredX += imgX + gap;
    // eslint-disable-next-line no-plusplus
    rendered++;
    if (rendered % renderedLength === 0) {
      featuredX = gap;
      featuredY += imgY + gap;
    }
  }

  if (!cache.lockerIcon) {
    cache.lockerIcon = await loadImage('./assets/LockerIcon.png');
  }

  drawWatermarks(
    ctx,
    cache.lockerIcon,
    headerScale,
    'LOCKER',
    `${items.length.toLocaleString()} Cosmetics`,
    epicname,
    username,
    true,
    gap,
  );

  return canvas.toBuffer('image/jpeg', {
    quality: items.length > 350 ? 0.5 : 0.8,
  });
};

export { drawLockerItem, drawLocker };
