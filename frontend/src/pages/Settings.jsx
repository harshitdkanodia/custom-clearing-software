import { useState, useEffect } from 'react';
import api, { hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings as SettingsIcon, Plus, Pencil, Trash2, Ban, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OPERATION_STAFF' });

    useEffect(() => { fetchUsers(); }, []);

    async function fetchUsers() {
        try {
            const res = await api.get('/users');
            setUsers(res.data.data);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    function openAdd() {
        setEditUser(null);
        setForm({ name: '', email: '', password: '', role: 'OPERATION_STAFF' });
        setFormOpen(true);
    }

    function openEdit(u) {
        setEditUser(u);
        setForm({ name: u.name, email: u.email, password: '', role: u.role });
        setFormOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editUser) {
                const payload = {
                    name: form.name,
                    role: form.role,
                    email: form.email !== editUser.email ? form.email : undefined,
                    password: form.password.trim() || undefined
                };
                await api.put(`/users/${editUser.id}`, payload);
                toast.success('User updated successfully');
            } else {
                await api.post('/users', form);
                toast.success('User created successfully');
            }
            setFormOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleStatus(u) {
        try {
            await api.patch(`/users/${u.id}/status`);
            toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
            fetchUsers();
        } catch (err) {
            toast.error('Failed to update status');
        }
    }

    async function handleDelete() {
        try {
            await api.delete(`/users/${deleteTarget.id}`);
            toast.success('User deleted successfully');
            setDeleteTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Delete failed');
            setDeleteTarget(null);
        }
    }

    const roleBadge = { ADMIN: 'destructive', OPERATION_STAFF: 'warning', VIEWER: 'info' };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage system access and team roles</p>
                </div>
                <Button onClick={openAdd} className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" /> Add Team Member
                </Button>
            </div>

            <Card className="border-gray-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="font-semibold text-gray-700">User Details</TableHead>
                            <TableHead className="font-semibold text-gray-700">Role</TableHead>
                            <TableHead className="font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-400 font-medium">No users found</TableCell>
                            </TableRow>
                        ) : (
                            users.map(u => (
                                <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{u.name}</span>
                                            <span className="text-xs text-gray-500">{u.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={roleBadge[u.role] || 'outline'} className="text-[10px] h-5">
                                            {u.role.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.isActive ? 'success' : 'destructive'} className="text-[10px] h-5">
                                            {u.isActive ? 'Active' : 'Deactivated'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-blue-600" title="Edit User" onClick={() => openEdit(u)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-amber-600" title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(u)}>
                                                {u.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-red-600" title="Delete User" onClick={() => setDeleteTarget(u)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* User Form */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{editUser ? 'Modify User account' : 'Register New User'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                        <div className="space-y-1">
                            <Label className="text-sm font-semibold">Full Name *</Label>
                            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rahul Sharma" required />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-semibold">Email Address *</Label>
                            <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="name@cha.com" required />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-semibold">{editUser ? 'Change Password' : 'Password *'}</Label>
                            <Input
                                type="password"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                placeholder={editUser ? 'Leave blank to keep current' : 'Min. 6 characters'}
                                required={!editUser}
                                minLength={6}
                            />
                            {editUser && <p className="text-[10px] text-gray-400">Security: Only fill this if you want to reset the user password.</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Access Level *</Label>
                            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Administrator</SelectItem>
                                    <SelectItem value="OPERATION_STAFF">Operation Staff</SelectItem>
                                    <SelectItem value="VIEWER">Viewer (Read-only)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="px-8 shadow-sm">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editUser ? 'Save changes' : 'Create Member'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
