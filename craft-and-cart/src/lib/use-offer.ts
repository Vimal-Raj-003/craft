"use client";
import { useEffect, useState } from "react";

export type OfferProduct = {
  productId: number;
  slot: number;
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
export type OfferState = { offers: OfferProduct[]; signedIn: boolean; eligible: boolean; reason: string | null };

/** The current first-order promotional products and whether this visitor can use them. Display only: the server prices every order. */
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