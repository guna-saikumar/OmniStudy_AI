import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Types ────────────────────────────────────────────────────────────────

export interface OutlineSection {
    heading: string;
    level: number;
    bullets: string[];
    subSections: { title: string; bullets: string[] }[];
}

export interface GeneratedSummaryContent {
    text: string | string[];
    documentOutline: OutlineSection[];
    mindMapData: {
        label: string;
        children: { label: string; children?: { label: string }[] }[];
    }[];
    infographicData: {
        title: string;
        sections: { title: string; points: string[] }[];
    };
    flashcards: { question: string; answer: string }[];
    comparativeTable: any[];
    topicClusters: { category: string; icon: string; color: string; items: string[] }[];
}

const clusterColors = [
    'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800',
    'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800',
    'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800',
    'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800',
    'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-800',
];
const clusterIcons = ['💎', '🚀', '🌟', '🔬', '📚'];

// ─── Local Fallback Logic (Omitted for brevity, keeping same) ───────────
// ... [detectHeadings, sectionToBullets, extractWords, extractKeyPhrases, smartFallback remain exactly as they were in the original]
function detectHeadings(text: string): { heading: string; body: string }[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sections: { heading: string; body: string }[] = [];
    let currentHeading = '';
    let currentBody: string[] = [];
    const isHeading = (line: string): boolean => {
        if (line.length < 3 || line.length > 120) return false;
        if (/^[A-Z][A-Z\s\d\-:]{3,}$/.test(line)) return true;
        if (/^[A-Z][A-Za-z\s\d\-:]{3,60}$/.test(line) && !line.endsWith('.') && !line.endsWith(',')) {
            const words = line.split(' ');
            if (words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5) return true;
        }
        if (/^(\d+[\.\)]\s|\d+\.\d+\s|Chapter\s|Section\s|Part\s|Unit\s|Module\s|Lesson\s)/i.test(line)) return true;
        return false;
    };
    for (const line of lines) {
        if (isHeading(line)) {
            if (currentHeading || currentBody.length > 0) sections.push({ heading: currentHeading || 'Introduction', body: currentBody.join(' ') });
            currentHeading = line;
            currentBody = [];
        } else currentBody.push(line);
    }
    if (currentHeading || currentBody.length > 0) sections.push({ heading: currentHeading || 'Content', body: currentBody.join(' ') });
    if (sections.length <= 1) {
        const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 40);
        const chunkSize = Math.ceil(sentences.length / 5);
        const defaults = ['Introduction', 'Core Concepts', 'Key Methods', 'Analysis', 'Summary'];
        return defaults.map((h, i) => ({ heading: h, body: sentences.slice(i * chunkSize, (i + 1) * chunkSize).join(' ') })).filter(s => s.body.trim().length > 0);
    }
    return sections;
}
function sectionToBullets(body: string, count = 4): string[] {
    const sentences = body.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 30 && s.length < 350 && /[a-zA-Z]/.test(s));
    return sentences.slice(0, count);
}
function extractWords(text: string, count: number): string[] {
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its', 'their', 'they', 'we', 'he', 'she', 'also', 'which', 'who', 'can', 'its', 'about', 'into', 'through']);
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const freq: Record<string, number> = {};
    words.forEach(w => { if (!stopwords.has(w)) freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, count).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}
function extractKeyPhrases(text: string, count: number): string[] {
    const phrases = text.match(/\b([A-Z][a-z]+(?:\s+[A-Za-z]+){1,3})\b/g) || [];
    const freq: Record<string, number> = {};
    phrases.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, count).map(([p]) => p);
}
function smartFallback(pdfText: string, fileName: string): GeneratedSummaryContent {
    console.log(`[Smart Fallback] Local generation triggered for ${fileName}`);
    const docTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    const rawSections = detectHeadings(pdfText);
    const topWords = extractWords(pdfText, 60);
    const keyPhrases = extractKeyPhrases(pdfText, 40);
    const documentOutline: OutlineSection[] = rawSections.map((sec) => {
        const bullets = sectionToBullets(sec.body, 8);
        const secWords = extractWords(sec.body, 12);
        const subSections: { title: string; bullets: string[] }[] = [];
        if (secWords.length >= 4) {
            subSections.push({ title: secWords.slice(0, 2).join(' & '), bullets: sectionToBullets(sec.body, 4) });
        }
        return { heading: sec.heading, level: 1, bullets: bullets.length > 0 ? bullets : [`This section covers ${sec.heading.toLowerCase()} in detail.`], subSections };
    }).filter(s => s.heading.trim().length > 0);
    const allBullets = documentOutline.flatMap(s => s.bullets);
    const text = allBullets.length > 0 ? allBullets.map(b => `• ${b}`) : [`• ${docTitle} covers fundamental principles across all its pages.`];
    const mindMapData = [{ label: docTitle, children: documentOutline.slice(0, 8).map(sec => ({ label: sec.heading, children: extractWords(sec.bullets.join(' '), 4).map(w => ({ label: w })) })) }];
    const infographicData = { title: docTitle, sections: documentOutline.slice(0, 10).map(s => ({ title: s.heading, points: s.bullets.slice(0, 3) })) };
    const flashcards = documentOutline.slice(0, 10).map(sec => ({ question: `What is the focus of "${sec.heading}"?`, answer: sec.bullets[0] }));
    const topicClusters = Array.from({ length: 3 }, (_, i) => ({ category: `Topic ${i + 1}`, icon: clusterIcons[i], color: clusterColors[i], items: topWords.slice(i * 5, i * 5 + 5) }));
    return { text, documentOutline, mindMapData, infographicData, flashcards, comparativeTable: [], topicClusters };
}

// ─── Gemini AI Processing Path ───────────────────────────────────────────────

export const generateSummaryFromText = async (pdfText: string, fileName: string): Promise<GeneratedSummaryContent> => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return smartFallback(pdfText, fileName);
    }

    const systemPrompt = `You are an advanced AI PDF summarization engine. 
Your goal is to be extremely thorough and exhaustive. You MUST conduct a deep, page-by-page analysis of the FULL provided document to generate exactly the study content required by its complexity.
Never skip sections, pages, or logical segments. Ensure that the information in each module reflects the full scale of the document.
Return ONLY raw JSON without markdown formatting. Document: "${fileName}"`;

    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 16384 }
    });

    const textLimit = 1000000; // Increased to cover massive textbooks (up to ~250k-300k words)
    const truncatedText = pdfText.length > textLimit ? pdfText.substring(0, textLimit) : pdfText;

    try {
        console.log("[Gemini] Starting Full Page-by-Page Analysis (Part 1: Key Points & Outline)...");

        const userPromptPart1 = `CRITICAL TASK: Analyze the ENTIRE provided PDF text to generate exhaustive study content covering every single page.

For the "text" (Key Points) field: Generate a detailed list of key points from every page of the document. The quantity must be exhaustive and reflect the scale of the full document—use as many as needed for a thorough summary of every finding.
For the "documentOutline" field: Generate an extremely granular multi-level structured outline covering EVERY heading and sub-heading. Each primary heading MUST have exactly 8-12 exhaustive bullet points plus a minimum of 4-6 detailed sub-sections (sub-headings), each with its own specific bullets. Do not skip any logical segment of the document.

Text:
"""
${truncatedText}
"""

Return ONLY raw JSON with this exact structure for Part 1:
{
  "text": [
    "Comprehensive key point from page 1...",
    "...(continue Dynamic based on content)..."
  ],
  "documentOutline": [
    {
      "heading": "Core Concept Name",
      "level": 1,
      "bullets": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5", "Point 6", "Point 7", "Point 8", "Point 9", "Point 10", "Point 11", "Point 12"],
      "subSections": [
        { "title": "Sub-heading 1", "bullets": ["Detail", "Detail"] },
        { "title": "Sub-heading 2", "bullets": ["Detail", "Detail"] },
        { "title": "Sub-heading 3", "bullets": ["Detail", "Detail"] },
        { "title": "Sub-heading 4", "bullets": ["Detail", "Detail"] }
      ]
    }
  ],
  "topicClusters": [{"category": "Theme Title", "items": ["keyword1", "keyword2"]}]
}`;

        const userPromptPart2 = `CRITICAL TASK: Analyze the ENTIRE provided PDF text to generate deep visual and study reinforcements for every page.

For the "infographicData" field: Generate exactly 10-15 highly detailed visual sections highlighting themes, processes, and logical flows based on an exhaustive page-by-page scan.
For the "comparativeTable" field: Generate as many separate comparison tables as required to clearly contrast all related concepts found throughout every page of the document. (Dynamic quantity)
For the "flashcards" field: Generate a comprehensive set of high-quality flashcards covering every major concept and technical term from every page. (Dynamic quantity)
For the "mindMapData" field: Generate an ARRAY of exactly 4-6 exhaustive mind map objects. Each mind map MUST have at least 6-12 primary branches. Each of these primary branches MUST contain at least 4-6 detailed sub-nodes for deep granularity. This is a strict requirement for knowledge organization.

Text:
"""
${truncatedText}
"""

Return ONLY raw JSON with this exact structure for Part 2:
{
  "mindMapData": [
    {
      "title": "Major Theme Title",
      "nodes": [
        {
          "name": "Branch 1",
          "children": [{"name": "Sub-node 1", "children": []}, {"name": "Sub-node 2", "children": []}, {"name": "Sub-node 3", "children": []}, {"name": "Sub-node 4", "children": []}]
        },
        { "name": "Branch 2", "children": [] },
        { "name": "Branch 3", "children": [] },
        { "name": "Branch 4", "children": [] },
        { "name": "Branch 5", "children": [] },
        { "name": "Branch 6", "children": [] }
      ]
    }
  ],
  "infographicData": {
    "title": "Exhaustive Document Title",
    "sections": [
      { "title": "Concept 1", "points": ["Detail A", "Detail B", "Detail C", "Detail D"], "type": "process", "relevance": 95 },
      { "title": "Concept 2", "points": ["Detail A", "Detail B", "Detail C", "Detail D"], "type": "architecture", "relevance": 90 }
      // ... continue to 10-15 sections
    ],
    "logicalFlow": [{"from": "Concept 1", "to": "Concept 2", "label": "enables"}]
  },
  "flashcards": [{"question": "Question?", "answer": "Answer"}],
  "comparativeTable": [{"title": "Comparison Title", "headers": ["Feature", "A", "B"], "rows": [["Data", "Detail A", "Detail B"]]}]
}

RULES:
1. Conduct a deep, page-by-page analysis. Do not skip any pages.
2. The Outline (8-12 bullets, 4-6 sub-sections), Infographics (10-15 sections), and Mind Maps (4-6 maps, 6-12 branches) MUST follow these strict structural counts.
3. Flashcards, Key Points, and Tables should be dynamically scaled as needed for exhaustion.`;

        // PART 1
        console.log("[Gemini] Starting Sequential Analysis (Part 1: Key Points & Outline)...");
        const result1 = await model.generateContent(systemPrompt + "\n\n" + userPromptPart1);
        const parsedPart1 = JSON.parse(result1.response.text());

        // Small delay to respect rate limits (RPM)
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("[Gemini] Processing Part 2: Visuals & Flashcards...");

        // PART 2
        const result2 = await model.generateContent(systemPrompt + "\n\n" + userPromptPart2);
        const parsedPart2 = JSON.parse(result2.response.text());

        console.log("[Gemini] All tasks completed.");

        const mapTopicToLabel = (node: any): any => {
            if (!node) return node;
            const childrenArray = node.children || node.nodes;
            return {
                label: node.topic || node.label || node.title || node.name || 'Untitled',
                children: childrenArray && Array.isArray(childrenArray) ? childrenArray.map(mapTopicToLabel) : undefined
            };
        };

        const topicClusters = (parsedPart1.topicClusters || []).map((c: any, i: number) => ({
            category: c.category,
            icon: clusterIcons[i % clusterIcons.length],
            color: clusterColors[i % clusterColors.length],
            items: c.items
        }));

        const mappedMindMapData = parsedPart2.mindMapData
            ? (Array.isArray(parsedPart2.mindMapData) ? parsedPart2.mindMapData.map(mapTopicToLabel) : [mapTopicToLabel(parsedPart2.mindMapData)])
            : [];

        return {
            text: parsedPart1.text || ["Summary completed."],
            documentOutline: parsedPart1.documentOutline || [],
            mindMapData: mappedMindMapData,
            infographicData: parsedPart2.infographicData || { title: fileName, sections: [] },
            flashcards: parsedPart2.flashcards || [],
            comparativeTable: parsedPart2.comparativeTable || [],
            topicClusters
        };

    } catch (err: any) {
        console.error("[Gemini AI Error]", err);
        throw new Error(`AI processing failed: ${err.message}. Please try a slightly smaller file.`);
    }
};
