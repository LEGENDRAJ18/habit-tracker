"use client";
import { createContext, useContext } from "react";
interface AIInsightCtxValue { openAIInsight: () => void; }
const AIInsightCtx = createContext<AIInsightCtxValue>({ openAIInsight: () => {} });
export const AIInsightProvider = AIInsightCtx.Provider;
export function useAIInsight() { return useContext(AIInsightCtx); }
