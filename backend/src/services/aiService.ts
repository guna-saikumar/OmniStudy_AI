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
    text: string;
    documentOutline: OutlineSection[];
    mindMapData: {
        label: string;
        children: { label: string; children?: { label: string }[] }[];
    };
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

// ─── Smart Text Fallback Engine ───────────────────────────────────────────

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
            if (words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5) {
                return true;
            }
        }
        if (/^(\d+[\.\)]\s|\d+\.\d+\s|Chapter\s|Section\s|Part\s|Unit\s|Module\s|Lesson\s)/i.test(line)) return true;
        return false;
    };

    for (const line of lines) {
        if (isHeading(line)) {
            if (currentHeading || currentBody.length > 0) {
                sections.push({ heading: currentHeading || 'Introduction', body: currentBody.join(' ') });
            }
            currentHeading = line;
            currentBody = [];
        } else {
            currentBody.push(line);
        }
    }

    if (currentHeading || currentBody.length > 0) {
        sections.push({ heading: currentHeading || 'Content', body: currentBody.join(' ') });
    }

    if (sections.length <= 1) {
        const sentences = text
            .replace(/\n+/g, ' ')
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.length > 40);

        const chunkSize = Math.ceil(sentences.length / 5);
        const defaults = ['Introduction', 'Core Concepts', 'Key Methods', 'Analysis', 'Summary'];
        return defaults.map((h, i) => ({
            heading: h,
            body: sentences.slice(i * chunkSize, (i + 1) * chunkSize).join(' '),
        })).filter(s => s.body.trim().length > 0);
    }

    return sections;
}

function sectionToBullets(body: string, count = 4): string[] {
    const sentences = body
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 350 && /[a-zA-Z]/.test(s));
    return sentences.slice(0, count);
}

function extractWords(text: string, count: number): string[] {
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those', 'it', 'its', 'their', 'they', 'we', 'he', 'she', 'also', 'which', 'who', 'can', 'its', 'about', 'into', 'through']);
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const freq: Record<string, number> = {};
    words.forEach(w => { if (!stopwords.has(w)) freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function extractKeyPhrases(text: string, count: number): string[] {
    const phrases = text.match(/\b([A-Z][a-z]+(?:\s+[A-Za-z]+){1,3})\b/g) || [];
    const freq: Record<string, number> = {};
    phrases.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([p]) => p);
}

function smartFallback(pdfText: string, fileName: string): GeneratedSummaryContent {
    console.log(`[Smart Fallback] Generating locally because AI was skipped or failed for ${fileName}`);
    const docTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    const rawSections = detectHeadings(pdfText);
    const topWords = extractWords(pdfText, 60);
    const keyPhrases = extractKeyPhrases(pdfText, 40);

    const documentOutline: OutlineSection[] = rawSections.map((sec) => {
        const bullets = sectionToBullets(sec.body, 8);
        const secWords = extractWords(sec.body, 12);
        const subSections: { title: string; bullets: string[] }[] = [];
        if (secWords.length >= 4) {
            subSections.push({
                title: secWords.slice(0, 2).join(' & '),
                bullets: sectionToBullets(sec.body, 4),
            });
        }
        return {
            heading: sec.heading,
            level: 1,
            bullets: bullets.length > 0
                ? bullets
                : [`This section covers ${sec.heading.toLowerCase()} in detail.`],
            subSections,
        };
    }).filter(s => s.heading.trim().length > 0);

    const allBullets = documentOutline.flatMap(s => s.bullets);

    const text = allBullets.length > 0
        ? allBullets.map(b => `• ${b}`).join('\n')
        : `• ${docTitle} covers fundamental principles across all its pages.\n• Each section provides detailed analysis of its respective topic.\n• Key concepts are supported with examples and explanations.\n• Practical implications are discussed throughout the document.\n• The document concludes with actionable insights and recommendations.`;

    let mindMapData: GeneratedSummaryContent['mindMapData'];

    if (documentOutline.length <= 8) {
        mindMapData = {
            label: docTitle,
            children: documentOutline.map(sec => ({
                label: sec.heading,
                children: extractWords(sec.bullets.join(' '), 8)
                    .slice(0, 4)
                    .map(w => ({ label: w })),
            })),
        };
    } else {
        const groupSize = Math.ceil(documentOutline.length / 4);
        const groups = [0, 1, 2, 3].map(g =>
            documentOutline.slice(g * groupSize, (g + 1) * groupSize)
        ).filter(g => g.length > 0);

        mindMapData = {
            label: docTitle,
            children: groups.map(group => ({
                label: group[0].heading,
                children: group.slice(1).map(sec => ({ label: sec.heading }))
                    .concat(
                        extractWords(group.map(s => s.bullets.join(' ')).join(' '), 6)
                            .slice(0, Math.max(0, 4 - group.length + 1))
                            .map(w => ({ label: w }))
                    ).slice(0, 5),
            })),
        };
    }

    const infoTypes = ["overview", "process", "logic", "architecture"];
    const infoSections = documentOutline
        .map((sec, i) => ({
            title: sec.heading,
            points: sec.bullets.slice(0, 6).map(b => b.substring(0, 120)),
            type: infoTypes[i % infoTypes.length],
            relevance: Math.max(20, 100 - (i * 10)),
            metadata: { complexity: i % 2 === 0 ? "medium" : "high", priority: (i % 5) + 1 }
        }))
        .filter(s => s.points.length > 0);

    const logicalFlow = infoSections.slice(0, -1).map((sec, i) => ({
        from: sec.title,
        to: infoSections[i + 1].title,
        label: 'Next Segment'
    }));

    if (infoSections.length < 5) {
        const topConcepts = keyPhrases.slice(0, 5);
        topConcepts.forEach((phrase, i) => {
            if (!infoSections.some(s => s.title === phrase)) {
                infoSections.push({
                    title: phrase,
                    points: [
                        `Key conceptual element: ${phrase}`,
                        `Critical theme identified in ${docTitle}`,
                        'Analyzed as a core component of the document structure'
                    ],
                    type: 'overview',
                    relevance: 40 + i * 5,
                    metadata: { complexity: 'medium', priority: 3 }
                });
            }
        });
    }

    const infographicData = { title: docTitle, sections: infoSections, logicalFlow };

    const flashcards: { question: string; answer: string }[] = documentOutline.map(sec => ({
        question: `What does the section "${sec.heading}" cover?`,
        answer: sec.bullets[0]
            || `This section explains the key concepts related to ${sec.heading.toLowerCase()} as discussed in ${docTitle}.`,
    }));

    const extraCards = [
        {
            question: `What is the main purpose of "${docTitle}"?`,
            answer: allBullets[0] || `${docTitle} provides a comprehensive study of its subject matter.`,
        },
        {
            question: `What methodologies are used in "${docTitle}"?`,
            answer: topWords.slice(0, 5).join(', ') + ' and related approaches.',
        },
        {
            question: `What are the practical applications discussed in "${docTitle}"?`,
            answer: documentOutline[documentOutline.length - 1]?.bullets[0]
                || 'The document explores various real-world applications and concludes with actionable recommendations.',
        },
    ];
    while (flashcards.length < 6) {
        flashcards.push(extraCards[flashcards.length % extraCards.length]);
    }

    const tableRows = [
        {
            title: "Core Concepts Overview",
            headers: ["Concept", "Key Features", "Examples", "Differences"],
            rows: documentOutline.slice(0, 8).map((sec, i) => [
                sec.heading,
                sec.bullets.slice(0, 2).join(' ').substring(0, 100) || 'Core features of this section',
                extractWords(sec.bullets.join(' '), 5).slice(0, 3).join(', ') || 'See section for details',
                [
                    'Foundational — establishes core principles',
                    'Analytical — examines relationships and patterns',
                    'Applied — focuses on practical implementation',
                    'Evaluative — compares and contrasts approaches',
                    'Synthetic — integrates multiple concepts',
                    'Theoretical — provides conceptual framework',
                    'Empirical — based on real-world evidence',
                    'Conclusive — summarises and recommends',
                ][i % 8],
            ])
        }
    ];

    if (tableRows[0].rows.length < 3 && allBullets.length > 0) {
        tableRows[0].rows.push([
            `${docTitle} — Key Point`,
            allBullets[0]?.substring(0, 80) || 'Core feature',
            topWords.slice(0, 3).join(', '),
            'Unique contribution within the document',
        ]);
    }

    const clusterCount = Math.min(5, documentOutline.length);
    const clusterGroupSize = Math.ceil(documentOutline.length / clusterCount);

    const topicClusters = Array.from({ length: clusterCount }, (_, ci) => {
        const group = documentOutline.slice(ci * clusterGroupSize, (ci + 1) * clusterGroupSize);
        const groupText = group.flatMap(s => s.bullets).join(' ');
        const items = extractWords(groupText, 20).slice(0, 5);
        return {
            category: group[0]?.heading || `Topic ${ci + 1}`,
            icon: clusterIcons[ci % clusterIcons.length],
            color: clusterColors[ci % clusterColors.length],
            items: items.length >= 2 ? items : topWords.slice(ci * 5, ci * 5 + 5),
        };
    }).filter(c => c.items.length > 0);

    while (topicClusters.length < 3) {
        const ci = topicClusters.length;
        topicClusters.push({
            category: `Group ${ci + 1}`,
            icon: clusterIcons[ci % clusterIcons.length],
            color: clusterColors[ci % clusterColors.length],
            items: topWords.slice(ci * 5, ci * 5 + 5),
        });
    }

    return { text, documentOutline, mindMapData, infographicData, flashcards, comparativeTable: tableRows, topicClusters };
}

// ─── Gemini AI Processing Path ───────────────────────────────────────────────

export const generateSummaryFromText = async (
    pdfText: string,
    fileName: string
): Promise<GeneratedSummaryContent> => {

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.warn('[Gemini] API key not configured. Using smart fallback.');
        return smartFallback(pdfText, fileName);
    }

    const systemPrompt = `You are an advanced AI PDF summarization engine.
Your goal is to be extremely thorough and exhaustive. You must analyze every single page and section of the provided document to generate exactly 6 Core Study Modules.

The 6 Core Study Modules you MUST generate:
1. KEY POINTS: An exhaustive, detailed list of strings representing the most critical facts and findings.
2. DOCUMENT OUTLINE: A highly granular multi-level structure of the entire document.
3. INFOGRAPHICS: Visual-ready data sections illustrating themes, processes, and logical flows.
4. MIND MAPS: A comprehensive array of conceptual maps for every major topic.
5. FLASHCARDS: A large set of high-quality study/review questions and answers.
6. COMPARISON: Detailed tables comparing and contrasting related concepts, features, or processes.

Your responsibilities:
- Conduct a deep, page-by-page analysis of the full text.
- Never skip sections or summarize so broadly that details are lost.
- Ensure that the information in each module reflects the SCALE of the full document (more content for longer files).
- Identification of technical terms is mandatory.
- CRITICAL: Never use "N/A", "Not Applicable", "No data", or "Not available" in any field (tables, flashcards, etc.). If a specific detail is missing from the text, synthesize a relevant conceptual explanation or an intelligent educational placeholder that fits the topic's context.

Document Name: "${fileName}"`;

    function mapTopicToLabel(node: any): any {
        if (!node) return node;
        const childrenArray = node.children || node.nodes;
        return {
            label: node.topic || node.label || node.title || node.name || 'Untitled',
            type: node.type || node.topic,
            children: childrenArray && Array.isArray(childrenArray) ? childrenArray.map(mapTopicToLabel) : undefined,
            relatedTo: node.relatedTo
        };
    }

    const textLimit = 1000000; // Increased limit for long PDFs
    const truncatedText = pdfText.length > textLimit ? pdfText.substring(0, textLimit) : pdfText;

    const userPromptPart1 = `CRITICAL TASK: Analyze the ENTIRE provided PDF text to generate the first 3 of the 6 core modules (Key Points, Document Outline, and Topic Theme Clusters).

For the "text" (Key Points) field: Generate an exhaustive list of exactly 40 to 80 detailed key points from every page of the document.
For the "documentOutline" field: Generate an extremely granular multi-level structured outline covering EVERY heading and sub-heading. Each primary heading MUST have 8-12 exhaustive bullet points plus a minimum of 4-6 detailed sub-sections (sub-headings), each with its own specific bullets. Do not skip any logical segment of the document.

PDF Content:
"""
${truncatedText}
"""

Return ONLY raw JSON with this exact structure for Part 1:
{
  "text": [
    "Comprehensive key point from page 1-5...",
    "Deep technical detail from middle sections...",
    "Crucial insight identified towards the end...",
    "...(continue to provide 40-60+ points for large documents)..."
  ],
  "documentOutline": [
    {
      "heading": "Core Concept Name (e.g., Support Vector Machines)",
      "level": 1,
      "bullets": ["Granular point 1", "Granular point 2", "Important definition/highlight"],
      "subSections": [
        {
          "title": "Specific detail or sub-case",
          "bullets": ["Technical point X", "Case study Y"]
        },
        {
          "title": "Methodological sub-component",
          "bullets": ["Process step 1", "Performance metric 2"]
        },
        { "title": "Additional Context", "bullets": ["..."] },
        { "title": "Related Case Study", "bullets": ["..."] }
      ]
    },
    {
      "heading": "Another Core Concept",
      "level": 1,
      "bullets": ["Detail..."],
      "subSections": []
    }
  ],
  "topicClusters": [{"category": "Theme Title", "items": ["keyword 1", "keyword 2", "keyword 3", "highlighted term 4"]}]
}

RULES:
1. Provide an extremely exhaustive analysis covering all pages. Do NOT skip any details. The "text" and "documentOutline" arrays should be as large as possible to capture information from the entire document.
2. Return ONLY raw JSON without markdown formatting.`;

    const userPromptPart2 = `CRITICAL TASK: Analyze the ENTIRE provided PDF text to generate the remaining 3 of the 6 core modules (Infographics, Comparison Tables, Flashcards, and Mind Maps).

For the "infographicData" (Visual Modality) field: Generate a minimum of 10-15 detailed visual sections highlighting themes, processes, and logical connections. Do not summarize broadly; be granular.
For the "comparativeTable" (Analytical Comparison) field: Generate at least 10-15 separate functional comparison tables for all related concepts across the whole PDF.
For the "flashcards" (Active Recall) field: Generate at least 50 highly detailed flashcards from every page.
For the "mindMapData" (Knowledge Organization) field: Generate an ARRAY of at least 4-6 exhaustive mind map objects, each covering a major chapter or logical theme. Each mind map MUST have at least 6-12 primary branches (major rectangles). Each of these primary branches MUST contain at least 4-6 detailed sub-nodes/children for deep granularity. This is a strict minimum—add more as required by the complexity.

PDF Content:
"""
${truncatedText}
"""

Return ONLY raw JSON with this exact structure for Part 2:
{
  "mindMapData": [
    {
      "title": "Theme or Chapter Title",
      "nodes": [
        {
          "name": "Major Segment",
          "children": [
            {"name": "Detailed Sub-node 1", "children": []},
            {"name": "Detailed Sub-node 2", "children": []},
            {"name": "Detailed Sub-node 3", "children": []},
            {"name": "Detailed Sub-node 4", "children": []}
          ]
        },
        { "name": "Segment 2", "children": [] },
        { "name": "Segment 3", "children": [] },
        { "name": "Segment 4", "children": [] },
        { "name": "Segment 5", "children": [] },
        { "name": "Segment 6", "children": [] }
      ]
    },
    { "title": "Another Major Chapter", "nodes": [] }
  ],
  "infographicData": {
    "title": "Exhaustive Document Title",
    "sections": [
      {
        "title": "First Major Concept", 
        "points": ["Deep technical detail 1", "Detailed explanation 2", "In-depth context 3", "Specific example 4"],
        "type": "process",
        "relevance": 95,
        "metadata": { "complexity": "high", "priority": 1 }
      },
      {
        "title": "Second Major Concept", 
        "points": ["Deep technical detail 1", "Detailed explanation 2", "In-depth context 3", "Specific example 4"],
        "type": "architecture",
        "relevance": 90,
        "metadata": { "complexity": "high", "priority": 2 }
      },
      { "title": "Third Concept", "points": ["..."], "type": "logic", "relevance": 85 },
      { "title": "Fourth Concept", "points": ["..."], "type": "overview", "relevance": 80 },
      { "title": "Fifth Concept", "points": ["..."], "type": "database", "relevance": 75 }
    ],
    "logicalFlow": [
      {"from": "First Major Concept", "to": "Second Major Concept", "label": "facilitates"}
    ]
  },
  "flashcards": [{"question": "Crucial Question from content?", "answer": "Detailed fact-based answer"}],
  "comparativeTable": [
    {
      "title": "Topic A vs Topic B Comparison",
      "headers": ["Feature", "Topic A", "Topic B"],
      "rows": [["Data Use", "Detail A", "Detail B"], ["Primary Goal", "Target A", "Target B"]]
    }
  ]
}

RULES:
1. Provide an exhaustive analysis covering all pages. If the document is very long, focus on high-impact summaries for sections to avoid exceeding output token limits.
2. The infographic data should be high-impact, focusing on the most important technical concepts and their logical flow.
3. Incorporate all highlighted technical terms, definitions, and important data points.
4. Keep bullet points information-dense and highly technical.
5. Return ONLY raw JSON without markdown formatting.
6. MANDATORY: Fill every cell in comparison tables and every field in infographics with relevant and descriptive text. Do not use generic placeholders or "N/A".`;

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 16384, // Increased for exhaustive summaries
            }
        });

        let parsedPart1, parsedPart2;
        let responseText1 = "", responseText2 = "";

        try {
            console.log("[Gemini] Starting Parallel Analysis (Tasks 1 & 2)...");
            
            // Execute both prompts in parallel for maximum speed
            const [result1, result2] = await Promise.all([
                model.generateContent(systemPrompt + "\n\n" + userPromptPart1),
                model.generateContent(systemPrompt + "\n\n" + userPromptPart2)
            ]);

            console.log("[Gemini] Both tasks completed. Parsing results...");
            
            responseText1 = result1.response.text();
            responseText2 = result2.response.text();

            const cleanContent1 = responseText1.replace(/^\s*```json/, '').replace(/```\s*$/, '').trim();
            parsedPart1 = JSON.parse(cleanContent1 || '{}');

            const cleanContent2 = responseText2.replace(/^\s*```json/, '').replace(/```\s*$/, '').trim();
            parsedPart2 = JSON.parse(cleanContent2 || '{}');

        } catch (parseError: any) {
            console.error("[Gemini AI] Processing or Parsing failed. Possible truncation or rate limit.");
            console.error("Part 1 text preview:", responseText1.substring(0, 500));
            console.error("Part 2 text preview:", responseText2.substring(0, 500));
            throw new Error('AI processing failed. Please try a slightly smaller file or try again in a few moments.');
        }

        const topicClusters = (parsedPart1.topicClusters || []).map(
            (cluster: any, i: number) => ({
                category: cluster.category,
                icon: clusterIcons[i % clusterIcons.length],
                color: clusterColors[i % clusterColors.length],
                items: cluster.items,
            })
        );

        const mappedMindMapData = parsedPart2.mindMapData
            ? (Array.isArray(parsedPart2.mindMapData)
                ? parsedPart2.mindMapData.map((m: any) => mapTopicToLabel(m))
                : mapTopicToLabel(parsedPart2.mindMapData))
            : [];

        return {
            text: parsedPart1.text,
            documentOutline: parsedPart1.documentOutline || [],
            mindMapData: mappedMindMapData,
            infographicData: parsedPart2.infographicData,
            flashcards: parsedPart2.flashcards,
            comparativeTable: parsedPart2.comparativeTable,
            topicClusters,
        };
    } catch (err: any) {
        console.error(`[Gemini AI Error]`, err);

        // Error from Google will typically be formatted depending on the cause.
        // If it's a structural syntax error, it might not have err.status
        const status = err?.status || err?.response?.status;

        if (status === 429) {
            throw new Error('Gemini AI limits exceeded. Please wait a moment before trying again.');
        } else if (status === 400) {
            throw new Error(`Gemini AI request invalid: ${err.message}`);
        } else if (status === 403 || status === 401) {
            throw new Error('Gemini API key is invalid or lacks necessary permissions.');
        }

        throw new Error(`Gemini AI Data Generation failed: ${err.message}`);
    }
};
