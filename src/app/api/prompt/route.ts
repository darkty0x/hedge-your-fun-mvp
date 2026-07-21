import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { runPromptPipeline } from "@/lib/prompt/pipeline";

const schema = z.object({
  intent: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await enforceRateLimit("prompt", 20);
    const body = schema.parse(await req.json());
    const result = await runPromptPipeline(body.intent);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET() {
  try {
    await enforceRateLimit("prompt-health", 30);
    return jsonOk({
      llmConfigured: Boolean(process.env.OPENAI_API_KEY),
      mode: process.env.OPENAI_API_KEY ? "llm+heuristic" : "heuristic",
    });
  } catch (err) {
    return jsonError(err);
  }
}
