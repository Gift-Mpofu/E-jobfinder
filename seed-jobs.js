const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dummyJobs = [
  {
    title: 'Senior Frontend Engineer',
    company: 'TechFlow Solutions',
    location: 'Remote (US)',
    description_text: 'We are looking for an experienced Frontend Engineer to lead our React architecture migration. You will architect scalable component libraries and work closely with product to ensure seamless user experiences.',
    skills_required: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
    seniority: 'Senior',
    salary_range: '$130,000 - $160,000',
    status: 'open',
    source: 'internal'
  },
  {
    title: 'Full Stack Web Developer',
    company: 'InnovateX',
    location: 'New York, NY (Hybrid)',
    description_text: 'Join our agile team to build dynamic web applications. We use Node.js and React to deliver high-performance tools for the finance sector. Strong database architecture skills are a huge plus.',
    skills_required: ['JavaScript', 'Node.js', 'React', 'PostgreSQL', 'Express'],
    seniority: 'Mid-Level',
    salary_range: '$100,000 - $130,000',
    status: 'open',
    source: 'internal'
  },
  {
    title: 'Backend Systems Engineer',
    company: 'CloudScale',
    location: 'Remote',
    description_text: 'Scale our cloud infrastructure to support millions of daily active users. You will write high-performance microservices, optimize database queries, and ensure 99.99% uptime.',
    skills_required: ['Go', 'Python', 'AWS', 'Kubernetes', 'PostgreSQL'],
    seniority: 'Senior',
    salary_range: '$140,000 - $180,000',
    status: 'open',
    source: 'internal'
  },
  {
    title: 'UX/UI Designer',
    company: 'CreativePulse Studio',
    location: 'London, UK',
    description_text: 'Design elegant, user-centric interfaces for our flagship mobile and web applications. You will conduct user research, create wireframes, and hand off pixel-perfect designs to engineering.',
    skills_required: ['Figma', 'UI Design', 'Wireframing', 'Prototyping', 'CSS'],
    seniority: 'Mid-Level',
    salary_range: '£60,000 - £80,000',
    status: 'open',
    source: 'internal'
  },
  {
    title: 'Data Analyst',
    company: 'Metrics First',
    location: 'Remote (EU)',
    description_text: 'Help our clients unlock insights from their massive datasets. You will build SQL pipelines, create interactive dashboards, and present findings to key stakeholders.',
    skills_required: ['Python', 'SQL', 'Tableau', 'Data Analysis', 'Pandas'],
    seniority: 'Entry-Level',
    salary_range: '€50,000 - €70,000',
    status: 'open',
    source: 'internal'
  }
];

async function seedJobs() {
    console.log("Seeding jobs into Supabase live_jobs table...");
    try {
        const { data, error } = await supabase.from('live_jobs').insert(dummyJobs);
        if (error) {
            throw error;
        }
        console.log("Seed successful!");
    } catch (err) {
        console.error("Error seeding jobs:", err.message);
    }
}

seedJobs();
