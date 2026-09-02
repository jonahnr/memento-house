import {runSystemHealthChecks} from "../../../lib/system-health";

export const maxDuration=30;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,authorization=request.headers.get("authorization");
 if(!secret||authorization!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
 const result=await runSystemHealthChecks();
 return Response.json(result,{status:result.status==="healthy"?200:503});
}
