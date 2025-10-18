import { useState, useEffect } from 'react'
import './Review.css'

function Review({ progress, onExport, onClear }) {
  const [data, setData] = useState({
    freeform: [],
    multiplechoice: [],
    imagematch: []
  })

  useEffect(() => {
    // Load all question data
    Promise.all([
      fetch('/data/freeform.json').then(res => res.json()),
      fetch('/data/multiplechoice.json').then(res => res.json()),
      fetch('/data/imagematch.json').then(res => res.json())
    ]).then(([freeform, multiplechoice, imagematch]) => {
      setData({ freeform, multiplechoice, imagematch })
    }).catch(err => {
      console.error('Error loading data:', err)
    })
  }, [])

  const calculateStats = () => {
    const stats = {
      freeform: {
        total: data.freeform.length,
        answered: Object.keys(progress.freeform).length
      },
      multiplechoice: {
        total: data.multiplechoice.length,
        answered: 0,
        correct: 0
      },
      imagematch: {
        total: data.imagematch.length,
        answered: 0,
        correct: 0
      }
    }

    // Calculate multiple choice stats
    data.multiplechoice.forEach(q => {
      const userAnswer = progress.multiplechoice[q.id]?.answer
      if (userAnswer && userAnswer.length > 0) {
        stats.multiplechoice.answered++
        const correctAnswer = q.correctAnswer.sort().toString()
        const userAnswerSorted = [...userAnswer].sort().toString()
        if (correctAnswer === userAnswerSorted) {
          stats.multiplechoice.correct++
        }
      }
    })

    // Calculate image match stats
    data.imagematch.forEach(q => {
      const userAnswer = progress.imagematch[q.id]?.answer
      if (userAnswer) {
        stats.imagematch.answered++
        if (userAnswer.isCorrect) {
          stats.imagematch.correct++
        }
      }
    })

    return stats
  }

  const stats = calculateStats()

  return (
    <div className="review">
      <h2>Progress Review</h2>
      <p className="description">
        Review your progress across all sections and export your results.
      </p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Freeform Q&A</h3>
          <div className="stat-value">
            {stats.freeform.answered} / {stats.freeform.total}
          </div>
          <div className="stat-label">Questions Answered</div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(stats.freeform.answered / stats.freeform.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h3>Multiple Choice</h3>
          <div className="stat-value">
            {stats.multiplechoice.correct} / {stats.multiplechoice.total}
          </div>
          <div className="stat-label">Correct Answers</div>
          <div className="progress-bar">
            <div 
              className="progress-fill correct"
              style={{ width: `${(stats.multiplechoice.correct / stats.multiplechoice.total) * 100}%` }}
            />
          </div>
          <div className="sub-stat">
            {stats.multiplechoice.answered} questions attempted
          </div>
        </div>

        <div className="stat-card">
          <h3>Image Match</h3>
          <div className="stat-value">
            {stats.imagematch.correct} / {stats.imagematch.total}
          </div>
          <div className="stat-label">Correct Matches</div>
          <div className="progress-bar">
            <div 
              className="progress-fill correct"
              style={{ width: `${(stats.imagematch.correct / stats.imagematch.total) * 100}%` }}
            />
          </div>
          <div className="sub-stat">
            {stats.imagematch.answered} images matched
          </div>
        </div>
      </div>

      <div className="detailed-progress">
        <h3>Detailed Progress</h3>
        
        <div className="section-detail">
          <h4>Freeform Q&A</h4>
          {data.freeform.map((q, index) => {
            const answered = progress.freeform[q.id]
            return (
              <div key={q.id} className="progress-item">
                <span className="item-number">Q{index + 1}</span>
                <span className="item-question">{q.question}</span>
                <span className={`item-status ${answered ? 'done' : 'pending'}`}>
                  {answered ? '✓' : '○'}
                </span>
              </div>
            )
          })}
        </div>

        <div className="section-detail">
          <h4>Multiple Choice</h4>
          {data.multiplechoice.map((q, index) => {
            const userAnswer = progress.multiplechoice[q.id]?.answer
            const answered = userAnswer && userAnswer.length > 0
            let isCorrect = false
            if (answered) {
              const correctAnswer = q.correctAnswer.sort().toString()
              const userAnswerSorted = [...userAnswer].sort().toString()
              isCorrect = correctAnswer === userAnswerSorted
            }
            return (
              <div key={q.id} className="progress-item">
                <span className="item-number">Q{index + 1}</span>
                <span className="item-question">{q.question}</span>
                <span className={`item-status ${answered ? (isCorrect ? 'correct' : 'incorrect') : 'pending'}`}>
                  {answered ? (isCorrect ? '✓' : '✗') : '○'}
                </span>
              </div>
            )
          })}
        </div>

        <div className="section-detail">
          <h4>Image Match</h4>
          {data.imagematch.map((q, index) => {
            const userAnswer = progress.imagematch[q.id]?.answer
            const answered = userAnswer !== undefined
            const isCorrect = userAnswer?.isCorrect
            return (
              <div key={q.id} className="progress-item">
                <span className="item-number">Q{index + 1}</span>
                <span className="item-question">Match: {q.correctWord}</span>
                <span className={`item-status ${answered ? (isCorrect ? 'correct' : 'incorrect') : 'pending'}`}>
                  {answered ? (isCorrect ? '✓' : '✗') : '○'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="action-buttons">
        <button className="export-button" onClick={onExport}>
          📥 Export Progress to JSON
        </button>
        <button className="clear-button" onClick={onClear}>
          🗑️ Clear All Progress
        </button>
      </div>
    </div>
  )
}

export default Review
