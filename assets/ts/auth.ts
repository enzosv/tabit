export async function login(email: string, password: string): Promise<string> {
  const { data, error } = await window.supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  if (error) {
    throw error;
  }
  return data.session.access_token;
}
