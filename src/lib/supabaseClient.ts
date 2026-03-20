import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzhzlxoxcddgxxtbrasq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HbjBgZHU6gOM5Ii9U55PhQ_mGCw_aq6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
