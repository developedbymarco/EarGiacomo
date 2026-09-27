import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { getAccountContext } from "@/lib/account/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccountContext();
  if (!account.configured) return <SetupNotice />;
  if (account.user) redirect("/practice");
  const params = await searchParams;
  return <LoginForm confirmError={params.error === "confirm"} />;
}
