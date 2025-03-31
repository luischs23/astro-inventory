'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from "../../components/ui/Button"

export default function FloatingScrollButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 z-50 rounded-full p-2 mb-14 bg-teal-600/20 hover:bg-teal-700 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </>
  )
}