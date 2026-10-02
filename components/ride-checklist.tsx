'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, RotateCcw, Printer } from 'lucide-react';
import { editorialPhotos } from '@/lib/journal';
const groups = [
  {
    title: 'The everyday essentials',
    items: [
      'Phone and charging cable',
      'Wallet and travel documents',
      'Keys and booking details',
      'Offline route and destination notes',
    ],
  },
  {
    title: 'The overnight bag',
    items: [
      'Change of clothes',
      'Toiletries and personal essentials',
      'Reusable water bottle',
      'Separate pouch for used clothing',
    ],
  },
  {
    title: 'The final once-over',
    items: [
      'Weather and road updates checked',
      'Accommodation and stops confirmed',
      'Trip details shared with someone at home',
      'Luggage instructions and load limits checked',
    ],
  },
];
const items = groups.flatMap((g) => g.items);
const storageKey = 'brmotogear-weekend-checklist-v1';
export function RideChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(value))
        setChecked([
          ...new Set(value.filter((v): v is string => typeof v === 'string' && items.includes(v))),
        ]);
    } catch {
      setSaved(false);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(checked));
      } catch {
        setSaved(false);
      }
    }
  }, [checked, ready]);
  return (
    <div className="page-wrap checklist-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow orange-text">LESS TO REMEMBER. MORE TO LOOK FORWARD TO.</span>
          <h1>Your weekend starts here.</h1>
          <p>A personal packing checklist for a little time away.</p>
        </div>
      </div>
      <div className="checklist-layout">
        <aside>
          <div className="checklist-image">
            <Image
              src={editorialPhotos.pause.src}
              alt={editorialPhotos.pause.alt}
              fill
              sizes="(max-width:700px) 90vw, 36vw"
              priority
            />
          </div>
          <h2>
            Pack a little.
            <br />
            Look forward to a lot.
          </h2>
          <p>
            Tick items as you pack. Your progress stays in this browser, ready for you to pick up
            later.
          </p>
          <p className="small-note">
            This list covers personal packing. Use your motorcycle and equipment manuals for vehicle
            checks, riding gear, load limits and luggage setup.
          </p>
          <Link className="text-link" href="/blog/pack-for-a-weekend">
            Read the packing notes <ArrowUpRight size={18} />
          </Link>
        </aside>
        <div>
          <div className="checklist-progress">
            <span className="eyebrow">YOUR PACKING PROGRESS</span>
            <strong aria-live="polite">
              {checked.length} of {items.length} ready
            </strong>
            <progress value={checked.length} max={items.length} aria-label="Packing progress" />
            <p>
              {checked.length === items.length
                ? 'Personal packing list complete. Review anything specific to your trip before you go.'
                : 'One less thing to think about with every tick.'}
            </p>
          </div>
          {groups.map((g, i) => (
            <fieldset className="checklist-group" key={g.title} disabled={!ready}>
              <legend>
                <span>0{i + 1}</span>
                {g.title}
              </legend>
              {g.items.map((item) => (
                <label className={checked.includes(item) ? 'packed' : ''} key={item}>
                  <input
                    type="checkbox"
                    checked={checked.includes(item)}
                    onChange={(e) =>
                      setChecked((prev) =>
                        e.target.checked ? [...prev, item] : prev.filter((v) => v !== item),
                      )
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <div className="checklist-actions">
            <button
              className="button outline"
              disabled={!ready || !checked.length}
              onClick={() => setChecked([])}
            >
              <RotateCcw size={16} /> Reset checklist
            </button>
            <button className="text-link" onClick={() => window.print()}>
              <Printer size={17} /> Print list
            </button>
          </div>
          <p className="small-note" role="status">
            {!ready
              ? 'Loading your list…'
              : saved
                ? 'Saved on this device. No account needed.'
                : 'Browser storage is unavailable. You can still use or print this list.'}
          </p>
        </div>
      </div>
    </div>
  );
}
