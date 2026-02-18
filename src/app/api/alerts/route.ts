import { auth } from "@/lib/auth";
import { generateAlerts } from "@/lib/alerts";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const alerts = await generateAlerts();
  return Response.json(alerts);
}
