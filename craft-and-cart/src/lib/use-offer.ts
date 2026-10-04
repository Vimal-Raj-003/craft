"use client";
import { useEffect, useState } from "react";

export type OfferProduct = {
  productId: number;
  slug: string;
  name: string;
  image_url: string | null;
  emoji: string;
  hue_a: string;
  hue_b: string;
  color: string | null;
  normalPaise: number;
  offerPaise: number;
};
export type OfferState = { offer: OfferProduct | null; signedIn: boolean; eligible: boolean; reason: string | null };

/** The current ₹1 first-order product and whether this visitor can use it. Display only: the server prices every order. */
export function useOffer() {
  const [state, setState] = useState<OfferState | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/offer", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setState(d))
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return state;
}
