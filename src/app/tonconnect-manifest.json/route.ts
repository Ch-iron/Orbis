export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json({ url: origin, name: 'Orbis', iconUrl: `${origin}/icon.png` });
}
