import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import PageLoader from '../components/PageLoader';
import ApiService from '../services/api';
import QuizPageHeader from '../components/quizpage/QuizPageHeader';
import QuizOverviewCards from '../components/quizpage/QuizOverviewCards';
import QuizAttemptCard from '../components/quizpage/QuizAttemptCard';
import QuizQuestionsList from '../components/quizpage/QuizQuestionsList';
import './QuizPage.css';

const QuizPage = () => {
  const { quizId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!quizId) {
        setLoading(false);
        setError('Quiz id is required in route: /quizpage/:quizId');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [quizData, user] = await Promise.all([
          ApiService.getQuizById(quizId),
          ApiService.getProfile().catch(() => null)
        ]);

        setQuiz(quizData || null);
        setCurrentUser(user);

        if (user?.user_id) {
          const userAttempt = await ApiService
            .getQuizAttemptByUser(quizId, user.user_id)
            .catch(() => null);
          setAttempt(userAttempt);
        } else {
          setAttempt(null);
        }
      } catch (err) {
        console.error('Error loading quiz page:', err);
        setError(err.message || 'Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quizId]);

  const normalizedQuestions = useMemo(() => {
    const questions = quiz?.questions || [];
    return questions.map((q, index) => ({
      question_id: q.question_id,
      question_type: q.question_type || 'text',
      question_text: q.question_text || `Question ${index + 1}`,
      points: Number(q.points || 0),
      position: Number(q.position || index + 1),
      options: Array.isArray(q.options) ? q.options : []
    }));
  }, [quiz]);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !quiz) {
    return (
      <section className="QuizPage">
        <BackButton
          to={quizId ? `/competitions/${quizId}` : '/competitions'}
          label={quizId ? 'Back to competition' : 'Back to Competitions'}
        />
        <div className="QuizPage__error">
          <h2>Unable to load quiz</h2>
          <p>{error || 'Quiz not found.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="QuizPage">
      <BackButton
        to={quizId ? `/competitions/${quizId}` : '/competitions'}
        label={quizId ? 'Back to competition' : 'Back to Competitions'}
      />
      <SEO
        title={quiz.title || 'Quiz Page'}
        description={quiz.description || 'Quiz details and your attempt overview'}
      />

      <div className="QuizPage__container">
        <QuizPageHeader quiz={quiz} />
        <QuizOverviewCards quiz={quiz} questions={normalizedQuestions} />
        <QuizAttemptCard attempt={attempt} currentUser={currentUser} />
        <QuizQuestionsList questions={normalizedQuestions} attempt={attempt} />
      </div>
    </section>
  );
};

export default QuizPage;
