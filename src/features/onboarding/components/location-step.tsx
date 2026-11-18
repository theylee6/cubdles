"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceFieldset, RadioChoices } from "@/components/ui/choice";
import { Input } from "@/components/ui/field";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";
import { saveLocation } from "../actions";
import { searchCitiesAction, type CityResult } from "../location-actions";
import { DISTANCES_KM, distanceOptionLabel, type DistanceUnit } from "../options";
import { Continue } from "./simple-steps";
import { FormMessage } from "./step-shell";

type GeoState = { kind: "idle" } | { kind: "locating" } | { kind: "found"; lat: number; lng: number } | { kind: "error"; message: string };

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

/**
 * Location: share the device's approximate location, or search for a city anywhere in the world.
 * Either way the server works out the city and country and rounds coordinates to ~1 km.
 */
export function LocationStep({ city, country, maxDistanceKm, unit }: { city: string | null; country: string | null; maxDistanceKm: number; unit: DistanceUnit }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveLocation);
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [chosen, setChosen] = useState<CityResult | null>(null);
  const [searching, startSearch] = useTransition();
  const timezoneRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const e = state.errors ?? {};
  const searchable = !chosen && query.trim().length >= 2;
  const visibleResults = searchable ? results : [];

  // The browser's time zone is only known on the client; write it straight into the hidden field.
  useEffect(() => {
    if (timezoneRef.current) timezoneRef.current.value = browserTimezone();
  }, []);

  // Debounced city search.
  useEffect(() => {
    if (!searchable) return;
    const t = setTimeout(() => startSearch(async () => setResults(await searchCitiesAction(query))), 250);
    return () => clearTimeout(t);
  }, [query, searchable]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo({ kind: "error", message: "Your browser can't share location. Please search for your city instead." });
      return;
    }
    setGeo({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Rounded in the browser too, so precise coordinates never leave the device.
        setGeo({ kind: "found", lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 });
        setChosen(null);
      },
      () => setGeo({ kind: "error", message: "We couldn't get your location. Please search for your city instead." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const usingDevice = geo.kind === "found";

  return (
    <form {...formProps} className="flex flex-col gap-7">
      <FormMessage message={state.message} />
      <input type="hidden" name="mode" value={usingDevice ? "device" : "city"} />
      <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="" />
      {usingDevice ? (
        <>
          <input type="hidden" name="lat" value={geo.lat} />
          <input type="hidden" name="lng" value={geo.lng} />
        </>
      ) : null}
      {chosen && !usingDevice ? <input type="hidden" name="cityId" value={chosen.id} /> : null}

      {city && !chosen && !usingDevice ? (
        <p className="flex items-center gap-1.5 text-sm text-mocha">
          <MapPin className="size-4 text-clay" aria-hidden /> Currently {city}
          {country ? `, ${country}` : ""}. Choose again below to change it.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="button" variant="secondary" onClick={locate} disabled={geo.kind === "locating"} className="w-full sm:w-auto">
          <LocateFixed className="size-4" aria-hidden />
          {geo.kind === "locating" ? "Finding you…" : "Use my current location"}
        </Button>
        <p className="text-sm text-mocha" aria-live="polite">
          {usingDevice ? (
            <span className="text-cocoa">
              Got it. We&rsquo;ll show the nearest city.{" "}
              <button type="button" className="text-clay underline underline-offset-4" onClick={() => setGeo({ kind: "idle" })}>
                Search instead
              </button>
            </span>
          ) : geo.kind === "error" ? (
            geo.message
          ) : (
            "Rounded to about 1 km before it's saved."
          )}
        </p>
      </div>

      {!usingDevice ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="city-search" className="text-sm font-medium">
            Or search for your city
          </label>
          {chosen ? (
            <div className="flex items-center justify-between rounded-[var(--radius-input)] bg-white/70 px-4 py-3 ring-2 ring-clay">
              <span>
                {chosen.name}, <span className="text-mocha">{chosen.country}</span>
              </span>
              <button type="button" className="text-sm text-clay underline underline-offset-4" onClick={() => { setChosen(null); setQuery(""); }}>
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mocha" aria-hidden />
              <Input
                id="city-search"
                role="combobox"
                aria-expanded={visibleResults.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Start typing a city"
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                className="pl-10"
                aria-invalid={e.cityId ? true : undefined}
              />
              {visibleResults.length ? (
                <ul id={listId} role="listbox" aria-label="Cities" className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl bg-cream shadow-[var(--shadow-float)] ring-1 ring-oat">
                  {visibleResults.map((r) => (
                    <li key={r.id} role="option" aria-selected={false}>
                      <button type="button" onClick={() => { setChosen(r); setResults([]); }} className={cn("w-full px-4 py-3 text-left hover:bg-linen focus-visible:bg-linen")}>
                        {r.name}, <span className="text-mocha">{r.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          <p className="text-sm text-mocha" aria-live="polite">
            {searching ? "Searching…" : searchable && !visibleResults.length ? "No cities found — try a nearby larger city." : ""}
          </p>
          {e.cityId ? <p role="alert" className="text-sm text-alert">{e.cityId}</p> : null}
        </div>
      ) : null}

      <ChoiceFieldset legend="Show me people within" error={e.distanceKm}>
        <RadioChoices name="distanceKm" options={DISTANCES_KM.map((d) => ({ value: String(d), label: distanceOptionLabel(d, unit) }))} defaultValue={String(maxDistanceKm)} />
      </ChoiceFieldset>

      <Continue pending={pending} />
    </form>
  );
}
