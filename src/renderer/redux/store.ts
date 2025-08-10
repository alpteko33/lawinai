import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

export type ChatMessage = {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
};

export type MessageModes = 'yazdir' | 'sor' | 'ozetle';

export type SessionState = {
  id: string | null;
  title: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
  mode: MessageModes;
  hasReasoningEnabled?: boolean;
  contextPercentage?: number;
};

const initialSession: SessionState = {
  id: null,
  title: 'Yeni Sohbet',
  messages: [],
  mode: 'sor',
};

const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSession,
  reducers: {
    setSession(state, action: PayloadAction<SessionState>) {
      return { ...action.payload };
    },
    setMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.messages = action.payload;
    },
    appendMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
    },
    setMode(state, action: PayloadAction<MessageModes>) {
      state.mode = action.payload;
    },
    setHasReasoningEnabled(state, action: PayloadAction<boolean | undefined>) {
      state.hasReasoningEnabled = action.payload;
    },
    setContextPercentage(state, action: PayloadAction<number | undefined>) {
      state.contextPercentage = action.payload;
    },
  },
});

export const { setSession, setMessages, appendMessage, setTitle, setMode, setHasReasoningEnabled, setContextPercentage } = sessionSlice.actions;

const persistConfig = {
  key: 'lawinai:root',
  storage,
  whitelist: ['session'],
};

const rootReducer = (state: any, action: any) => {
  return {
    session: sessionSlice.reducer(state?.session, action),
  };
};

const persistedReducer = persistReducer(persistConfig, rootReducer as any);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Selectors
export const selectMode = (state: RootState): MessageModes => state.session.mode;
export const selectHasReasoningEnabled = (state: RootState): boolean => Boolean(state.session.hasReasoningEnabled);
export const selectContextPercentage = (state: RootState): number | undefined => state.session.contextPercentage;


