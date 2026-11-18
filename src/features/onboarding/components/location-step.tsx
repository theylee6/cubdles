"use client";

import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceFieldset, RadioChoices } from "@/components/ui/choice";
import { Field, Select } from "@/components/ui/field";
import { useActionForm } from "@/components/ui/use-action-form";
import type { FormState } from "@/lib/auth/schemas";
import { saveLocation } from "../actions";
import { CITIES, DISTANCES_KM, nearestCity } from "../options";
import { Continue } from "./simple-steps";
import { FormMessage } from "./step-shell";

type GeoState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "found"; lat: number; lng: number; near: string }
  | { kind: "error"; message: string };

export function LocationStep({ city, maxDistanceKm }: { city: string | null; maxDistanceKm: number }) {
  const { state, pending, formProps } = useActionForm<FormState>(saveLocation);
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });
  const e = state.errors ?? {};
  const knownCity = CITIES.some((c) => c.name === city) ? city : "";

  function locate() {
    if (!("geolocation" in navigator)) {
      setGeo({ kind: "error", message: "Your browser can't share location. Please choose a city instead." });
      return;
    }
    setGeo({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round in the browser too, so precise coordinates never leave the device.
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        setGeo({ kind: "found", lat, lng, near: nearestCity({ lat, lng })?.name ?? "your area" });
      },
      () => setGeo({ kind: "error", message: "We couldn't get your location. Please choose a city instead." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  const usingDevice = geo.kind === "found";

  return (
    <form {...formProps} className="flex flex-col gap-7">
      <FormMessage message={state.message} />
      <input type="hidden" name="mode" value={usingDevice ? "device" : "city"} />
      {usingDevice ? (
        <>
          <input type="hidden" name="lat" value={geo.lat} />
          <input type="hidden" name="lng" value={geo.lng} />
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="button" variant="secondary" onClick={locate} disabled={geo.kind === "locating"} className="w-full sm:w-auto">
          <LocateFixed className="size-4" aria-hidden />
          {geo.kind === "locating" ? "Finding you…" : "Use my current location"}
        </Button>
        <p className="text-sm text-mocha" aria-live="polite">
          {geo.kind === "found" ? (
            <span className="inline-flex items-center gap-1.5 text-cocoa">
              <MapPin className="size-4 text-clay" aria-hidden /> Got it — near {geo.near}.{" "}
              <button type="button" className="text-clay underline underline-offset-4" onClick={() => setGeo({ kind: "idle" })}>
                Choose a city instead
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
        <Field label="Or choose your city" htmlFor="city" error={e.city}>
          <Select id="city" name="city" defaultValue={knownCity ?? ""} aria-invalid={e.city ? true : undefined}>
            <option value="">Select a city</option>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </Field>
      ) : null}

      <ChoiceFieldset legend="Show me people within" error={e.distanceKm}>
        <RadioChoices
          name="distanceKm"
          options={DISTANCES_KM.map((d) => ({ value: String(d), label: `${d} km` }))}
          defaultValue={String(maxDistanceKm)}
        />
      </ChoiceFieldset>

      <Continue pending={pending} />
    </form>
  );
}
