
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, updateDoc, deleteDoc, query, orderBy, collectionGroup, type Timestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ShieldCheck, User, Search, Loader2, Settings, AlertTriangle, 
    Users, FileText, ClipboardList, Activity, TrendingUp, 
    Eye, Ban, KeyRound, Download, Trash2, Flag, Info, Server, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ADMIN_EMAIL = 'giftmpofud@gmail.com';

type UserProfile = {
    id: string;
    email: string;
    targetRole?: string;
    scansUsed: number;
    photoURL?: string;
    lastActive?: Timestamp;
    role?: 'admin' | 'user';
    status?: 'active' | 'suspended';
    location?: string;
    experienceLevel?: string;
};

type CV = {
    id: string;
    userId: string;
    fileName: string;
    uploadDate: string;
    fileContent: string;
    flagged?: boolean;
};

type JobDescription = {
    id: string;
    userId: string;
    descriptionText: string;
    creationDate: string;
};

type MatchResult = {
    id: string;
    jobTitle: string;
    matchScore: number;
    analysisDate: string;
    userId: string;
    cvId: string;
    jobDescriptionId: string;
    missingKeywords?: string[];
    reasoning?: string;
};

type FilterType = 'all' | 'active' | 'scans' | 'cvs' | 'jds' | 'errors';

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isActualAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Global Collections Queries - DEFER until we are sure user is Admin
    // This prevents "Missing or insufficient permissions" errors on initial load
    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !isActualAdmin) return null;
        return query(collection(firestore, 'users'), orderBy('email'));
    }, [firestore, isActualAdmin]);
    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const cvsQuery = useMemoFirebase(() => {
        if (!firestore || !isActualAdmin) return null;
        return query(collectionGroup(firestore, 'cvs'), orderBy('uploadDate', 'desc'));
    }, [firestore, isActualAdmin]);
    const { data: allCvs, isLoading: isAllCvsLoading } = useCollection<CV>(cvsQuery);

    const jobsQuery = useMemoFirebase(() => {
        if (!firestore || !isActualAdmin) return null;
        return query(collectionGroup(firestore, 'jobDescriptions'), orderBy('creationDate', 'desc'));
    }, [firestore, isActualAdmin]);
    const { data: allJobs, isLoading: isAllJobsLoading } = useCollection<JobDescription>(jobsQuery);

    const matchResultsQuery = useMemoFirebase(() => {
        if (!firestore || !isActualAdmin) return null;
        return query(collectionGroup(firestore, 'matchResults'), orderBy('analysisDate', 'desc'));
    }, [firestore, isActualAdmin]);
    const { data: allMatches, isLoading: isAllMatchesLoading } = useCollection<MatchResult>(matchResultsQuery);

    // Metrics Calculation
    const metrics = useMemo(() => {
        if (!users || !mounted) return { total: 0, active: 0, totalScans: 0, totalCvs: 0, totalJobs: 0 };
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return {
            total: users.length,
            active: users.filter(u => u.lastActive && u.lastActive.toDate() > sevenDaysAgo).length,
            totalScans: users.reduce((acc, u) => acc + (u.scansUsed || 0), 0),
            totalCvs: allCvs?.length || 0,
            totalJobs: allJobs?.length || 0
        };
    }, [users, allCvs, allJobs, mounted]);

    useEffect(() => {
        if (mounted && !isUserLoading && !isActualAdmin) {
            router.push('/dashboard');
        }
    }, [mounted, isUserLoading, isActualAdmin, router]);

    const handleUpdateUserField = async (userId: string, field: string, value: any) => {
        if (!firestore) return;
        setIsUpdating(userId);
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { [field]: value });
            toast({ title: "Updated", description: "System property changed successfully." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsUpdating(null);
        }
    };

    const handleDeleteDocument = async (path: string) => {
        if (!firestore || !window.confirm("Delete this document forever?")) return;
        try {
            await deleteDoc(doc(firestore, path));
            toast({ title: "Removed", description: "Entry purged from database." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed", description: error.message });
        }
    };

    const handleFlagDocument = async (path: string, currentlyFlagged: boolean) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, path), { flagged: !currentlyFlagged });
            toast({ title: currentlyFlagged ? "Unflagged" : "Flagged" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const handleDownloadContent = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleResetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: "Email Sent", description: "Password reset instructions delivered." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed", description: error.message });
        }
    };

    const filteredUsers = useMemo(() => {
        if (!users || !mounted) return [];
        let result = users;
        if (searchTerm) {
            result = result.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        switch (activeFilter) {
            case 'active': result = result.filter(u => u.lastActive && u.lastActive.toDate() > sevenDaysAgo); break;
            case 'scans': result = result.filter(u => u.scansUsed > 0); break;
        }
        return result;
    }, [users, searchTerm, activeFilter, mounted]);

    if (!mounted || isUserLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isActualAdmin) return null;

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
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black">{value}</div>
                    {description && <p className="text-[10px] text-muted-foreground mt-1 uppercase">{description}</p>}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="text-primary h-10 w-10" />
                        DEVELOPER CONSOLE
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Master Key Access: {user?.email}</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="SEARCH SYSTEM NODES..." 
                        className="pl-9 h-11 bg-muted/20 border-primary/20 font-mono text-xs uppercase"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={isUsersLoading ? "..." : metrics.total} icon={Users} type="all" description="Registered accounts" />
                <StatCard title="Active Users" value={isUsersLoading ? "..." : metrics.active} icon={Activity} colorClass="text-green-500" type="active" description="Active last 7 days" />
                <StatCard title="AI Analyses" value={isUsersLoading ? "..." : metrics.totalScans} icon={TrendingUp} colorClass="text-blue-500" type="scans" description="Total scan throughput" />
                <StatCard title="Server Status" value="OPTIMAL" icon={Server} colorClass="text-emerald-500" type="all" description="Global instance health" />
                <StatCard title="CVs Uploaded" value={isAllCvsLoading ? "..." : metrics.totalCvs} icon={FileText} colorClass="text-orange-500" type="cvs" description="Total document count" />
                <StatCard title="Job Descs" value={isAllJobsLoading ? "..." : metrics.totalJobs} icon={ClipboardList} colorClass="text-purple-500" type="jds" description="Descriptions submitted" />
                <StatCard title="Error Logs" value="0" icon={AlertCircle} colorClass="text-muted-foreground" type="errors" description="Exceptions today" />
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1">
                    <TabsTrigger value="users" className="gap-2 font-bold uppercase text-[10px]"><Users className="h-3 w-3" /> Users</TabsTrigger>
                    <TabsTrigger value="cvs" className="gap-2 font-bold uppercase text-[10px]"><FileText className="h-3 w-3" /> CVs</TabsTrigger>
                    <TabsTrigger value="jobs" className="gap-2 font-bold uppercase text-[10px]"><ClipboardList className="h-3 w-3" /> Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="shadow-2xl border-primary/10">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle className="text-lg font-bold">USER DIRECTORY</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isUsersLoading ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/10">
                                            <TableHead className="text-[10px] font-black uppercase">Identifier</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Activity</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Usage</TableHead>
                                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Control</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((u) => (
                                            <TableRow key={u.id} className="hover:bg-muted/5 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center overflow-hidden">
                                                            {u.photoURL ? <img src={u.photoURL} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-muted-foreground" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{u.email}</span>
                                                            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">{u.role || 'user'}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.status === 'suspended' ? 'destructive' : 'outline'} className="text-[9px] font-bold uppercase">
                                                        {u.status || 'active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {u.lastActive ? formatDistanceToNow(u.lastActive.toDate(), { addSuffix: true }) : 'OFFLINE'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={cn("font-mono font-bold text-xs", u.scansUsed >= 3 ? "text-destructive" : "text-primary")}>
                                                        {u.scansUsed}/3
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => { setSelectedUser(u); setIsUserDetailsOpen(true); }}>
                                                        <Settings className="h-3 w-3 mr-2" /> Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cvs">
                    <Card className="shadow-2xl border-primary/10">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle className="text-lg font-bold">CV REPOSITORY</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isAllCvsLoading ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-[10px] font-black uppercase">Filename</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Owner</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allCvs?.map((cv) => {
                                            const owner = users?.find(u => u.id === cv.userId);
                                            return (
                                                <TableRow key={cv.id}>
                                                    <TableCell className="font-medium text-xs">{cv.fileName}</TableCell>
                                                    <TableCell className="text-[10px] font-mono">{owner?.email || cv.userId}</TableCell>
                                                    <TableCell className="text-[10px] text-muted-foreground">{new Date(cv.uploadDate).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {cv.flagged && <Badge variant="destructive" className="text-[8px] gap-1"><AlertTriangle className="h-2 w-2" /> FLAG</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-1">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3 w-3" /></Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-3xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle className="text-sm font-bold">{cv.fileName}</DialogTitle>
                                                                        <DialogDescription className="text-[10px] uppercase">Node: {cv.id}</DialogDescription>
                                                                    </DialogHeader>
                                                                    <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30 font-mono text-[11px] leading-relaxed">
                                                                        <pre className="whitespace-pre-wrap">{cv.fileContent}</pre>
                                                                    </ScrollArea>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" size="sm" onClick={() => handleDownloadContent(cv.fileContent, cv.fileName)}>
                                                                            <Download className="h-3 w-3 mr-2" /> Download Raw
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFlagDocument(`users/${cv.userId}/cvs/${cv.id}`, !!cv.flagged)}>
                                                                <Flag className={cn("h-3 w-3", cv.flagged ? "text-destructive fill-destructive" : "")} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteDocument(`users/${cv.userId}/cvs/${cv.id}`)}>
                                                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="jobs">
                    <Card className="shadow-2xl border-primary/10">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle className="text-lg font-bold">ANALYSIS LOGS</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isAllJobsLoading ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-[10px] font-black uppercase">Role Identified</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">User</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Score</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                                            <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allMatches?.map((match) => {
                                            const owner = users?.find(u => u.id === match.userId);
                                            return (
                                                <TableRow key={match.id}>
                                                    <TableCell className="font-bold text-xs">{match.jobTitle}</TableCell>
                                                    <TableCell className="text-[10px] font-mono">{owner?.email || match.userId}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={match.matchScore > 75 ? 'default' : 'secondary'} className="text-[9px] font-bold">
                                                            {match.matchScore}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-muted-foreground font-mono">
                                                        {new Date(match.analysisDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Info className="h-3 w-3" /></Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle className="text-sm font-bold">Analysis Feedback</DialogTitle>
                                                                    <DialogDescription className="text-[10px] uppercase">Job Title: {match.jobTitle}</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                                                        <h4 className="text-[10px] font-black uppercase mb-2 text-primary">AI Reasoning</h4>
                                                                        <p className="text-xs leading-relaxed text-muted-foreground">{match.reasoning || "No detailed reasoning available."}</p>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {match.missingKeywords?.map(kw => <Badge key={kw} variant="outline" className="text-[8px] uppercase">{kw}</Badge>)}
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDocument(`users/${match.userId}/cvs/${match.cvId}/matchResults/${match.id}`)}>
                                                                        <Trash2 className="h-3 w-3 mr-2" /> Delete Log
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            SECURITY NODE: {selectedUser?.email}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] uppercase tracking-tighter">
                            MANAGE ACCESS PERMISSIONS AND REVIEW DOCUMENT HISTORY
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Settings className="h-3 w-3" /> ACCESS CONTROL
                                    </h4>
                                    
                                    <div className="p-4 border-2 border-primary/10 rounded-xl bg-muted/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase">System Status</span>
                                            <Button 
                                                variant={selectedUser.status === 'suspended' ? 'default' : 'outline'} 
                                                size="sm"
                                                className="h-8 text-[10px] font-bold uppercase"
                                                onClick={() => handleUpdateUserField(selectedUser.id, 'status', selectedUser.status === 'suspended' ? 'active' : 'suspended')}
                                                disabled={selectedUser.email === ADMIN_EMAIL}
                                            >
                                                {selectedUser.status === 'suspended' ? <ShieldCheck className="h-3 w-3 mr-2" /> : <Ban className="h-3 w-3 mr-2" />}
                                                {selectedUser.status === 'suspended' ? 'RESTORE' : 'SUSPEND'}
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase">Auth Role</span>
                                            <Select 
                                                value={selectedUser.role || 'user'} 
                                                onValueChange={(val) => handleUpdateUserField(selectedUser.id, 'role', val)}
                                                disabled={selectedUser.email === ADMIN_EMAIL}
                                            >
                                                <SelectTrigger className="w-[120px] h-8 text-[10px] font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">USER</SelectItem>
                                                    <SelectItem value="admin">ADMIN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                                            <span className="text-xs font-bold uppercase">Credential Safety</span>
                                            <Button variant="secondary" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => handleResetPassword(selectedUser.email)}>
                                                <KeyRound className="h-3 w-3 mr-2" /> RESET PWD
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <User className="h-3 w-3" /> CAREER SNAPSHOT
                                    </h4>
                                    <div className="p-4 border-2 border-primary/10 rounded-xl bg-muted/10 space-y-2 text-xs font-mono uppercase">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">TARGET_ROLE:</span>
                                            <span className="font-bold">{selectedUser.targetRole || 'NULL'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">EXP_LEVEL:</span>
                                            <span className="font-bold">{selectedUser.experienceLevel || 'NULL'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-3 w-3" /> CV HISTORY
                                </h4>
                                <ScrollArea className="h-[320px] border-2 border-primary/10 rounded-xl p-3 bg-muted/5">
                                    <div className="space-y-2">
                                        {allCvs?.filter(cv => cv.userId === selectedUser.id).map((cv) => (
                                            <div key={cv.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold truncate max-w-[150px]">{cv.fileName}</span>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-mono">{new Date(cv.uploadDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadContent(cv.fileContent, cv.fileName)}>
                                                    <Download className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        {allCvs?.filter(cv => cv.userId === selectedUser.id).length === 0 && (
                                            <p className="text-[10px] text-muted-foreground text-center py-10 uppercase font-mono tracking-widest">NO_DATA_FOUND</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
