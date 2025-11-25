// lib/supabaseDebug.ts
export const debugSupabase = {
  log: (message: string, data?: any) => {
    console.log(`🔍 [Supabase Debug] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`❌ [Supabase Error] ${message}`, {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
  },
  tableInfo: async (supabase: any, tableName: string) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);
      
      if (error) {
        console.error(`Table ${tableName} error:`, error);
        return null;
      }
      
      console.log(`📊 Table ${tableName} structure:`, data);
      return data;
    } catch (err) {
      console.error(`Failed to inspect table ${tableName}:`, err);
      return null;
    }
  }
};