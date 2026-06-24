import { NextRequest } from "next/server";

export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) {
    throw new Error("User session not found");
  }
  return userId;
}
