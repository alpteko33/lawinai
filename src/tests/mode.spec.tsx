import { describe, it, expect } from 'vitest';

// Simple reducer-like tests using the exported selectors and initial state shape
import { store } from '@/renderer/redux/store';

describe('Mode state', () => {
  it('default mode should be sor', () => {
    const state = store.getState() as any;
    expect(state.session.mode).toBe('sor');
  });
});


