const fs = require('fs');

let fileStr = fs.readFileSync('c:/Users/NELSON/Desktop/E-jobfinder-1/src/app/dashboard/admin/page.tsx', 'utf8');

fileStr = fileStr.replace(/import { collection[\s\S]*?@\/firebase';/, `import { useSupabase, useUser } from '@/supabase/provider';`);

fileStr = fileStr.replace(/lastActive\?: Timestamp;/, `lastActive?: string;`);

// Remove auth and firestore imports inside component
fileStr = fileStr.replace(/const auth = useAuth\(\);\n\s*const firestore = useFirestore\(\);/, 'const supabase = useSupabase();');

// Replace queries and effect
const fetchAllRegex = /\/\/ Global Collections Queries[\s\S]*?\} catch \(err\) \{\n\s*console\.error\("Failed to fetch admin data details explicitly:", err\);\n\s*\}\n\s*\};\n\n\s*fetchAllData\(\);\n\n\s*return \(\) => \{ isMounted = false; \};\n\s*\}, \[isActualAdmin, firestore, users\]\);/;

const newFetchAll = `
    const [users, setUsers] = useState<UserProfile[] | null>(null);
    const [isUsersLoading, setIsUsersLoading] = useState(true);
    const [allCvs, setAllCvs] = useState<CV[] | null>(null);
    const [allJobs, setAllJobs] = useState<JobDescription[] | null>(null);
    const [allMatches, setAllMatches] = useState<MatchResult[] | null>(null);
    const [isAllCvsLoading, setIsAllCvsLoading] = useState(true);
    const [isAllJobsLoading, setIsAllJobsLoading] = useState(true);

    useEffect(() => {
        if (!isActualAdmin) return;
        
        let isMounted = true;
        const fetchAllData = async () => {
            try {
                const [profilesRes, cvsRes, jobsRes, matchesRes] = await Promise.all([
                    supabase.from('profiles').select('*').order('email'),
                    supabase.from('cvs').select('*').order('upload_date', { ascending: false }),
                    supabase.from('job_descriptions').select('*').order('creation_date', { ascending: false }),
                    supabase.from('match_results').select('*').order('analysis_date', { ascending: false })
                ]);

                if (!isMounted) return;

                if (profilesRes.data) {
                    setUsers(profilesRes.data.map((p: any) => ({
                        id: p.id,
                        email: p.email || 'unknown@example.com',
                        targetRole: p.target_role,
                        scansUsed: p.scans_used || 0,
                        photoURL: p.photo_url,
                        lastActive: p.last_active,
                        role: p.role,
                        status: p.status,
                        location: p.location,
                        experienceLevel: p.experience_level
                    })));
                } else setUsers([]);
                setIsUsersLoading(false);

                if (cvsRes.data) {
                    setAllCvs(cvsRes.data.map((c: any) => ({
                        id: c.id,
                        userId: c.user_id,
                        fileName: c.file_name,
                        uploadDate: c.upload_date,
                        fileContent: c.file_content,
                        flagged: c.flagged
                    })));
                } else setAllCvs([]);
                setIsAllCvsLoading(false);

                if (jobsRes.data) {
                    setAllJobs(jobsRes.data.map((j: any) => ({
                        id: j.id,
                        userId: j.user_id,
                        descriptionText: j.description_text,
                        creationDate: j.creation_date
                    })));
                } else setAllJobs([]);
                setIsAllJobsLoading(false);

                if (matchesRes.data) {
                    setAllMatches(matchesRes.data.map((m: any) => ({
                        id: m.id,
                        jobTitle: m.job_title,
                        matchScore: m.match_score,
                        analysisDate: m.analysis_date,
                        userId: m.user_id,
                        cvId: m.cv_id,
                        jobDescriptionId: m.job_description_id,
                        missingKeywords: m.missing_keywords,
                        reasoning: m.reasoning
                    })));
                } else setAllMatches([]);
            } catch (err) {
                console.error("Failed to fetch admin data via Supabase:", err);
            }
        };

        fetchAllData();

        return () => { isMounted = false; };
    }, [isActualAdmin, supabase]);
`;

fileStr = fileStr.replace(fetchAllRegex, newFetchAll.trim());

// Handlers
fileStr = fileStr.replace(/const handleUpdateUserField = async \([\s\S]*?setIsUpdating\(null\);\n\s*\};/, `
    const handleUpdateUserField = async (userId: string, field: string, value: any) => {
        setIsUpdating(userId);
        try {
            const mappedField = field === 'targetRole' ? 'target_role' : field === 'scansUsed' ? 'scans_used' : field === 'photoURL' ? 'photo_url' : field === 'lastActive' ? 'last_active' : field === 'experienceLevel' ? 'experience_level' : field;
            const { error: patchError } = await supabase.from('profiles').update({ [mappedField]: value }).eq('id', userId);
            if(patchError) throw patchError;
            setUsers(prev => prev?.map(u => u.id === userId ? { ...u, [field]: value } : u) || null);
            toast({ title: "Updated", description: "Property changed successfully." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsUpdating(null);
        }
    };
`);

fileStr = fileStr.replace(/const handleDeleteDocument = async \([\s\S]*?\}\n\s*\};/, `
    const handleDeleteMatch = async (matchId: string) => {
        if (!window.confirm("Delete this document forever?")) return;
        try {
            const { error: delError } = await supabase.from('match_results').delete().eq('id', matchId);
            if(delError) throw delError;
            setAllMatches(prev => prev?.filter(m => m.id !== matchId) || null);
            toast({ title: "Removed", description: "Entry purged from database." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed", description: error.message });
        }
    };

    const handleDeleteCv = async (cvId: string) => {
        if (!window.confirm("Delete this document forever?")) return;
        try {
            const { error: delError } = await supabase.from('cvs').delete().eq('id', cvId);
            if(delError) throw delError;
            setAllCvs(prev => prev?.filter(c => c.id !== cvId) || null);
            toast({ title: "Removed", description: "Entry purged from database." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed", description: error.message });
        }
    };
`);

fileStr = fileStr.replace(/const handleFlagDocument = async \(path: string, currentlyFlagged: boolean\) => \{[\s\S]*?\}\n\s*\};/, `
    const handleFlagCv = async (cvId: string, currentlyFlagged: boolean) => {
        try {
            const { error: updError } = await supabase.from('cvs').update({ flagged: !currentlyFlagged }).eq('id', cvId);
            if(updError) throw updError;
            setAllCvs(prev => prev?.map(c => c.id === cvId ? { ...c, flagged: !currentlyFlagged } : c) || null);
            toast({ title: currentlyFlagged ? "Unflagged" : "Flagged" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };
`);

fileStr = fileStr.replace(/const handleResetPassword = async \([\s\S]*?\}\n\s*\};/, `
    const handleResetPassword = async (email: string) => {
        try {
            const { error: rsaError } = await supabase.auth.resetPasswordForEmail(email);
            if(rsaError) throw rsaError;
            toast({ title: "Email Sent", description: "Password reset instructions delivered." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed", description: error.message });
        }
    };
`);

// UI adjustments

// handleDeleteDocument => handleDeleteCv
fileStr = fileStr.replace(/handleDeleteDocument\(\`users\/\$\{cv\.userId\}\/cvs\/\$\{cv\.id\}\`\)/g, "handleDeleteCv(cv.id)");

// handleDeleteDocument => handleDeleteMatch
fileStr = fileStr.replace(/handleDeleteDocument\(\`users\/\$\{match\.userId\}\/cvs\/\$\{match\.cvId\}\/matchResults\/\$\{match\.id\}\`\)/g, "handleDeleteMatch(match.id)");

// handleFlagDocument => handleFlagCv
fileStr = fileStr.replace(/handleFlagDocument\(\`users\/\$\{cv\.userId\}\/cvs\/\$\{cv\.id\}\`, !!cv.flagged\)/g, "handleFlagCv(cv.id, !!cv.flagged)");


// Date logic fixes
fileStr = fileStr.replace(/u\.lastActive\.toDate\(\)/g, "new Date(u.lastActive)");

fs.writeFileSync('c:/Users/NELSON/Desktop/E-jobfinder-1/src/app/dashboard/admin/page.tsx', fileStr);
