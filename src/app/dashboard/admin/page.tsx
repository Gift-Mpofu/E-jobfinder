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
import { ShieldCheck, User, Plus, Minus, Search, Loader2, Settings } from 'lucide-react';
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
                title: "Quota Updated",
                description: `Manual scan adjustment successful.`,
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
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary h-10 w-10" />
                        Developer Admin Panel
                    </h1>
                    <p className="text-muted-foreground text-lg">Master Key Management: Monitor users and control scan quotas.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search users..." 
                        className="pl-9 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{users?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-secondary/20 border-secondary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">Active</div>
                    </CardContent>
                </Card>
                <Card className="bg-accent/5 border-accent/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Admin Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="text-lg py-1 px-4">Master Level</Badge>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-lg border-muted">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Directory</CardTitle>
                            <CardDescription>Manage scan limits for all active E-Job Finder accounts.</CardDescription>
                        </div>
                        <Settings className="h-5 w-5 text-muted-foreground animate-spin-slow" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow>
                                    <TableHead className="w-[350px]">User Profile</TableHead>
                                    <TableHead>Target Role</TableHead>
                                    <TableHead>Scan Quota (Used/Limit)</TableHead>
                                    <TableHead className="text-right pr-6">Manual Control</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers?.map((u) => (
                                    <TableRow key={u.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center overflow-hidden">
                                                    {u.photoURL ? (
                                                        <img src={u.photoURL} alt={u.email} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm truncate">{u.email}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ID: {u.id.substring(0, 12)}...</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-medium">{u.targetRole || 'Not Set'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[100px]">
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${u.scansUsed >= 3 ? 'bg-destructive' : 'bg-primary'}`} 
                                                            style={{ width: `${Math.min((u.scansUsed / 3) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={`font-mono font-bold text-sm ${u.scansUsed >= 3 ? 'text-destructive' : 'text-primary'}`}>
                                                    {u.scansUsed} <span className="text-muted-foreground font-normal">/ 3</span>
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-3">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 border hover:bg-destructive hover:text-destructive-foreground transition-all"
                                                    onClick={() => handleUpdateScans(u.id, u.scansUsed, -1)}
                                                    disabled={isUpdating === u.id || u.scansUsed === 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 border hover:bg-primary hover:text-primary-foreground transition-all"
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
                                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                                            No matches found for "{searchTerm}"
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
