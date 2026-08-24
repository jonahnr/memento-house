import {createClient} from "@supabase/supabase-js";
const ADMIN="jonahnr@gmail.com";
export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kdcymeoldvwlmfwemfgq.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY,token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!key||!token)return new Response("Unauthorized",{status:401});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),result=await admin.auth.getUser(token),user=result.data.user;if(!user||user.email?.toLowerCase()!==ADMIN)return new Response("Forbidden",{status:403});
 const body=await request.json(),product=String(body.product||"map"),tier=String(body.tier),addon=String(body.addon||"none"),valid:Record<string,string[]>={map:["map","plus"],deck:["essential","signature","story","bespoke"],unity:["signature-board","bespoke"]};if(!valid[product]?.includes(tier))return new Response("Invalid product or tier",{status:400});
 const testOrders=Array.isArray(user.user_metadata?.admin_test_orders)?user.user_metadata.admin_test_orders:[],order={id:`test_${Date.now()}`,product,tier,addon,created_at:new Date().toISOString()},metadata={...user.user_metadata,purchase_status:"admin_test",last_test_purchase:order,admin_test_orders:[order,...testOrders].slice(0,20),...(product==="map"?{product_tier:tier}:{})};
 const updated=await admin.auth.admin.updateUserById(user.id,{user_metadata:metadata});if(updated.error)return new Response(updated.error.message,{status:500});
 const saved=await admin.from("orders").insert({customer_user_id:user.id,customer_email:user.email||ADMIN,customer_name:"Jonah (admin test)",product,tier,addons:addon&&addon!=="none"?[addon]:[],payment_status:"admin_bypass",questionnaire_status:"not_sent",design_status:"awaiting_questionnaire",entitlement_status:product==="map"?"active":"not_applicable",is_test:true});if(saved.error)return new Response(saved.error.message,{status:500});
 return Response.json({ok:true,product,tier,redirect:"/order/success"});
}
