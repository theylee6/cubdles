import { notFound } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { ProfileView } from "@/features/discovery/components/profile-view";
import { PersonList } from "@/features/discovery/components/person-list";
import { SwipeDeck } from "@/features/discovery/components/swipe-deck";
import type { ProfileCard } from "@/features/discovery/types";
import { MemberNavView } from "@/features/member/member-nav";

/** DEVELOPMENT ONLY: discovery components with sample data (illustrated placeholders, no real people). 404 in production. */
function placeholder(hue: string, label: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><rect width='400' height='500' fill='${hue}'/><circle cx='200' cy='200' r='80' fill='#FBF7F2' opacity='.7'/><rect x='90' y='300' width='220' height='160' rx='110' fill='#FBF7F2' opacity='.7'/><text x='200' y='480' font-family='sans-serif' font-size='18' text-anchor='middle' fill='#6E5F58'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE: ProfileCard[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    display_name: "Sample A",
    age: 29,
    gender: "Woman",
    pronouns: "she/her",
    city: "Bengaluru",
    intention: "long_term",
    bio: "Sample bio: weekend baker, terrible at board games, excellent at blanket forts.",
    job_title: "Designer",
    education: null,
    distance: "under_5",
    last_active_at: null,
    last_active_label: "Active today",
    affection: { cuddle_style: "little_spoon", pace: "slow", touch_comfort: 5, public_affection: 3, love_languages: ["touch", "time"] },
    lifestyle: { diet: "vegetarian", drinking: "sometimes" },
    interests: ["Baking", "Movie nights", "Chai"],
    prompts: [
      { question: "My ideal lazy Sunday looks like", answer: "Rain, chai, and a very long film." },
      { question: "Big spoon or little spoon, and why", answer: "Little spoon. Warmest seat in the house." },
    ],
    photos: [
      { id: "p1", path: "x", width: 400, height: 500, url: placeholder("#F2BFA4", "Sample photo 1") },
      { id: "p2", path: "y", width: 400, height: 500, url: placeholder("#EBC9BD", "Sample photo 2") },
    ],
    compatibility: {
      score: 0.86,
      reasons: [{ code: "spoons_fit" }, { code: "same_pace", value: "slow" }, { code: "shared_interests", count: 2 }],
      parts: {},
    },
    match_id: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    display_name: "Sample B",
    age: 31,
    gender: "Man",
    pronouns: null,
    city: "Bengaluru",
    intention: "life_partner",
    bio: "Sample bio.",
    job_title: null,
    education: null,
    distance: "5_10",
    last_active_at: null,
    affection: { cuddle_style: "big_spoon", pace: "steady", touch_comfort: 4, public_affection: 4, love_languages: ["acts"] },
    lifestyle: null,
    interests: ["Hiking", "Dogs"],
    prompts: [{ question: "The way to my heart is", answer: "Remembering how I take my coffee." }],
    photos: [{ id: "p3", path: "z", width: 400, height: 500, url: placeholder("#E3E8DE", "Sample photo") }],
    compatibility: { score: 0.71, reasons: [{ code: "both_cuddly" }], parts: {} },
    match_id: null,
  },
];

export default function DiscoveryPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-dvh">
      <MemberNavView pathname="/app/discover" />
      <main className="pb-24 md:pl-60">
        <Container className="flex max-w-3xl flex-col gap-16 py-8">
          <p className="rounded-2xl bg-blush-soft px-4 py-3 text-sm">Development preview — sample data, illustrated placeholders.</p>
          <section id="deck" className="mx-auto w-full max-w-md">
            <h2 className="mb-4 text-2xl">Swipe deck</h2>
            <SwipeDeck initial={SAMPLE} initialOffset={null} />
          </section>
          <section id="profile" className="mx-auto w-full max-w-md">
            <h2 className="mb-4 text-2xl">Full profile</h2>
            <ProfileView card={SAMPLE[0]} />
          </section>
          <section id="list">
            <h2 className="mb-4 text-2xl">Matches list</h2>
            <PersonList cards={SAMPLE} emptyText="" meta={() => "Matched 18 Nov"} />
          </section>
        </Container>
      </main>
    </div>
  );
}
