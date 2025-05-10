import React from 'react'
import clsx from 'clsx'

interface MetadataItemProps {
  label: string
  value: string
  icon?: React.ReactNode
}

export const MetadataItem = ({ label, value, icon }: MetadataItemProps) => {
  return (
    <div className="flex flex-col items-center text-sm font-medium text-text-secondary">
      {icon && <div className="mb-1 text-lg text-text-secondary">{icon}</div>}
      <span className="text-text-primary">{label}</span>
      <span>{value}</span>
    </div>
  )
}
