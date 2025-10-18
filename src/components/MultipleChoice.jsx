import { useState, useEffect } from 'react'
import './MultipleChoice.css'

function MultipleChoice({ progress, updateProgress }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/multiplechoice.json')
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

  const handleOptionChange = (questionId, optionIndex, questionType) => {
    const currentAnswer = progress[questionId]?.answer || []
    
    if (questionType === 'multiple') {
      // Toggle selection for multiple choice
      const newAnswer = currentAnswer.includes(optionIndex)
        ? currentAnswer.filter(idx => idx !== optionIndex)
        : [...currentAnswer, optionIndex]
      updateProgress(questionId, newAnswer)
    } else {
      // Single selection for single choice and true/false
      updateProgress(questionId, [optionIndex])
    }
  }

  const checkAnswer = (question) => {
    const userAnswer = progress[question.id]?.answer || []
    if (userAnswer.length === 0) return null
    
    const correctAnswer = question.correctAnswer.sort().toString()
    const userAnswerSorted = [...userAnswer].sort().toString()
    return correctAnswer === userAnswerSorted
  }

  if (loading) {
    return <div className="loading">Loading questions...</div>
  }

  return (
    <div className="multiple-choice">
      <h2>Multiple Choice</h2>
      <p className="description">
        Select the correct answer(s). Questions may have single or multiple correct answers.
      </p>
      
      <div className="questions-list">
        {questions.map((q, index) => {
          const isCorrect = checkAnswer(q)
          const userAnswer = progress[q.id]?.answer || []
          
          return (
            <div key={q.id} className="question-card">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                <div className="badges">
                  {q.type === 'multiple' && <span className="type-badge">Multiple Select</span>}
                  {q.type === 'truefalse' && <span className="type-badge">True/False</span>}
                  {isCorrect !== null && (
                    <span className={`result-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                </div>
              </div>
              
              <p className="question-text">{q.question}</p>
              
              <div className="options-list">
                {q.options.map((option, optIndex) => {
                  const isSelected = userAnswer.includes(optIndex)
                  const isCorrectOption = q.correctAnswer.includes(optIndex)
                  const showCorrect = isCorrect === false && isCorrectOption
                  
                  return (
                    <label 
                      key={optIndex} 
                      className={`option ${isSelected ? 'selected' : ''} ${showCorrect ? 'highlight-correct' : ''}`}
                    >
                      <input
                        type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                        name={q.id}
                        checked={isSelected}
                        onChange={() => handleOptionChange(q.id, optIndex, q.type)}
                      />
                      <span className="option-text">{option}</span>
                    </label>
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

export default MultipleChoice
