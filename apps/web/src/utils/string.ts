export function extractJsonFromMarkdown(markdown: string): string | null {
    const jsonFence = /```json\n([\s\S]*?)\n```/i.exec(markdown);
    if (jsonFence && jsonFence[1]) return jsonFence[1].trim();
    const anyFence = /```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/g;
    let m: RegExpExecArray | null;
    while ((m = anyFence.exec(markdown))) {
        const content = (m[1] || "").trim();
        if (content.startsWith("{") || content.startsWith("[")) return content;
    }
    return null;
}