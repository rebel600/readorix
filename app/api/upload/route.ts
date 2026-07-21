import { auth } from '@clerk/nextjs/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import {
    ACCEPTED_IMAGE_TYPES,
    ACCEPTED_PDF_TYPES,
    MAX_FILE_SIZE,
} from '@/lib/constants';
import { getBookQuota } from '@/lib/subscription-server';

export async function POST(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
                const { userId } = await auth();

                if (!userId) {
                    throw new Error('Unauthorized');
                }

                // Without this a user at their book limit could still mint upload
                // tokens and write to blob storage indefinitely — the book insert
                // would fail later, but the bytes (and the bill) would remain.
                const { allowed, plan, maxBooks } = await getBookQuota();

                if (!allowed) {
                    throw new Error(
                        `You have reached the maximum number of books allowed for your ${plan} plan (${maxBooks}).`,
                    );
                }

                return {
                    allowedContentTypes: [
                        ...ACCEPTED_PDF_TYPES,
                        ...ACCEPTED_IMAGE_TYPES,
                    ],
                    maximumSizeInBytes: MAX_FILE_SIZE,
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({ userId }),
                };
            },
            onUploadCompleted: async () => {
                // The book record is created client-side after upload resolves.
            },
        });

        return Response.json(jsonResponse);
    } catch (error) {
        console.error('[/api/upload]', error);

        return Response.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
