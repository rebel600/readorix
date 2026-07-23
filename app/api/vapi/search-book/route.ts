import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { searchBookSegments } from '@/lib/actions/book.actions';

// This route is reachable by anyone on the internet — clerkMiddleware() in
// proxy.ts only makes auth() available, it does not gate the request, and a
// voice agent has no Clerk session to present anyway. Vapi instead sends the
// shared secret configured on the assistant's server tool as X-Vapi-Secret.
// Without this check, guessing a bookId reads any user's book back verbatim.
function isAuthorizedVapiRequest(request: Request) {
    const expected = process.env.VAPI_SERVER_SECRET;
    const provided = request.headers.get('x-vapi-secret');

    // Fail closed: an unset secret must not turn the endpoint into an open one.
    if (!expected || !provided) {
        return false;
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);

    return a.length === b.length && timingSafeEqual(a, b);
}

// Helper function to process book search logic
async function processBookSearch(bookId: unknown, query: unknown) {
    // Call payloads carry session metadata and raw transcribed speech, so the
    // request is never logged whole, and even the narrowed form stays in dev.
    if (process.env.NODE_ENV !== 'production') {
        console.log('Vapi search-book request:', { bookId, query });
    }

    // Validate inputs before conversion to prevent null/undefined becoming "null"/"undefined" strings
    if (bookId == null || query == null || query === '') {
        return { result: 'Missing bookId or query' };
    }

    // Convert bookId to string
    const bookIdStr = String(bookId);
    const queryStr = String(query).trim();

    // Additional validation after conversion
    if (!bookIdStr || bookIdStr === 'null' || bookIdStr === 'undefined' || !queryStr) {
        return { result: 'Missing bookId or query' };
    }

    // Execute search
    const searchResult = await searchBookSegments(bookIdStr, queryStr, 3);

    // Return results
    if (!searchResult.success || !searchResult.data?.length) {
        return { result: 'No information found about this topic in the book.' };
    }

    const combinedText = searchResult.data
        .map((segment) => (segment as { content: string }).content)
        .join('\n\n');

    return { result: combinedText };
}

export async function GET() {
    return NextResponse.json({ status: 'ok' });
}

// Parse tool arguments that may arrive as a JSON string or an object
function parseArgs(args: unknown): Record<string, unknown> {
    if (!args) return {};
    if (typeof args === 'string') {
        try { return JSON.parse(args); } catch { return {}; }
    }
    return args as Record<string, unknown>;
}

export async function POST(request: Request) {
    // Before the body is read, and well before anything touches the database.
    if (!isAuthorizedVapiRequest(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Support multiple Vapi formats
        const functionCall = body?.message?.functionCall;
        const toolCallList = body?.message?.toolCallList || body?.message?.toolCalls;

        // Handle single functionCall format
        if (functionCall) {
            const { name, parameters } = functionCall;
            const parsed = parseArgs(parameters);

            if (name === 'searchBook') {
                const result = await processBookSearch(parsed.bookId, parsed.query);
                return NextResponse.json(result);
            }

            return NextResponse.json({ result: `Unknown function: ${name}` });
        }

        // Handle toolCallList format (array of calls)
        if (!toolCallList || toolCallList.length === 0) {
            return NextResponse.json({
                results: [{ result: 'No tool calls found' }],
            });
        }

        const results = [];

        for (const toolCall of toolCallList) {
            const { id, function: func } = toolCall;
            const name = func?.name;
            const args = parseArgs(func?.arguments);

            if (name === 'searchBook') {
                const searchResult = await processBookSearch(args.bookId, args.query);
                results.push({ toolCallId: id, ...searchResult });
            } else {
                results.push({ toolCallId: id, result: `Unknown function: ${name}` });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Vapi search-book error:', error);
        return NextResponse.json({
            results: [{ result: 'Error processing request' }],
        });
    }
}
