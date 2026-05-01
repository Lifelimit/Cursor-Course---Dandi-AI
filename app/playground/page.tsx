import { auth } from "@/auth";
import PlaygroundClient from "./PlaygroundClient";
import { redirect } from "next/navigation";

export default async function PlaygroundPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <PlaygroundClient initialSession={session} />;
}
