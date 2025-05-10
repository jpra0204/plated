import React from 'react'
import clsx from 'clsx'
import Image from 'next/image'

interface HeroImageProps {
  src: string
  alt: string
}

export const HeroImage = ({ src, alt }: HeroImageProps) => {
  const sharedClassName = clsx(
    'w-full h-[320px] rounded-xl overflow-hidden mb-8'
  )

  return (
    <div className={sharedClassName} data-testid="hero-image">
      <Image
        src={src}
        alt={alt}
        className="object-cover w-full h-full rounded-xl"
        width='0'
        height='0'
        sizes='100vw'
      />
    </div>
  )
}
