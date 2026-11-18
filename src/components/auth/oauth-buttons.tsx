import { oauthAction } from "@/lib/auth/actions";
import { buttonClasses } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
      <path d="M16.4 12.6c0-2.5 2.1-3.7 2.2-3.8-1.2-1.7-3-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.2zM13.9 5.2c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3-1.5z" />
    </svg>
  );
}

export function OAuthButtons({ next, verb }: { next?: string; verb: "Continue" | "Sign up" }) {
  return (
    <div className="grid gap-3">
      <form action={oauthAction}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="next" value={next ?? "/app"} />
        <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
          <GoogleIcon /> {verb} with Google
        </button>
      </form>
      <form action={oauthAction}>
        <input type="hidden" name="provider" value="apple" />
        <input type="hidden" name="next" value={next ?? "/app"} />
        <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
          <AppleIcon /> {verb} with Apple
        </button>
      </form>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-mocha" role="separator" aria-label="or">
      <span className="h-px flex-1 bg-oat" />
      or
      <span className="h-px flex-1 bg-oat" />
    </div>
  );
}
