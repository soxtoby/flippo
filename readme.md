# ![upside down hippo](/assets/hippo.svg) Flippo
Flipping easy transitions.

Uses the [FLIP](https://aerotwist.com/blog/flip-your-animations/) technique to transition elements from one state to another.

> **Warning**
> Flippo is still very much a work-in-progress. Expect the API to change.

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
import { Flip } from "flippo-react";
```

Wrap elements you want to transition in the `Flip` component:
```tsx
<Flip><div className="box"></div></Flip>
```

> **Note**
> Flipped elements must forward their `ref` to an element.

To transition from one element to a another element, give them the same id:
```tsx
showLarge
    ? <Flip id="box"><div className="large"></div></Flip>
    : <Flip id="box"><div className="small"></div></Flip>
```

If one element affects the layout of other elements without them re-rendering (e.g. they're in separate memoized components), you can wrap them in a `FlipScope` to animate everything in the scope together:
```tsx
import { Flip, FlipScope } from "flippo-react";
import { memo } from "react";

function Accordion() {
    return <FlipScope>
        <AccordionSection title="One" />
        <AccordionSection title="Two" />
        <AccordionSection title="Three" />
    </FlipScope>
}

const AccordionSection = memo(({ title }: { title: string; }) => {
    let [expanded, setExpanded] = useState(false);

    return <Flip>
        <div className={expanded ? 'expanded' : 'collapsed'}>
        <span onClick={() => setExpanded(e => !e)}>
            {title}
        </span>
    </Flip>
});
```

## Running the Examples
1. Download the source.
2. In the root folder, run `yarn` to fetch dependencies and build.
3. Run `yarn examples`, which will start a local server and open the examples in your default browser.

---
Hippo image from [Twemoji](https://github.com/twitter/twemoji), licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).