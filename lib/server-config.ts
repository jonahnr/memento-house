const clean=(value:string|undefined)=>value?.trim()||"";

export function supabaseServerConfig(){
 const url=clean(process.env.NEXT_PUBLIC_SUPABASE_URL)||"https://kdcymeoldvwlmfwemfgq.supabase.co";
 const serviceRoleKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY)||clean(process.env.SUPABASE_ROLE_KEY)||clean(process.env.SUPABASE_SECRET_KEY);
 return{url,serviceRoleKey};
}

export function stripeServerConfig(){
 return{liveSecretKey:clean(process.env.STRIPE_SECRET_KEY)||clean(process.env.STRIPE_LIVE_SECRET_KEY),testSecretKey:clean(process.env.STRIPE_TEST_SECRET_KEY)||clean(process.env.STRIPE_TEST_KEY)};
}

export function serverConfigStatus(){
 const supabase=supabaseServerConfig(),stripe=stripeServerConfig();
 return{supabaseUrl:true,supabaseServiceRole:Boolean(supabase.serviceRoleKey),stripeLive:Boolean(stripe.liveSecretKey),stripeTest:Boolean(stripe.testSecretKey),adminEmails:Boolean(clean(process.env.ADMIN_EMAILS)),environment:clean(process.env.VERCEL_ENV)||"local",branch:clean(process.env.VERCEL_GIT_COMMIT_REF)||null,commit:clean(process.env.VERCEL_GIT_COMMIT_SHA).slice(0,12)||null};
}
