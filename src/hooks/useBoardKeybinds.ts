import { useEffect, useMemo, useRef } from 'react';
import { useKeybinds, KeyAction } from '../context/KeybindsProvider';
import { useSettings } from '../state/settings';

export type BoardKeyHandlers = {
  first?: () => void;
  prev?: () => void;
  next?: () => void;
  last?: () => void;
  flip?: () => void;
};

/**
 * Attaches window-level keydown handlers for board navigation.
 * Skips when user is typing in inputs/textareas/contentEditable.
 * Supports two bindings per action and modifiers (Ctrl/Alt/Shift/Meta).
 */
export function useBoardKeybinds(handlers: BoardKeyHandlers, enabled = true) {
  const { getActionForEvent } = useKeybinds();
  const { settings } = useSettings();

  const repeatConfig = useMemo(() => {
    const rawRate = Number(settings.boardHoldStepsPerSecond ?? 0);
    const rate = Math.max(0, Math.min(20, Math.round(rawRate * 10) / 10));
    if (rate <= 0) {
      return {
        enabled: false as const,
        stepsPerSecond: 0,
        intervalMs: Infinity,
        initialDelayMs: Infinity,
      };
    }
    const intervalMs = rate > 0 ? 1000 / rate : Infinity;
    return {
      enabled: true as const,
      stepsPerSecond: rate,
      intervalMs,
      initialDelayMs: 250,
    };
  }, [settings.boardHoldStepsPerSecond]);

  type HoldTimer = { timeout?: number; interval?: number };
  const holdTimersRef = useRef<{ 'board.next'?: HoldTimer; 'board.prev'?: HoldTimer }>({});

  const stopHold = (key: 'board.next' | 'board.prev') => {
    const timers = holdTimersRef.current[key];
    if (!timers) return;
    if (typeof timers.timeout === 'number') window.clearTimeout(timers.timeout);
    if (typeof timers.interval === 'number') window.clearInterval(timers.interval);
    delete holdTimersRef.current[key];
  };

  const stopAllHolds = () => {
    stopHold('board.next');
    stopHold('board.prev');
  };

  useEffect(() => () => stopAllHolds(), []);

  useEffect(() => {
    stopAllHolds();
  }, [repeatConfig.enabled, repeatConfig.intervalMs, repeatConfig.initialDelayMs]);

  useEffect(() => {
    if (!enabled) return;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || el.isContentEditable) return true;
      return false;
    };

    const startHold = (key: 'board.next' | 'board.prev', callback: () => void) => {
      if (!repeatConfig.enabled) return;
      stopHold(key);

      const timers: HoldTimer = {};
      const firstDelay = Math.max(repeatConfig.initialDelayMs, repeatConfig.intervalMs);
      timers.timeout = window.setTimeout(() => {
        callback();
        if (!repeatConfig.enabled) {
          stopHold(key);
          return;
        }
        timers.interval = window.setInterval(() => {
          callback();
        }, repeatConfig.intervalMs);
        holdTimersRef.current[key] = timers;
      }, firstDelay);
      holdTimersRef.current[key] = timers;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const action = getActionForEvent(e);
      if (!action) return;

      let handled = false;
      let suppressed = false;

      switch (action as KeyAction) {
        case 'board.first':
          if (handlers.first) { handlers.first(); handled = true; }
          break;
        case 'board.prev':
          if (handlers.prev) {
            if (!e.repeat) {
              handlers.prev();
              handled = true;
              startHold('board.prev', handlers.prev);
            } else {
              suppressed = true;
            }
          }
          break;
        case 'board.next':
          if (handlers.next) {
            if (!e.repeat) {
              handlers.next();
              handled = true;
              startHold('board.next', handlers.next);
            } else {
              suppressed = true;
            }
          }
          break;
        case 'board.last':
          if (handlers.last) { handlers.last(); handled = true; }
          break;
        case 'board.flip':
          if (handlers.flip) { handlers.flip(); handled = true; }
          break;
      }

      if (handled || suppressed) {
        // Prevent the page from scrolling with arrow keys while navigating
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const action = getActionForEvent(e);
      if (!action) return;
      if (action === 'board.next' || action === 'board.prev') {
        const hadTimer = !!holdTimersRef.current[action];
        stopHold(action);
        if (hadTimer) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const onWindowBlur = () => {
      stopAllHolds();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', onWindowBlur);
      stopAllHolds();
    };
  }, [
    getActionForEvent,
    handlers.first,
    handlers.prev,
    handlers.next,
    handlers.last,
    handlers.flip,
    enabled,
    repeatConfig.enabled,
    repeatConfig.intervalMs,
    repeatConfig.initialDelayMs,
  ]);
}
