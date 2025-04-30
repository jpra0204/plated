A vibrant, responsive recipe discovery platform built with Next.js, React, and Tailwind CSS.
Designed to provide an intuitive user experience with real-time search suggestions, beautiful UI animations, and scalable architecture ready for production.

** Features **
** Real-time Auto-Suggest Search **
Instantly display recipe suggestions as users type.

** Fully Responsive Design **
Optimized for mobile, tablet, and desktop devices.

** Fast and Optimized Performance **
Built-in Next.js image optimization and server-side rendering for blazing speeds.

** Vibrant and Accessible UI **
Colorful but accessible design ensuring great UX for everyone.

** Cloudinary Integration **
Efficient and optimized image handling via a cloud-based CDN.

** Scalable Architecture **
Modular folder structure for easy scaling and future feature expansion.

** Tech Stack **

TECH	        PURPOSE
Next.js	        React Framework (SSR, SSG, API routes)
React	        Frontend library
TypeScript	    For more scalable and stable code
Tailwind CSS	Utility-first CSS styling
Vercel	        Deployment and Hosting
Cloudinary	    Image storage and optimization

** Project Structure **
bash
Copy
Edit
/vibrant-recipes
│
├── public/             # Static files (images, favicon, etc.)
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Next.js pages (routes)
│   │    ├── api/       # API routes (server-side functions)
│   ├── styles/         # Global styles and Tailwind config
│   ├── utils/          # Helper functions and utilities
│   └── lib/            # External libraries or API clients
├── .env.local          # Environment variables
├── tailwind.config.ts  # TailwindCSS configuration
├── next.config.js      # Next.js configuration
└── README.md           # Project overview (this file)

** Setup Instructions **
Clone the repository

bash
Copy
Edit
git clone https://github.com/jpra0204/plated.git 
Navigate into the project directory

bash
Copy
Edit
cd plated
Install dependencies

bash
Copy
Edit
npm install
Start the development server

bash
Copy
Edit
npm run dev
Visit the app
Open http://localhost:3000 in your browser.

** Deployment **
This project is set up for Vercel deployment:

Push your code to GitHub.

Connect the repository to Vercel.

Configure environment variables if needed.

Deploy instantly.

Learning and Development Goals
Mastering dynamic UI experiences with auto-suggest and real-time feedback.

Building scalable frontend architecture suitable for real-world production apps.

Emphasizing performance, responsiveness, and accessibility in UI/UX.

Practicing clean code and reusable component patterns in React and Next.js.

** Contact **
If you have any questions or would like to discuss the project, feel free to reach out!
LinkedIn: https://www.linkedin.com/in/jproca/
Email: jp.roca.angulo@gmail.com


** MVP 1 – Core Development **

PACKAGE	                   PURPOSE
next	                   Core framework
react/react-dom            React runtime
tailwindcss	               Styling
postcss/autoprefixer       Tailwind build chain
@fontsource/poppins	       Font loading
@types/react /typescript   Type safety & DX
clsx	                   Conditional Tailwind classes

** MVP 2 – Search & Image Optimization **

PACKAGE	                PURPOSE
fuse.js	                Fuzzy search / autocomplete logic
cloudinary	            Image hosting + transformation
@cloudinary/url-gen	    Client-side Cloudinary helper
axios	                Cleaner async requests if using APIs

** MVP 3 – SEO, Analytics, & Growth Tools **

PACKAGE	                PURPOSE
next-seo	            SEO meta tags
react-ga4 or gtag.js	Google Analytics 4 tracking
next-sitemap	        Sitemap generation for SEO
next/script (built-in)	External script loading (e.g. ads, analytics)
@vercel/analytics   	Vercel-based page analytics

** MVP 4 – Advanced Features (Optional for V1) **

PACKAGE	                PURPOSE
zustand or jotai	    State management (e.g. filter/search UI)
framer-motion	        Animations (nice visual polish)
react-toastify	        Feedback / notifications
swr or react-query	    Data fetching if dynamic recipes/API