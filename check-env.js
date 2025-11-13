// Quick script to check if .env file is set up correctly
require('dotenv').config();

console.log('\n=== Environment Variables Check ===\n');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || '❌ NOT SET');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET (first 20 chars: ' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
console.log('\n=== Instructions ===');
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('1. Open the .env file in your project root');
  console.log('2. Add these two lines (replace with your actual values):');
  console.log('   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
  console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  console.log('3. Get your credentials from: https://app.supabase.com → Your Project → Settings → API');
  console.log('4. Restart Expo dev server after saving the .env file');
} else {
  console.log('✅ Environment variables are set!');
  console.log('If the app still shows "NOT SET", restart Expo dev server.');
}
console.log('\n');


