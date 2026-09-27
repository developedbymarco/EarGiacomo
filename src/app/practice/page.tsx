import { PracticeBuilder } from "@/components/practice/PracticeBuilder";
import { getAccountContext } from "@/lib/account/session";

export default async function PracticePage() {
  const account = await getAccountContext();
  const low = account.profile?.default_range_low;
  const high = account.profile?.default_range_high;
  const hasRange = typeof low === "number" && typeof high === "number" && high > low;
  return (
    <PracticeBuilder
      signedIn={Boolean(account.user)}
      savedRangeLow={hasRange ? low : null}
      savedRangeHigh={hasRange ? high : null}
    />
  );
}
