export function friendlyAuthError(message:string){
 if(/unsupported provider|provider is not enabled/i.test(message))return "Google sign-in is not enabled in Supabase yet. Use email sign-in for now, or enable Google under Supabase Authentication → Providers.";
 if(/redirect/i.test(message)&&/not allowed|invalid/i.test(message))return "This site address is not approved for sign-in yet. Add the Vercel address under Supabase Authentication → URL Configuration → Redirect URLs.";
 if(/rate limit|too many requests|429|after .*seconds/i.test(message))return "Please wait a few minutes before requesting another email. For security, confirmation emails cannot be sent repeatedly in a short period.";
 if(/email.*not confirmed/i.test(message))return "Your email still needs to be confirmed. Request a new confirmation email below, then open only the newest message.";
 return message;
}
