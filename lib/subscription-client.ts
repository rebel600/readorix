'use client';

import {useAuth} from "@clerk/nextjs";
import {PLANS, PLAN_LIMITS, PlanLimits, PlanType} from "@/lib/subscription-constants";

// Client-side mirror of getUserPlan() in subscription-server.ts. Uses the has()
// helper exposed by useAuth() so client components can gate UI on the user's
// plan without a round trip. These reads are for presentation only — the server
// checks in subscription-server.ts remain the authoritative ones.
export const useUserPlan = (): PlanType => {
    const { isLoaded, userId, has } = useAuth();

    if (!isLoaded || !userId || !has) return PLANS.FREE;

    if (has({ plan: PLANS.PRO })) return PLANS.PRO;
    if (has({ plan: PLANS.STANDARD })) return PLANS.STANDARD;

    return PLANS.FREE;
};

export const usePlanLimits = (): PlanLimits => {
    const plan = useUserPlan();
    return PLAN_LIMITS[plan];
};
