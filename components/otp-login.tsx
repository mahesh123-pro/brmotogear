'use client';
import { useState } from 'react';
import { api, send } from '@/lib/api';
import type { PublicUser } from '@/lib/types';
export function OtpLogin({ onLogin }: { onLogin: (user: PublicUser) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [requested, setRequested] = useState(false);
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="otp-login">
      <button type="button" className="underlined" onClick={() => setOpen(!open)}>
        {open ? 'Close email sign-in' : 'Sign in with a one-time email code'}
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              if (requested) {
                await onLogin(
                  await api<PublicUser>('/auth/otp/verify', send('POST', { email, code })),
                );
              } else {
                const r = await api<{ message: string; demoCode?: string }>(
                  '/auth/otp/request',
                  send('POST', { email }),
                );
                setDemoCode(r.demoCode || '');
                setRequested(true);
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Account email
            <input
              type="email"
              required
              value={email}
              readOnly={requested}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {requested && (
            <>
              <p className="small-note">
                If an account exists, a six-digit code has been sent. It expires in 10 minutes.
              </p>
              {demoCode && (
                <p className="demo-otp">
                  Demo sign-in code: <strong>{demoCode}</strong>
                </p>
              )}
              <label>
                Six-digit code
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="button outline full">
            {busy ? 'One moment…' : requested ? 'Verify and sign in' : 'Send sign-in code'}
          </button>
          {requested && (
            <button
              type="button"
              className="underlined"
              onClick={() => {
                setRequested(false);
                setCode('');
                setDemoCode('');
              }}
            >
              Use another email or request a new code
            </button>
          )}
        </form>
      )}
    </div>
  );
}
