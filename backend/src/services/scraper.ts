import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

export async function fetchPrivacyPolicy(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('header').remove();
    $('footer').remove();
    
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    return text;
  } catch (error) {
    throw new Error(`Failed to fetch privacy policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function chunkText(text: string, minTokens: number = 1500, maxTokens: number = 2000): string[] {
  const avgCharsPerToken = 4;
  const minChars = minTokens * avgCharsPerToken;
  const maxChars = maxTokens * avgCharsPerToken;
  
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length < maxChars) {
      currentChunk += para + '\n\n';
    } else {
      if (currentChunk.length >= minChars) {
        chunks.push(currentChunk.trim());
        currentChunk = para + '\n\n';
      } else {
        currentChunk += para + '\n\n';
        if (currentChunk.length >= minChars) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}