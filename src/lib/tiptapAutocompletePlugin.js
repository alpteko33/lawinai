import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { streamAutocomplete } from '../services/autocompleteService.js';
import { stripUnwantedClosures, fixWhitespaceAndIndent } from '../autocomplete/postprocess.js';

export function computeAcceptedText({ prefix, suffix, suggestion }) {
  let accepted = stripUnwantedClosures(suggestion || '', suffix || '');
  accepted = fixWhitespaceAndIndent(accepted, prefix || '');
  return accepted;
}

export function shouldCancelOnEscape(textSoFar) {
  return Boolean(textSoFar);
}

const AUTOCOMPLETE_PLUGIN_KEY = new PluginKey('tiptap-autocomplete');

function getPrefixSuffix(state) {
  const { from } = state.selection;
  const doc = state.doc;
  const prefix = doc.textBetween(0, from, '\n', '\n');
  const suffix = doc.textBetween(from, doc.content.size, '\n', '\n');

  // 4–8KB pencereyle sınırla
  const MAX = 8192;
  const prunedPrefix = prefix.length > MAX ? prefix.slice(prefix.length - MAX) : prefix;
  const prunedSuffix = suffix.length > MAX ? suffix.slice(0, MAX) : suffix;
  return { from, prefix: prunedPrefix, suffix: prunedSuffix };
}

function shouldRenderCompletion({ completionText, isMultilineAllowed, caretAtLineEnd }) {
  if (!completionText) return false;
  if (!completionText.trim()) return false;
  const hasNewline = completionText.includes('\n');
  if (!hasNewline) return true; // tek satır öneri: boş değilse göster
  // çok satırlı öneri sadece caret satırı sonu boşsa
  if (hasNewline && isMultilineAllowed && caretAtLineEnd) return true;
  return false;
}

function isCaretAtLineEnd(state) {
  const { from } = state.selection;
  const nextChar = state.doc.textBetween(from, Math.min(from + 1, state.doc.content.size));
  return nextChar === '' || nextChar === '\n';
}

export function createTiptapAutocompletePlugin({ debounceMs = 180 } = {}) {
  let debounceTimer = null;
  let currentAbortController = null;

  function clearDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function cancelOngoing(view, { removeDecoration = true } = {}) {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    if (removeDecoration) {
      const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state);
      if (pluginState && pluginState.decorationSet && pluginState.decorationSet.find().length) {
        const tr = view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { type: 'clear' });
        view.dispatch(tr);
      }
    }
  }

  const basePlugin = new Plugin({
    key: AUTOCOMPLETE_PLUGIN_KEY,
    state: {
      init: () => ({ decorationSet: DecorationSet.empty, completionId: null, textSoFar: '', abortController: null }),
      apply(tr, pluginState, oldState, newState) {
        const meta = tr.getMeta(AUTOCOMPLETE_PLUGIN_KEY);
        if (meta?.type === 'clear') {
          return { ...pluginState, decorationSet: DecorationSet.empty, textSoFar: '', completionId: null };
        }
        if (meta?.type === 'update') {
          return { ...pluginState, decorationSet: meta.decorationSet, textSoFar: meta.textSoFar, completionId: meta.completionId };
        }
        // Seçim değişirse dekorasyonu temizle (yazmaya devam edilince iptal)
        if (tr.docChanged || tr.selectionSet) {
          return { ...pluginState, decorationSet: DecorationSet.empty, textSoFar: '', completionId: null };
        }
        return pluginState;
      },
    },
    props: {
      decorations(state) {
        const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(state);
        return pluginState?.decorationSet || null;
      },
      handleKeyDown(view, event) {
        const pluginState = AUTOCOMPLETE_PLUGIN_KEY.getState(view.state);
        if (!pluginState) return false;
        if (event.key === 'Tab') {
          const text = pluginState.textSoFar || '';
          if (!text) return false;
          event.preventDefault();
          // Bracket-aware kabul ve whitespace uyumu
          const { prefix, suffix } = getPrefixSuffix(view.state);
          const accepted = computeAcceptedText({ prefix, suffix, suggestion: text });
          view.dispatch(view.state.tr.insertText(accepted).setMeta(AUTOCOMPLETE_PLUGIN_KEY, { type: 'clear' }));
          return true;
        }
        if (event.key === 'Escape') {
          if (pluginState.textSoFar) {
            event.preventDefault();
            view.dispatch(view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { type: 'clear' }));
            cancelOngoing(view);
            return true;
          }
        }
        return false;
      },
      handleTextInput(view) {
        // Yazmaya devam: mevcut öneriyi iptal et
        cancelOngoing(view);
        return false;
      },
      handleDOMEvents: {
        compositionstart(view) {
          cancelOngoing(view);
          return false;
        },
      },
    },
    view(editorView) {
      return {
        update(view) {
          // 120–200ms debounce ile tetikle
          clearDebounce();
          debounceTimer = setTimeout(async () => {
            const { from, prefix, suffix } = getPrefixSuffix(view.state);
            const caretAtEnd = isCaretAtLineEnd(view.state);
            
            // Prefix boşsa autocomplete'i tetikleme
            if (!prefix || prefix.trim() === '') {
              return;
            }
            
            // Tek satır boş değilse göster; çok satır için satır sonu boş
            const completionId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

            // Yeni istek: eskisini iptal et
            cancelOngoing(view, { removeDecoration: false });
            currentAbortController = new AbortController();

            try {
              const stream = await streamAutocomplete({ prefix, suffix, completionId }, currentAbortController.signal);
              let textSoFar = '';
              const applyRender = () => {
                if (!shouldRenderCompletion({ completionText: textSoFar, isMultilineAllowed: true, caretAtLineEnd: caretAtEnd })) {
                  view.dispatch(view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, { type: 'clear' }));
                  return;
                }
                const deco = Decoration.widget(from, () => {
                  const span = document.createElement('span');
                  span.className = 'ghost-text';
                  span.textContent = textSoFar;
                  return span;
                }, { side: 1 });
                const decos = DecorationSet.create(view.state.doc, [deco]);
                view.dispatch(view.state.tr.setMeta(AUTOCOMPLETE_PLUGIN_KEY, {
                  type: 'update',
                  decorationSet: decos,
                  textSoFar,
                  completionId,
                }));
              };

              for await (const { delta, fullText } of stream) {
                textSoFar += delta;
                applyRender();
              }
              if (stream.onDone) stream.onDone();
            } catch (e) {
              // sessiz
            }
          }, debounceMs);
        },
        destroy() {
          clearDebounce();
          if (currentAbortController) currentAbortController.abort();
        },
      };
    },
  });

  const bindings = keymap({}); // Tab/Esc zaten handleKeyDown ile ele alınıyor

  return [basePlugin, bindings];
}

export default createTiptapAutocompletePlugin;


