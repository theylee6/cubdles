/** Email content. Pure functions (unit-tested). Plain, warm, no tracking pixels. */

export type Rendered = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function layout(opts: {
  title: string;
  paragraphs: string[];
  cta?: { href: string; label: string };
  footer: string;
}): string {
  const ps = opts.paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p}</p>`)
    .join("");
  const cta = opts.cta
    ? `<p style="margin:22px 0"><a href="${esc(opts.cta.href)}" style="background:#A04F37;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FBF7F2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3B2A24">
<div style="max-width:520px;margin:0 auto;padding:28px 22px">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 20px;color:#3B2A24">Cu<span style="color:#A04F37">bd</span>les</p>
<h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;margin:0 0 14px">${opts.title}</h1>
${ps}${cta}
<p style="margin:28px 0 0;font-size:12px;color:#6E5F58;line-height:1.5">${opts.footer}</p>
</div></body></html>`;
}

const name = (n: string | null | undefined) =>
  n && n.trim() ? n.trim() : "someone";

export function matchEmail(p: {
  recipient: string | null;
  other: string | null;
  url: string;
  unsubscribeUrl: string;
}): Rendered {
  const other = name(p.other);
  return {
    subject: `You matched with ${other} on Cubdles`,
    html: layout({
      title: `You and ${esc(other)} both said yes`,
      paragraphs: [
        `Hi ${esc(name(p.recipient))},`,
        `You have a new match. Say hello whenever you&rsquo;re ready.`,
      ],
      cta: { href: p.url, label: "Open Cubdles" },
      footer: `You&rsquo;re getting this because match emails are on. <a href="${esc(p.unsubscribeUrl)}" style="color:#6E5F58">Turn off match emails</a>.`,
    }),
    text: `Hi ${name(p.recipient)},\n\nYou matched with ${other} on Cubdles. Say hello whenever you're ready: ${p.url}\n\nTurn off match emails: ${p.unsubscribeUrl}`,
  };
}

/** Never includes the message itself: inboxes are less private than the app. */
export function messageEmail(p: {
  recipient: string | null;
  other: string | null;
  url: string;
  unsubscribeUrl: string;
}): Rendered {
  const other = name(p.other);
  return {
    subject: `${other} sent you a message`,
    html: layout({
      title: `New message from ${esc(other)}`,
      paragraphs: [
        `Hi ${esc(name(p.recipient))},`,
        `${esc(other)} sent you a message on Cubdles.`,
      ],
      cta: { href: p.url, label: "Read it" },
      footer: `We email at most once an hour per conversation, and only when you haven&rsquo;t read it. <a href="${esc(p.unsubscribeUrl)}" style="color:#6E5F58">Turn off message emails</a>.`,
    }),
    text: `Hi ${name(p.recipient)},\n\n${other} sent you a message on Cubdles: ${p.url}\n\nTurn off message emails: ${p.unsubscribeUrl}`,
  };
}

/** Fraud-ban notification (15 U.S.C. 45g): who, when, false identity, never send money, help, contact. */
export function fraudBanEmail(p: {
  recipient: string | null;
  bannedName: string | null;
  lastContact: string | null;
  timeZone: string;
  safetyUrl: string;
  ftcUrl: string;
  contact: string;
}): Rendered {
  const banned = name(p.bannedName);
  const when = p.lastContact
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: p.timeZone,
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(p.lastContact))
    : null;
  const lines = [
    `We've banned ${banned} from Cubdles for fraud.${when ? ` Your last message with them was on ${when}.` : ""}`,
    "They may have been using a false identity or trying to defraud other members.",
    "Never send money, gift cards, crypto or any other kind of payment to someone you met on Cubdles, and never share bank, card or other financial details.",
    "If you've already sent money or shared financial details, contact your bank straight away and report it to the police. If they contacted you outside Cubdles, stop replying.",
  ];
  return {
    subject:
      "Important: someone you talked to on Cubdles was removed for fraud",
    html: layout({
      title: "Someone you talked to was removed for fraud",
      paragraphs: [
        `Hi ${esc(name(p.recipient))},`,
        ...lines.map(esc),
        `How to spot romance scams: <a href="${esc(p.ftcUrl)}" style="color:#A04F37">US Federal Trade Commission guide</a> and our <a href="${esc(p.safetyUrl)}" style="color:#A04F37">safety centre</a>.`,
        `Questions? Contact us: ${esc(p.contact)}`,
      ],
      footer:
        "This is a safety notice. We send these to everyone who received messages from a member we ban for fraud.",
    }),
    text: [
      `Hi ${name(p.recipient)},`,
      ...lines,
      `How to spot romance scams: ${p.ftcUrl} and ${p.safetyUrl}`,
      `Questions? Contact us: ${p.contact}`,
    ].join("\n\n"),
  };
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

/** Push text. Like emails, never includes message content. */
export function pushPayload(n: {
  kind: "match" | "message" | "fraud_ban";
  other_name: string | null;
  ref_id: string;
}): PushPayload {
  const name = n.other_name?.trim() || "Someone";
  if (n.kind === "match")
    return {
      title: "It's a match!",
      body: `You and ${name} both said yes. Say hello.`,
      url: `/app/matches/${n.ref_id}`,
      tag: `match-${n.ref_id}`,
    };
  if (n.kind === "message")
    return {
      title: name,
      body: "Sent you a message",
      url: `/app/matches/${n.ref_id}`,
      tag: `chat-${n.ref_id}`,
    };
  return {
    title: "Important safety notice",
    body: "Someone you talked to was removed for fraud. Tap to read what to do.",
    url: "/app/discover",
    tag: `safety-${n.ref_id}`,
  };
}
