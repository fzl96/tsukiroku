"use client"

export default function FinanceError({ reset }: { reset: () => void }) {
  return (
    <div className="p-10">
      <h1 className="text-2xl">Couldn’t load your finances</h1>
      <p className="mt-3">Please check your connection and try again.</p>
      <button type="button" className="mt-5 border px-4 py-2" onClick={reset}>
        Try again
      </button>
    </div>
  )
}
