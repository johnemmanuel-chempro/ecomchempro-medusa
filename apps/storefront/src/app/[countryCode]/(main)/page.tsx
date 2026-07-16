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
      {/* <Hero /> */}
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
