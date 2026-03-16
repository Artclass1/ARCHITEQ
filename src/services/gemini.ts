import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ArchitecturePlan {
  title: string;
  conceptOverview: string;
  designPrinciples: string[];
  materialPalette: { name: string; description: string }[];
  spatialLayout: { area: string; description: string }[];
  constructionPhases: { phase: string; details: string }[];
  imagePrompts: string[];
}

export async function generatePlan(prompt: string): Promise<ArchitecturePlan> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a master architect. Create a comprehensive, professional architectural plan based on the following concept: "${prompt}".
    The design should lean towards modern, minimalist, and highly aesthetic principles.
    Focus on clean lines, high-end materials, and spatial harmony.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A sophisticated, minimalist project title" },
          conceptOverview: { type: Type.STRING, description: "High-level overview of the architectural concept, focusing on light, space, and form." },
          designPrinciples: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Core design principles (e.g., 'Monolithic forms', 'Seamless indoor-outdoor flow')" 
          },
          materialPalette: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Material name (e.g., 'Board-formed concrete')" },
                description: { type: Type.STRING, description: "Why and where it is used" }
              }
            }
          },
          spatialLayout: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING, description: "Area name (e.g., 'Primary Living Volume')" },
                description: { type: Type.STRING, description: "Description of the space and its atmosphere" }
              }
            }
          },
          constructionPhases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING, description: "Phase name (e.g., 'Site Preparation & Foundation')" },
                details: { type: Type.STRING, description: "Key activities in this phase" }
              }
            }
          },
          imagePrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 highly detailed prompts for an AI image generator to create photorealistic architectural renderings of this project. Specify lighting (e.g., 'golden hour', 'soft overcast'), materials, and atmosphere. Ensure they are distinct views (e.g., exterior, interior living, detail)."
          }
        },
        required: ["title", "conceptOverview", "designPrinciples", "materialPalette", "spatialLayout", "constructionPhases", "imagePrompts"]
      }
    }
  });

  return JSON.parse(response.text!) as ArchitecturePlan;
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Photorealistic architectural rendering, modern minimalism, highly detailed, 8k resolution, professional architectural photography, architectural digest style. ${prompt}`,
        },
      ],
    },
    config: {
      // @ts-ignore - imageConfig is valid but might not be fully typed in all SDK versions
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed or returned no image data.");
}
