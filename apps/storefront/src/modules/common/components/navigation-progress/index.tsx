"use client"

import NextTopLoader from "nextjs-toploader"

export default function NavigationProgress() {
  return (
    <NextTopLoader
      color="#ffd95a"
      height={3}
      showSpinner={false}
      crawl
      crawlSpeed={200}
      speed={200}
      shadow="0 0 10px #ffd95a,0 0 5px #ffd95a"
    />
  )
}
