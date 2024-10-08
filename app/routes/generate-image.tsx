import { useState } from "react";
import { json } from "@remix-run/cloudflare";
import { useActionData, Form } from "@remix-run/react";
import type { ActionFunction } from "@remix-run/cloudflare";
import { CONFIG } from "~/config";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const enhance = formData.get("enhance") === "true";
  const model = CONFIG.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"];

  if (!prompt) {
    return json({ error: "未找到提示词" }, { status: 400 });
  }

  try {
    const result = await generateImage(enhance ? `---tl ${prompt}` : prompt, model);
    return json(result);
  } catch (error) {
    console.error("生成图片时出错:", error);
    return json({ error: "生成图片失败" }, { status: 500 });
  }
};

async function generateImage(prompt: string, model: string): Promise<{ prompt: string, translatedPrompt: string, image: string }> {
  const cf_account = CONFIG.CF_ACCOUNT_LIST[Math.floor(Math.random() * CONFIG.CF_ACCOUNT_LIST.length)];
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${cf_account.account_id}/ai/run/${model}`;
  
  const jsonBody = { prompt, num_steps: CONFIG.FLUX_NUM_STEPS };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cf_account.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jsonBody)
  });

  if (!response.ok) {
    throw new Error('Cloudflare API request failed: ' + response.status);
  }

  const jsonResponse = await response.json();
  return {
    prompt,
    translatedPrompt: prompt, // 这里可能需要根据实际情况调整
    image: jsonResponse.result.image
  };
}

export default function GenerateImage() {
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(false);
  const actionData = useActionData<typeof action>();

  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 px-4">
      <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-10 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center drop-shadow-lg">
          白嫖 CF 的 Flux 生成图片
        </h1>
        <Form method="post" className="space-y-8">
          <div>
            <label htmlFor="prompt" className="block text-white text-lg font-semibold mb-3">
              输入提示词：
            </label>
            <input
              type="text"
              id="prompt"
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 transition duration-300 ease-in-out hover:bg-opacity-30"
              placeholder="请输入您的提示词..."
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
            <button
              type="button"
              onClick={handleEnhanceToggle}
              className={`flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400
                          ${enhance ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-gray-400 to-gray-600"}`}
            >
              {enhance ? "已强化提示词" : "是否强化提示词"}
            </button>
            <input type="hidden" name="enhance" value={enhance.toString()} />
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-600 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              重置
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-700 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              提交
            </button>
          </div>
        </Form>
        {actionData && actionData.image && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">生成的图片：</h2>
            <img src={`data:image/jpeg;base64,${actionData.image}`} alt="Generated Image" className="w-full rounded-xl shadow-lg" />
          </div>
        )}
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  );
}