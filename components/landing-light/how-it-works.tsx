import Image from 'next/image'

import { steps } from '@/lib/landing-light-data'

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-charcoal relative overflow-hidden px-6 py-20">
      {/* Particle bursts extracted from the design export. */}
      <Image
        src="/landing/particles-left.webp"
        alt=""
        aria-hidden="true"
        width={360}
        height={510}
        className="pointer-events-none absolute top-1/2 -left-10 hidden w-64 -translate-y-1/2 lg:block"
      />
      <Image
        src="/landing/particles-right.webp"
        alt=""
        aria-hidden="true"
        width={360}
        height={510}
        className="pointer-events-none absolute top-1/2 -right-10 hidden w-64 -translate-y-1/2 lg:block"
      />

      <div className="relative mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          How it works?
        </h2>

        <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {steps.map(({ title, blurb }, i) => (
            <li key={title} className="flex gap-4">
              <span className="text-2xl font-bold text-white/90 tabular-nums">{i + 1}</span>
              <div className="border-l border-white/20 pl-4">
                <h3 className="font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">{blurb}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
