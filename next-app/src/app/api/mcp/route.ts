/**
 * Hoardly MCP Server — Next.js Route Handler
 *
 * Production version of the Vite dev middleware at vite.config.ts.
 * Reads from Supabase instead of in-memory snapshot.
 *
 * Endpoints:
 *   GET  /api/mcp/cards              list_cards (paginated)
 *   GET  /api/mcp/cards/search?q=…   search_cards
 *   GET  /api/mcp/cards/:id          get_card
 *   GET  /api/mcp/status             health check
 *
 * Authentication: Bearer token (user's Supabase JWT) or API key (future).
 * Read-only by default; write operations require mcp_read_only=false in profile.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // TODO: initialise Supabase server client
  // const supabase = createRouteHandlerClient({ cookies })

  const url = req.nextUrl;
  const pathname = url.pathname.replace(/^\/api\/mcp/, "");

  if (pathname === "/status") {
    return NextResponse.json({
      ok: true,
      status: "Supabase not connected — configure VITE_SUPABASE_URL",
      endpoints: [
        "GET /api/mcp/cards",
        "GET /api/mcp/cards/search?q=",
        "GET /api/mcp/cards/:id",
      ],
    });
  }

  return NextResponse.json({ error: "MCP not yet connected to Supabase" }, { status: 503 });
}
