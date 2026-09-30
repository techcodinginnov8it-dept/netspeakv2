export async function imageFileToDataUrl(file: File): Promise<string> {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) throw new Error('Use a JPEG, PNG, or WebP image.');
  if (file.size > 1024 * 1024) throw new Error('Image must be 1 MB or smaller.');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
