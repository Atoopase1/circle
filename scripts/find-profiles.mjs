// Quick script to list all profiles and find the old account
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://otgcamotncgafefxjahd.supabase.co',
  'sb_publishable_L8c4Y0Af8W4tO45UlOrZrg_XCv0p-aU'
);

async function main() {
  // 1. List all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, phone, display_name, avatar_url, bio, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error.message);
    return;
  }

  console.log(`\n=== Found ${profiles.length} profiles ===\n`);
  profiles.forEach((p, i) => {
    console.log(`Profile ${i + 1}:`);
    console.log(`  ID:           ${p.id}`);
    console.log(`  Email:        ${p.email || '(none)'}`);
    console.log(`  Phone:        ${p.phone || '(none)'}`);
    console.log(`  Display Name: ${p.display_name}`);
    console.log(`  Avatar:       ${p.avatar_url ? 'Yes' : 'No'}`);
    console.log(`  Bio:          ${p.bio || '(default)'}`);
    console.log(`  Created:      ${p.created_at}`);
    console.log('');
  });

  // 2. Check which profile has chats
  for (const p of profiles) {
    const { count: chatCount } = await supabase
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id);
    
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', p.id);

    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', p.id);

    console.log(`${p.display_name} (${p.id.slice(0,8)}...): ${chatCount || 0} chats, ${msgCount || 0} messages sent, ${followersCount || 0} followers`);
  }
}

main();
