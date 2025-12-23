'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Email and password are required')
  }

  let supabase;
  try {
    supabase = await createClient()
  } catch {
    redirect('/login?error=Unable to connect to authentication service')
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        redirect('/login?error=Invalid email or password')
      }
      redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('fetch failed') || message.includes('ENOTFOUND')) {
      redirect('/login?error=Unable to connect to server. Please check your internet connection.')
    }
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
