export {};

declare global {
  interface Window {
    cardgen?: {
      saveConfig: (cfg: {
        otherAnswersAcceptance: number;
        maxOtherAnswerCount: number;
        depth: number;
        threads: number;
        hash: number;
      }) => Promise<boolean>;
      makeCard?: (args: {
        movesSAN?: string[];
        moves?: string;
        pgn?: string;
        fen?: string;
        duplicateStrategy?: 'skip' | 'overwrite' | 'prompt' | 'keep-both';
        tags?: string[];
        config?: {
          otherAnswersAcceptance: number;
          maxOtherAnswerCount: number;
          depth: number;
          threads: number;
          hash: number;
        };
      }) => Promise<{ ok: boolean; message: string; id?: string; deckId?: string; skipped?: boolean; existingId?: string }>;
      cancel?: () => void;
    };

    autogen?: {
      scanChessCom: (opts: { username?: string; limit?: number; fromDate?: string; toDate?: string }) => Promise<{ ok: boolean; message?: string; scanned?: number; created?: number; cancelled?: boolean }>;
      scanLichess?: (opts: { username?: string; limit?: number; fromDate?: string; toDate?: string }) => Promise<{ ok: boolean; message?: string; scanned?: number; created?: number; cancelled?: boolean }>;
      cancel: () => void;
      onProgress: (cb: (p: { phase?: string; index?: number; total?: number; url?: string; fen?: string; pgn?: string; message?: string; posIdx?: number; posTotal?: number; creating?: boolean; seq?: number; deviated?: boolean; expected?: string; got?: string; forced?: boolean }) => void) => () => void;
      onDone: (cb: (r: { ok?: boolean; message?: string; scanned?: number; created?: number; cancelled?: boolean }) => void) => () => void;
    };

    answers?: {
      readAll: () => Promise<Record<string, string | { move: string; pgn?: string }>>;
      saveAll: (map: Record<string, string | { move: string; pgn?: string }>) => Promise<boolean>;
    };

    cards?: {
      readAll?: () => Promise<any[]>;
      readOne: (id: string) => Promise<any | null>;
      update: (card: any) => Promise<boolean>;
      create?: (card: any) => Promise<boolean>;
      setDue?: (id: string, due: string | 'new' | undefined) => Promise<boolean>;
      exportToDownloads?: () => Promise<{ ok: boolean; path?: string; message?: string }>;
      exportJsonToDownloads?: (cards: any[], name?: string) => Promise<{ ok: boolean; path?: string; message?: string }>;
      importFromFile?: (mode: 'add' | 'overwrite') => Promise<{ ok: boolean; cards?: any[]; message?: string; added?: number; replaced?: number; total?: number; imported?: number; skipped?: number; source?: string; cancelled?: boolean }>;
    };

    decks?: {
      getLimits: () => Promise<Record<string, any>>;
      setLimits: (storeObj: Record<string, any>) => Promise<boolean>;
    };

    zoom?: {
      getFactor: () => number;
      setFactor: (f: number) => number;
      in: (step?: number) => number;
      out: (step?: number) => number;
      reset: () => number;
    };
  }
}
