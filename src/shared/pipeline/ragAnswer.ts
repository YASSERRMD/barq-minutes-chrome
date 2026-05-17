import { generate } from '../models/llm';
import { retrieveContext, type RagSource } from './ragRetrieve';
import { formatTimestamp } from '../utils/time';

const ANSWER_PROMPT = `You answer questions about a meeting using only the retrieved transcript excerpts below.
If the excerpts do not contain the answer, say "Not discussed in this meeting."
Do not invent details. Do not refer to information outside the excerpts.
Keep the answer concise and factual.

Question: {QUESTION}

Excerpts:
{EXCERPTS}

Answer:`;

function formatExcerpts(sources: RagSource[]): string {
  return sources
    .map((s, i) => {
      const ts = formatTimestamp(s.start);
      return `[${i + 1}] (${ts}) ${s.text}`;
    })
    .join('\n\n');
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
}

export async function answerMeetingQuestion(
  meetingId: string,
  question: string,
): Promise<RagAnswer> {
  const sources = await retrieveContext(meetingId, question, { k: 5 });
  if (sources.length === 0) {
    return {
      answer: 'Not discussed in this meeting.',
      sources: [],
    };
  }
  const prompt = ANSWER_PROMPT
    .replace('{QUESTION}', question.trim())
    .replace('{EXCERPTS}', formatExcerpts(sources));

  const out = await generate({
    prompt,
    maxNewTokens: 220,
    temperature: 0.1,
  });

  return { answer: out.trim(), sources };
}
