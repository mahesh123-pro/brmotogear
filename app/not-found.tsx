import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page-wrap empty-state">
      <span className="eyebrow orange-text">404 / A LITTLE OFF COURSE</span>
      <h1>This road doesn’t lead anywhere.</h1>
      <p>Let’s get you back to the good stuff.</p>
      <Link className="button" href="/shop">
        Explore helmets →
      </Link>
    </div>
  );
}
