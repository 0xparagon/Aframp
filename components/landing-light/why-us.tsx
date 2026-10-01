import Image from 'next/image'

import { whyUs } from '@/lib/landing-light-data'

export function WhyUs() {
  return (
    <section className="grid lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="bg-brand-deep hidden items-center justify-center p-12 lg:flex">
        <Image
          src="/landing/why-us-wallet.png"
          alt=""
          aria-hidden="true"
          width={535}
          height={570}
          sizes="(max-width: 1024px) 100vw, 320px"
          decoding="async"
          className="h-auto w-full max-w-[320px]"
        />
      </div>

      <div className="bg-white dark:bg-surface px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-brand-deep dark:text-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Why Us?
          </h2>

          <ul className="mt-12 space-y-8">
            {whyUs.map(({ title, blurb }) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden="true" className="mt-0.5 text-base leading-none">
                  🔻
                </span>
                <div>
                  <h3 className="text-charcoal dark:text-white font-bold">{title}</h3>
                  <p className="text-charcoal/70 dark:text-white/70 mt-1.5 text-xs leading-relaxed">
                    {blurb}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
