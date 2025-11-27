import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create ephemeral client secret for browser WebRTC connection
    // Correct endpoint: /v1/realtime/client_secrets
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
        },
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errJson = await response.json();
        detail = JSON.stringify(errJson);
      } catch {
        detail = await response.text();
      }
      console.error('OpenAI ephemeral token error:', response.status, detail);
      return NextResponse.json(
        { error: `Failed to create session: ${response.status} ${detail}` },
        { status: response.status }
      );
    }

    const clientSecret = await response.json();
    
    // Return the token value directly
    return NextResponse.json({
      token: clientSecret.value,
      expires_at: clientSecret.expires_at,
    });

  } catch (error) {
    console.error('Realtime session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
