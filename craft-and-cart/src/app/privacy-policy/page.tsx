import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Craft & Cart",
  description: "How Craft & Cart (JillJill Crafts) collects, uses and protects your information.",
};

const UPDATED = "5 October 2026";

const sections: [string, React.ReactNode][] = [
  ["1. Who we are", <p key="a">This website, craft.jilljill.in (Craft &amp; Cart, also called JillJill Crafts), sells handmade crochet products. This policy explains what information the site collects and how it is used. Questions about it can be sent to our support team on <a className="underline" href="tel:9943200746">9943200746</a>.</p>],
  ["2. Information we collect", (
    <ul key="b" className="list-disc space-y-2 pl-5">
      <li><b>Account information:</b> your name, email address, phone number and password. The password is stored only as a one-way hash, so nobody (including us) can read it.</li>
      <li><b>Delivery information:</b> the delivery addresses and phone numbers you enter at checkout or save in My Account.</li>
      <li><b>Order information:</b> what you ordered, prices, shipping, payment method, order and payment status, and dates.</li>
      <li><b>Payment records:</b> when you pay online, Razorpay processes the payment (see section 6). We keep the Razorpay order ID, payment ID, amount, status and the reason of a failed attempt. We do <b>not</b> receive or store your card number, CVV, UPI PIN or OTP.</li>
      <li><b>Messages you send us:</b> newsletter sign-ups (your email) and custom-order requests (name, email, your idea, budget).</li>
      <li><b>Technical information:</b> our hosting server keeps standard technical logs (for example IP address and the pages requested) for security and troubleshooting.</li>
    </ul>
  )],
  ["3. Cookies and browser storage", (
    <ul key="c" className="list-disc space-y-2 pl-5">
      <li>A <b>sign-in cookie</b> keeps you signed in for up to 14 days. It is marked secure and cannot be read by page scripts.</li>
      <li>Your <b>cart</b> is saved in your browser&apos;s local storage on your own device.</li>
      <li>The <b>support chat</b> history is kept in your browser tab only and disappears when you close the tab.</li>
      <li>We have not added advertising or analytics trackers to this site. Razorpay&apos;s payment window is run by Razorpay and may use its own cookies under its own policy.</li>
    </ul>
  )],
  ["4. Support chatbot and phone support", (
    <p key="d">The chat assistant is an automated tool that answers from our shop information (products, prices, shipping and offer rules, and, if you are signed in and ask, your own orders). What you type is used only to produce the answer; we do not save chat messages on our server. If the assistant cannot help, you can call our support team, and a call only starts when you tap the call button.</p>
  )],
  ["5. How we use your information", (
    <ul key="e" className="list-disc space-y-2 pl-5">
      <li>To create and secure your account, take and deliver your orders, and confirm payments.</li>
      <li>To show your order history and order status, and to give you support.</li>
      <li>To apply our first-order offer rules fairly (the offer is limited to one per customer and phone number).</li>
      <li>To send a password-reset email when you ask for one, and our newsletter if you subscribed.</li>
      <li>To protect the site against fraud, abuse and security problems.</li>
    </ul>
  )],
  ["6. Payments and Razorpay", (
    <p key="f">Online payments are processed by <b>Razorpay</b>. When you choose to pay online, you enter your payment details in Razorpay&apos;s window and Razorpay handles them under <a className="underline" href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">its own privacy policy</a>. Our server confirms a payment only after checking Razorpay&apos;s cryptographic signature. If you choose Cash on Delivery, no online payment details are involved.</p>
  )],
  ["7. Security", <p key="g">We take reasonable steps to protect your information: the site is served over HTTPS, passwords are hashed, access to admin pages is limited by role, and payment results are verified on the server. No website or system can be guaranteed to be completely secure.</p>],
  ["8. Who else sees your information", (
    <ul key="h" className="list-disc space-y-2 pl-5">
      <li><b>Razorpay</b>, to process online payments.</li>
      <li><b>Delivery partners</b>, who receive your name, address and phone number so they can deliver your order.</li>
      <li><b>Our hosting provider</b>, whose servers store the site and its database, and an <b>email service</b> if password-reset emails are enabled.</li>
      <li>Authorities, if the law requires us to share information.</li>
    </ul>
  )],
  ["9. How long we keep it", <p key="i">We keep account and order records for as long as we need them to run the shop, handle support questions and meet our accounting and legal obligations. We do not yet apply an automatic deletion schedule.</p>],
  ["10. Your choices and contact", <p key="j">You can see and update your name, phone number, addresses and password under <Link className="underline" href="/account/profile">My Account</Link>. To ask us to correct or delete your information, or to stop newsletter emails, call <a className="underline" href="tel:9943200746">9943200746</a>. We may need to keep some order records where we are required or entitled to.</p>],
  ["11. Changes to this policy", <p key="k">If we change how the site handles information, we will update this page and its date. The current version is the one shown here.</p>],
];

export default function PrivacyPolicy() {
  return (
    <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
      <div className="aurora" style={{ opacity: 0.35 }}><i /><i /><i /></div>
      <h1 className="text-4xl font-bold sm:text-5xl">Privacy <span className="font-serif font-normal italic text-gradient">policy</span></h1>
      <p className="mt-3 text-sm text-dim">Last updated: {UPDATED}</p>
      <p className="mt-6 text-dim">This is a plain-language description of what this website actually does with your information today.</p>
      <div className="mt-8 space-y-5">
        {sections.map(([title, body]) => (
          <section key={title} className="glass rounded-3xl p-5 text-[15px] leading-relaxed text-dim sm:p-7">
            <h2 className="mb-3 text-xl font-semibold text-ink">{title}</h2>
            {body}
          </section>
        ))}
      </div>
    </div>
  );
}
