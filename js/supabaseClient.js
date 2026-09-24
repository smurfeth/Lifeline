const SUPABASE_URL = 'https://bnytmuwgutotekaaylig.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_c5fAj53uud1ud8WFRY_fxg_WOvW2kI1'; // Make sure this is the 'anon' 'public' key from Supabase

// Export here so other files can import it
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Testing the connection to Supabase (please work huhu)
async function testConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection failed:', error.message);
    } else {
      console.log('Supabase connected successfully!');
    }
  } catch (err) {
    console.error('Unexpected connection error:', err);
  }
}

testConnection();