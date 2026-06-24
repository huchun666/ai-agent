import { cookies } from "next/headers";

export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) {
    throw new Error("User session not found");
  }
  return userId;
}
