import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { script } = await request.json();
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    // Prompt for Ollama: generate a viral YouTube Shorts title and description
    const prompt = `You are a viral YouTube Shorts expert. Given the following script, generate:
1. A clickbait, viral YouTube Shorts TITLE (max 80 chars, no hashtags, no quotes, no emojis).
2. A viral YouTube Shorts DESCRIPTION (max 200 chars, no hashtags, no quotes, no emojis, no links).\n\nScript:\n${script}\n\nFormat:\nTitle: <title>\nDescription: <description>`;

    // Write payload to temp file
    const tempDir = path.join(process.cwd(), 'temporary_files', 'descgen');
    await fs.mkdir(tempDir, { recursive: true });
    const tempPayloadPath = path.join(tempDir, 'ollama_payload.json');
    const tempResponsePath = path.join(tempDir, 'ollama_response.json');
    const ollamaPayload = {
      model: 'llama3.2:latest',
      prompt,
      stream: false
    };
    await fs.writeFile(tempPayloadPath, JSON.stringify(ollamaPayload));
    const command = `curl -s -X POST "http://localhost:11434/api/generate" -d @"${tempPayloadPath}" --max-time 30 -o "${tempResponsePath}" -H "Content-Type: application/json"`;
    await execPromise(command);
    // Check if response file exists
    try {
      await fs.access(tempResponsePath);
    } catch (e) {
      console.error('Ollama response file missing:', tempResponsePath);
      throw new Error('Ollama did not produce a response file');
    }
    let responseContent;
    try {
      responseContent = await fs.readFile(tempResponsePath, 'utf8');
    } catch (e) {
      console.error('Failed to read Ollama response file:', tempResponsePath, e);
      throw new Error('Failed to read Ollama API response');
    }
    if (!responseContent || responseContent.trim() === '') {
      throw new Error('Empty response from Ollama API');
    }
    let response;
    try {
      response = JSON.parse(responseContent);
    } catch (e) {
      console.error('Ollama response is not valid JSON:', responseContent);
      throw new Error('Ollama response is not valid JSON');
    }
    if (!response.response) {
      throw new Error('Invalid response from Ollama API');
    }
    // Parse the response for Title/Description
    let title = '';
    let description = '';
    let match = response.response.match(/Title:\s*(.+)\nDescription:\s*([\s\S]+)/i);
    if (!match) {
      // Try Markdown-style: **Title:** ...\n\n**Description:** ...
      match = response.response.match(/\*\*Title:\*\*\s*(.+?)\n+\*\*Description:\*\*\s*([\s\S]+)/i);
      if (!match) {
        // Try Markdown-style with possible extra newlines
        match = response.response.match(/\*\*Title:\*\*\s*(.+?)\n+\n*\*\*Description:\*\*\s*([\s\S]+)/i);
      }
    }
    if (match) {
      title = match[1].trim();
      description = match[2].trim();
    } else {
      // Fallback: try to extract first two non-empty lines as title/description
      const lines = response.response.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        title = lines[0].replace(/^"|"$/g, '');
        description = lines.slice(1).join(' ');
      } else {
        console.error('Could not parse title/description from Ollama output:', response.response);
        return NextResponse.json({ error: 'Could not parse title/description from Ollama output. Please check the LLM output format.' }, { status: 500 });
      }
    }
    return NextResponse.json({ title, description });
  } catch (error) {
    console.error('generate-description API error:', error);
    return NextResponse.json({ error: (error instanceof Error) ? error.message : 'Failed to generate description' }, { status: 500 });
  }
}
