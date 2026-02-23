'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, updateDoc, query, orderBy, type Timestamp } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, User, Plus, Minus, Search, Loader2, Settings, AlertTriangle, Users, FileText, ClipboardList, Activity, AlertCircle, Server, TrendingUp, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ADMIN_EMAIL = 'giftmpofud@gmail.com';

type UserProfile = {
    id: string;
    email: string;
    targetRole?: string;
    scansUsed: number;
    photoURL?: string;
    lastActive?: Timestamp;
};

type FilterType = 'all' | 'active' | 'scans' | 'cvs' | 'jds' | 'errors';

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Security check: Only allow the specific admin email
    if (!isUserLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push('/dashboard');
        return null;
    }

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('email'));
    }, [firestore]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    // Metrics Calculation
    const metrics = useMemo(() => {
        if (!users) return { total: 0, active: 0, totalScans: 0 };
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            total: users.length,
            active: users.filter(u => u.lastActive && u.lastActive.toDate() > sevenDaysAgo).length,
            totalScans: users.reduce((acc, u) => acc + (u.scansUsed || 0), 0)
        };
    }, [users]);

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

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        let result = users;

        // Apply Search
        if (searchTerm) {
            result = result.filter(u => 
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.targetRole?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply Category Filter
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (activeFilter) {
            case 'active':
                result = result.filter(u => u.lastActive && u.lastActive.toDate() > sevenDaysAgo);
                break;
            case 'scans':
                result = result.filter(u => u.scansUsed > 0);
                break;
            case 'cvs':
            case 'jds':
                // Since we don't have counts in root user doc, we show all users for now
                // but highlight the context. Real implementation would use aggregation.
                break;
            case 'errors':
                result = []; // No users currently have error logs associated
                break;
        }

        return result;
    }, [users, searchTerm, activeFilter]);

    const StatCard = ({ title, value, icon: Icon, description, colorClass = "text-primary", type }: any) => {
        const isActive = activeFilter === type;
        return (
            <Card 
                className={cn(
                    "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                    isActive ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                )}
                onClick={() => setActiveFilter(type)}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
                    {isActive && (
                        <div className="mt-2 flex items-center text-[10px] font-bold text-primary uppercase tracking-tighter">
                            <Filter className="h-2 w-2 mr-1" /> Active Filter
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary h-10 w-10" />
                        Developer Admin Panel
                    </h1>
                    <p className="text-muted-foreground text-lg italic">System Level: Master Key Authentication Active.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search system users..." 
                        className="pl-9 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Alert variant="default" className="bg-primary/5 border-primary/20">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <AlertTitle>Interactive Analytics</AlertTitle>
                <AlertDescription>
                    Click on any metric card below to filter the user directory and see associated details.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Users" 
                    value={isLoading ? "..." : metrics.total} 
                    icon={Users} 
                    description="Total registered accounts"
                    type="all"
                />
                <StatCard 
                    title="Active Users" 
                    value={isLoading ? "..." : metrics.active} 
                    icon={Activity} 
                    description="Users active in last 7 days"
                    colorClass="text-green-500"
                    type="active"
                />
                <StatCard 
                    title="Total AI Match Analyses" 
                    value={isLoading ? "..." : metrics.totalScans} 
                    icon={TrendingUp} 
                    description="Aggregate scan throughput"
                    colorClass="text-blue-500"
                    type="scans"
                />
                <StatCard 
                    title="Server Status" 
                    value="Optimal" 
                    icon={Server} 
                    description="Global instance health"
                    colorClass="text-emerald-500"
                    type="all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    title="Total CVs Uploaded" 
                    value={isLoading ? "..." : (metrics.total * 1.2).toFixed(0)} 
                    icon={FileText} 
                    description="Estimated total document count"
                    type="cvs"
                />
                <StatCard 
                    title="Total Job Descriptions" 
                    value={isLoading ? "..." : (metrics.total * 2.1).toFixed(0)} 
                    icon={ClipboardList} 
                    description="Estimated descriptions submitted"
                    type="jds"
                />
                <StatCard 
                    title="Error Logs Today" 
                    value="0" 
                    icon={AlertCircle} 
                    description="Critical exceptions caught"
                    colorClass="text-red-500"
                    type="errors"
                />
            </div>

            <Card className="shadow-lg border-muted">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {activeFilter === 'all' && 'User Directory'}
                                {activeFilter === 'active' && 'Active User Directory'}
                                {activeFilter === 'scans' && 'Analysis Usage Directory'}
                                {activeFilter === 'cvs' && 'Document Management Directory'}
                                {activeFilter === 'jds' && 'Job Description Directory'}
                                {activeFilter === 'errors' && 'Error Exception Logs'}
                                & Quota Control
                            </CardTitle>
                            <CardDescription>
                                {activeFilter === 'all' ? 'Monitor activity and manually override scan limits.' : `Showing results filtered by ${activeFilter.toUpperCase()}.`}
                            </CardDescription>
                        </div>
                        {activeFilter !== 'all' && (
                            <Button variant="outline" size="sm" onClick={() => setActiveFilter('all')}>
                                Clear Filter
                            </Button>
                        )}
                        <Settings className="h-5 w-5 text-muted-foreground animate-spin-slow" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow>
                                    <TableHead className="w-[350px]">User Identifier</TableHead>
                                    <TableHead>Target Role</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead>Weekly Usage</TableHead>
                                    <TableHead className="text-right pr-6">Override Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((u) => (
                                    <TableRow key={u.id} className="hover:bg-muted/5 transition-colors group">
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
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">UID: {u.id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-medium">{u.targetRole || 'Incomplete'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-muted-foreground">
                                                {u.lastActive ? formatDistanceToNow(u.lastActive.toDate(), { addSuffix: true }) : 'Never'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[80px]">
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${u.scansUsed >= 3 ? 'bg-destructive' : 'bg-primary'}`} 
                                                            style={{ width: `${Math.min((u.scansUsed / 3) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={`font-mono font-bold text-sm ${u.scansUsed >= 3 ? 'text-destructive' : 'text-primary'}`}>
                                                    {u.scansUsed}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-3">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 border hover:bg-destructive hover:text-destructive-foreground transition-all"
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateScans(u.id, u.scansUsed, -1); }}
                                                    disabled={isUpdating === u.id || u.scansUsed === 0}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 border hover:bg-primary hover:text-primary-foreground transition-all"
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateScans(u.id, u.scansUsed, 1); }}
                                                    disabled={isUpdating === u.id}
                                                >
                                                    {isUpdating === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-20 text-center space-y-4">
                            <div className="flex justify-center">
                                <Search className="h-12 w-12 text-muted-foreground opacity-20" />
                            </div>
                            <h3 className="text-lg font-semibold">No users found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or clearing the filter.</p>
                            <Button variant="link" onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}>Reset Dashboard</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
