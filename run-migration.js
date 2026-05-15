import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓ found' : '✗ missing');
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓ found' : '✗ missing');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    const migrationFile = path.join(__dirname, 'supabase/migrations/20260515_create_saved_quizzes_table.sql');

    if (!fs.existsSync(migrationFile)) {
      console.error(`Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('📝 Running migration: creating saved_quizzes table...');
    console.log('Connecting to:', SUPABASE_URL);
    
    // Split SQL by semicolons and execute each statement
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      console.log(`\n  Executing: ${statement.substring(0, 60)}...`);
      
      // Use rpc to execute SQL if available, otherwise fail gracefully
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement }).catch(err => ({
        data: null,
        error: { message: 'RPC not available', details: err.message }
      }));
      
      if (error?.message?.includes('RPC')) {
        console.log('\n⚠️  Note: Supabase RPC method not available.');
        console.log('Please execute the SQL manually in your Supabase dashboard:');
        console.log('\nSQL Query Dashboard: https://app.supabase.com/project/_/sql');
        console.log('\nSQL to execute:\n');
        console.log(sql);
        process.exit(1);
      }
      
      if (error) {
        console.error(`❌ Error executing statement: ${error.message}`);
        throw error;
      }
      
      console.log('  ✓ Success');
    }

    console.log('\n✅ Migration executed successfully!');
    console.log('The saved_quizzes table is now ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
