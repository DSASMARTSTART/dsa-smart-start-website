import React from 'react';
import { useTranslation } from 'react-i18next';
import QuizRenderer from './QuizRenderer';
import { getQuizForModule } from '../data/quizHelpers';

type Props = Omit<React.ComponentProps<typeof QuizRenderer>, 'quizQuestions'>;

/** The question bank and quiz UI are downloaded only when a checkpoint opens. */
export default function QuizCheckpoint(props: Props) {
  const { t } = useTranslation('courses');
  const questions = getQuizForModule(props.module.id);
  if (!questions)
    return (
      <p className="p-8">
        {t('courseViewer.contentComingSoon', { defaultValue: 'Content coming soon' })}
      </p>
    );
  return <QuizRenderer {...props} quizQuestions={questions} />;
}
