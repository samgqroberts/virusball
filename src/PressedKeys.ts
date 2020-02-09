import _ from 'lodash';

// array to keep track of key presses
// must ensure that later-pressed keys have higher indexes
const keysPressed: string[] = [];

document.addEventListener('keydown', (e) => {
  keysPressed.push(e.key);
});

document.addEventListener('keyup', (e) => {
  _.remove(keysPressed, (key) => key === e.key);
});

export type KeysCapture = {
  readonly keysPressed: string[]
  readonly latestPressed: (key1: string, key2: string) => string | null
}

export function capture(): KeysCapture {
  return {
    keysPressed: keysPressed.slice(),
    latestPressed: (key1, key2) => {
      const key1Index = keysPressed.indexOf(key1);
      const key2Index = keysPressed.indexOf(key2);
      if (key1Index === -1 && key2Index === -1) {
        return null;
      }
      return key1Index > key2Index ? key1 : key2;
    }
  };
}
