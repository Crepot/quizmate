import { useState, useEffect } from 'react'
import './FreeformQA.css'

function FreeformQA({ progress, updateProgress }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/freeform.json')
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

  const handleAnswerChange = (questionId, answer) => {
    updateProgress(questionId, answer)
  }

  if (loading) {
    return <div className="loading">Loading questions...</div>
  }

  return (
    <div className="freeform-qa">
      <h2>Freeform Q&A</h2>
      <p className="description">Write your answers in the text areas below. Your progress is saved automatically.</p>
      
      <div className="questions-list">
        {questions.map((q, index) => (
          <div key={q.id} className="question-card">
            <div className="question-header">
              <span className="question-number">Question {index + 1}</span>
              {progress[q.id] && <span className="answered-badge">✓ Answered</span>}
            </div>
            <p className="question-text">{q.question}</p>
            <textarea
              className="answer-input"
              placeholder="Type your answer here..."
              value={progress[q.id]?.answer || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              rows="5"
            />
            <details className="answer-reveal">
              <summary>Show Answer</summary>
              <div className="correct-answer">{q.answer}</div>
            </details>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FreeformQA
