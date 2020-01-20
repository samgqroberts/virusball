import _ from 'lodash';

const keysPressed: string[] = [];

document.addEventListener('keydown', (e) => {
  console.log(e.key);
  keysPressed.push(e.key);
});

document.addEventListener('keyup', (e) => {
  _.remove(keysPressed, (key) => key === e.key);
});

type KeysCapture = {
  readonly keysPressed: string[]
  readonly isPressed: (key: string) => boolean
}

export function capture(): KeysCapture {
  return {
    keysPressed: keysPressed.slice(),
    isPressed: (key) => keysPressed.indexOf(key) !== -1,
  };
}
