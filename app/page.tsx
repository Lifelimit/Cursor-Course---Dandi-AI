import { auth } from "@/auth";
import LandingClient from "./LandingClient";

export default async function Home() {
  const session = await auth();
  return <LandingClient initialSession={session} />;
}
