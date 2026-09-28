import { Landing } from "@/components/home/Landing";
import { Today } from "@/components/home/Today";
import { getAccountContext } from "@/lib/account/session";

export default async function Home() {
  const account = await getAccountContext();
  if (account.user && account.profile) return <Today />;
  return <Landing />;
}
