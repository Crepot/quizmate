import { useState, useEffect } from 'react'
import './ImageMatch.css'

function ImageMatch({ progress, updateProgress }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/imagematch.json')
      .then(res => res.json())
      .then(data => {
        setQuestions(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading questions:', err)
        setLoading(false)
      })
  }, [])

  const handleWordSelect = (questionId, word, correctWord) => {
    updateProgress(questionId, {
      selected: word,
      isCorrect: word === correctWord
    })
  }

  if (loading) {
    return <div className="loading">Loading questions...</div>
  }

  return (
    <div className="image-match">
      <h2>Image-Word Matching</h2>
      <p className="description">
        Select the word that matches the image shown.
      </p>
      
      <div className="questions-list">
        {questions.map((q, index) => {
          const userAnswer = progress[q.id]?.answer
          const hasAnswered = userAnswer !== undefined
          const isCorrect = userAnswer?.isCorrect
          
          return (
            <div key={q.id} className="question-card">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                {hasAnswered && (
                  <span className={`result-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                )}
              </div>
              
              <div className="image-container">
                <img 
                  src={q.image} 
                  alt="Match this image" 
                  className="question-image"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextElementSibling.style.display = 'flex'
                  }}
                />
                <div className="image-placeholder" style={{ display: 'none' }}>
                  Image not found
                </div>
              </div>
              
              <div className="options-grid">
                {q.options.map((word, wordIndex) => {
                  const isSelected = userAnswer?.selected === word
                  const isCorrectWord = word === q.correctWord
                  const showCorrect = hasAnswered && !isCorrect && isCorrectWord
                  
                  return (
                    <button
                      key={wordIndex}
                      className={`word-option ${isSelected ? 'selected' : ''} ${showCorrect ? 'highlight-correct' : ''}`}
                      onClick={() => handleWordSelect(q.id, word, q.correctWord)}
                    >
                      {word}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ImageMatch
