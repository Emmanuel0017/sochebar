import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Input, Label } from '../../components/Input';
import { errorMessage } from '../../lib/errors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-4xl text-brass">Sochebar</div>
          <div className="text-sm text-paper-dim mt-2 tracking-wide">Every kwacha, every bottle, traceable.</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-panel-border rounded-lg p-6 space-y-4">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              autoFocus
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-copper bg-copper/10 border border-copper/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
