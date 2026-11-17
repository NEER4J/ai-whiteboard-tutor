import { TutorApp } from "@/components/tutor/tutor-app"

// The lesson id is read on the client from the URL (lessons are stored in the
// browser's localStorage), so this route simply serves the same app shell.
export default function LessonPage() {
  return <TutorApp />
}
