# ![upside down hippo](/assets/hippo.svg) Flippo
Flipping easy transitions.

Uses the [FLIP](https://aerotwist.com/blog/flip-your-animations/) technique to transition elements from one state to another.

⚠ Flippo is still very much a work-in-progress. Expect the API to change.

## Getting Started with React
Install with yarn or NPM:
```
yarn add flippo-react
```
```
npm install --save flippo-react
```

Import `flippo-react`:
```tsx
import { FlipScope, Flip } from "flippo-react";
```

Wrap elements you want to transition in the `Flip` component:
```tsx
<Flip id="box"><div className="box"></div></Flip>
```

To transition from one element to a another element, give them the same id:
```tsx
showLarge
    ? <Flip id="box"><div className="large"></div></Flip>
    : <Flip id="box"><div className="small"></div></Flip>
```

Wrap all of the `Flip`'d elements in the `FlipScope` component. All of the elements in a `FlipScope` will transition when the `FlipScope`'s `triggerData` changes.

```tsx
function FlippingDemo() {
    let [showLarge, setShowLarge] = React.useState(false);

    return <FlipScope triggerData={showLarge}>
        <button onClick={() => setShowLarge(large => !large)}>Toggle size</button>
        {showLarge
            ? <Flip id="box"><div className="large"></div></Flip>
            : <Flip id="box"><div className="small"></div></Flip>
        }
    </FlipScope>;
}
```

## Running the Examples
1. Download the source.
2. In the root folder, run `yarn` to fetch dependencies and build.
3. Run `yarn examples`, which will start a local server and open the examples in your default browser.

---
Hippo image from [Twemoji](https://github.com/twitter/twemoji), licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).