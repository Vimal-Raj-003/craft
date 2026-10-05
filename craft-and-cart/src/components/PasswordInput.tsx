"use client";
import { useId, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Password field with a show/hide eye button inside the right edge. Used for EVERY password input on the site.
 * - hidden by default (type="password"); the button toggles type="text" and back, without touching the typed value
 * - the button is type="button", so clicking it never submits the form
 * - right padding keeps the text clear of the icon; the tap target is 44px on phones
 */
export default function PasswordInput({ className = "", ...props }: Props) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="relative">
      <input {...props} id={props.id ?? id} type={shown ? "text" : "password"} className={`input !pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        onMouseDown={(e) => e.preventDefault()} // keep focus (and the caret) in the field
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        aria-controls={props.id ?? id}
        title={shown ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-dim transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink"
      >
        {shown ? (
          // eye-off
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // eye
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
