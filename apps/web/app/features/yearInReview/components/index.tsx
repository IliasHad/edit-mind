import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hero } from './slides/Hero'
import { Scenes } from './slides/Scenes'
import { Categories } from './slides/Categories'
import { Objects } from './slides/Objects'
import { FunFacts } from './slides/FunFacts'
import { Share } from './slides/Share'
import { SlideNavigation } from './SlideNavigation'
import type { YearInReviewData } from '@shared/schemas/yearInReview'
import { Locations } from './slides/Locations'
import { Faces } from './slides/Faces'
import { MostSpokenWords } from './slides/MostSpokenWords'
import { InfoSlide } from './slides/InfoSlide'

interface Props {
  data: YearInReviewData
  year: number
  videoPath: string
}

export function YearInReviews({ data, year,videoPath }: Props) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const slides = data.slides

  const paginate = useCallback(
    (newDirection: number) => {
      const next = current + newDirection
      if (next >= 0 && next < slides.length) {
        setDirection(newDirection)
        setCurrent(next)
      }
    },
    [current, slides.length]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        paginate(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        paginate(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [current, paginate])

  useEffect(() => {
    let touchStartY = 0
    let touchEndY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY
      const diff = touchStartY - touchEndY

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          paginate(1)
        } else {
          paginate(-1)
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [current, paginate])

  const render = (slide: (typeof slides)[0]) => {
    const commonProps = {
      title: slide.title,
      content: slide.content,
      interactiveElements: slide.interactiveElements,
      year,
    }

    switch (slide.type) {
      case 'hero':
        return <Hero {...commonProps} onContinue={() => paginate(1)} />
      case 'scenes':
        return <Scenes {...commonProps} scenes={data.topScenes} />
      case 'categories':
        return <Categories {...commonProps} />
      case 'objects':
        return <Objects {...commonProps} objects={data.topObjects} faces={data.topFaces} />
      case 'faces':
        return <Faces {...commonProps} faces={data.topFaces} />
      case 'mostSpokenWords':
        return <MostSpokenWords {...commonProps} words={data.mostSpokenWords} />
      case 'funFacts':
        return <FunFacts {...commonProps} />
      case 'share':
        return <Share {...commonProps} videoPath={videoPath} />
      case 'locations':
        return <Locations {...commonProps} locations={data.topLocations} />
      case 'openingScene':
        return <InfoSlide {...commonProps} themeColor="cyan" />
      case 'objectStory':
        return <InfoSlide {...commonProps} themeColor="purple" />
      case 'weekendPersonality':
        return <InfoSlide {...commonProps} themeColor="pink" />
      case 'weekdayEnergy':
        return <InfoSlide {...commonProps} themeColor="amber" />
      case 'colorTemperature':
        return <InfoSlide {...commonProps} themeColor="cyan" />
      case 'moodboard':
        return <InfoSlide {...commonProps} themeColor="purple" />
      case 'yourCreativeDNA':
        return <InfoSlide {...commonProps} themeColor="pink" />
      case 'vibeScore':
        return <InfoSlide {...commonProps} themeColor="amber" />
      case 'rareGems':
        return <InfoSlide {...commonProps} themeColor="cyan" />
      case 'snapshotOfTheYear':
        return <InfoSlide {...commonProps} themeColor="purple" />
      case 'closingScene':
        return <InfoSlide {...commonProps} themeColor="pink" />
      default:
        return null
    }
  }

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            y: {
              type: 'tween',
              ease: [0.16, 1, 0.3, 1],
              duration: 0.6,
            },
            opacity: { duration: 0.3 },
          }}
          className="absolute inset-0"
        >
          {render(slides[current])}
        </motion.div>
      </AnimatePresence>

      <SlideNavigation
        currentSlide={current}
        totalSlides={slides.length}
        onNavigate={setCurrent}
        onNext={() => paginate(1)}
        onPrev={() => paginate(-1)}
      />
    </div>
  )
}
