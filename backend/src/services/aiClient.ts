import axios from 'axios';
import { AIClassification } from '../models/types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function analyzeChunk(chunkText: string, chunkIndex: number): Promise<AIClassification[]> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/classify`, {
      text: chunkText,
      section_id: `chunk_${chunkIndex}`
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !Array.isArray(response.data.classifications)) {
      throw new Error('Invalid response from AI service');
    }
    
    return response.data.classifications;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`AI service error: ${error.response?.data?.detail || error.message}`);
    }
    throw error;
  }
}