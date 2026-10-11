export async function GET() {
  // In a full production app, this would verify a secure session cookie.
  // For now, we return the Master Admin to ensure the dashboard renders.
  return Response.json({ 
    user: { name: "Sahil Malek", memberId: "005" } 
  });
}