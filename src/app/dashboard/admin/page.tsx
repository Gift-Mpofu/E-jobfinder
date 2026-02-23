
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
    ShieldCheck, User, Plus, Minus, Search, Loader2, Settings, AlertTriangle, 
    Users, FileText, ClipboardList, Activity, AlertCircle, Server, TrendingUp, 
    Filter, Eye, Ban, ShieldAlert, KeyRound, Mail, ChevronRight, History, 
    Download, Trash2, Flag, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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

    // Security check: Only allow the specific admin email
    if (!isUserLoading && user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push('/dashboard');
        return null;
    }

    // Global Collections Queries (Admin Only via Collection Group)
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('email'));
    }, [firestore]);
    const { data: users, isLoading: isUsersLoading } = useCollection<UserProfile>(usersQuery);

    const cvsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'cvs'), orderBy('uploadDate', 'desc'));
    }, [firestore]);
    const { data: allCvs, isLoading: isAllCvsLoading } = useCollection<CV>(cvsQuery);

    const jobsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'jobDescriptions'), orderBy('creationDate', 'desc'));
    }, [firestore]);
    const { data: allJobs, isLoading: isAllJobsLoading } = useCollection<JobDescription>(jobsQuery);

    const matchResultsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'matchResults'), orderBy('analysisDate', 'desc'));
    }, [firestore]);
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

    const handleUpdateUserField = async (userId: string, field: string, value: any) => {
        if (!firestore) return;
        setIsUpdating(userId);
        try {
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { [field]: value });
            toast({
                title: "User Updated",
                description: `${field} updated successfully.`,
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsUpdating(null);
        }
    };

    const handleDeleteDocument = async (path: string) => {
        if (!firestore || !window.confirm("Are you sure you want to delete this document? This action is irreversible.")) return;
        try {
            await deleteDoc(doc(firestore, path));
            toast({ title: "Deleted", description: "Document removed from system." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Delete Failed", description: error.message });
        }
    };

    const handleFlagDocument = async (path: string, currentlyFlagged: boolean) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, path), { flagged: !currentlyFlagged });
            toast({ title: currentlyFlagged ? "Unflagged" : "Flagged", description: `Document status updated.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
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
                </CardContent>
            </Card>
        );
    };

    if (!mounted) return null;

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary h-10 w-10" />
                        Admin Management
                    </h1>
                    <p className="text-muted-foreground text-lg italic">Accessing System Core Control.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search system data..." 
                        className="pl-9 h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Users" value={isUsersLoading ? "..." : metrics.total} icon={Users} type="all" />
                <StatCard title="Active Users" value={isUsersLoading ? "..." : metrics.active} icon={Activity} colorClass="text-green-500" type="active" />
                <StatCard title="Total AI Analyses" value={isUsersLoading ? "..." : metrics.totalScans} icon={TrendingUp} colorClass="text-blue-500" type="scans" />
                <StatCard title="Total CVs" value={isAllCvsLoading ? "..." : metrics.totalCvs} icon={FileText} colorClass="text-orange-500" type="cvs" />
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> User Management</TabsTrigger>
                    <TabsTrigger value="cvs" className="gap-2"><FileText className="h-4 w-4" /> CV Management</TabsTrigger>
                    <TabsTrigger value="jobs" className="gap-2"><ClipboardList className="h-4 w-4" /> Job Management</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card className="shadow-lg border-muted">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle>User Directory & Security</CardTitle>
                            <CardDescription>Manage permissions, roles, and review document history.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isUsersLoading ? (
                                <div className="p-8 space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="w-[300px]">User</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Active</TableHead>
                                            <TableHead>Usage</TableHead>
                                            <TableHead className="text-right pr-6">Management</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((u) => (
                                            <TableRow key={u.id} className="hover:bg-muted/5 transition-colors group">
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center overflow-hidden">
                                                            {u.photoURL ? <img src={u.photoURL} alt={u.email} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-sm truncate">{u.email}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{u.role || 'user'}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.status === 'suspended' ? 'destructive' : 'outline'}>
                                                        {u.status || 'active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {u.lastActive ? formatDistanceToNow(u.lastActive.toDate(), { addSuffix: true }) : 'Never'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-mono font-bold text-sm ${u.scansUsed >= 3 ? 'text-destructive' : 'text-primary'}`}>
                                                        {u.scansUsed} / 3
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="outline" size="sm" onClick={() => { setSelectedUser(u); setIsUserDetailsOpen(true); }}>
                                                        <Eye className="h-4 w-4 mr-2" /> Manage
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
                    <Card className="shadow-lg border-muted">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle>Global CV Repository</CardTitle>
                            <CardDescription>Review all documents uploaded to the platform.</CardDescription>
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
                                            <TableHead>File Name</TableHead>
                                            <TableHead>User Email</TableHead>
                                            <TableHead>Upload Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allCvs?.map((cv) => {
                                            const owner = users?.find(u => u.id === cv.userId);
                                            return (
                                                <TableRow key={cv.id}>
                                                    <TableCell className="font-medium">{cv.fileName}</TableCell>
                                                    <TableCell className="text-xs">{owner?.email || cv.userId}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{new Date(cv.uploadDate).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {cv.flagged && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Flagged</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>{cv.fileName}</DialogTitle>
                                                                        <DialogDescription>Content preview for {owner?.email}</DialogDescription>
                                                                    </DialogHeader>
                                                                    <ScrollArea className="h-96 border rounded-md p-4 bg-muted/50 font-sans text-sm">
                                                                        <pre className="whitespace-pre-wrap">{cv.fileContent}</pre>
                                                                    </ScrollArea>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" onClick={() => handleDownloadContent(cv.fileContent, cv.fileName)}>
                                                                            <Download className="h-4 w-4 mr-2" /> Download
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Button variant="ghost" size="icon" onClick={() => handleFlagDocument(`users/${cv.userId}/cvs/${cv.id}`, !!cv.flagged)}>
                                                                <Flag className={cn("h-4 w-4", cv.flagged ? "text-destructive fill-destructive" : "")} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(`users/${cv.userId}/cvs/${cv.id}`)}>
                                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
                    <Card className="shadow-lg border-muted">
                        <CardHeader className="border-b bg-muted/30">
                            <CardTitle>Job Description & Analysis Logs</CardTitle>
                            <CardDescription>Monitor AI analysis throughput and content quality.</CardDescription>
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
                                            <TableHead>Job Title</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Analysis Score</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allMatches?.map((match) => {
                                            const owner = users?.find(u => u.id === match.userId);
                                            const jobDoc = allJobs?.find(j => j.id === match.jobDescriptionId);
                                            return (
                                                <TableRow key={match.id}>
                                                    <TableCell className="font-medium">{match.jobTitle}</TableCell>
                                                    <TableCell className="text-xs">{owner?.email || match.userId}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={match.matchScore > 70 ? 'default' : 'secondary'}>{match.matchScore}%</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{new Date(match.analysisDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon"><Info className="h-4 w-4" /></Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Analysis: {match.jobTitle}</DialogTitle>
                                                                        <DialogDescription>Match Score: {match.matchScore}%</DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <h4 className="text-sm font-bold mb-2 uppercase tracking-tighter text-muted-foreground">Original Job Description</h4>
                                                                            <ScrollArea className="h-40 border rounded p-3 text-xs bg-muted/30">
                                                                                {jobDoc?.descriptionText || 'Job description document not found.'}
                                                                            </ScrollArea>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-bold mb-2 uppercase tracking-tighter text-muted-foreground">Missing Keywords Identified</h4>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {match.missingKeywords?.map(kw => <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(`users/${match.userId}/cvs/${match.cvId}/matchResults/${match.id}`)}>
                                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
            </Tabs>

            <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            Security & Access Control
                        </DialogTitle>
                        <DialogDescription>
                            Detailed management for {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Settings className="h-4 w-4" /> Account Settings
                                    </h4>
                                    
                                    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Access Status</span>
                                            <Button 
                                                variant={selectedUser.status === 'suspended' ? 'default' : 'outline'} 
                                                size="sm"
                                                onClick={() => handleUpdateUserField(selectedUser.id, 'status', selectedUser.status === 'suspended' ? 'active' : 'suspended')}
                                                disabled={selectedUser.email === ADMIN_EMAIL}
                                            >
                                                {selectedUser.status === 'suspended' ? <ShieldCheck className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                                                {selectedUser.status === 'suspended' ? 'Reactivate' : 'Suspend User'}
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Permission Role</span>
                                            <Select 
                                                value={selectedUser.role || 'user'} 
                                                onValueChange={(val) => handleUpdateUserField(selectedUser.id, 'role', val)}
                                                disabled={selectedUser.email === ADMIN_EMAIL}
                                            >
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Security</span>
                                            <Button variant="secondary" size="sm" onClick={() => handleResetPassword(selectedUser.email)}>
                                                <KeyRound className="h-4 w-4 mr-2" />
                                                Reset Password
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" /> Career Snapshot
                                    </h4>
                                    <div className="p-4 border rounded-lg bg-muted/10 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Target Role:</span>
                                            <span className="font-medium">{selectedUser.targetRole || 'Not Set'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Exp Level:</span>
                                            <span className="font-medium">{selectedUser.experienceLevel || 'Not Set'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <History className="h-4 w-4" /> Document Overview
                                </h4>
                                <ScrollArea className="h-[300px] border rounded-lg p-2 bg-muted/5">
                                    {isAllCvsLoading ? (
                                        <div className="p-4 space-y-2">
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {allCvs?.filter(cv => cv.userId === selectedUser.id).map((cv) => (
                                                <div key={cv.id} className="p-3 border rounded hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold truncate max-w-[150px]">{cv.fileName}</span>
                                                            <span className="text-[10px] text-muted-foreground">{new Date(cv.uploadDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadContent(cv.fileContent, cv.fileName)}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
