/* eslint-disable prefer-destructuring */
import { registerFont, loadImage, Image, Canvas } from 'canvas';
import fs from 'fs';

import { roundRect, drawBackground, drawWatermarks } from './Utils';

registerFont('./assets/Fonts/BurbankBigRegular-Black.otf', {
  family: 'Burbank Big Regular',
  style: 'Black',
});

interface KeyValuePair {
  [key: string]: any;
}

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

const cache: { [key: string]: Image } = {};

const mult = 0.5;
const gap = 60 * mult;
const imgX = 512 * mult;
const imgY = 512 * mult;

const drawShopItem = async (item: KeyValuePair, index: number) => {
  const canvas = new Canvas(imgX, imgX);
  const ctx = canvas.getContext('2d', {
    alpha: true,
  });

  const imgUrl = item.displayAssets[0]?.url;
  const renderData = item.displayAssets[0]?.renderData;

  const bgColorA = renderData?.Background_Color_A ?? {
    color: '#000000',
    alpha: 1,
  };
  const bgColorB = renderData?.Background_Color_B ?? {
    color: '#000000',
    alpha: 1,
  };

  const gradientX = renderData?.Gradient_Position_X ?? 50;
  const gradientY = renderData?.Gradient_Position_Y ?? 50;

  // draw radial gradient
  const grd = ctx.createRadialGradient(
    (gradientX / 100) * imgX,
    (gradientY / 100) * imgX,
    5,
    (gradientX / 100) * imgX,
    (gradientY / 100) * imgX,
    (imgX + imgX) / 1.5,
  );
  grd.addColorStop(1, bgColorA.color);
  grd.addColorStop(0, bgColorB.color);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, imgX, imgX);

  // draw item
  if (imgUrl) {
    const img = await loadImage(imgUrl);
    ctx.drawImage(img, 0, 0, imgX, imgX);
  }

  // draw overlay 1
  ctx.fillStyle = '#1e1e1e';
  ctx.beginPath();
  ctx.moveTo(0, imgX - 67);
  ctx.lineTo(imgX, imgX - 74);
  ctx.lineTo(imgX, imgX);
  ctx.lineTo(0, imgX);
  ctx.closePath();
  ctx.fill();

  // draw overlay 2
  ctx.fillStyle = '#0e0e0e';
  ctx.beginPath();
  ctx.moveTo(0, imgX - 26);
  ctx.lineTo(imgX, imgX - 28);
  ctx.lineTo(imgX, imgX);
  ctx.lineTo(0, imgX);
  ctx.closePath();
  ctx.fill();

  // draw item price
  if (!cache.vbucksIcon) {
    cache.vbucksIcon = await loadImage('./assets/Vbucks.png');
  }

  ctx.drawImage(cache.vbucksIcon, imgX - 4 - 28, imgX - 28, 30, 28);

  const priceText = item.price.finalPrice.toLocaleString();
  ctx.fillStyle = '#a7b8bc';
  ctx.font = `italic 16px Burbank Big Rg Bk`;
  let cur = imgX - ctx.measureText(priceText).width - 10 - 28;
  ctx.fillText(priceText, cur, imgX - 9);

  if (item.price.regularPrice !== item.price.finalPrice) {
    const regularPriceText = item.price.regularPrice.toLocaleString();
    ctx.globalAlpha = 0.352;
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 16px Burbank Big Rg Bk`;
    cur -= ctx.measureText(regularPriceText).width + 8;
    ctx.fillText(regularPriceText, cur, imgX - 9);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#a7b8bc';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cur - 2, imgX - 12);
    ctx.lineTo(cur + ctx.measureText(regularPriceText).width + 4, imgX - 18);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // draw rarity border
  ctx.fillStyle =
    overlayColors[item.rarity.id.toLowerCase()] ?? overlayColors.common;
  ctx.beginPath();
  ctx.moveTo(0, imgX - 72);
  ctx.lineTo(imgX, imgX - 82);
  ctx.lineTo(imgX, imgX - 74);
  ctx.lineTo(0, imgX - 67);
  ctx.closePath();
  ctx.fill();

  // draw title and subtitle
  const title = item.displayName?.toUpperCase() ?? '';
  const subtitle = item.displayType?.toUpperCase() ?? '';

  let totalHeight = 0;
  let titleFontSize = 20;
  ctx.font = `italic ${titleFontSize}px Burbank Big Rg Bk`;
  let titleSize = ctx.measureText(title).width;
  while (titleSize > imgX) {
    titleFontSize -= 1;
    ctx.font = `italic ${titleFontSize}px Burbank Big Rg Bk`;
    titleSize = ctx.measureText(title).width;
  }
  const titleMeasure = ctx.measureText(title);
  const titleFont = `italic ${titleFontSize}px Burbank Big Rg Bk`;
  totalHeight += titleFontSize;
  const subtitleFontSize = 16;
  const subtitleFont = `${subtitleFontSize}px Burbank Big Rg Bk`;
  ctx.font = subtitleFont;
  const subTitleMeasure = ctx.measureText(subtitle);
  if (subtitle !== '') {
    totalHeight += -titleMeasure.actualBoundingBoxDescent + subtitleFontSize;
  }

  const contentTop = imgX - 67;
  const contentHeight = 39;
  cur = contentTop + (contentHeight - totalHeight) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.font = titleFont;
  ctx.fillText(
    title,
    (imgX - titleSize) / 2,
    cur + titleMeasure.actualBoundingBoxAscent,
  );
  cur += titleFontSize - titleMeasure.actualBoundingBoxDescent;

  if (subtitle !== '') {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '7a7a7a';
    ctx.font = subtitleFont;
    ctx.fillText(
      subtitle,
      (imgX - subTitleMeasure.width) / 2,
      cur + subTitleMeasure.actualBoundingBoxAscent,
    );
    ctx.globalAlpha = 1;
  }

  // draw item index
  if (index !== undefined) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 20px Burbank Big Rg Bk`;
    ctx.fillText(`${index + 1}`, 4, imgX - 6);
    ctx.globalAlpha = 1;
  }

  return canvas.toBuffer('image/png');
};

const drawShop = async (items: KeyValuePair[]) => {
  const renderedLength = Math.ceil(Math.sqrt(items.length));

  const cX = imgX * renderedLength + gap + renderedLength * gap;
  const headerScale = cX / 2000;
  const cY =
    imgX * Math.ceil(items.length / renderedLength) +
    gap +
    renderedLength * gap +
    headerScale * 128 +
    headerScale * 40;
  const canvas = new Canvas(cX, cY);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, cX, cY);

  // outline, inside, text
  const vialotorColors: KeyValuePair = {
    Low: ['#FF2C78', '#CF0067', '#FFFFFF'],
    Medium: ['#FF2C78', '#CF0067', '#FFFFFF'],
    High: ['#FFFFFF', '#FFFF00', '#00062B'],
  };

  let featuredX = gap;
  let featuredY = gap * 2 + 128 * headerScale;
  let rendered = 0;

  let i = 0;
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
      img = await loadImage(await drawShopItem(item, i));
      ctx.drawImage(img, featuredX, featuredY);
    } catch (e) {
      // IGNORE ERROR
    }

    // draw banner
    if (item.banner) {
      const bannerText = item.banner.name.toUpperCase();
      const colors =
        vialotorColors[item.banner.intensity] ?? vialotorColors.High;
      ctx.font = `italic 19px Burbank Big Rg Bk`;
      const bannerTextWidth = ctx.measureText(bannerText).width;

      ctx.fillStyle = colors[0];

      ctx.beginPath();
      ctx.moveTo(featuredX - 12, featuredY - 9);
      ctx.lineTo(featuredX + 22 + bannerTextWidth, featuredY - 12);
      ctx.lineTo(featuredX + 14 + bannerTextWidth, featuredY + 27);
      ctx.lineTo(featuredX - 8, featuredY + 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors[1];

      ctx.beginPath();
      ctx.moveTo(featuredX - 6, featuredY - 4);
      ctx.lineTo(featuredX + 15 + bannerTextWidth, featuredY - 6);
      ctx.lineTo(featuredX + 9 + bannerTextWidth, featuredY + 22);
      ctx.lineTo(featuredX - 3, featuredY + 21);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors[2];

      ctx.fillText(
        bannerText,
        featuredX -
          12 +
          (featuredX +
            22 +
            bannerTextWidth -
            (featuredX - 12) -
            bannerTextWidth) /
            2 -
          2,
        featuredY -
          12 +
          (39 - 19) / 2 +
          ctx.measureText(bannerText).actualBoundingBoxAscent,
      );
    }

    featuredX += imgX + gap;
    rendered += 1;
    if (rendered % renderedLength === 0) {
      featuredX = gap;
      featuredY += imgX + gap;
    }

    i += 1;
  }

  if (!cache.lockerIcon) {
    cache.lockerIcon = await loadImage('./assets/LockerIcon.png');
  }

  drawWatermarks(
    ctx,
    cache.lockerIcon,
    headerScale,
    'Item Shop',
    `${items.length.toLocaleString()} Items`,
    new Date().toLocaleString().split(',')[0],
    'discord.gg/Fishstick',
    false,
    gap,
  );

  return canvas.toBuffer('image/png');
};

export default drawShop;
