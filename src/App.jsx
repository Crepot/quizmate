import { useState, useEffect } from 'react'
import FreeformQA from './components/FreeformQA'
import MultipleChoice from './components/MultipleChoice'
import ImageMatch from './components/ImageMatch'
import Review from './components/Review'
import './App.css'

function App() {
  const [activeSection, setActiveSection] = useState('freeform')
  const [progress, setProgress] = useState({
    freeform: {},
    multiplechoice: {},
    imagematch: {}
  })

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('quizmate-progress')
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress))
      } catch (e) {
        console.error('Error loading progress:', e)
      }
    }
  }, [])

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('quizmate-progress', JSON.stringify(progress))
  }, [progress])

  const updateProgress = (section, questionId, answer) => {
    setProgress(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [questionId]: {
          answer,
          timestamp: new Date().toISOString()
        }
      }
    }))
  }

  const exportProgress = () => {
    const dataStr = JSON.stringify(progress, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `quizmate-progress-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearProgress = () => {
    if (window.confirm('Are you sure you want to clear all progress?')) {
      setProgress({
        freeform: {},
        multiplechoice: {},
        imagematch: {}
      })
      localStorage.removeItem('quizmate-progress')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>QuizMate</h1>
        <p>Interactive Study App</p>
      </header>

      <nav className="nav">
        <button 
          className={activeSection === 'freeform' ? 'active' : ''}
          onClick={() => setActiveSection('freeform')}
        >
          Freeform Q&A
        </button>
        <button 
          className={activeSection === 'multiplechoice' ? 'active' : ''}
          onClick={() => setActiveSection('multiplechoice')}
        >
          Multiple Choice
        </button>
        <button 
          className={activeSection === 'imagematch' ? 'active' : ''}
          onClick={() => setActiveSection('imagematch')}
        >
          Image Match
        </button>
        <button 
          className={activeSection === 'review' ? 'active' : ''}
          onClick={() => setActiveSection('review')}
        >
          Review
        </button>
      </nav>

      <main className="main">
        {activeSection === 'freeform' && (
          <FreeformQA 
            progress={progress.freeform}
            updateProgress={(id, answer) => updateProgress('freeform', id, answer)}
          />
        )}
        {activeSection === 'multiplechoice' && (
          <MultipleChoice 
            progress={progress.multiplechoice}
            updateProgress={(id, answer) => updateProgress('multiplechoice', id, answer)}
          />
        )}
        {activeSection === 'imagematch' && (
          <ImageMatch 
            progress={progress.imagematch}
            updateProgress={(id, answer) => updateProgress('imagematch', id, answer)}
          />
        )}
        {activeSection === 'review' && (
          <Review 
            progress={progress}
            onExport={exportProgress}
            onClear={clearProgress}
          />
        )}
      </main>
    </div>
  )
}

export default App
