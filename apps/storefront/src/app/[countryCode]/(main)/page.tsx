import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import Banner from "@modules/common/components/banner"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "ChemPro Online - Turn to a Reliable Online Chemist & Skips the queue!",
  description:
    "ChemPro Online - Turn to a Reliable Online Chemist & Skips the queue!",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <div className="content-container">
        <div className="mt-5 flex flex-col gap-4 small:flex-row small:items-stretch">
          <div className="small:flex-[3] min-w-0">
            <div className="relative aspect-[12/5] w-full overflow-hidden rounded-lg">
              <Banner className="absolute inset-0" />
            </div>
          </div>
          <div className="small:flex-1 min-w-0 flex">
            <div className="relative flex-1 aspect-[12/5] w-full overflow-hidden rounded-lg small:aspect-auto small:min-h-[12rem]">
              <Image
                src="/pricematch.png"
                alt="Price matching"
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover"
              />
              <Link
                href="/"
                className="absolute bottom-2 left-1/2 z-10 w-3/4 max-w-[180px] -translate-x-1/2 rounded-md bg-white px-4 py-1 text-center text-[#045a9c]"
              >
                <p className="font-bold">VIEW MORE</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-[50px] overflow-hidden bg-[#28a8df] pb-16 pt-4">
        <div className="relative z-10 flex h-[100px] w-full items-center gap-x-3 overflow-x-auto px-6 text-white small:justify-center">
          <div className="min-w-[250px] rounded-[20px] border border-[#0780bb] bg-[#098cc9] p-3 shadow-sm">
            <p className="text-center">Vitamins & Supplements</p>
          </div>

          <div className="min-w-[250px] rounded-[20px] border border-[#0780bb] bg-[#098cc9] p-3 shadow-sm">
            <p className="text-center">Beauty</p>
          </div>

          <div className="min-w-[250px] rounded-[20px] border border-[#0780bb] bg-[#098cc9] p-3 shadow-sm">
            <p className="text-center">Pet Supplies</p>
          </div>

          <div className="min-w-[250px] rounded-[20px] border border-[#0780bb] bg-[#098cc9] p-3 shadow-sm">
            <p className="text-center">Baby Care</p>
          </div>

          <div className="min-w-[250px] rounded-[20px] border border-[#0780bb] bg-[#098cc9] p-3 shadow-sm">
            <p className="text-center">Medication</p>
          </div>
        </div>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-32 w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 128"
        >
          <defs>
            <linearGradient id="category-wave" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ef321b" />
              <stop offset="55%" stopColor="#ff8a2a" />
              <stop offset="100%" stopColor="#ffd55a" />
            </linearGradient>
          </defs>
          <path
            d="M0 75C340 145 750 42 1100 25C1235 18 1350 19 1440 25V128H0Z"
            fill="url(#category-wave)"
          />
          <path
            d="M0 86C340 151 750 69 1100 77C1235 80 1350 98 1440 110V128H0Z"
            fill="white"
          />
        </svg>

      </div>


    {/* initial display of products */}
      <div className="bg-white w-full">
        <div className="content-container py-10">
          <p className="text-2xl font-bold text-[#045a9c]" >Great Value Across Your Everyday Essentials</p>
          <p className="text-sm text-ui-fg-muted">Enjoy everyday savings across products, prescriptions and pharmacy services.</p>
        </div>

      </div>
    </>
  )
}
