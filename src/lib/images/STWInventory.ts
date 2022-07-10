import { registerFont, loadImage, Image, Canvas } from 'canvas';
import fs from 'fs';

import { roundRect, drawBackground, drawWatermarks } from './Utils';

registerFont('./assets/Fonts/BurbankBigRegular-Black.otf', {
  family: 'Burbank Big Regular',
  style: 'Black',
});

interface KeyValuePair extends Iterable<KeyValuePair> {
  [key: string]: any;
}

const cache: { [key: string]: Image } = {};

const mult = 0.5;
const gap = 60 * mult;
const imgX = 500 * mult;
const imgY = 530 * mult;

const drawSTWInventoryItem = async (item: KeyValuePair) => {
  const outpath = `./STWInventory/${item.id}.png`;

  const canvas = new Canvas(imgX, imgX);
  const ctx = canvas.getContext('2d');

  let bgImg;
  switch (item.rarity) {
    case 'common':
      bgImg = await loadImage('./assets/STW/Common.png');
      break;

    case 'uncommon':
      bgImg = await loadImage('./assets/STW/Uncommon.png');
      break;

    case 'rare':
      bgImg = await loadImage('./assets/STW/Rare.png');
      break;

    case 'epic':
      bgImg = await loadImage('./assets/STW/Epic.png');
      break;

    case 'legendary':
      bgImg = await loadImage('./assets/STW/Legendary.png');
      break;

    case 'mythic':
      bgImg = await loadImage('./assets/STW/Mythic.png');
      break;

    default:
      bgImg = await loadImage('./assets/STW/Common.png');
      break;
  }

  // draw the background
  ctx.drawImage(bgImg, 0, 0, imgX, imgX);

  try {
    // draw the item
    const img = await loadImage(`./STWImages/${item.id}.png`);
    ctx.drawImage(
      img,
      0 + imgX * 0.05,
      0 + imgX * 0.05,
      imgX * 0.9,
      imgX * 0.9,
    );
  } catch (e) {
    // ignore the error
  }

  try {
    // save the file
    await fs.promises.writeFile(outpath, canvas.toBuffer('image/png'));
  } catch (e) {
    await fs.promises.mkdir(outpath, {
      recursive: true,
    });

    // save the file
    await fs.promises.writeFile(outpath, canvas.toBuffer('image/png'));
  }

  return outpath;
};

const drawSTWInventory = async (
  items: KeyValuePair,
  epicname: string,
  username: string,
  inventoryType: string,
  png = true,
) => {
  const renderedLength = Math.ceil(Math.sqrt(items.length));

  const cX = imgX * renderedLength + gap + renderedLength * gap;
  const headerScale = cX / 2000;
  const cY =
    imgX * Math.ceil(items.length / renderedLength) +
    gap +
    renderedLength * gap +
    headerScale * 128 +
    headerScale * 80;
  const canvas = new Canvas(cX, cY);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, cX, cY);

  let featuredX = gap;
  let featuredY = gap * 2 + 128 * headerScale;
  let rendered = 0;

  const pl = await loadImage('./assets/STW.png');

  // eslint-disable-next-line no-restricted-syntax
  for await (const item of items) {
    ctx.fillStyle = '#fff';
    roundRect(
      ctx,
      featuredX - gap / 4,
      featuredY - gap / 4,
      imgX + gap / 2,
      imgX + gap / 2,
      10,
      true,
      false,
    );

    let img;
    try {
      img = await loadImage(`./STWInventory/${item.id}.png`);
    } catch (e) {
      img = await loadImage(await drawSTWInventoryItem(item));
    }
    ctx.drawImage(img, featuredX, featuredY);

    ctx.shadowBlur = 35;
    ctx.font = `italic ${imgX * 0.2}px Burbank Big Rg Bk`;
    ctx.shadowColor = '#000';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      item.quantity,
      featuredX + imgX - ctx.measureText(item.quantity).width - 10,
      featuredY + imgX - 10,
    );
    ctx.shadowBlur = 0;

    if (item.pl) {
      ctx.drawImage(
        pl,
        featuredX,
        featuredY + imgX * 0.05,
        imgX * 0.3,
        imgX * 0.3,
      );
      ctx.shadowBlur = 35;
      ctx.font = `italic ${imgX * 0.2}px Burbank Big Rg Bk`;
      ctx.shadowColor = '#000';
      ctx.fillStyle = '#fff';
      ctx.fillText(item.pl, featuredX + imgX * 0.25, featuredY + imgX * 0.25);
      ctx.shadowBlur = 0;
    }

    featuredX += imgX + gap;
    // eslint-disable-next-line no-plusplus
    rendered++;
    if (rendered % renderedLength === 0) {
      featuredX = gap;
      featuredY += imgX + gap;
    }
  }

  if (!cache.inventory) {
    cache.inventory = await loadImage('./assets/STW.png');
  }

  drawWatermarks(
    ctx,
    cache.inventory,
    headerScale,
    'INVENTORY',
    `${items.length.toLocaleString()} Items`,
    epicname,
    username,
    true,
    gap,
  );

  return canvas.toBuffer('image/jpeg', {
    // eslint-disable-next-line no-nested-ternary
    quality: png ? undefined : items.length > 196 ? 0.8 : 1,
  });
};

export default drawSTWInventory;
