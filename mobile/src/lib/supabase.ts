import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { sessionStorage } from './secure-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY gerekli.',
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});
