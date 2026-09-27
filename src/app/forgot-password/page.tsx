import { SetupNotice } from "@/components/auth/SetupNotice";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getAccountContext } from "@/lib/account/session";

export default async function ForgotPasswordPage() {
  const account = await getAccountContext();
  if (!account.configured) return <SetupNotice />;
  return <ForgotPasswordForm />;
}
