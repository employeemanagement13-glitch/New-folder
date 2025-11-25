// /app/api/clerk/sync/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, clerkUserId } = body;
    
    if (!email || !clerkUserId) {
      return NextResponse.json({ success: false, error: 'Missing email or clerkUserId' }, { status: 400 });
    }
    
    const ADMIN_EMAILS = ['employeemanagement13@gmail.com', 'shehzilshahzad51@gmail.com'];
    
    if (ADMIN_EMAILS.includes(email)) {
      console.log(email)
      const {data, error } = await supabaseAdmin
        .from('admins')
        .upsert(
          { clerk_user_id: clerkUserId, email, role: 'admin', created_at: new Date().toISOString() },
          { onConflict: 'clerk_user_id' }
        );
        console.log({data, error})
    } else {
     const {data, error } = await supabaseAdmin
        .from('employees')
        .upsert(
          { clerk_user_id: clerkUserId, email,full_name: email.split("@")[0] , role_id: 'employee', created_at: new Date().toISOString() },
          { onConflict: 'clerk_user_id' }
        );
                console.log({data, error})
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Sync error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
