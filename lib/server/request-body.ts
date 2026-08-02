import "server-only";

export async function readJsonLimited(request: Request, maximumBytes = 2_000_000): Promise<unknown> {
  const declared = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (declared > maximumBytes) throw new Error("Request body too large");
  const body = await request.arrayBuffer();
  if (body.byteLength > maximumBytes) throw new Error("Request body too large");
  return JSON.parse(new TextDecoder().decode(body));
}
