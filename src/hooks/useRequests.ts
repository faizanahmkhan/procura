import { useReducer, useEffect } from 'react';
import type { ToolRequest, AIAnalysis, RequestStatus } from '../types';
import { SEED_REQUESTS } from '../data/seedRequests';

const STORAGE_KEY = 'wembol_v1';
const LEGACY_STORAGE_KEY = 'govtool_v1';

type Action =
  | { type: 'ADD_REQUEST'; payload: ToolRequest }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: RequestStatus; reason?: string } }
  | { type: 'SET_AI_ANALYSIS'; payload: { id: string; analysis: AIAnalysis } };

function loadFromStorage(): ToolRequest[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        raw = legacy;
      }
    }
    if (raw) {
      return JSON.parse(raw) as ToolRequest[];
    }
  } catch {
    // Corrupted storage — fall through to seed data
  }
  return SEED_REQUESTS;
}

function reducer(state: ToolRequest[], action: Action): ToolRequest[] {
  switch (action.type) {
    case 'ADD_REQUEST':
      return [action.payload, ...state];

    case 'UPDATE_STATUS':
      return state.map((req) =>
        req.id === action.payload.id
          ? {
              ...req,
              status: action.payload.status,
              reason: action.payload.reason ?? req.reason,
              resolvedAt:
                action.payload.status === 'Approved' || action.payload.status === 'Rejected'
                  ? new Date().toISOString()
                  : req.resolvedAt,
            }
          : req,
      );

    case 'SET_AI_ANALYSIS':
      return state.map((req) =>
        req.id === action.payload.id ? { ...req, aiAnalysis: action.payload.analysis } : req,
      );
  }
}

export interface UseRequestsResult {
  requests: ToolRequest[];
  addRequest: (req: ToolRequest) => void;
  updateStatus: (id: string, status: RequestStatus, reason?: string) => void;
  setAIAnalysis: (id: string, analysis: AIAnalysis) => void;
}

export function useRequests(): UseRequestsResult {
  const [requests, dispatch] = useReducer(reducer, undefined, loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }, [requests]);

  return {
    requests,
    addRequest: (req) => dispatch({ type: 'ADD_REQUEST', payload: req }),
    updateStatus: (id, status, reason) =>
      dispatch({ type: 'UPDATE_STATUS', payload: { id, status, reason } }),
    setAIAnalysis: (id, analysis) =>
      dispatch({ type: 'SET_AI_ANALYSIS', payload: { id, analysis } }),
  };
}
