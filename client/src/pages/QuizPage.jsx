import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiPlayCircle } from 'react-icons/fi';
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
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [quizId, location.pathname]);

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

  const quizStatus = quiz?.status;
  const isActive = quizStatus === 'active';
  const isClosed = quizStatus === 'closed';
  const showQuestionReview = isClosed || (isActive && attempt?.status === 'submitted');

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

        {quizStatus === 'published' && currentUser?.user_id && (
          <p className="QuizPage__publishedHint">
            Question wording stays hidden until this quiz is set to <strong>Active</strong>. You can still see
            your attempt summary above.
          </p>
        )}

        {isActive && currentUser?.user_id && attempt?.status !== 'submitted' && (
          <div className="QuizPage__takeCta">
            <p className="QuizPage__takeCtaText">
              This quiz uses one page per question. When you are ready, continue below.
            </p>
            <button
              type="button"
              className="QuizPage__takeCtaBtn"
              onClick={() => navigate(`/quizpage/${quizId}/take/1`)}
            >
              <FiPlayCircle size={20} aria-hidden />
              {attempt ? 'Continue quiz' : 'Start quiz'}
            </button>
          </div>
        )}

        {!currentUser?.user_id && (
          <p className="QuizPage__loginHint">Sign in to take the quiz when it is active.</p>
        )}

        {showQuestionReview && (
          <QuizQuestionsList questions={normalizedQuestions} attempt={attempt} />
        )}
      </div>
    </section>
  );
};

export default QuizPage;
