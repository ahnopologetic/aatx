import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // In a real app, fetch repositories from GitHub API using session.accessToken
    const repositories = [
      { id: "1", name: "web-analytics", owner: "aatx-org", lastScanned: "2023-08-01T12:00:00Z", eventsCount: 42 },
      { id: "2", name: "mobile-app", owner: "aatx-org", lastScanned: "2023-07-25T09:15:00Z", eventsCount: 28 },
      { id: "3", name: "backend-api", owner: "aatx-org", lastScanned: "2023-07-20T14:30:00Z", eventsCount: 35 },
    ]

    return NextResponse.json({ repositories })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
