// Quick diagnostic: check follows table directly
import { createClient } from '@supabase/supabase-js';

const url = 'https://otgcamotncgafefxjahd.supabase.co';
const key = 'sb_publishable_L8c4Y0Af8W4tO45UlOrZrg_XCv0p-aU';

const supabase = createClient(url, key);

async function check() {
  console.log('=== Checking follows table ===');
  
  // Try fetching all follows
  const { data, error, count } = await supabase
    .from('follows')
    .select('*', { count: 'exact' });
  
  console.log('All follows data:', data);
  console.log('All follows count:', count);
  console.log('All follows error:', error);
  
  if (data && data.length > 0) {
    console.log('\n=== Follows by following_id ===');
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.following_id]) grouped[row.following_id] = [];
      grouped[row.following_id].push(row.follower_id);
    }
    for (const [following_id, followers] of Object.entries(grouped)) {
      console.log(`User ${following_id} has ${followers.length} followers:`, followers);
    }
  }

  // Also try the head count approach
  console.log('\n=== Head count test ===');
  const { count: headCount, error: headErr } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true });
  
  console.log('Head count:', headCount);
  console.log('Head error:', headErr);
}

check();
