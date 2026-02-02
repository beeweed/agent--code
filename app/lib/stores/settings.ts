import { map } from 'nanostores';

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlOrMetaKey?: boolean;
  action: () => void;
}

export interface Shortcuts {}

export interface Settings {
  shortcuts: Shortcuts;
}

export const shortcutsStore = map<Shortcuts>({});

export const settingsStore = map<Settings>({
  shortcuts: shortcutsStore.get(),
});

shortcutsStore.subscribe((shortcuts) => {
  settingsStore.set({
    ...settingsStore.get(),
    shortcuts,
  });
});
