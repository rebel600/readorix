'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@clerk/nextjs';
import { IBook, Messages } from '@/types';
import { ASSISTANT_ID, DEFAULT_VOICE, voiceOptions, VOICE_SETTINGS } from '@/lib/constants';
import { startVoiceSession, endVoiceSession } from '@/lib/actions/session.actions';

export type VapiStatus =
    | 'idle'
    | 'connecting'
    | 'starting'
    | 'listening'
    | 'thinking'
    | 'speaking';

const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;

const useVapi = (book: IBook) => {
    const { userId } = useAuth();

    const [status, setStatus] = useState<VapiStatus>('idle');
    const [isActive, setIsActive] = useState(false);
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [duration, setDuration] = useState(0);
    const [maxDurationSeconds, setMaxDurationSeconds] = useState(0);
    const [limitError, setLimitError] = useState<string | null>(null);
    const [isBillingError, setIsBillingError] = useState(false);

    const vapiRef = useRef<Vapi | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const durationRef = useRef(0);
    const maxDurationRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearError = useCallback(() => {
        setLimitError(null);
        setIsBillingError(false);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Persist the session and tear down local state. Safe to call multiple times.
    const finalizeSession = useCallback(async () => {
        stopTimer();
        setIsActive(false);
        setStatus('idle');
        setCurrentMessage('');
        setCurrentUserMessage('');

        const sessionId = sessionIdRef.current;
        sessionIdRef.current = null;

        if (sessionId) {
            await endVoiceSession(sessionId, durationRef.current);
        }
    }, [stopTimer]);

    const stop = useCallback(async () => {
        try {
            await vapiRef.current?.stop();
        } catch (e) {
            console.error('Failed to stop Vapi call', e);
            // Ensure state is cleaned up even if the SDK stop() throws.
            await finalizeSession();
        }
    }, [finalizeSession]);

    // Initialise the Vapi client and register listeners once.
    useEffect(() => {
        if (!VAPI_PUBLIC_KEY) return;

        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        const onCallStart = () => {
            setIsActive(true);
            setStatus('listening');

            durationRef.current = 0;
            setDuration(0);
            stopTimer();
            timerRef.current = setInterval(() => {
                durationRef.current += 1;
                setDuration(durationRef.current);

                if (maxDurationRef.current > 0 && durationRef.current >= maxDurationRef.current) {
                    void stop();
                }
            }, 1000);
        };

        const onCallEnd = () => {
            void finalizeSession();
        };

        // Assistant started/stopped talking.
        const onSpeechStart = () => setStatus('speaking');
        const onSpeechEnd = () => setStatus('listening');

        const onMessage = (message: { type?: string; role?: string; transcriptType?: string; transcript?: string }) => {
            if (message.type !== 'transcript' || !message.role) return;

            const role = message.role === 'user' ? 'user' : 'assistant';
            const transcript = message.transcript ?? '';

            if (message.transcriptType === 'partial') {
                if (role === 'user') {
                    setCurrentUserMessage(transcript);
                    setStatus('thinking');
                } else {
                    setCurrentMessage(transcript);
                }
                return;
            }

            if (message.transcriptType === 'final') {
                setMessages((prev) => [...prev, { role, content: transcript }]);
                if (role === 'user') {
                    setCurrentUserMessage('');
                } else {
                    setCurrentMessage('');
                }
            }
        };

        const onError = (error: unknown) => {
            console.error('Vapi error', error);
            setLimitError('Something went wrong with the voice session. Please try again.');
            void finalizeSession();
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('message', onMessage);
        vapi.on('error', onError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('message', onMessage);
            vapi.off('error', onError);
            stopTimer();
            void vapi.stop();
            vapiRef.current = null;
        };
    }, [finalizeSession, stop, stopTimer]);

    const start = useCallback(async () => {
        clearError();

        if (!VAPI_PUBLIC_KEY || !ASSISTANT_ID) {
            setLimitError('Voice assistant is not configured. Please contact support.');
            return;
        }

        if (!userId) {
            setLimitError('Please login to start a voice session.');
            return;
        }

        const vapi = vapiRef.current;
        if (!vapi) return;

        setStatus('connecting');
        setMessages([]);
        setCurrentMessage('');
        setCurrentUserMessage('');

        // Enforce plan limits before dialing out.
        const session = await startVoiceSession(userId, book._id);

        if (!session.success) {
            setLimitError(session.error ?? 'Unable to start a voice session.');
            setIsBillingError(Boolean(session.isBillingError));
            setStatus('idle');
            return;
        }

        sessionIdRef.current = session.sessionId ?? null;
        const maxSeconds = (session.maxDurationMinutes ?? 0) * 60;
        maxDurationRef.current = maxSeconds;
        setMaxDurationSeconds(maxSeconds);

        const voiceKey = (book.persona && book.persona in voiceOptions ? book.persona : DEFAULT_VOICE) as keyof typeof voiceOptions;
        const voiceId = voiceOptions[voiceKey].id;

        try {
            setStatus('starting');
            await vapi.start(ASSISTANT_ID, {
                variableValues: {
                    bookTitle: book.title,
                    author: book.author,
                    persona: book.persona ?? voiceOptions[voiceKey].name,
                },
                voice: {
                    provider: '11labs',
                    voiceId,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                    speed: VOICE_SETTINGS.speed,
                },
            });
        } catch (e) {
            console.error('Failed to start Vapi call', e);
            setLimitError('Failed to start the voice session. Please try again.');
            setStatus('idle');
            await finalizeSession();
        }
    }, [book._id, book.author, book.persona, book.title, clearError, finalizeSession, userId]);

    return {
        status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
        clearError,
        limitError,
        isBillingError,
        maxDurationSeconds,
    };
};

export default useVapi;
