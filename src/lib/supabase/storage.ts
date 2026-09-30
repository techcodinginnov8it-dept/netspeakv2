import 'server-only';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const freshnessChecksBucket = 'freshness-checks';
const signedUrlTtlSeconds = 60 * 60;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabaseStorage = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureFreshnessChecksBucket() {
  const { error: getBucketError } = await supabaseStorage.storage.getBucket(freshnessChecksBucket);
  if (!getBucketError) return;

  const { error: createBucketError } = await supabaseStorage.storage.createBucket(freshnessChecksBucket, {
    public: false,
    fileSizeLimit: '1048576',
    allowedMimeTypes: ['image/jpeg'],
  });

  if (createBucketError && !/already exists/i.test(createBucketError.message)) {
    throw new Error(`Unable to configure Freshness Check storage: ${createBucketError.message}`);
  }
}

export async function uploadFreshnessCheckPhoto(path: string, photo: Buffer) {
  await ensureFreshnessChecksBucket();
  const { error } = await supabaseStorage.storage.from(freshnessChecksBucket).upload(path, photo, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Unable to upload Freshness Check photo: ${error.message}`);
}

export async function removeFreshnessCheckPhoto(path: string) {
  const { error } = await supabaseStorage.storage.from(freshnessChecksBucket).remove([path]);
  if (error) console.error('Unable to remove orphaned Freshness Check photo:', error.message);
}

export async function getFreshnessCheckPhotoUrl(photoReference: string) {
  if (photoReference.startsWith('data:') || /^https?:\/\//i.test(photoReference)) return photoReference;

  const { data, error } = await supabaseStorage.storage
    .from(freshnessChecksBucket)
    .createSignedUrl(photoReference, signedUrlTtlSeconds);
  if (error || !data?.signedUrl) {
    console.error('Unable to create Freshness Check photo URL:', error?.message);
    return null;
  }
  return data.signedUrl;
}