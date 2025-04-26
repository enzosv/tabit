export async function login(email: string, password: string) {
  const { data, error } = await window.supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  console.log(error);
  console.log(data);
}
