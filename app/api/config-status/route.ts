import {serverConfigStatus} from "../../../lib/server-config";
export const dynamic="force-dynamic";
export async function GET(){return Response.json(serverConfigStatus(),{headers:{"Cache-Control":"no-store"}})}
