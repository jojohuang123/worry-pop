import { GoogleGenAI } from "@google/genai";

async function generateMascot() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A cute, round, fluffy white creature with big sparkling eyes and a tiny smile, sitting on a soft cloud. Pastel colors, 3D render style, high quality, soft lighting, minimalist background.',
        },
      ],
    },
    config: {
      imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
        },
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export { generateMascot };
