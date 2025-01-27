// 对接 one-api/new-api 使用
const API_KEY = Deno.env.get("API_KEY");
const HUGGINGFACE_API_KEYS = Deno.env.get("HUGGINGFACE_API_KEYS")?.split(",") || [];

// 目前发现的可用模型，请求时如模型不在该列表内，则使用你请求的模型
const CUSTOMER_MODEL_MAP = {
    "qwen2.5-72b-instruct": "Qwen/Qwen2.5-72B-Instruct",
    "qwq-32b-preview": "Qwen/QwQ-32B-Preview",
    "qwen2.5-coder-32b-instruct": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "deepseek-r1-32b": "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "deepseek-r1-hg": "deepseek-ai/DeepSeek-R1"
};

let currentKeyIndex = 0;

async function handleRequest(request: Request): Promise<Response> {
    try {
        if (request.method === "OPTIONS") {
            return getResponse("", 204);
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== API_KEY) {
            return getResponse("Unauthorized", 401);
        }

        if (request.url.endsWith("/v1/models")) {
            const arrs = [];
            Object.keys(CUSTOMER_MODEL_MAP).map(element => arrs.push({ id: element, object: "model" }));
            const response = {
                data: arrs,
                success: true
            };

            return getResponse(JSON.stringify(response), 200);
        }

        if (request.method !== "POST") {
            return getResponse("Only POST requests are allowed", 405);
        }

        if (!request.url.endsWith("/v1/chat/completions")) {
            return getResponse("Not Found", 404);
        }

        const data = await request.json();
        const messages = data.messages || [];
        const model = CUSTOMER_MODEL_MAP[data.model] || data.model;
        const temperature = data.temperature || 0.7;
        const max_tokens = data.max_tokens || 8196;
        const top_p = Math.min(Math.max(data.top_p || 0.9, 0.0001), 0.9999);
        const stream = data.stream || false;

        const requestBody = {
            model: model,
            stream: stream,
            temperature: temperature,
            max_tokens: max_tokens,
            top_p: top_p,
            messages: messages
        };

        const apiKey = HUGGINGFACE_API_KEYS[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % HUGGINGFACE_API_KEYS.length;

        const apiUrl = `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return getResponse(`Error from API: ${response.statusText} - ${errorText}`, response.status);
        }

        const newResponse = new Response(response.body, {
            status: response.status,
            headers: {
                ...Object.fromEntries(response.headers.entries()),
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': '*'
            }
        });

        return newResponse;
    } catch (error) {
        return getResponse(JSON.stringify({
            error: `处理请求失败: ${error.message}`
        }), 500);
    }
}

function getResponse(resp: string, status: number): Response {
    return new Response(resp, {
        status: status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    });
}

// 使用 Deno 的 serve 函数来处理 HTTP 请求
Deno.serve({ port: 8000 }, handleRequest);
