"use client";
import gsap from "gsap";

/** Launches a yarn-ball from `from` to the cart button with a curved path. */
export function flyToCart(from: HTMLElement, emoji = "🧶") {
  const target = document.getElementById("cart-button");
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ball = document.createElement("div");
  ball.textContent = emoji;
  Object.assign(ball.style, {
    position: "fixed", left: `${a.left + a.width / 2}px`, top: `${a.top + a.height / 2}px`,
    fontSize: "28px", zIndex: "120", pointerEvents: "none", filter: "drop-shadow(0 0 12px #e8334f)",
  });
  document.body.appendChild(ball);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  gsap.timeline({ onComplete: () => { ball.remove(); gsap.fromTo(target, { scale: 1.35 }, { scale: 1, duration: 0.6, ease: "elastic.out(1,0.4)" }); } })
    .to(ball, { x: dx, duration: 0.8, ease: "power1.in" }, 0)
    .to(ball, { y: dy - 120, duration: 0.4, ease: "power2.out" }, 0)
    .to(ball, { y: dy, duration: 0.4, ease: "power2.in" }, 0.4)
    .to(ball, { rotation: 540, scale: 0.4, duration: 0.8 }, 0);
}
