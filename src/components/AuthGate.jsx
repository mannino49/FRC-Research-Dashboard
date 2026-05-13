import React from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

export default function AuthGate({ children }) {
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(isSupabaseConfigured);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) return children;

  if (loading) {
    return (
      <div className="app">
        <div className="status-panel" role="status">Checking session...</div>
      </div>
    );
  }

  if (!session) {
    async function signIn(e) {
      e.preventDefault();
      setMessage('');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }

    return (
      <div className="app auth-page">
        <form className="auth-card" onSubmit={signIn}>
          <div className="sc">FRC dashboard</div>
          <h1>Sign in</h1>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          <button type="submit">Enter dashboard</button>
          {message && <p className="auth-error" role="alert">{message}</p>}
        </form>
      </div>
    );
  }

  return children;
}
