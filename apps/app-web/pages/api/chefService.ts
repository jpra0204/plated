import fetch from "node-fetch";

type Provider = "groq" | "together";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS as string);

export async function generateRecipe(prompt: string): Promise<string> {
    const providers = [
      {
        name: "groq",
        url: process.env.GROQ_URL,
        key: process.env.GROQ_API_KEY!,
        buildBody: () => ({
          model: process.env.GROQ_MODEL,
          messages: [{ role: "system", content: prompt }],
          max_tokens: MAX_TOKENS,
        }),
      },
      {
        name: "together",
        url: process.env.TOGETHER_URL,
        key: process.env.TOGETHERAI_API_KEY!,
        buildBody: () => ({
            model: process.env.TOGETHERAI_MODEL,
            messages: [{ role: "system", content: prompt }],
            max_tokens: MAX_TOKENS,
        }),
      },
    ];
  
    for (const provider of providers) {
        console.log(provider.buildBody())
        try {
            const res = await fetch(provider.url as string, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${provider.key}`,
                },
                body: JSON.stringify(provider.buildBody()),
            });

            console.log("URL: "+provider.url);
            if (res.status === 429) throw new Error("Rate limited");
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data = (await res.json()) as any;

            // Normalize response
            const content =
            data.choices?.[0]?.message?.content ??
            data.choices?.[0]?.text ??
            "";

            return content;
        } catch (err: any) {
            console.warn(`Plated Chef: ${provider.name} failed:`, err.message);
        }
    }
    throw new Error("All providers failed");
}
