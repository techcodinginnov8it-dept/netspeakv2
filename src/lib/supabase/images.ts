import 'server-only';

import { createClient } from '@supabase/supabase-js';

const ticketEvidenceBucket = 'ticket-evidence';
const maxImageBytes = 1024 * 1024;
const signedUrlTtlSeconds = 60 * 60;

type UploadedImage = {
  bytes: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function parseUploadedImage(dataUrl: string): UploadedImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > maxImageBytes) return null;

  if (match[1] === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    return { bytes, contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (match[1] === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { bytes, contentType: 'image/png', extension: 'png' };
  }
  if (match[1] === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') {
    return { bytes, contentType: 'image/webp', extension: 'webp' };
  }

  return null;
}

async function ensureTicketEvidenceBucket() {
  const storage = getStorageClient().storage;
  const { error: lookupError } = await storage.getBucket(ticketEvidenceBucket);
  if (!lookupError) return storage;

  const { error: createError } = await storage.createBucket(ticketEvidenceBucket, {
    public: false,
    fileSizeLimit: String(maxImageBytes),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Unable to configure ticket evidence storage: ${createError.message}`);
  }
  return storage;
}

export async function uploadTicketEvidenceImage(path: string, image: UploadedImage) {
  const { error } = await (await ensureTicketEvidenceBucket()).from(ticketEvidenceBucket).upload(path, image.bytes, {
    contentType: image.contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Unable to upload evidence image: ${error.message}`);
}

export async function removeTicketEvidenceImage(path: string) {
  const { error } = await getStorageClient().storage.from(ticketEvidenceBucket).remove([path]);
  if (error) console.error('Unable to remove orphaned evidence image:', error.message);
}

export async function getTicketEvidenceImageUrl(reference: string) {
  if (reference.startsWith('data:') || /^https?:\/\//i.test(reference)) return reference;
  try {
    const { data, error } = await getStorageClient().storage
      .from(ticketEvidenceBucket)
      .createSignedUrl(reference, signedUrlTtlSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch (error) {
    console.error('Unable to create evidence image URL:', error);
    return null;
  }
}
