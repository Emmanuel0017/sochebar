import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';

interface Role {
  id: string;
  name: string;
}
interface UserRow {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  role: Role;
}

export function UsersPage() {
  const { push } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', roleId: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/roles')])
      .then(([u, r]) => {
        setUsers(u.data);
        setRoles(r.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createUser() {
    try {
      await api.post('/users', form);
      push('User created');
      setModalOpen(false);
      setForm({ name: '', username: '', password: '', roleId: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Users</h1>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New user
          </span>
        </Button>
      </div>

      <Card>
        {users.map((u) => (
          <div key={u.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{u.name}</div>
              <div className="text-xs text-paper-dim">
                {u.username} · {u.role.name}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
              <Button variant="secondary" onClick={() => toggleActive(u)}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New user">
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={createUser}
            disabled={!form.name || !form.username || form.password.length < 6 || !form.roleId}
          >
            Create user
          </Button>
        </div>
      </Modal>
    </div>
  );
}
