#!/usr/bin/env node
/**
 * Journal Mandala MCP server.
 *
 * Claude から Journal Mandala (Google Drive バックエンド) に直接エントリを
 * 書き込むためのツールを公開する stdio MCP サーバー。
 *
 * 必要な環境変数:
 *   JOURNAL_MANDALA_API_KEY — API キー (発行手順は README 参照)
 *
 * 任意:
 *   JOURNAL_MANDALA_API_URL — デフォルト https://journal-mandala.vercel.app
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
const API_URL = (process.env.JOURNAL_MANDALA_API_URL ?? 'https://journal-mandala.vercel.app').replace(/\/$/, '');
const API_KEY = process.env.JOURNAL_MANDALA_API_KEY;
if (!API_KEY) {
    console.error('ERROR: JOURNAL_MANDALA_API_KEY environment variable is required');
    process.exit(1);
}
function localDateJST() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
}
function localTimeJST() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(11, 16);
}
const server = new McpServer({
    name: 'journal-mandala',
    version: '0.1.0',
});
server.registerTool('add_journal_entry', {
    title: 'Add Journal Mandala entry',
    description: 'Journal Mandala に新しい日記エントリを作成する。' +
        'event (出来事: 何があったか) と thought (思考: それについてどう感じたか) は両方とも任意だが、' +
        '少なくとも title/event/thought のいずれかは必須。' +
        '日付を省略すると日本時間での今日の日付になる。',
    inputSchema: {
        title: z
            .string()
            .optional()
            .describe('エントリのタイトル（任意。省略時は先頭20文字から自動生成）'),
        event: z
            .string()
            .optional()
            .describe('出来事: 何があったかを事実ベースで記述'),
        thought: z
            .string()
            .optional()
            .describe('思考: それについてどう感じたか・何を考えたか'),
        entry_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('YYYY-MM-DD 形式。省略時は日本時間での今日'),
        entry_time: z
            .string()
            .regex(/^\d{2}:\d{2}$/)
            .optional()
            .describe('HH:MM 形式（任意）'),
        tags: z
            .array(z.string())
            .optional()
            .describe('タグの配列（任意）'),
        star_rating: z
            .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
            .optional()
            .describe('1-5 の評価（任意）'),
    },
}, async (args) => {
    if (!args.title && !args.event && !args.thought) {
        return {
            isError: true,
            content: [{ type: 'text', text: 'Error: title, event, thought のいずれか一つは必須です' }],
        };
    }
    const body = {
        entry_type: 'diary',
        entry_date: args.entry_date ?? localDateJST(),
        entry_time: args.entry_time ?? localTimeJST(),
        title: args.title,
        event: args.event,
        thought: args.thought,
        tags: args.tags,
        star_rating: args.star_rating,
    };
    try {
        const res = await fetch(`${API_URL}/api/entries`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: `API エラー (status ${res.status}): ${data.error ?? JSON.stringify(data)}`,
                    },
                ],
            };
        }
        const summary = [
            `✓ エントリを作成しました (${data.account ?? 'default'} アカウント)`,
            `  id: ${data.entry?.id}`,
            `  date: ${data.entry?.entry_date}`,
            data.entry?.driveFileId ? `  drive: ${data.entry.driveFileId}` : '',
        ].filter(Boolean).join('\n');
        return {
            content: [{ type: 'text', text: summary }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: 'text', text: `ネットワークエラー: ${msg}` }],
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
