'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Ruler, Check, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { useState } from 'react';
import { api, send } from '@/lib/api';
import { useStore } from './store';
import { editorialPhotos } from '@/lib/journal';
const faqs = [
  [
    'How do I choose a helmet size?',
    'Measure around the widest part of your head, just above your eyebrows, and compare the measurement to the current size chart for the exact helmet model. Size labels vary between models.',
  ],
  [
    'Can I track my order?',
    'Yes. Sign in and open My orders. Select an order to view its status history and tracking reference when the order has shipped.',
  ],
  [
    'Which payment methods are available?',
    'Live checkout uses Razorpay. The methods shown depend on the payment account and transaction. In this demonstration store, checkout is simulated and no money is charged.',
  ],
  [
    'How much does delivery cost?',
    'The current store configuration offers free shipping on orders of ₹2,000 or more and ₹99 shipping below that amount. Your total is shown before payment.',
  ],
  [
    'How do I cancel or return an order?',
    'You can cancel an unpaid reservation from My orders. For a paid order or return, contact rider support with the order number. Eligibility and refund terms must be confirmed before live selling.',
  ],
  [
    'Are the listed certifications verified?',
    'This demo catalog does not claim verified safety certifications. Before buying, check the exact product label and current manufacturer information. Never assume all variants have the same approvals.',
  ],
];
export function InfoPage({ page }: { page: string }) {
  const { config } = useStore();
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (page === 'collections')
    return (
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow orange-text">CHOOSE YOUR OWN ROAD</span>
            <h1>A helmet for your kind of ride.</h1>
            <p>Meet the collection, from city streets to the great beyond.</p>
          </div>
        </div>
        <div className="collection-grid">
          {[
            {
              name: 'The everyday ride',
              text: 'Full-face favourites for the daily journey.',
              image: 'apex-solid',
              category: 'Full Face',
            },
            {
              name: 'The slower road',
              text: 'Open-face classics with plenty of character.',
              image: 'retro-jet',
              category: 'Open Face',
            },
            {
              name: 'The adventure ahead',
              text: 'Off-road silhouettes for a different perspective.',
              image: 'mx-carbon',
              category: 'Off-Road',
            },
          ].map((c) => (
            <Link
              href={`/shop?category=${encodeURIComponent(c.category)}`}
              className="collection-card"
              key={c.name}
            >
              <div>
                <Image src={`/images/${c.image}-0.jpg`} alt={c.category} fill sizes="33vw" />
              </div>
              <span className="eyebrow orange-text">{c.category}</span>
              <h2>{c.name}</h2>
              <p>{c.text}</p>
              <span className="text-link">
                Explore collection <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  if (page === 'about')
    return (
      <>
        <section className="about-hero">
          <span className="eyebrow orange-text">THIS IS BRMOTOGEAR</span>
          <h1>
            For the miles.
            <br />
            For the moments.
            <br />
            <em>For the ride.</em>
          </h1>
          <p>We believe good gear belongs at the beginning of every good story.</p>
        </section>
        <div className="page-wrap story-grid">
          <div>
            <span className="eyebrow orange-text">WHY WE’RE HERE</span>
            <h2>
              The long way home
              <br />
              is our kind of shortcut.
            </h2>
          </div>
          <div>
            <p>
              BRMotoGear is built around a simple idea: finding your next helmet should feel as good
              as planning your next ride.
            </p>
            <p>
              We bring clear product information, considered choices, and straightforward shopping
              together in one place. Whether you ride across town or towards a distant horizon, the
              right fit comes first.
            </p>
            <p>
              This first collection focuses on helmets. Over time, we hope to bring the same care to
              the rest of your riding kit.
            </p>
            <Link href="/shop" className="button">
              Meet the collection <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="about-photo">
          <Image src={editorialPhotos.city.src} alt={editorialPhotos.city.alt} fill sizes="100vw" />
          <div>
            <span className="eyebrow">EVERY RIDE HAS A STORY.</span>
            <h2>Make the next one yours.</h2>
            <Link href="/lookbook" className="button light">
              Explore the lookbook <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </>
    );
  if (page === 'size-guide')
    return (
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow orange-text">COMFORT STARTS WITH CONFIDENCE</span>
            <h1>Let’s find your fit.</h1>
            <p>A few careful measurements make all the difference.</p>
          </div>
          <Ruler size={60} strokeWidth={1} />
        </div>
        <div className="fit-layout">
          <div className="measurement-art">
            <svg
              viewBox="0 0 400 360"
              role="img"
              aria-label="Measure around the widest part of your head, approximately 2.5 centimetres above your eyebrows"
            >
              <path
                d="M148 269c-35-29-54-77-50-126 4-60 43-97 101-97s97 37 101 97c4 49-15 97-50 126l-3 42h-94z"
                fill="#e8e5df"
                stroke="#555b56"
                strokeWidth="2"
              />
              <path
                d="M147 174q21-11 36 0m35 0q21-11 36 0m-55 5-8 39h16m-30 29q23 13 46 0"
                fill="none"
                stroke="#555b56"
                strokeWidth="3"
              />
              <ellipse
                cx="200"
                cy="145"
                rx="117"
                ry="27"
                fill="none"
                stroke="#f36b32"
                strokeWidth="7"
                strokeDasharray="9 5"
              />
              <path d="M310 152h66" stroke="#f36b32" strokeWidth="2" />
              <text x="260" y="112" fontSize="14" fill="#9e431f">
                2.5 cm above eyebrows
              </text>
            </svg>
            <span className="eyebrow">MEASURE TWICE. RIDE CONFIDENTLY.</span>
          </div>
          <div>
            <div className="guide-step">
              <span>01</span>
              <div>
                <h3>Grab a soft measuring tape</h3>
                <p>
                  Wrap it around the widest part of your head, approximately 2.5 cm above your
                  eyebrows. Keep the tape level and comfortably snug.
                </p>
              </div>
            </div>
            <div className="guide-step">
              <span>02</span>
              <div>
                <h3>Check the model’s size chart</h3>
                <p>
                  Write down the measurement in centimetres. Match it to the exact manufacturer and
                  helmet model. Generic S–XL ranges are not interchangeable.
                </p>
              </div>
            </div>
            <div className="guide-step">
              <span>03</span>
              <div>
                <h3>Try it on before you ride</h3>
                <p>
                  Check for even, snug contact without painful pressure. Follow the manufacturer’s
                  fit and retention checks. If you are between sizes, ask for model-specific advice.
                </p>
              </div>
            </div>
            <a
              className="text-link"
              href="https://axorhelmets.com/pages/size-chart"
              target="_blank"
              rel="noreferrer"
            >
              Check AXOR manufacturer sizing <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="help-strip">
          <div>
            <h2>Still between sizes?</h2>
            <p>Tell rider support the model and your measurement.</p>
          </div>
          <Link href="/contact" className="button">
            Let’s talk fit <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  if (page === 'safety-guide')
    return (
      <div className="page-wrap reading-page">
        <ShieldCheck className="orange-text" size={40} />
        <span className="eyebrow orange-text">KNOW YOUR GEAR</span>
        <h1>Protection comes first.</h1>
        <p className="lead">
          A helmet is one part of riding safely. Choose carefully, fit it correctly and follow the
          manufacturer’s instructions.
        </p>
        {[
          [
            'Check the exact certification',
            'Check the label and manufacturer documentation for the exact model and variant. This demo catalog makes no verified certification claims.',
          ],
          [
            'Fit and fastening matter',
            'Use the model’s size chart and retention checks. Fasten the strap correctly every time; a loose or incorrectly secured helmet may not perform as intended.',
          ],
          [
            'After an impact',
            'Stop using a helmet after an impact and follow the manufacturer’s replacement advice, even if damage is not visible.',
          ],
          [
            'Keep your view clear',
            'Use the recommended cleaning method for the visor and shell. Avoid unapproved chemicals and modifications.',
          ],
          [
            'Know when to replace it',
            'Follow manufacturer guidance on service life, wear and storage. Ask the manufacturer if you are unsure about a helmet’s condition.',
          ],
        ].map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
        <Link href="/size-guide" className="button">
          Start with the fit <ArrowRight size={17} />
        </Link>
      </div>
    );
  if (page === 'contact')
    return (
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow orange-text">RIDERS HELPING RIDERS</span>
            <h1>Let’s talk about your next ride.</h1>
            <p>Fit questions, order updates, or a little advice. Start here.</p>
          </div>
        </div>
        <div className="contact-layout">
          <div>
            <div className="contact-detail">
              <Mail />
              <div>
                <h3>Send a message</h3>
                <p>Include your order number for an existing order.</p>
              </div>
            </div>
            <div className="contact-detail">
              <MapPin />
              <div>
                <h3>Based in India</h3>
                <p>Built around the roads we call home.</p>
              </div>
            </div>
            <p className="small-note">
              {config?.demo
                ? 'Demo messages are saved in the local admin inbox. No email is sent.'
                : 'Your message will appear in the rider support inbox.'}
            </p>
            <Link href="/faq" className="text-link">
              You might find your answer here <ArrowUpRight size={16} />
            </Link>
          </div>
          {sent ? (
            <div className="panel success-panel">
              <Check size={36} />
              <h2>Your message is in.</h2>
              <p>We’ve saved your enquiry.</p>
              <small>Reference: {sent}</small>
              <button className="button outline" onClick={() => setSent('')}>
                Send another message
              </button>
            </div>
          ) : (
            <form
              className="panel"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  const result = await api<{ id: string }>(
                    '/contact',
                    send('POST', Object.fromEntries(new FormData(e.currentTarget).entries())),
                  );
                  setSent(result.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Your name
                <input name="name" required minLength={2} maxLength={100} />
              </label>
              <label>
                Email address
                <input name="email" type="email" required />
              </label>
              <label>
                How can we help?
                <textarea name="message" required minLength={10} maxLength={2000} rows={5} />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button disabled={busy} className="button">
                {busy ? 'Sending…' : 'Send your message'}
                <ArrowUpRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    );
  if (page === 'faq')
    return (
      <div className="page-wrap reading-page">
        <span className="eyebrow orange-text">A LITTLE CLARITY FOR THE ROAD</span>
        <h1>Good questions. Clear answers.</h1>
        <div className="faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <Link href="/contact" className="text-link">
          Still need a hand? <ArrowRight size={17} />
        </Link>
      </div>
    );
  const content: Record<string, { title: string; intro: string; sections: string[][] }> = {
    'shipping-returns': {
      title: 'Shipping & returns.',
      intro: 'Know what happens between checkout and your first ride.',
      sections: [
        [
          'Delivery',
          'Orders of ₹2,000 and above have free shipping in the current store configuration. Shipping below that threshold is ₹99. Live delivery coverage and timelines must be confirmed by support.',
        ],
        [
          'Returns and cancellations',
          'Unpaid orders can be cancelled in your account. For paid orders, contact support with your order number. Keep the helmet unworn, with tags and packaging, while a request is reviewed.',
        ],
        [
          'Before launch',
          'This is a demonstration policy. The store operator must publish the actual return window, exclusions, reverse-shipping charges and refund timelines before accepting live orders.',
        ],
      ],
    },
    privacy: {
      title: 'Your privacy matters.',
      intro: 'A clear view of the information this store uses.',
      sections: [
        [
          'Information you provide',
          'The store records account details, saved addresses, shopping activity, order records, reviews and support enquiries. Passwords are stored as hashes.',
        ],
        [
          'Payment information',
          'Payment credentials are handled by Razorpay during live checkout. The store retains payment identifiers and status, not raw card numbers or banking credentials.',
        ],
        [
          'Cookies and device storage',
          'Secure session cookies keep you signed in. The shopping bag and wishlist may be stored on your device before you sign in. No marketing tracker is enabled in this build.',
        ],
        [
          'Your requests',
          'Contact rider support to request access, correction or deletion. The operator must define retention periods, legal entity details and the privacy contact before launch.',
        ],
      ],
    },
    terms: {
      title: 'A few ground rules.',
      intro: 'Please read these terms before placing an order.',
      sections: [
        [
          'Demonstration store',
          'The sample catalog, prices, inventory and simulated transactions are for testing. A demo order is not a purchase and will not be shipped.',
        ],
        [
          'Product information',
          'Use manufacturer documentation for the exact model’s fit, specifications, approvals and care. Product photography and names identify the displayed products; they do not establish authorized reseller status.',
        ],
        [
          'Live purchases',
          'Before live sales, the operator must publish its legal name, registered address, applicable taxes, sale conditions, fulfilment terms and refund policy. Live orders must be confirmed by the server after payment verification.',
        ],
        ['Contact', 'Use the contact page for account, order or product enquiries.'],
      ],
    },
  };
  const c = content[page];
  return (
    <div className="page-wrap reading-page">
      <span className="eyebrow orange-text">THE DETAILS MATTER</span>
      <h1>{c?.title || 'Rider journal.'}</h1>
      <p className="lead">{c?.intro || 'Practical reading for your next adventure.'}</p>
      {c?.sections.map(([h, p]) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </section>
      )) || (
        <>
          <Link href="/size-guide" className="help-strip">
            How to find your helmet fit <ArrowRight />
          </Link>
          <Link href="/safety-guide" className="help-strip">
            Know your helmet: care and safety <ArrowRight />
          </Link>
        </>
      )}
    </div>
  );
}
