
// valid Key characters that come back from KeyboardEvent.key (incomplete list)
export type Key
  = 'a'
  | 'w'
  | 'd'
  | 's'
  | 'ArrowLeft'
  | 'ArrowUp'
  | 'ArrowRight'
  | 'ArrowDown'
const keys: Key[] = [
  'a',
  'w',
  'd',
  's',
  'ArrowLeft',
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
];

// array to keep track of key presses
// must ensure that later-pressed keys have higher indexes
let keysPressed: Key[] = [];

document.addEventListener('keydown', (e) => {
  const key = e.key as Key;
  if (keys.includes(key)) {
    keysPressed.push(key);
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed = keysPressed.filter((key) => key !== e.key);
});

export type KeysCapture = {
  readonly keysPressed: Key[]
  readonly latestPressed: <K1 extends Key, K2 extends Key>(key1: K1, key2: K2) => K1 | K2 | null
}

export function capture(): KeysCapture {
  return {
    keysPressed: keysPressed.slice(),
    latestPressed: <K1 extends Key, K2 extends Key>(key1: K1, key2: K2) => {
      const key1Index = keysPressed.indexOf(key1);
      const key2Index = keysPressed.indexOf(key2);
      if (key1Index === -1 && key2Index === -1) {
        return null;
      }
      return key1Index > key2Index ? key1 : key2;
    }
  };
}
