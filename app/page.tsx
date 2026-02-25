"use client"

import Link from "next/link"
import { SCENES } from "@/lib/scenes"

export default function Page() {
  return (
    <main className="w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold text-slate-100 mb-2">Select a scene</h1>
      <p className="text-slate-400 text-sm mb-8">Choose a 3D model to view in the viewer.</p>
      <div className="flex flex-col items-center justify-center w-full max-w-md gap-4">
        {SCENES.map((scene) => (
          <Link
            key={scene.id}
            href={`/view/${scene.id}`}
            className="border w-full border-slate-700 hover:bg-slate-700 transition bg-slate-800 rounded-xl p-4"
          >
            <div className="flex flex-col">
              <span className="text-slate-100 text-base font-semibold">{scene.name}</span>
              <span className="text-slate-300 text-sm">{scene.location}</span>
              <span className="text-slate-400 text-sm">{scene.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
