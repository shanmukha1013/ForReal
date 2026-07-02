import { tool } from 'ai';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

async function run(command, args) {
  const { stdout } = await execFileAsync(command, args);
  return stdout.trim();
}

function logToolCall(name, preview) {
  console.log(`\n> ${name} ${preview}`);
}

const git = tool({
  description: 'Run a git command like log or diff',
  inputSchema: z.object({
    subcommand: z.enum(['log', 'diff', 'show']),
    args: z.array(z.string()).default([])
  }),
  execute: async({ subcommand, args }) => {
    logToolCall('git', [subcommand, ...args].join(' '));
    return run('git', [subcommand, ...args]);
  }
});

import { generateText, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
});

const result = await generateText({
  model: google('gemini-2.5-flash'),
  stopWhen: stepCountIs(10),
  system: 'Summarize recent git commits into a concise changelog entry. Focus on user-facing changes.',
  prompt: 'Summarize the last 20 commits',
  tools: { git }
});

console.log(result.text);
