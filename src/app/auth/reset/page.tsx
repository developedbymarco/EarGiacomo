import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { getAccountContext } from "@/lib/account/session";

export default async function ResetPasswordPage() {
  const account = await getAccountContext();
  if (!account.configured) return <SetupNotice />;
  if (!account.user) redirect("/forgot-password");
  return <ResetPasswordForm />;
}
