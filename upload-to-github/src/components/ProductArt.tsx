import Image from "next/image";

type Art = { name: string; image_url: string | null; emoji: string; hue_a: string; hue_b: string };

/** Real product photo when we have one, otherwise the gradient + emoji placeholder. */
export default function ProductArt({ p, sizes, priority = false, emojiClass = "text-6xl sm:text-8xl" }: {
  p: Art; sizes: string; priority?: boolean; emojiClass?: string;
}) {
  if (p.image_url) {
    return (
      <Image
        src={p.image_url} alt={p.name} fill sizes={sizes} priority={priority}
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  }
  return (
    <span className={`float ${emojiClass} drop-shadow-[0_20px_30px_rgba(0,0,0,.45)] transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6`}>
      {p.emoji}
    </span>
  );
}
