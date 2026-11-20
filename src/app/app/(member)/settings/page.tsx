import Link from "next/link";
import { Suspense } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { getSafetyAdvisory } from "@/features/member/safety";
import { SafetyAdvisoryNotice } from "@/features/member/safety-advisory";
import { getStaffRoles } from "@/lib/auth/staff";
import { CancelMembershipButton } from "@/features/billing/components/cancel-button";
import { getMembership } from "@/features/billing/data";
import { formatMoney } from "@/lib/utils";
import { getMyFeatures } from "@/features/member/features";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import {
  ActionSwitch,
  DeleteAccountForm,
  EmailSettingsForm,
  PrivacyForm,
} from "@/features/settings/settings-forms";
import { signOutAction } from "@/lib/auth/actions";
import { requireActiveMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const me = await requireActiveMember("/app/settings");
  const supabase = await createClient();
  const [{ data: privacy }, { data: profile }, features] = await Promise.all([
    supabase
      .from("privacy_settings")
      .select(
        "show_online_status, show_last_active, send_read_receipts, hide_age, hide_distance",
      )
      .eq("profile_id", me.id)
      .single(),
    supabase.from("profiles").select("is_incognito").eq("id", me.id).single(),
    getMyFeatures(),
  ]);
  const { data: emailPrefs } = await supabase
    .from("notification_settings")
    .select("email_matches, email_messages")
    .eq("profile_id", me.id)
    .maybeSingle();
  const [advisory, staffRoles, membership] = await Promise.all([
    getSafetyAdvisory(),
    getStaffRoles(),
    getMembership(),
  ]);
  const periodEnd = membership.subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(membership.subscription.currentPeriodEnd))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        actions={
          staffRoles.length ? (
            <Link
              href="/admin"
              className="text-sm text-clay underline underline-offset-4"
            >
              Moderation tools
            </Link>
          ) : undefined
        }
      />
      <SafetyAdvisoryNotice advisory={advisory} />

      <Card>
        <h2 className="mb-1 text-xl">Visibility</h2>
        <div className="divide-y divide-oat">
          <ActionSwitch
            action="pause"
            label="Pause my profile"
            hint="Hide from discovery without losing your matches."
            initial={me.status === "paused"}
          />
          <ActionSwitch
            action="incognito"
            label="Incognito"
            hint="Only people you've liked can see you."
            initial={Boolean(profile?.is_incognito)}
            disabledReason={
              features.incognito || profile?.is_incognito
                ? undefined
                : "Comes with Cubdles Plus."
            }
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl">Membership</h2>
        {membership.planCode === "plus" && membership.subscription ? (
          <>
            <p className="text-sm">
              <strong>{membership.subscription.planName}</strong>
              {membership.subscription.amountMinor !== null &&
              membership.subscription.currency
                ? ` · ${formatMoney(membership.subscription.amountMinor, membership.subscription.currency)} every ${membership.subscription.periodMonths === 1 ? "month" : `${membership.subscription.periodMonths} months`}`
                : ""}
            </p>
            <p className="text-sm text-mocha">
              {membership.subscription.cancelAtPeriodEnd ||
              membership.subscription.status === "cancelled"
                ? `Cancelled. You have Plus until ${periodEnd ?? "the end of this period"}.`
                : membership.subscription.status === "pending"
                  ? "Your last renewal payment didn't go through; Razorpay will retry. Please check your payment method."
                  : `Renews${periodEnd ? ` on ${periodEnd}` : " automatically"}.`}
            </p>
            {!membership.subscription.cancelAtPeriodEnd &&
            membership.subscription.status !== "cancelled" ? (
              <CancelMembershipButton until={periodEnd} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-mocha">
            You&rsquo;re on the free plan.{" "}
            <Link
              href="/app/upgrade"
              className="text-clay underline underline-offset-4"
            >
              See Cubdles Plus
            </Link>
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-xl">Emails</h2>
        <EmailSettingsForm
          initial={{
            email_matches: emailPrefs?.email_matches ?? true,
            email_messages: emailPrefs?.email_messages ?? true,
          }}
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-xl">Privacy</h2>
        {privacy ? <PrivacyForm initial={privacy} /> : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl">Account</h2>
        <p className="text-sm text-mocha">
          Signed in as {me.email ?? "your account"}. Need help?{" "}
          <Link
            href="/contact"
            className="text-clay underline underline-offset-4"
          >
            Contact us
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/me/export"
            download
            className={buttonClasses("secondary")}
          >
            Download my data
          </a>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              Log out
            </Button>
          </form>
        </div>
        <p className="text-xs text-mocha">
          Your data download is a JSON file with your profile, matches, messages
          you sent, reports you made and settings.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl">Delete account</h2>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
