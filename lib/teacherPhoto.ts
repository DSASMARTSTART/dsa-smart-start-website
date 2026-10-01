/** Crop portraits to a square and bound dimensions before storing the public image. */
export async function prepareTeacherPhoto(file: File): Promise<File> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 ** 2 ||
    !file.size
  )
    throw new Error('Choose a JPG, PNG or WebP image under 5 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const crop = Math.min(bitmap.width, bitmap.height);
    if (!crop) throw new Error('The photo could not be read.');
    const size = Math.min(crop, 800);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo editing is unavailable in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(
      bitmap,
      (bitmap.width - crop) / 2,
      (bitmap.height - crop) / 2,
      crop,
      crop,
      0,
      0,
      size,
      size
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Could not prepare photo.'))),
        'image/jpeg',
        0.85
      )
    );
    return new File([blob], 'portrait.jpg', { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
