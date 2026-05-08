import { useState } from 'react';
import { answerMeetingQuestion } from '../../shared/pipeline/ragAnswer';
import { ensureSessions } from '../../shared/models/sessions';
import { RagSources } from './RagSources';
import type { RagSource } from '../../shared/pipeline/ragRetrieve';

export function AskMeeting({ meetingId }: { meetingId: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<RagSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer('');
    setSources([]);
    try {
      await ensureSessions(['llm', 'embedding']);
      const result = await answerMeetingQuestion(meetingId, question);
      setAnswer(result.answer);
      setSources(result.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Ask this meeting</h3>
      <div className="field">
        <label htmlFor="ask-input">Question</label>
        <textarea
          id="ask-input"
          className="textarea"
          placeholder="What did we decide about pricing?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <button type="button" className="primary-button" disabled={loading} onClick={ask}>
        {loading ? 'Thinking...' : 'Ask'}
      </button>
      {error && (
        <p className="muted" style={{ color: '#b3261e', marginTop: 8 }}>
          {error}
        </p>
      )}
      {answer && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Answer</h4>
          <p style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
        </div>
      )}
      <RagSources sources={sources} />
    </div>
  );
}
