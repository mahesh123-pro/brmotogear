'use client';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  MoveDown,
  Truck,
  Ruler,
  Headphones,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from './store';
import { ProductCard } from './products';
import { JournalCards } from './journal';
import { CinematicHero } from './cinematic-hero';
export function Home() {
  const { products } = useStore();
  return (
    <>
      <CinematicHero />
      <div className="benefit-bar">
        <div>
          <Truck />
          <span>
            <strong>The road is calling</strong>
            <small>Free shipping above ₹2,000</small>
          </span>
        </div>
        <div>
          <Ruler />
          <span>
            <strong>Find your perfect fit</strong>
            <small>A guide for every rider</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Protection comes first</strong>
            <small>Know your helmet, know your ride</small>
          </span>
        </div>
        <div>
          <Headphones />
          <span>
            <strong>Here for the riders</strong>
            <small>Support along the way</small>
          </span>
        </div>
      </div>
      <section className="section" id="discover">
        <div className="section-heading">
          <div>
            <span className="eyebrow orange-text">DIFFERENT ROADS. SAME PASSION.</span>
            <h2>Find your kind of ride.</h2>
          </div>
          <Link className="text-link" href="/collections">
            Explore all styles <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="category-grid">
          {[
            {
              name: 'Full face',
              category: 'Full Face',
              text: 'All in. Every ride.',
              image: '/images/apex-solid-0.jpg',
              number: '01',
            },
            {
              name: 'Open face',
              category: 'Open Face',
              text: 'A little more freedom.',
              image: '/images/retro-jet-0.jpg',
              number: '02',
            },
            {
              name: 'Off-road',
              category: 'Off-Road',
              text: 'Beyond the beaten path.',
              image: '/images/mx-carbon-0.jpg',
              number: '03',
            },
          ].map((c) => (
            <Link
              href={`/shop?category=${encodeURIComponent(c.category)}`}
              key={c.name}
              className="category-card"
            >
              <span className="category-number">/{c.number}</span>
              <div className="category-image">
                <Image
                  src={c.image}
                  alt={`${c.name} motorcycle helmet`}
                  fill
                  sizes="(max-width:600px) 90vw, 33vw"
                />
              </div>
              <div className="category-copy">
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={23} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section popular">
        <div className="section-heading">
          <div>
            <span className="eyebrow orange-text">GOOD COMPANY FOR THE OPEN ROAD</span>
            <h2>The starting lineup.</h2>
          </div>
          <Link className="text-link" href="/shop">
            Shop all helmets <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="product-grid">
          {products.slice(0, 4).map((p, i) => (
            <ProductCard product={p} index={i} key={p.id} />
          ))}
        </div>
      </section>
      <section className="manifesto">
        <div className="manifesto-visual">
          <Image
            src="https://images.unsplash.com/photo-1740701562598-8c5bbc5a746b?auto=format&fit=crop&w=1000&q=80"
            alt="Motorcyclist on a winding forest road"
            fill
            sizes="(max-width:700px) 100vw, 50vw"
          />
          <span>TAKE THE LONG WAY HOME.</span>
        </div>
        <div className="manifesto-copy">
          <span className="eyebrow orange-text">MORE THAN A PIECE OF GEAR</span>
          <h2>
            Your ride.
            <br />
            Your story.
            <br />
            <em>Your helmet.</em>
          </h2>
          <p>
            That first turn of the key. The air before sunrise. The road you’ve never taken. We’re
            here for the same reason you are — the feeling of being out there.
          </p>
          <p>
            Thoughtfully chosen helmets. Straightforward advice. A little more confidence for
            whatever comes next.
          </p>
          <Link className="button light" href="/about">
            Meet BRMotoGear <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section guide-teaser">
        <span className="eyebrow orange-text">BEFORE THE NEXT ADVENTURE</span>
        <div>
          <h2>
            A better ride starts
            <br />
            with a better fit.
          </h2>
          <p>
            Your helmet should feel right before you leave the driveway. Start with your
            measurements and check the manufacturer’s size chart.
          </p>
          <Link className="text-link" href="/size-guide">
            Find your fit <ArrowUpRight size={18} />
          </Link>
        </div>
        <Ruler className="big-ruler" strokeWidth={0.7} />
      </section>
      <section className="section journal-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow orange-text">BEYOND THE HELMET</span>
            <h2>Stories for the road.</h2>
          </div>
          <Link href="/blog" className="text-link">
            Visit the journal <ArrowUpRight size={18} />
          </Link>
        </div>
        <JournalCards />
      </section>
    </>
  );
}
