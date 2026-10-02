'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Pause, Play, MoveDown } from 'lucide-react';
export function CinematicHero() {
  const section = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    const update = () => {
      setReduced(media.matches);
      setVisible(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (section.current) observer.observe(section.current);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <section
      ref={section}
      className={`cinema-hero ${paused || !visible || reduced ? 'motion-paused' : ''}`}
      aria-label="Your next ride starts here"
    >
      <div className="cinema-image">
        <Image
          src="https://images.unsplash.com/photo-1586653202207-c1b691a61aa8?auto=format&fit=crop&w=2400&q=85"
          alt="Motorcyclist riding along an open alpine road beneath mountain peaks"
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className="cinema-shade" />
      <div className="cinema-copy">
        <span className="cinema-eyebrow">
          <i /> MADE FOR THE MILES AHEAD
        </span>
        <h1>
          CHASE THE
          <br />
          <em>OPEN ROAD.</em>
        </h1>
        <p>
          For the early starts. The unexpected turns.
          <br />
          And every ride that feels like you.
        </p>
        <div className="cinema-actions">
          <Link href="/shop" className="button">
            Find your helmet <ArrowUpRight size={20} />
          </Link>
          <Link href="/collections" className="cinema-secondary">
            Explore the collections <ArrowRight size={18} />
          </Link>
        </div>
      </div>
      <div className="cinema-bottom">
        <div className="cinema-signature">
          <span>BR /</span>
          <div>
            GOOD GEAR. GREAT JOURNEYS.<small>RIDE SAFE. RIDE BOLD.</small>
          </div>
        </div>
        <div className="cinema-controls">
          {!reduced && (
            <button
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Play background animation' : 'Pause background animation'}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              <span>{paused ? 'Play motion' : 'Pause motion'}</span>
            </button>
          )}
          <a href="#discover" aria-label="Discover helmet collections">
            <MoveDown size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
