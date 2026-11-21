import { publicEnv } from "@/lib/env";

/** Who runs Cubdles. Shows only what the owner has configured; never placeholder details. */
export function BusinessDetails({ className }: { className?: string }) {
  const name = publicEnv.NEXT_PUBLIC_BUSINESS_NAME;
  const address = publicEnv.NEXT_PUBLIC_BUSINESS_ADDRESS;
  const email = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL;
  if (!name && !address && !email) return null;
  return (
    <address
      className={`not-italic text-sm leading-relaxed text-mocha ${className ?? ""}`}
    >
      <span className="font-semibold text-cocoa">Cubdles is operated by</span>
      {name ? (
        <>
          <br />
          {name}
        </>
      ) : null}
      {address ? (
        <>
          <br />
          {address}
        </>
      ) : null}
      {email ? (
        <>
          <br />
          <a
            className="text-clay underline underline-offset-4"
            href={`mailto:${email}`}
          >
            {email}
          </a>
        </>
      ) : null}
    </address>
  );
}
