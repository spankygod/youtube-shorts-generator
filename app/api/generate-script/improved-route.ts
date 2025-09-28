import { NextResponse } from 'next/server';

export async function generateScriptWithLogs(params: {
  subject: string;
  numberOfFacts: number;
  storyStyle: string;
  language: string;
  moods: string[] | string;
  shortDuration: string;
  jobId?: string;
}): Promise<string> {
  const { subject, numberOfFacts, storyStyle, language, moods, shortDuration } = params;
  const moodStr = Array.isArray(moods) ? moods.join(', ') : moods;
  let durationSeconds = '15-20';
  if (shortDuration === '20-45') durationSeconds = '20-45';
  if (shortDuration === '30-60') durationSeconds = '30-60';
  const durationNum = Number(durationSeconds.split('-')[1] || durationSeconds.split('-')[0]);

  let prompt = '';
  if (storyStyle === 'reddit') {
    prompt = `You are a YouTube Shorts scriptwriter specializing in Reddit-style storytelling.\n\nWrite a short, punchy story for the following subject:\n${subject}\n\nFormat:\n${subject}\n\nInstructions:\n- Use ${language} style communication.  \n- Mood: ${moodStr}.  \n- Keep the total story within ${durationSeconds} seconds (~${Math.floor(durationNum * 3)} words).  \n- Line 1: Sets up the scenario or tension.  \n- Line 2: Delivers the twist, emotional payoff, or reveal.  \n- Do NOT include any bullet points, numbers, intros, or extra commentary.  \n- Stick strictly to the format and no special characters like comma,asterisk, double qoute or single qoute.`;
  } 
  else if (storyStyle === 'factual') {
    prompt = `You are a scriptwriter for viral YouTube Shorts that deliver fascinating factual lists.\n\nWrite a script for this subject:  \n${subject}\n\nFormat:\n${subject}  \n1  \n2  \n... up to ${numberOfFacts}\n\nInstructions:\n- Use ${language} style communication.\n- Include exactly ${numberOfFacts} short facts.  \n- Keep the total script length under ${durationSeconds} seconds (~${Math.floor(durationNum * 3)} words).  \n- Each fact should be ${moodStr}.  \n- No intro or conclusion — just the title and numbered facts.  \n- Stick strictly to the format and no special characters like comma,asterisk, double qoute or single qoute.`;
  } 
  else if (storyStyle === 'educational') {
    prompt = `You are a scriptwriter for viral YouTube Shorts that deliver fascinating educational facts.\n\nWrite a script for this subject:  \n${subject}\n\nFormat:\nDid you know about ${subject}  \n1  \n2  \n... up to ${numberOfFacts}\n\nInstructions:\n- Use ${language} style communication.\n- Include exactly ${numberOfFacts} short facts.  \n- Keep the total script length under ${durationSeconds} seconds (~${Math.floor(durationNum * 3)} words).  \n- Each fact should be ${moodStr}.  \n- No intro or conclusion — just the title and numbered facts.  \n- Stick strictly to the format and no special characters like comma,asterisk, double qoute or single qoute.`;
  }
    else if (storyStyle === 'factual-educational') {
    prompt = `You are a scriptwriter for viral YouTube Shorts that deliver fascinating educational facts.\n\nWrite a script for this subject:  \n${subject}\n\nFormat:\n ${subject} \n\nInstructions:\n- Use ${language} style communication.\n- Include viral hooks.  \n- Keep the total script length under ${durationSeconds} seconds (~${Math.floor(durationNum * 3)} words).  \n- Each fact should be ${moodStr}.  \n- No intro or conclusion — just the title and explaination.  \n- Stick strictly to the format and no special characters like comma,asterisk, double qoute or single qoute.`;
  }

  try {
    console.log('Prompt sent to Ollama:', prompt);
    const ollamaPayload = {
      model: "llama3.2",
      prompt: prompt,
      stream: false
    };
    const apiResponse = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload)
    });
    if (!apiResponse.ok) {
      throw new Error('Ollama API error');
    }
    const responseJson = await apiResponse.json();
    if (!('response' in responseJson) || !responseJson.response) {
      throw new Error('Ollama returned an empty script.');
    }
    return responseJson.response;
  } catch (error) {
    // Rethrow original error for better debugging
    throw error;
  }
}

export async function POST(request: Request) {
  const jobId = Math.random().toString(36).substring(2, 15);
  try {
    const body = await request.json();
    const { subject, numberOfFacts, storyStyle, language, moods, shortDuration } = body;
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    const script = await generateScriptWithLogs({
      subject,
      numberOfFacts: numberOfFacts || 5,
      storyStyle: storyStyle || 'reddit',
      language: language || 'English',
      moods: moods || ['humor'],
      shortDuration: shortDuration || '15-20',
      jobId
    });
    return NextResponse.json({
      script,
      jobId,
      stats: {
        scriptLength: script.length,
        subject,
        language,
        style: storyStyle
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate script', jobId },
      { status: 500 }
    );
  }
}
