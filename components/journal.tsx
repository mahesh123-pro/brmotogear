import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';
import { editorialPhotos, journalArticles } from '@/lib/journal';

export function JournalCards({ limit = 3 }: { limit?: number }) {
  return (
    <div className="journal-grid">
      {journalArticles.slice(0, limit).map((article) => (
        <Link key={article.slug} className="journal-card" href={`/blog/${article.slug}`}>
          <div className="journal-card-image">
            <Image
              src={article.photo.src}
              alt={article.photo.alt}
              fill
              sizes="(max-width:700px) 90vw, 32vw"
            />
          </div>
          <div className="journal-meta">
            <span>{article.category}</span>
            <span>{article.time}</span>
          </div>
          <h3>{article.title}</h3>
          <p>{article.summary}</p>
          <span className="text-link">
            Read the story <ArrowUpRight size={18} />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function Journal({ slug }: { slug?: string }) {
  const article = journalArticles.find((a) => a.slug === slug);
  if (article)
    return (
      <>
        <div className="page-wrap article-heading">
          <Link href="/blog" className="text-link">
            <ArrowLeft size={17} /> Back to the journal
          </Link>
          <div className="journal-meta">
            <span>{article.category}</span>
            <span>{article.time}</span>
          </div>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          <span className="small-note">Words by BRMotoGear · Field notes, volume 01</span>
        </div>
        <div className="article-cover">
          <Image src={article.photo.src} alt={article.photo.alt} fill sizes="100vw" priority />
        </div>
        <div className="page-wrap article-layout">
          <aside>
            <span className="eyebrow orange-text">IN THIS STORY</span>
            <nav aria-label="Article sections">
              {article.sections.map((section, i) => (
                <a key={section.title} href={`#chapter-${i + 1}`}>
                  {String(i + 1).padStart(2, '0')} / {section.title}
                </a>
              ))}
            </nav>
            <a className="small-note" href={article.photo.source} target="_blank" rel="noreferrer">
              Photography on Unsplash ↗
            </a>
          </aside>
          <div className="article-body">
            {article.sections.map((section, i) => (
              <section id={`chapter-${i + 1}`} key={section.title}>
                <span className="eyebrow orange-text">0{i + 1}</span>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </section>
            ))}
            <Link
              className="button"
              href={article.slug === 'pack-for-a-weekend' ? '/ride-checklist' : '/collections'}
            >
              {article.slug === 'pack-for-a-weekend'
                ? 'Open your packing checklist'
                : 'Explore the helmet collection'}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <section className="section journal-section">
          <div className="section-heading">
            <h2>Keep the story going.</h2>
            <Link href="/blog" className="text-link">
              All stories <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="journal-grid related-stories">
            {journalArticles
              .filter((a) => a.slug !== slug)
              .map((a) => (
                <Link className="journal-card" href={`/blog/${a.slug}`} key={a.slug}>
                  <div className="journal-card-image">
                    <Image
                      src={a.photo.src}
                      alt={a.photo.alt}
                      fill
                      sizes="(max-width:700px) 90vw, 45vw"
                    />
                  </div>
                  <span className="eyebrow orange-text">{a.category}</span>
                  <h3>{a.title}</h3>
                  <span className="text-link">
                    Read story <ArrowUpRight size={18} />
                  </span>
                </Link>
              ))}
          </div>
        </section>
      </>
    );
  return (
    <>
      <section className="editorial-hero">
        <Image
          src={editorialPhotos.forest.src}
          alt={editorialPhotos.forest.alt}
          fill
          sizes="100vw"
          priority
        />
        <div className="editorial-hero-copy">
          <span className="eyebrow">THE BRMOTOGEAR JOURNAL / VOL. 01</span>
          <h1>
            Good stories.
            <br />
            <em>Better journeys.</em>
          </h1>
          <p>
            Notes on the everyday ride, the weekend escape, and everything that makes the miles your
            own.
          </p>
          <a href="#stories" className="button light">
            Find your next read <ArrowRight size={18} />
          </a>
        </div>
      </section>
      <section className="section journal-section" id="stories">
        <div className="section-heading">
          <div>
            <span className="eyebrow orange-text">OFF THE CLOCK. ON THE ROAD.</span>
            <h2>From the rider’s notebook.</h2>
          </div>
          <span className="small-note">Three stories. A fresh perspective.</span>
        </div>
        <JournalCards />
      </section>
      <div className="page-wrap editorial-links">
        <Link href="/lookbook">
          <span className="eyebrow orange-text">IN PICTURES</span>
          <h2>The road, in frames.</h2>
          <p>Explore our visual riding moodboard.</p>
          <ArrowUpRight />
        </Link>
        <Link href="/ride-checklist">
          <span className="eyebrow orange-text">BEFORE YOU HEAD OUT</span>
          <h2>A little less to remember.</h2>
          <p>Build your weekend packing routine.</p>
          <ArrowUpRight />
        </Link>
      </div>
    </>
  );
}

export function Lookbook() {
  const frames = [
    {
      photo: editorialPhotos.city,
      title: 'Everyday, considered.',
      text: 'Simple lines. Familiar streets. A moment before the day begins.',
      href: '/shop?category=Full%20Face',
      cta: 'Explore full-face helmets',
    },
    {
      photo: editorialPhotos.forest,
      title: 'Follow your curiosity.',
      text: 'For the roads that invite you to slow down and take it all in.',
      href: '/blog/make-room-for-the-long-way',
      cta: 'Read the long-way story',
    },
    {
      photo: editorialPhotos.pause,
      title: 'Make time to stop.',
      text: 'The quiet moments between the miles have a story of their own.',
      href: '/ride-checklist',
      cta: 'Plan your weekend packing',
    },
  ];
  return (
    <div className="page-wrap lookbook">
      <div className="page-heading">
        <div>
          <span className="eyebrow orange-text">BRMOTOGEAR / VISUAL NOTES</span>
          <h1>The road, in frames.</h1>
          <p>
            A moodboard for the rider in you. Everyday details, open roads and a little room to
            wander.
          </p>
        </div>
        <span className="lookbook-volume">
          VOL.
          <br />
          01
        </span>
      </div>
      {frames.map((frame, i) => (
        <section className="lookbook-frame" key={frame.title}>
          <div className="lookbook-image">
            <Image
              src={frame.photo.src}
              alt={frame.photo.alt}
              fill
              sizes="(max-width:700px) 90vw, 65vw"
              priority={i === 0}
            />
            <span className="frame-number">0{i + 1} / FIELD NOTES</span>
          </div>
          <div className="lookbook-copy">
            <span className="eyebrow orange-text">A DIFFERENT PERSPECTIVE</span>
            <h2>{frame.title}</h2>
            <p>{frame.text}</p>
            <Link className="text-link" href={frame.href}>
              {frame.cta} <ArrowUpRight size={18} />
            </Link>
            <a
              className="small-note photo-credit"
              href={frame.photo.source}
              target="_blank"
              rel="noreferrer"
            >
              Photo source · Unsplash ↗
            </a>
          </div>
        </section>
      ))}
      <div className="help-strip">
        <div>
          <h2>Find your next riding companion.</h2>
          <p>Explore the helmets behind your next chapter.</p>
        </div>
        <Link href="/shop" className="button">
          Shop helmets <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
