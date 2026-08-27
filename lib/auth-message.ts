export function friendlyAuthError(message:string){
 if(/unsupported provider|provider is not enabled/i.test(message))return "Google sign-in is not enabled in Supabase yet. Use email sign-in for now, or enable Google under Supabase Authentication → Providers.";
 if(/redirect/i.test(message)&&/not allowed|invalid/i.test(message))return "This site address is not approved for sign-in yet. Add the Vercel address under Supabase Authentication → URL Configuration → Redirect URLs.";
 return message;
}
