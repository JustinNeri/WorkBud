import { supabase } from './supabase'

const BUCKET = 'avatars'
/** The longest edge we keep. The avatar is rendered at 44px, so this is
 *  already generous for a 3x screen and leaves room to show it larger later. */
const MAX_EDGE = 512
const MIME = 'image/jpeg'
const QUALITY = 0.85

/** Rejected before any work is done — a 40MP photo is a mistake, not input. */
export const MAX_PICK_BYTES = 12 * 1024 * 1024

/**
 * Decode a picked file, honouring its EXIF rotation.
 *
 * Phone cameras write the sensor's raw orientation and a "rotate this" tag
 * alongside it, so a portrait photo decodes on its side unless something
 * applies the tag. createImageBitmap does it natively; the <img> path is the
 * fallback for engines that don't take the option, and browsers apply the tag
 * there by default.
 */
async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Centre-crop to a square and shrink to MAX_EDGE, as a JPEG.
 *
 * This runs before the upload, not after, and that is the point: a photo
 * straight off a phone is 3–8MB, and this app is used on mobile data in the
 * Philippines. Sending the original to render a 44px circle would cost the
 * user real money and several seconds on a slow connection — the resized file
 * is usually under 60KB.
 *
 * Cropping rather than squashing: an avatar is displayed in a square, so the
 * choice is between cropping here where the middle is kept, or letting CSS
 * crop it later to the same effect but after paying to upload the rest.
 */
async function squareThumbnail(file) {
  const source = await decode(file)
  const width = source.width || source.naturalWidth
  const height = source.height || source.naturalHeight
  if (!width || !height) throw new Error('That image could not be read.')

  const side = Math.min(width, height)
  const edge = Math.min(side, MAX_EDGE)

  const canvas = document.createElement('canvas')
  canvas.width = edge
  canvas.height = edge

  const ctx = canvas.getContext('2d')
  // A photo scaled down in one step aliases badly; the browser's own
  // smoothing at high quality is enough to avoid it here.
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    source,
    (width - side) / 2,
    (height - side) / 2,
    side,
    side,
    0,
    0,
    edge,
    edge,
  )
  source.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, MIME, QUALITY))
  if (!blob) throw new Error('That image could not be converted.')
  return blob
}

/**
 * The public URL for a stored avatar path, or null when there isn't one.
 *
 * Paths are stored rather than URLs: a URL bakes in the project host, and a
 * stored one would rot the day the project moves. This is synchronous and
 * does no network work, so it is safe to call straight from render.
 */
export function avatarUrl(path) {
  if (!path || !supabase) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Resize, upload, and hand back the stored path.
 *
 * The filename carries a timestamp instead of being a stable "avatar.jpg".
 * Overwriting one path would leave every browser and CDN that had already
 * fetched it showing the old face until the cache expired; a new path can't
 * be stale, and the caller deletes the previous file once the profile row
 * points at the new one.
 */
export async function uploadAvatar(userId, file) {
  if (!supabase) return { error: 'Not connected.' }

  let blob
  try {
    blob = await squareThumbnail(file)
  } catch (err) {
    return { error: err.message || 'That image could not be read.' }
  }

  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: MIME,
    // Immutable in practice, because the path changes on every upload.
    cacheControl: '31536000',
    upsert: false,
  })

  if (error) return { error: error.message || 'Upload failed.' }
  return { path }
}

/**
 * Delete a stored avatar. Best-effort on purpose: this is only ever called
 * once the profile row has stopped pointing at the file, so a failure leaves
 * an orphan nobody can see rather than anything the user needs telling about.
 */
export async function removeAvatar(path) {
  if (!path || !supabase) return
  await supabase.storage.from(BUCKET).remove([path])
}
