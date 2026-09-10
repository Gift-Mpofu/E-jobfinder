# E-JobFinder 🚀

A modern, AI-powered job finder application built with Next.js and TypeScript. E-JobFinder leverages Google Genkit AI to help users discover, explore, and apply for jobs intelligently.

## Overview

E-JobFinder is a full-stack web application designed to revolutionize the job search experience. Using advanced AI capabilities and a beautiful, responsive UI, it provides users with personalized job recommendations and a seamless job discovery platform.

## Key Features

- 🤖 **AI-Powered Job Matching** - Uses Google Genkit AI for intelligent job recommendations
- 📱 **Fully Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎨 **Beautiful UI Components** - Built with Radix UI and Tailwind CSS
- 🔐 **Secure Authentication** - Integrated with Supabase for user authentication and data management
- 📊 **Advanced Analytics** - Visualize job trends and statistics with Recharts
- 🌙 **Dark Mode Support** - Theme switching with next-themes
- 📄 **PDF Support** - Resume upload and processing capabilities
- ⚡ **High Performance** - Built with Next.js 15+ and Turbopack for blazing fast builds
- 🎯 **Form Validation** - Robust form handling with React Hook Form and Zod validation

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.9
- **Language**: TypeScript 5
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Hook Form
- **Form Validation**: Zod
- **Charts & Visualizations**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theme Management**: next-themes

### Backend & Services
- **AI Engine**: Google Genkit AI (@genkit-ai/google-genai)
- **Backend Integration**: Genkit + Next.js (@genkit-ai/next)
- **Database & Auth**: Supabase (PostgreSQL)
- **PDF Processing**: pdfjs-dist

### Development
- **Build Tool**: Next.js with Turbopack
- **Linting**: ESLint via Next.js
- **Package Manager**: npm/yarn

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Cloud account (for Genkit AI)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Gift-Mpofu/E-jobfinder.git
cd E-jobfinder
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
GENKIT_API_KEY=your_google_genkit_key
```

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
E-jobfinder/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Home page
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions
│   └── styles/                # Global styles
├── public/                    # Static assets
├── package.json              # Dependencies and scripts
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── next.config.ts            # Next.js configuration
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Core Functionality

### Job Discovery
- Browse and search job listings
- AI-powered job recommendations based on user profile
- Advanced filtering options

### User Profiles
- Create and manage user profiles
- Upload and parse resumes (PDF support)
- Track application history

### AI Integration
- Intelligent job matching using Google Genkit
- Smart job recommendations
- Personalized insights

### Data Management
- Secure user authentication via Supabase
- Real-time data synchronization
- Job listings and application tracking

## Dependencies Overview

### UI & Components
- Radix UI provides accessible, unstyled component primitives
- Tailwind CSS for utility-first styling
- Shadcn-style component architecture

### Forms & Validation
- React Hook Form for efficient form management
- Zod for runtime type validation

### Data & Visualization
- Recharts for interactive charts and analytics
- date-fns for date manipulation

### Development Experience
- TypeScript for type safety
- Next.js 15 with App Router
- Turbopack for faster builds

## Configuration

### Tailwind CSS
Configured in `tailwind.config.ts` with custom theming support and animation utilities.

### TypeScript
Strict mode enabled for better type safety. See `tsconfig.json` for details.

### Next.js
- App Router enabled
- Turbopack bundler for faster development
- Image optimization
- Automatic code splitting

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)
```bash
vercel deploy
```

Ensure environment variables are configured in your deployment platform.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Code Quality

- Maintain TypeScript strict mode
- Follow Next.js best practices
- Use Tailwind CSS utilities for styling
- Write accessible components using Radix UI
- Validate forms with Zod schemas

## Troubleshooting

### Development Server Issues
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Build Issues
Ensure all environment variables are properly set and Supabase/Genkit credentials are valid.

## License

This project is private. All rights reserved.

## Contact & Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the repository owner.

---

**E-JobFinder** - Making job searching smarter with AI 🎯
