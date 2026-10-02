'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap empty-state">
      <h1>A small bump in the road.</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
