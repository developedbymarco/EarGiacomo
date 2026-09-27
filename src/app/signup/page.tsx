import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { SignupForm } from "@/components/auth/SignupForm";
import { getAccountContext } from "@/lib/account/session";

export default async function SignupPage() {
  const account = await getAccountContext();
  if (!account.configured) return <SetupNotice />;
  if (account.user) redirect("/practice");
  return <SignupForm />;
}
