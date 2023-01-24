# fold
Fold is a React state library.

## Install
```
yarn add https://github.com/solarfluxx/fold
```

## Examples

### Counter
```tsx
import { atom } from '@solarfluxx/fold';

const countAtom = atom(0);

function Counter() {
  const count = countAtom.use();
  
  return (
    <div>
      <div>{ count }</div>
      <button onClick={() => countAtom.set(count => count + 1)}>Increment</button>
    </div>
  );
}
```
