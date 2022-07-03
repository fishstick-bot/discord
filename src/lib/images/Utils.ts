import { Image, CanvasRenderingContext2D } from 'canvas';

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 5,
  fill: boolean = false,
  stroke: boolean = true,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (stroke) {
    ctx.stroke();
  }
  if (fill) {
    ctx.fill();
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cX: number,
  cY: number,
) {
  const c1 = '#197dd1'; // primary color for the bg
  const c2 = '#081888'; // secondary color for the bg

  // draw background gradient
  const gradient = ctx.createRadialGradient(
    cX * 0.5,
    cY * 0.5,
    cY * 0.15,
    cX * 0.6,
    cY * 0.6,
    cX * 0.5,
  );
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cX, cY);
}

export function drawWatermarks(
  ctx: CanvasRenderingContext2D,
  icon: Image,
  scale: number,
  title: string,
  subtitle: string,
  epicname?: string,
  username?: string,
  promo: boolean = true,
  gap: number = 60 * 0.5,
  imgY: number = 530 * 0.5,
) {
  // DRAW ICON OF IMAGE
  ctx.drawImage(
    icon,
    gap,
    gap,
    (imgY * 1.5 - gap) * scale,
    (imgY * 1.5 - gap) * scale,
  );

  // DRAW VECTOR NEXT TO ICON
  ctx.fillStyle = '#b1b0b1';

  const vectorSize = (imgY * 1.5 - gap) * scale;
  const vectorStartX = (imgY * 1.5 + gap) * scale + gap;
  const vectorStartY = gap;
  const vectorGap = gap;

  ctx.beginPath();
  ctx.moveTo(vectorStartX, vectorStartY);
  ctx.lineTo(
    vectorStartX + vectorGap * 2 * scale,
    vectorStartY + vectorGap * 2 * scale,
  );
  ctx.lineTo(vectorStartX - vectorGap * scale, vectorStartY + vectorSize);
  ctx.lineTo(
    vectorStartX - vectorGap * 2 * scale,
    vectorStartY + vectorSize - vectorGap * scale,
  );
  ctx.closePath();
  ctx.fill();

  // DRAW TITLE
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.font = `italic ${imgY * 0.9 * scale}px Burbank Big Rg Bk`;
  ctx.fillText(
    title,
    vectorStartX + vectorGap * 3 * scale,
    imgY * 1.5 * scale -
      gap * scale * (scale === 1 ? 1.5 : 1) -
      imgY * 0.7 * scale,
  );

  // DRAW SUBTITLE
  ctx.fillStyle = '#b1b0b1';
  ctx.textBaseline = 'middle';
  ctx.font = `italic ${imgY * 0.7 * scale}px Burbank Big Rg Bk`;
  ctx.fillText(
    subtitle.toUpperCase(),
    vectorStartX + vectorGap * scale * (scale === 1 ? 1.5 : 1),
    imgY * 1.5 * scale - gap * scale * (scale === 1 ? 1.5 : 1),
  );

  // DRAW EPICNAME
  if (epicname) {
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${imgY * 0.9 * scale}px Burbank Big Rg Bk`;
    ctx.fillText(
      epicname,
      ctx.canvas.width - ctx.measureText(epicname).width - gap * 2,
      imgY * 1.5 * scale -
        gap * scale * (scale === 1 ? 1.5 : 1) -
        imgY * 0.7 * scale,
    );
  }

  // DRAW USERNAME
  if (username) {
    ctx.fillStyle = '#b1b0b1';
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${imgY * 0.7 * scale}px Burbank Big Rg Bk`;
    ctx.fillText(
      username,
      ctx.canvas.width -
        ctx.measureText(username).width -
        gap * 2 * (scale === 1 ? 1.5 : 1),
      imgY * 1.5 * scale - gap * scale * (scale === 1 ? 1.5 : 1),
    );
  }

  // DRAW DISCORD.GG/FISHSTICK
  if (promo) {
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 50px Burbank Big Rg Bk`;
    ctx.fillText(
      'discord.gg/Fishstick',
      (ctx.canvas.width - ctx.measureText('discord.gg/fishstick').width) / 2,
      ctx.canvas.height - 40,
    );
  }
}
