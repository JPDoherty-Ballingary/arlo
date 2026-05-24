'use client'

import { useState, useEffect } from 'react'

const acronyms = [
  'Always Reminding, Largely Obsessive',
  'Action Required, Loop Ongoing',
  'Aggressively Relentless, Lovably Organised',
  'Actually Really Loves Organising',
  'Automated Reminder of Life\'s Obligations',
  'Annoyingly Reliable, Largely Overlooked',
  'Always Right, Loves Overdelivering',
  'Absolutely Refuses to Let Go',
  'Action Required. Loop Operator.',
]

export default function RollingAcronym() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % acronyms.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="relative overflow-hidden w-full flex justify-center"
      style={{ height: '1.75rem' }}
    >
      <span
        key={index}
        className="absolute text-base sm:text-lg font-medium"
        style={{
          color: '#22d45f',
          animation: 'arlo-ticker 2.5s ease-in-out forwards',
        }}
      >
        {acronyms[index]}
      </span>
    </div>
  )
}
