import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Study Assistant — Personalised plans for any project" },
      {
        name: "description",
        content:
          "Upload a project brief and get an AI-generated study plan with code examples and quizzes tailored to your level.",
      },
      { name: "author", content: "Study Assistant" },
      { property: "og:title", content: "Study Assistant — Personalised plans for any project" },
      {
        property: "og:description",
        content: "Upload a project brief and get a personalised study plan and quizzes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Study Assistant — Personalised plans for any project" },
      { name: "description", content: "Study Buddy Pro generates personalized study plans and quizzes from project documents using AI." },
      { property: "og:description", content: "Study Buddy Pro generates personalized study plans and quizzes from project documents using AI." },
      { name: "twitter:description", content: "Study Buddy Pro generates personalized study plans and quizzes from project documents using AI." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0bc83582-35dd-4b41-8e09-a130ffd444c8/id-preview-2c5dd5ef--f8fcc470-77ba-41a7-996c-4616a414b527.lovable.app-1776945780849.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0bc83582-35dd-4b41-8e09-a130ffd444c8/id-preview-2c5dd5ef--f8fcc470-77ba-41a7-996c-4616a414b527.lovable.app-1776945780849.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
