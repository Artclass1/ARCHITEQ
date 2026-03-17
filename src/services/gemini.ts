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
  dimensions?: { area: string; size: string }[];
  estimatedCost?: { category: string; cost: string }[];
  totalEstimatedCost?: string;
  localResources?: string[];
  executionStrategy?: string;
}

const planSchemaProperties = {
  title: { type: Type.STRING, description: "A sophisticated, professional project title" },
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
    description: "Highly detailed prompts for an AI image generator to create photorealistic architectural renderings that EXACTLY match this project. You MUST include the specific architectural style, the exact materials from the material palette, the environment/location, and the specific lighting. Ensure the generated images will perfectly reflect the project's unique design."
  },
  dimensions: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        area: { type: Type.STRING, description: "Area or room name" },
        size: { type: Type.STRING, description: "Dimensions (e.g., '20x30 ft' or '400 sq ft')" }
      }
    },
    description: "Dimensions and sizes of the spaces"
  },
  estimatedCost: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "Cost category (e.g., 'Foundation', 'Finishes')" },
        cost: { type: Type.STRING, description: "Estimated cost range" }
      }
    },
    description: "Breakdown of estimated costs"
  },
  totalEstimatedCost: { type: Type.STRING, description: "Total estimated cost of the project" },
  localResources: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: "Available local resources, materials, or labor on location"
  },
  executionStrategy: { type: Type.STRING, description: "Strategy to complete the project smoothly and fastly" }
};

export async function generatePlan(prompt: string): Promise<ArchitecturePlan> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are a master architect. Create a comprehensive, professional architectural plan based on the following concept: "${prompt}".
    The design should perfectly reflect the user's requested style. If no style is specified, default to a highly aesthetic, professional design.
    Ensure all elements (materials, layout, phases) are cohesive and realistic.
    Include dimensions, estimated costs, local resources, and an execution strategy for fast and smooth completion if implied or as a professional baseline.
    CRITICAL: The imagePrompts MUST perfectly describe this specific project's unique style, materials, and context so the resulting images match the plan exactly.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: planSchemaProperties,
        required: ["title", "conceptOverview", "designPrinciples", "materialPalette", "spatialLayout", "constructionPhases", "imagePrompts"]
      }
    }
  });

  return JSON.parse(response.text!) as ArchitecturePlan;
}

export interface ChatUpdateResponse {
  aiMessage: string;
  updatedPlan: ArchitecturePlan;
  newImagePrompts: string[];
}

export async function chatAndUpdatePlan(
  chatHistory: { role: 'user' | 'model'; text: string }[],
  currentPlan: ArchitecturePlan,
  userMessage: string
): Promise<ChatUpdateResponse> {
  
  const systemInstruction = `You are a master architect collaborating with a client on a project.
You have an existing architectural plan. The user will ask for changes, additions (like dimensions, costs, local resources, execution strategies), or new images.
You must respond with a JSON object containing:
1. "aiMessage": A friendly, professional response to the user explaining what you updated.
2. "updatedPlan": The complete updated architecture plan object. Modify the existing plan based on the user's request. Add dimensions, costs, resources, etc., if asked.
3. "newImagePrompts": An array of strings containing prompts for ANY NEW images the user requested. If no new images were requested, leave this empty. CRITICAL: These prompts MUST perfectly describe the project's specific style, materials, and context so the images match the plan exactly. Do NOT include the old image prompts here, only new ones.`;

  const historyText = chatHistory.map(msg => `${msg.role === 'user' ? 'Client' : 'Architect'}: ${msg.text}`).join('\n');
  
  const prompt = `
Current Plan:
${JSON.stringify(currentPlan, null, 2)}

Chat History:
${historyText}

Client's New Message: "${userMessage}"

Update the plan and respond accordingly.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiMessage: { type: Type.STRING },
          updatedPlan: {
            type: Type.OBJECT,
            properties: planSchemaProperties,
            required: ["title", "conceptOverview", "designPrinciples", "materialPalette", "spatialLayout", "constructionPhases", "imagePrompts"]
          },
          newImagePrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["aiMessage", "updatedPlan", "newImagePrompts"]
      }
    }
  });

  return JSON.parse(response.text!) as ChatUpdateResponse;
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Photorealistic architectural rendering, highly detailed, 8k resolution, professional architectural photography, architectural digest style. ${prompt}`,
        },
      ],
    },
    config: {
      // @ts-ignore - imageConfig is valid but might not be fully typed in all SDK versions
      imageConfig: {
        aspectRatio: "16:9"
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
