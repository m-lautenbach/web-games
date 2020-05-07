import assetCache from './assetCache'
import getFrameMap from './getFrameMap'

const shadowCache = {}

const drawShadow = (spritesheet, sourceX, sourceY, w, h, frame) => {
  const canvas = document.getElementById('image-manipulation')
  const ctx = canvas.getContext('2d')
  ctx.drawImage(spritesheet, sourceX, sourceY, w, h, 0, 0, w, h)

  let shadow
  if (shadowCache[frame]) {
    shadow = shadowCache[frame]
  } else {
    shadow = ctx.getImageData(0, 0, w, h)
    shadow.data.forEach((value, index) => {
      // is color
      if ((index + 1) % 4 === 0) {
        // if not fully transparent
        if (value !== 0) {
          shadow.data[index] = 150
        }
      } else {
        // make black
        shadow.data[index] = 50
      }
    })
    shadowCache[frame] = shadow
  }
  ctx.putImageData(shadow, 0, 0)
  return canvas
}

export default (ctx, actor, { camera: { x: cx } }) => () => {
  const { character, animation: { id: animationId, frame }, position: { x, y }, direction } = actor

  const { w, h } = assetCache.data.characters[character].bmp.frames_69
  const { [animationId]: { frames } } = getFrameMap()
  const { x: sourceX, y: sourceY } = frames[frame]

  const spritesheet = assetCache.images.freezeSpritesheet

  const shadowCanvas = drawShadow(spritesheet, sourceX, sourceY, w, h, frame)

  ctx.setTransform(1, 0, 0, 1, 0, 0)

  if (direction === 'left') {
    ctx.setTransform(-1, 0, .5, .5, x + (w / 2), y + (h / 2))
    ctx.drawImage(shadowCanvas, cx, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.translate(x + w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(spritesheet, sourceX, sourceY, w, h, cx, y, w, h)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  } else {
    ctx.setTransform(1, 0, .5, .5, x - (w / 2), y + (h / 2))
    ctx.drawImage(shadowCanvas, -cx, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(spritesheet, sourceX, sourceY, w, h, x - cx, y, w, h)
  }
}