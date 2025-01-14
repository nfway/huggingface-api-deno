# HuggingFace API Proxy

This will generate a deno proxy for huggingface api, transfer into OpenAI format base url.

## Steps

You need to add `Environment Variables` in your deno project

- `API_KEY` : the key you want use for OneAPI/NewAPI/Uni-API

- `HUGGINGFACE_API_KEYS`: the API you got from [here](https://huggingface.co/settings/tokens/new?globalPermissions=inference.serverless.write&tokenType=fineGrained)

- OpenAI format baseurl: https://example.deno.dev/v1/chat/completions

Enjoy
