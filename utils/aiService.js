const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("OPENAI KEY LOADED:", !!process.env.OPENAI_API_KEY);
const getAIResponse = async (questionText) => {
  try {
    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a cautious health information assistant. Give general educational guidance only. Do not diagnose. Do not prescribe medication dosages. Always recommend seeking urgent medical care for severe symptoms such as trouble breathing, chest pain, severe allergic reactions, fainting, confusion, seizures, or signs of stroke. Keep answers concise and clear."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: questionText
            }
          ]
        }
      ]
    });

    return response.output_text;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "I’m sorry, but I couldn’t generate a response right now. Please try again later or consult a qualified healthcare professional.";
  }
};


module.exports = {
  getAIResponse,
};
