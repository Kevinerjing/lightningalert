import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <section className="homePanel">
        <p className="eyebrow">CHC2D Presentation</p>
        <h1>A Century of Canadian History Through Photographs</h1>
        <p>
          A documentary-style timeline built from Kevin Jing's PowerPoint deck.
        </p>
        <Link href="/history">Open Presentation</Link>
      </section>
    </main>
  );
}
