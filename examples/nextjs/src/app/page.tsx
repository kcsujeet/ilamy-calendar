import Calendar from '@/components/calendar'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Next.js + ilamy Calendar Example
        </h1>
        <Calendar />
      </div>
    </main>
  )
}
