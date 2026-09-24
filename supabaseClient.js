const SUPABASE_URL = 'https://bnytmuwgutotekaaylig.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c5fAj53uud1ud8WFRY_fxg_WOvW2kI1';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Quick connection test
async function testConnection() {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connected successfully!');
  }
}

testConnection();
