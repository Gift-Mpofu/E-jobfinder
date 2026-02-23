'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, User, Plus, Minus, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ADMIN_EMAIL = 'Giftmpofud@gmail.com';

type UserProfile = {
    id: string;
    email: string;
    targetRole?: string;
    scansUsed: number;
    photoURL?: string;
};

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Security check: Only allow the specific admin email
    if (!isUserLoading && user?.email !== ADMIN_EMAIL) {
        router.push('/dashboard');
        return null;
    }

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('email'));
    }, [firestore]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    const handleUpdateScans = async (userId: string, currentScans: number, delta: number) => {
        if (!firestore) return;
        setIsUpdating(userId);
        try {
            const userRef = doc(firestore, 'users', userId);
            const newCount = Math.max(0, currentScans + delta);
            await updateDoc(userRef, { scansUsed: newCount });
            toast({
                title: "Updated",
                description: `Scan count updated for user.`,
            });
        } catch (error: any) {
            console.error("Update failed:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message,
            });
        } finally {
            setIsUpdating(null);
        }
    };

    const filteredUsers = users?.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.targetRole?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-primary h-8 w-8" />
                        Admin Panel
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage user accounts and scan quotas.</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by email or role..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>All registered E-Job Finder users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Target Role</TableHead>
                                    <TableHead>Scans Used</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers?.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                    {u.photoURL ? (
                                                        <img src={u.photoURL} alt={u.email} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{u.email}</span>
                                                    <span className="text-xs text-muted-foreground">ID: {u.id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{u.targetRole || 'Not Set'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${u.scansUsed >= 3 ? 'text-destructive' : 'text-primary'}`}>
                                                    {u.scansUsed}
                                                </span>
                                                <span className="text-muted-foreground text-xs">/ 3</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8"
                                                    onClick={() => handleUpdateScans(u.id, u.scansUsed, -1)}
                                                    disabled={isUpdating === u.id || u.scansUsed === 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-8 w-8"
                                                    onClick={() => handleUpdateScans(u.id, u.scansUsed, 1)}
                                                    disabled={isUpdating === u.id}
                                                >
                                                    {isUpdating === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredUsers?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No users found matching your search.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}