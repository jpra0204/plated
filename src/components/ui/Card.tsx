import React from 'react'
import { Typography } from './Typography'
import { useIsMobile } from '@/hooks/useIsMobile'
import clsx from 'clsx'

interface CardProps {
  title: string
  subtitle?: string
  text?: string
  imageSrc?: string
  imageAlt?: string
  isMobile?: boolean
}

export const Card = ({
  title,
  subtitle,
  text,
  imageSrc,
  imageAlt,
  isMobile,
}: CardProps) => {
  const mobile = isMobile ?? useIsMobile()

  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm flex flex-col max-w-xs',
        mobile ? 'p-4 gap-2' : 'p-6 gap-3'
      )}
    >
      <div
        className={clsx(
          'w-full bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden',
          mobile ? 'h-32' : 'h-40'
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-sm text-gray-500">Image Placeholder</span>
        )}
      </div>

      <Typography variant="bodyTitle" as="h3">
        {title}
      </Typography>

      {subtitle && (
        <Typography variant="bodySubtitle" as="h4">
          {subtitle}
        </Typography>
      )}

      {text && (
        <Typography variant="smallText" as="p">
          {text}
        </Typography>
      )}
    </div>
  )
}
