import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://npvcghdzrtqrlliprtnw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdmNnaGR6cnRxcmxsaXBydG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzUwMDcsImV4cCI6MjA5MzI1MTAwN30.Z1VnHSDQ1kInkEGDmKDM1-lZ1cSecQF3nn3d7SjXJDY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});