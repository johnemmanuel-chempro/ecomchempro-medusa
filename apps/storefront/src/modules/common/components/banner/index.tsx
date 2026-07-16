"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination, Autoplay } from "swiper/modules"

import "swiper/css"
import "swiper/css/pagination"

type BannerProps = {
  className?: string
}

export default function Banner({ className }: BannerProps) {
  return (
    <div className={`h-full w-full overflow-hidden ${className ?? ""}`}>
      <Swiper
        className="h-full [&_.swiper-wrapper]:h-full [&_.swiper-slide]:h-full"
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        loop
      >
        <SwiperSlide>
          <img
            src="/homebanner1.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </SwiperSlide>

        <SwiperSlide>
          <img
            src="/homebanner2.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </SwiperSlide>

        <SwiperSlide>
          <img
            src="/homebanner3.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </SwiperSlide>

        <SwiperSlide>
          <img
            src="/homebanner4.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </SwiperSlide>
      </Swiper>
    </div>
  )
}
