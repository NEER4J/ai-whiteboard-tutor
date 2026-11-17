import type { Metadata } from "next"
import { TutorApp } from "@/components/tutor/tutor-app"

// Lessons live in the visitor's own browser, so these URLs are not for search engines.
export const metadata: Metadata = {
  title: "Lesson",
  robots: { index: false, follow: false },
}

// The lesson id is read on the client from the URL, so this route simply serves the same app shell.
export default function LessonPage() {
  return <TutorApp />
}
