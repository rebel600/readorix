import {auth} from "@clerk/nextjs/server";
import {PLANS, PLAN_LIMITS, PlanType} from "@/lib/subscription-constants";
import {connectToDatabase} from "@/database/mongoose";
import Book from "@/database/models/book.model";

export const getUserPlan = async (): Promise<PlanType> => {
    const { has, userId } = await auth();

    if (!userId) return PLANS.FREE;

    if (has({ plan: "pro" })) return PLANS.PRO;
    if (has({ plan: "standard" })) return PLANS.STANDARD;

    return PLANS.FREE;
}

export const getPlanLimits = async () => {
    const plan = await getUserPlan();
    return PLAN_LIMITS[plan];
}

export interface BookQuota {
    userId: string | null;
    plan: PlanType;
    maxBooks: number;
    bookCount: number;
    allowed: boolean;
}

// Single source of truth for "may this user add another book?". Used by the page
// (to avoid rendering the form), by /api/upload (to avoid issuing blob tokens),
// and by createBook (the authoritative check). Callers must not trust a count
// supplied by the client.
export const getBookQuota = async (): Promise<BookQuota> => {
    const { userId } = await auth();

    const plan = await getUserPlan();
    const { maxBooks } = PLAN_LIMITS[plan];

    if (!userId) {
        return { userId: null, plan, maxBooks, bookCount: 0, allowed: false };
    }

    await connectToDatabase();
    const bookCount = await Book.countDocuments({ clerkId: userId });

    return { userId, plan, maxBooks, bookCount, allowed: bookCount < maxBooks };
}